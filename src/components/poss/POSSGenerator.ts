import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Waypoint, getWaypointLabel } from "@/hooks/useWaypoints";
import { OutingType } from "@/hooks/useOutings";
import logoTeamOxygen from "@/assets/logo-team-oxygen-transparent.png";

// Types for POSS generation
export interface POSSParticipant {
  first_name: string;
  last_name: string;
  apnea_level: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  group_number: number | null;
}

export interface POSSLocation {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  maps_url: string | null;
  satellite_map_url: string | null;
  bathymetric_map_url: string | null;
  max_depth: number | null;
}

export interface POSSBoat {
  name: string;
  registration_number: string | null;
  pilot_name: string | null;
  pilot_phone: string | null;
  oxygen_location: string | null;
  home_port: string | null;
}

export interface POSSWeather {
  windSpeed: string | null;
  maxWindSpeed: string | null;
  waveHeight: string | null;
  maxWaveHeight: string | null;
  temperature: string | null;
  conditions: string | null;
}

export interface POSSCoInstructor {
  name: string;
  level: string | null;
  phone: string | null;
}

export interface POSSData {
  outingTitle: string;
  outingDateTime: string;
  outingLocation: string;
  outingType: OutingType;
  diveMode: "boat" | "shore" | null;
  location: POSSLocation | null;
  boat: POSSBoat | null;
  waypoints: Waypoint[];
  participants: POSSParticipant[];
  organizerName: string;
  organizerLevel: string | null;
  organizerLevelName: string | null;
  organizerMaxDepthEaa: number | null;
  organizerMaxDepthEao: number | null;
  organizerPhone: string | null;
  coInstructors: POSSCoInstructor[];
  waterEntryTime: string | null;
  waterExitTime: string | null;
  weather: POSSWeather | null;
}

// Helper: Convert image URL to Base64 (CORS-safe)
const getDataUri = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn("Failed to load image:", url);
    return null;
  }
};

// Helper: Draw a box with optional fill
const drawBox = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: { fill?: string; stroke?: string; lineWidth?: number }
) => {
  const { fill, stroke = "#000000", lineWidth = 0.5 } = options || {};
  doc.setDrawColor(stroke);
  doc.setLineWidth(lineWidth);
  if (fill) {
    doc.setFillColor(fill);
    doc.rect(x, y, width, height, "FD");
  } else {
    doc.rect(x, y, width, height, "S");
  }
};

// Helper: Format GPS coordinates
const formatGPS = (lat: number | null, lon: number | null): string => {
  if (lat === null || lon === null) return "Non disponible";
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
};

// Helper: Group a phone's digits with French spacing (pairs of 2).
// Odd-length national parts (e.g. after a +33 prefix) keep the first digit alone.
const frenchPhoneGroups = (digits: string): string => {
  const parts: string[] = [];
  let i = 0;
  if (digits.length % 2 === 1) {
    parts.push(digits[0]);
    i = 1;
  }
  for (; i < digits.length; i += 2) parts.push(digits.slice(i, i + 2));
  return parts.join(" ");
};

// Helper: Format a phone number (e.g. "0611033118" -> "06 11 03 31 18",
// "+33767811438" -> "+33 7 67 81 14 38"). Falls back to the raw value if
// there are no digits to format.
const formatPhone = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;

  if (hasPlus) {
    // International: 2-digit country code, then the national part grouped.
    return `+${digits.slice(0, 2)} ${frenchPhoneGroups(digits.slice(2))}`;
  }
  // French mobile entered without its leading 0 (9 digits starting with 6/7).
  if (digits.length === 9 && /^[67]/.test(digits)) {
    digits = `0${digits}`;
  }
  return frenchPhoneGroups(digits);
};

// Helper: Calculate session duration
const calculateDuration = (entryTime: string | null, exitTime: string | null): string => {
  if (!entryTime || !exitTime) return "N/A";

  const [entryHours, entryMinutes] = entryTime.split(':').map(Number);
  const [exitHours, exitMinutes] = exitTime.split(':').map(Number);

  let durationMinutes = (exitHours * 60 + exitMinutes) - (entryHours * 60 + entryMinutes);

  if (durationMinutes < 0) {
    durationMinutes += 24 * 60; // Handle crossing midnight
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours > 0) {
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }
  return `${minutes}min`;
};

// Main POSS Generator
export const generatePOSS = async (data: POSSData): Promise<void> => {
  const { outingTitle, outingDateTime, outingLocation, outingType, diveMode, location, boat, waypoints, participants, organizerName, organizerLevel, organizerLevelName, organizerMaxDepthEaa, organizerMaxDepthEao, organizerPhone, coInstructors, waterEntryTime, waterExitTime, weather } = data;
  
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Load logo
  let logoBase64: string | null = null;
  try {
    logoBase64 = await getDataUri(logoTeamOxygen);
  } catch {
    console.warn("Could not load logo");
  }

  // ====================
  // A. EN-TÊTE OPTIMISÉ
  // ====================
  const headerHeight = 20;
  drawBox(doc, margin, y, contentWidth, headerHeight, { fill: "#f3f4f6" });

  // Logo (left - smaller)
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin + 2, y + 2, 16, 16);
  }

  // Title (center - one line)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor("#000000");
  doc.text("PLAN D'ORGANISATION DES SECOURS (P.O.S.S.)", pageWidth / 2, y + 6, { align: "center" });

  // Session info
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const dateStr = format(new Date(outingDateTime), "EEEE d MMMM yyyy", { locale: fr });
  const sessionDuration = calculateDuration(waterEntryTime, waterExitTime);
  const sessionTimeInfo = waterEntryTime && waterExitTime
    ? `Mise à l'eau : ${waterEntryTime}  |  Sortie : ${waterExitTime}  |  Durée : ${sessionDuration}`
    : "Horaires non définis";

  doc.text(`Date : ${dateStr}   |   Lieu : ${location?.name || outingLocation}`, pageWidth / 2, y + 12, { align: "center" });
  doc.setFontSize(7.5);
  doc.text(sessionTimeInfo, pageWidth / 2, y + 16, { align: "center" });

  // Date de génération (top right)
  doc.setTextColor("#666666");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`, pageWidth - margin - 2, y + 18, { align: "right" });
  doc.setTextColor("#000000");

  y += headerHeight + 3;

  // ====================
  // ENCADREMENT & CONTACTS (Responsable + Co-encadrants avec téléphones)
  // ====================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#0369a1");
  doc.text("ENCADREMENT & CONTACTS", margin, y);
  doc.setTextColor("#000000");
  y += 4;

  const encadrementRows: string[][] = [
    ["Responsable POSS", organizerName, organizerLevel || "-", formatPhone(organizerPhone) || "Non renseigné"],
  ];
  coInstructors.forEach((co) => {
    encadrementRows.push(["Co-encadrant", co.name, co.level || "-", formatPhone(co.phone) || "Non renseigné"]);
  });

  autoTable(doc, {
    startY: y,
    head: [["Rôle", "Nom", "Niveau", "Téléphone"]],
    body: encadrementRows,
    theme: "grid",
    headStyles: {
      fillColor: "#0369a1",
      textColor: "#ffffff",
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: { fontSize: 9, cellPadding: 2, valign: "middle" },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold" },
      1: { cellWidth: 70 },
      2: { cellWidth: 35 },
      3: { cellWidth: contentWidth - 145, fontStyle: "bold" },
    },
    didParseCell: (cell) => {
      // Highlight the responsable row
      if (cell.section === "body" && cell.row.index === 0) {
        cell.cell.styles.fillColor = "#fef3c7";
      }
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

  // ====================
  // ENCART MÉTÉO SYNTHÉTIQUE
  // ====================
  if (weather) {
    const weatherHeight = 12;
    drawBox(doc, margin, y, contentWidth, weatherHeight, { fill: "#fef3c7", stroke: "#f59e0b", lineWidth: 0.8 });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor("#92400e");
    doc.text(`Conditions : ${weather.conditions || "à vérifier"}  -  Vent ${weather.windSpeed || "N/A"} (raf. ${weather.maxWindSpeed || "N/A"})  -  Houle ${weather.waveHeight || "N/A"} (max ${weather.maxWaveHeight || "N/A"})  -  Temp. ${weather.temperature || "N/A"}°C`, margin + 5, y + 8);
    doc.setTextColor("#000000");

    y += weatherHeight + 3;
  }

  // ====================
  // URGENCE + PROFONDEUR MAX - MISE EN ÉVIDENCE
  // ====================
  // Profondeur max encadrée = limite du niveau du DP (apnea_levels), croisée avec
  // la profondeur max du site si elle est plus restrictive. Même logique que sur
  // les cartes de sortie et la fiche détaillée (OutingCard / OutingDetail).
  const isOpenWater = outingType === "Mer" || outingType === "Étang" || outingType === "Dépollution";
  const organizerMaxDepth = isOpenWater ? organizerMaxDepthEao : organizerMaxDepthEaa;
  const locationMaxDepth = location?.max_depth ?? null;
  const effectiveMaxDepth = organizerMaxDepth && locationMaxDepth
    ? Math.min(organizerMaxDepth, locationMaxDepth)
    : organizerMaxDepth || locationMaxDepth;
  const maxDepthStr = effectiveMaxDepth ? `${effectiveMaxDepth}m` : "N/A";
  const encadrementLabel = isOpenWater ? "EAO" : "EAA";
  const levelLabel = organizerLevelName || organizerLevel || "encadrant";

  const bandHeight = 9;
  const halfWidth = (contentWidth - 4) / 2;

  // Numéros d'urgence (gauche)
  drawBox(doc, margin, y, halfWidth, bandHeight, { fill: "#fee2e2", stroke: "#dc2626", lineWidth: 1.2 });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor("#dc2626");
  doc.text("URGENCE : VHF 16  |  CROSS 196  |  SAMU 15", margin + halfWidth / 2, y + 6, { align: "center" });

  // Profondeur max (droite)
  drawBox(doc, margin + halfWidth + 4, y, halfWidth, bandHeight, { fill: "#fee2e2", stroke: "#dc2626", lineWidth: 1.2 });
  doc.text(`PROFONDEUR MAX (${levelLabel}) : ${maxDepthStr}`, margin + halfWidth + 4 + halfWidth / 2, y + 6, { align: "center" });
  doc.setTextColor("#000000");

  y += bandHeight + 3;

  if (effectiveMaxDepth) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor("#666666");
    const noticeText = `Les apnéistes peuvent avoir des prérogatives personnelles plus profondes, mais dans le cadre d'une activité organisée par le club avec un DP « ${levelLabel} », la zone encadrée doit rester dans la limite ${encadrementLabel} de ${effectiveMaxDepth} m.`;
    const noticeLines = doc.splitTextToSize(noticeText, contentWidth);
    doc.text(noticeLines, margin, y + 2.5);
    y += noticeLines.length * 3 + 3;
    doc.setTextColor("#000000");
  }

  y += 1;

  // ====================
  // B. CARTOGRAPHIE OPÉRATIONNELLE
  // ====================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CARTE SATELLITE & POINTS DE REPÈRE", margin, y);
  y += 5;

  // Satellite map only (bathymetric removed for better readability)
  const maxMapHeight = 62;
  const maxMapWidth = contentWidth;

  // Try to load satellite map
  let satelliteBase64: string | null = null;
  if (location?.satellite_map_url) {
    satelliteBase64 = await getDataUri(location.satellite_map_url);
  }

  if (satelliteBase64) {
    // Preserve the source aspect ratio so the map is not distorted
    let drawWidth = maxMapWidth;
    let drawHeight = maxMapHeight;
    try {
      const props = doc.getImageProperties(satelliteBase64);
      const ratio = props.width / props.height;
      drawWidth = maxMapWidth;
      drawHeight = drawWidth / ratio;
      if (drawHeight > maxMapHeight) {
        drawHeight = maxMapHeight;
        drawWidth = drawHeight * ratio;
      }
    } catch {
      // Fallback to bounding box if properties can't be read
      drawWidth = maxMapWidth;
      drawHeight = maxMapHeight;
    }
    const imgX = margin + (contentWidth - drawWidth) / 2; // center horizontally
    doc.addImage(satelliteBase64, "PNG", imgX, y, drawWidth, drawHeight);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Plan logistique (Satellite)", pageWidth / 2, y + drawHeight + 4, { align: "center" });
    y += drawHeight + 10;
  } else {
    // No map available
    drawBox(doc, margin, y, contentWidth, 25, { fill: "#e5e7eb" });
    doc.setFontSize(10);
    doc.text("Carte satellite non disponible", pageWidth / 2, y + 13, { align: "center" });
    y += 30;
  }

  // Waypoints legend as table
  const diveZones = waypoints.filter(w => w.point_type === "dive_zone");
  const otherWaypoints = waypoints.filter(w => w.point_type !== "dive_zone");

  if (diveZones.length > 0 || otherWaypoints.length > 0) {
    // Keep the whole legend on one page: if it would not fit under the map,
    // move it entirely to a fresh page rather than splitting the table.
    const legendRowCount = diveZones.length + otherWaypoints.length;
    const estimatedLegendHeight = 5 + 8 + legendRowCount * 7; // title + header + rows
    if (y + estimatedLegendHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#000000");
    doc.text("LÉGENDE DES POINTS", margin, y);
    y += 5;

    const waypointRows: string[][] = [];

    // Add dive zones
    diveZones.forEach((zone, idx) => {
      waypointRows.push([
        `Zone ${idx + 1}`,
        zone.name,
        formatGPS(zone.latitude, zone.longitude)
      ]);
    });

    // Add other waypoints
    otherWaypoints.forEach((wp) => {
      waypointRows.push([
        getWaypointLabel(wp.point_type),
        wp.name,
        formatGPS(wp.latitude, wp.longitude)
      ]);
    });

    autoTable(doc, {
      startY: y,
      head: [["Type", "Nom", "Coordonnées GPS"]],
      body: waypointRows,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        font: "courier" // Courier for GPS coordinates
      },
      headStyles: {
        fillColor: "#0369a1",
        textColor: "#ffffff",
        fontStyle: "bold",
        font: "helvetica"
      },
      columnStyles: {
        0: { cellWidth: 35, font: "helvetica", fontStyle: "bold" },
        1: { cellWidth: 50, font: "helvetica" },
        2: { cellWidth: contentWidth - 85, font: "courier" }
      },
      margin: { left: margin, right: margin }
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  // ====================
  // C. MOYENS LOGISTIQUES
  // ====================
  const isBoatMode = diveMode === "boat" && boat;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#0369a1");

  if (isBoatMode) {
    doc.text("SUPPORT SURFACE", margin, y);
    y += 5;

    const boatInfo = [
      ["Bateau", boat.name || "Non spécifié"],
      ["Immatriculation", boat.registration_number || "N/A"],
      ["Pilote", boat.pilot_name || "Non spécifié"],
      ["Tél. Pilote", formatPhone(boat.pilot_phone) || "Non spécifié"],
      ["Emplacement O2", boat.oxygen_location || "À bord"],
      ["Port d'attache", boat.home_port || "N/A"],
    ];

    autoTable(doc, {
      startY: y,
      head: [],
      body: boatInfo,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 35 },
        1: { cellWidth: contentWidth - 35 },
      },
      margin: { left: margin, right: margin },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  doc.setTextColor("#000000");

  // ====================
  // E. TABLEAU DES PLONGEURS (page dédiée)
  // ====================
  doc.addPage();
  y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#0369a1");
  doc.text("LISTE DES PARTICIPANTS", margin, y);
  doc.setTextColor("#000000");

  // Total participants (encadrants inclus)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#666666");
  doc.text(
    `Total : ${participants.length} participant${participants.length > 1 ? "s" : ""}`,
    pageWidth - margin,
    y,
    { align: "right" }
  );
  doc.setTextColor("#000000");
  y += 4;

  // Rôle : on identifie le responsable et les co-encadrants par leur nom (mêmes
  // sources que le bloc ENCADREMENT) afin de les repérer et de les placer en
  // tête du tableau.
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const coNames = new Set(coInstructors.map((c) => norm(c.name)));
  const orgNorm = norm(organizerName);
  const roleOf = (p: POSSParticipant): "RESP." | "Encadrant" | "" => {
    const full = norm(`${p.first_name} ${p.last_name}`);
    const reversed = norm(`${p.last_name} ${p.first_name}`);
    if (full === orgNorm || reversed === orgNorm) return "RESP.";
    if (coNames.has(full) || coNames.has(reversed)) return "Encadrant";
    return "";
  };
  const roleRank = (r: string) => (r === "RESP." ? 0 : r === "Encadrant" ? 1 : 2);

  // La colonne « Groupe » n'est ajoutée que si des groupes ont été composés
  // pour cette sortie, afin de ne pas afficher une colonne vide sinon.
  const hasGroups = participants.some((p) => p.group_number != null);

  // Si des groupes existent : on regroupe les plongeurs par groupe (les non
  // affectés en dernier), et dans chaque groupe l'encadrant apparaît en tête.
  // Sinon : encadrants d'abord (responsable puis co-encadrants), puis les
  // autres plongeurs, chaque groupe conservant son ordre d'origine.
  const sortedParticipants = participants
    .map((p, idx) => ({ p, role: roleOf(p), idx }))
    .sort((a, b) => {
      if (hasGroups) {
        const ga = a.p.group_number ?? Infinity;
        const gb = b.p.group_number ?? Infinity;
        if (ga !== gb) return ga - gb;
      }
      return roleRank(a.role) - roleRank(b.role) || a.idx - b.idx;
    });

  const participantData = sortedParticipants.map(({ p, role }) => {
    const row = [
      role,
      p.last_name?.toUpperCase() || "",
      p.first_name || "",
      p.apnea_level || "-",
      p.emergency_contact_phone
        ? `${p.emergency_contact_name || ""} ${formatPhone(p.emergency_contact_phone)}`.trim()
        : "-",
    ];
    if (hasGroups) {
      row.splice(1, 0, p.group_number ? `Groupe ${p.group_number}` : "—");
    }
    return row;
  });

  const emptyRow = hasGroups
    ? ["", "", "Aucun participant", "", "", ""]
    : ["", "Aucun participant", "", "", ""];
  const head = hasGroups
    ? [["Rôle", "Groupe", "NOM", "Prénom", "Niveau", "Contact Urgence"]]
    : [["Rôle", "NOM", "Prénom", "Niveau", "Contact Urgence"]];
  const columnStyles = hasGroups
    ? {
        0: { cellWidth: 22, fontStyle: "bold" as const, halign: "center" as const },
        1: { cellWidth: 24, fontStyle: "bold" as const, halign: "center" as const },
        2: { cellWidth: 38, fontStyle: "bold" as const },
        3: { cellWidth: 30 },
        4: { cellWidth: 40 },
        5: { cellWidth: "auto" as const },
      }
    : {
        0: { cellWidth: 26, fontStyle: "bold" as const, halign: "center" as const },
        1: { cellWidth: 40, fontStyle: "bold" as const },
        2: { cellWidth: 32 },
        3: { cellWidth: 42 },
        4: { cellWidth: "auto" as const },
      };

  autoTable(doc, {
    startY: y,
    head,
    body: participantData.length > 0 ? participantData : [emptyRow],
    theme: "striped",
    headStyles: {
      fillColor: [14, 165, 233],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles,
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index < sortedParticipants.length) {
        const role = sortedParticipants[data.row.index].role;
        if (role === "RESP.") {
          data.cell.styles.fillColor = "#fef3c7"; // jaune = responsable
          data.cell.styles.fontStyle = "bold";
        } else if (role === "Encadrant") {
          data.cell.styles.fillColor = "#dbeafe"; // bleu = encadrant
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // Légende des couleurs
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor("#666666");
  doc.text("Légende : surligné jaune = Responsable POSS  |  surligné bleu = Encadrant", margin, y);
  doc.setTextColor("#000000");

  // Force new page after participants to maintain consistent layout
  doc.addPage();
  y = margin;

  // ====================
  // G. INVENTAIRE DU MATÉRIEL DE SECOURS (Art. A.322-13 Code du sport)
  // ====================

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#0369a1");
  doc.text("INVENTAIRE DU MATÉRIEL DE SECOURS (Conformité Code du sport)", margin, y);
  y += 5;

  const equipmentData = [
    ["OXYGÉNOTHÉRAPIE", "", ""],
    ["Bouteille O2 médical", "5L / 200 bars", ""],
    ["Détendeur-débitmètre", "15 L/min", ""],
    ["Masque haute concentration", "Adulte + Enfant", ""],
    ["BAVU (insufflateur manuel)", "Adulte", ""],
    ["SECOURISME", "", ""],
    ["Trousse de secours complète", "Couverture survie, désinfectant, pansements, compresses", ""],
    ["Aspirine 500mg", "Sachet de 10", ""],
    ["Eau douce (rinçage)", "5L minimum", ""],
    ["Fiche d'évacuation POSS", "Pré-remplie", ""],
    ["COMMUNICATION & SÉCURITÉ", "", ""],
    ["Radio VHF portable", "Testée + Batterie OK", ""],
    ["Téléphone portable", "Chargé + Crédit", ""],
    ["Pavillon Alpha / Bouée signalisation", "Visible (bateau/côte)", ""],
  ];

  // Rows that are section headers (no specs / no checkbox)
  const sectionRowIndices = new Set([0, 5, 10]);

  autoTable(doc, {
    startY: y,
    head: [["Matériel", "Spécifications", "Coché"]],
    body: equipmentData,
    theme: "grid",
    headStyles: {
      fillColor: "#0369a1",
      textColor: "#ffffff",
      fontStyle: "bold",
      fontSize: 9,
      halign: "center"
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      lineColor: "#94a3b8",
      lineWidth: 0.2,
      valign: "middle"
    },
    columnStyles: {
      0: { cellWidth: 75, fontStyle: "bold", halign: "left" },
      1: { cellWidth: contentWidth - 100, halign: "left" },
      2: { cellWidth: 20, halign: "center" }
    },
    didParseCell: (data) => {
      // Section headers styling
      if (sectionRowIndices.has(data.row.index)) {
        data.cell.styles.fillColor = "#dbeafe";
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9;
        data.cell.styles.textColor = "#1e40af";
      }
    },
    didDrawCell: (data) => {
      // Draw a real checkbox square in the third column (skip section headers)
      if (
        data.section === "body" &&
        data.column.index === 2 &&
        !sectionRowIndices.has(data.row.index)
      ) {
        const size = 4;
        const cx = data.cell.x + data.cell.width / 2 - size / 2;
        const cy = data.cell.y + data.cell.height / 2 - size / 2;
        doc.setDrawColor("#334155");
        doc.setLineWidth(0.4);
        doc.rect(cx, cy, size, size, "S");
      }
    },
    margin: { left: margin, right: margin }
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ====================
  // H. PROCÉDURE D'ALERTE INTERNE (Annexe III-10)
  // ====================

  // Check if we need a new page
  if (y + 65 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#dc2626");
  doc.text("PROCÉDURE D'ALERTE INTERNE - QUI FAIT QUOI ? (Annexe III-10 Code du sport)", margin, y);
  y += 5;

  const procedureData = [
    ["PHASE 1", "RÉCUPÉRATION & MISE EN SÉCURITÉ", "• Binôme sécurité : Récupération immédiate de la victime\n• Sortie de l'eau en urgence\n• Allonger la victime sur surface plane et stable"],
    ["PHASE 2", "OXYGÉNATION & BILAN VITAL", "• Membre formé PSE1/PSE2 : Mise sous O2 (15 L/min, masque haute concentration)\n• Contrôle conscience : Victime répond ? Respire normalement ?\n• Si inconscient : PLS + Alerte immédiate\n• Si arrêt respiratoire : RCP + DAE"],
    ["PHASE 3", "DÉCLENCHEMENT DE L'ALERTE", "• Responsable POSS ou personne désignée :\n  - CROSS via VHF Canal 16 ou Tél 196\n  - ou SAMU 15\n• Utiliser le script d'appel (voir ci-dessous)\n• Communiquer GPS SITE (URGENCE)"],
    ["PHASE 4", "GUIDAGE & ACCUEIL SECOURS", "• Membre au point d'accès : Guider les secours vers le site\n• GPS communiqué : " + formatGPS(location?.latitude ?? null, location?.longitude ?? null) + "\n• Préparer fiche d'évacuation + Matériel médical\n• Maintenir l'oxygénation jusqu'à relève par secours"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Phase", "Action", "Détails opérationnels"]],
    body: procedureData,
    theme: "grid",
    headStyles: {
      fillColor: "#dc2626",
      textColor: "#ffffff",
      fontStyle: "bold",
      fontSize: 9
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: "#fca5a5",
      lineWidth: 0.3,
      valign: "top"
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: "bold", halign: "center", fillColor: "#fee2e2" },
      1: { cellWidth: 60, fontStyle: "bold" },
      2: { cellWidth: contentWidth - 82, halign: "left" }
    },
    margin: { left: margin, right: margin }
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ====================
  // SCRIPT D'ALERTE (FIN DU DOCUMENT)
  // ====================
  const scriptHeight = 35;

  // Force new page if needed
  if (y + scriptHeight > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }

  drawBox(doc, margin, y, contentWidth, scriptHeight, { fill: "#fef2f2", stroke: "#dc2626", lineWidth: 1.5 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#dc2626");
  doc.text("SCRIPT D'APPEL EN CAS D'URGENCE", margin + 5, y + 6);

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor("#000000");
  const callerName = boat?.name || organizerName.split(" ")[0].toUpperCase();
  const scriptLines = [
    `"ICI ${callerName}. Position : ${formatGPS(location?.latitude ?? null, location?.longitude ?? null)}.`,
    `Nature : ACCIDENT APNÉE. Victime : [Âge]. Conscience : [OUI/NON].`,
    `Je demande une ÉVACUATION MÉDICALE."`,
  ];
  let scriptY = y + 12;
  scriptLines.forEach((line) => {
    doc.text(line, margin + 5, scriptY);
    scriptY += 5;
  });

  // ====================
  // PAGE CARTE EN GRAND (fin du document)
  // ====================
  if (satelliteBase64) {
    doc.addPage();
    let mapPageY = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor("#0369a1");
    doc.text("CARTE SATELLITE (VUE DÉTAILLÉE)", pageWidth / 2, mapPageY + 2, { align: "center" });
    doc.setTextColor("#000000");
    mapPageY += 8;

    const availW = contentWidth;
    const availH = pageHeight - mapPageY - margin;
    let bigW = availW;
    let bigH = availH;
    try {
      const props = doc.getImageProperties(satelliteBase64);
      const ratio = props.width / props.height;
      bigW = availW;
      bigH = bigW / ratio;
      if (bigH > availH) {
        bigH = availH;
        bigW = bigH * ratio;
      }
    } catch {
      bigW = availW;
      bigH = availH;
    }
    const bigX = margin + (contentWidth - bigW) / 2;
    const bigY = mapPageY + (availH - bigH) / 2; // center vertically
    doc.addImage(satelliteBase64, "PNG", bigX, bigY, bigW, bigH);
  }

  // ====================
  // Save PDF
  // ====================
  const siteName = location?.name?.replace(/\s+/g, "_") || "Sortie";
  const fileName = `POSS_${siteName}_${format(new Date(outingDateTime), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
};
