import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Waypoint, getWaypointLabel } from "@/hooks/useWaypoints";
import logoTeamOxygen from "@/assets/logo-team-oxygen-transparent.png";

// Types for POSS generation
export interface POSSParticipant {
  first_name: string;
  last_name: string;
  apnea_level: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
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

export interface POSSData {
  outingTitle: string;
  outingDateTime: string;
  outingLocation: string;
  diveMode: "boat" | "shore" | null;
  location: POSSLocation | null;
  boat: POSSBoat | null;
  waypoints: Waypoint[];
  participants: POSSParticipant[];
  organizerName: string;
  organizerLevel: string | null;
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

// Helper: Get max depth based on instructor level (FSGT)
const getMaxDepthForLevel = (apneaLevel: string | null): number | null => {
  if (!apneaLevel) return null;

  const level = apneaLevel.toUpperCase().trim();

  // FSGT levels - profondeur max autorisée pour l'encadrement
  if (level.includes("EA1")) return 6;
  if (level.includes("EA2")) return 15;  // ⚠️ EA2 = 15m (pas 20m)
  if (level.includes("EA3")) return 40;
  if (level.includes("EA4")) return 60;

  // FFESSM levels (if needed)
  if (level.includes("E1")) return 20;
  if (level.includes("E2")) return 40;
  if (level.includes("E3") || level.includes("E4")) return 60;

  return null;
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
  const { outingTitle, outingDateTime, outingLocation, diveMode, location, boat, waypoints, participants, organizerName, organizerLevel, waterEntryTime, waterExitTime, weather } = data;
  
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
  const headerHeight = 22;
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
    ? `Mise à l'eau : ${waterEntryTime} | Sortie : ${waterExitTime} | Durée : ${sessionDuration}`
    : "Horaires non définis";

  doc.text(`Date : ${dateStr}  |  Lieu : ${location?.name || outingLocation}`, margin + 22, y + 12);
  doc.setFontSize(7.5);
  doc.text(sessionTimeInfo, margin + 22, y + 15.5);

  // Numéros d'urgence dans le bandeau
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor("#dc2626");
  doc.text("URGENCE : VHF 16 | CROSS 196 | SAMU 15", margin + 22, y + 19);
  doc.setTextColor("#000000");

  // Responsable et date de génération (top right)
  doc.setTextColor("#dc2626");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Responsable : ${organizerName}`, pageWidth - margin - 55, y + 12);

  doc.setTextColor("#666666");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`, pageWidth - margin - 55, y + 16);
  doc.setTextColor("#000000");

  y += headerHeight + 3;

  // ====================
  // ENCART MÉTÉO SYNTHÉTIQUE
  // ====================
  if (weather) {
    const weatherHeight = 12;
    drawBox(doc, margin, y, contentWidth, weatherHeight, { fill: "#fef3c7", stroke: "#f59e0b", lineWidth: 0.8 });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor("#92400e");
    doc.text(`⚠ ${weather.conditions || "Conditions défavorables"} — Vent ${weather.windSpeed || "N/A"} (raf. ${weather.maxWindSpeed || "N/A"}) ≈ Houle ${weather.waveHeight || "N/A"} (max ${weather.maxWaveHeight || "N/A"}) 🌡 ${weather.temperature || "N/A"}°`, margin + 5, y + 8);
    doc.setTextColor("#000000");

    y += weatherHeight + 3;
  }

  // ====================
  // PROFONDEUR MAX - MISE EN ÉVIDENCE
  // ====================
  const maxDepth = getMaxDepthForLevel(organizerLevel);
  const maxDepthStr = maxDepth ? `${maxDepth}m` : "N/A";

  drawBox(doc, margin, y, contentWidth, 8, { fill: "#fee2e2", stroke: "#dc2626", lineWidth: 1.2 });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor("#dc2626");
  doc.text(`PROFONDEUR MAX (basée sur ${organizerLevel || "niveau encadrant"}) : ${maxDepthStr}`, pageWidth / 2, y + 5.5, { align: "center" });
  doc.setTextColor("#000000");

  y += 11;

  // ====================
  // B. CARTOGRAPHIE OPÉRATIONNELLE
  // ====================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CARTE SATELLITE & POINTS DE REPÈRE", margin, y);
  y += 5;

  // Satellite map only (bathymetric removed for better readability)
  const mapHeight = 65;
  const mapWidth = contentWidth;

  // Try to load satellite map
  let satelliteBase64: string | null = null;
  if (location?.satellite_map_url) {
    satelliteBase64 = await getDataUri(location.satellite_map_url);
  }

  if (satelliteBase64) {
    doc.addImage(satelliteBase64, "PNG", margin, y, mapWidth, mapHeight);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Plan logistique (Satellite)", pageWidth / 2, y + mapHeight + 4, { align: "center" });
    y += mapHeight + 10;
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
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
      ["Tél. Pilote", boat.pilot_phone || "Non spécifié"],
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
  // E. TABLEAU DES PLONGEURS
  // ====================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("LISTE DES PARTICIPANTS", margin, y);
  y += 3;

  // Helper to check if level is encadrant (EA1, EA2, EA3, EA4, E1, E2, E3, E4)
  const isEncadrant = (level: string | null): boolean => {
    if (!level) return false;
    const levelUpper = level.toUpperCase().trim();
    return /EA[1-4]|E[1-4]/.test(levelUpper);
  };

  const participantData = participants.map((p) => [
    p.last_name?.toUpperCase() || "",
    p.first_name || "",
    p.apnea_level || "-",
    p.emergency_contact_phone ? `${p.emergency_contact_name || ""} ${p.emergency_contact_phone}` : "-",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["NOM", "Prénom", "Niveau", "Contact Urgence"]],
    body: participantData.length > 0 ? participantData : [["Aucun participant", "", "", ""]],
    theme: "striped",
    headStyles: {
      fillColor: [14, 165, 233],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: "bold" },
      1: { cellWidth: 30 },
      2: { cellWidth: 45 },
      3: { cellWidth: contentWidth - 110 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index < participants.length) {
        const participant = participants[data.row.index];
        const participantFullName = `${participant.first_name} ${participant.last_name}`;

        // Highlight organizer (responsable)
        if (participantFullName.toLowerCase().includes(organizerName.toLowerCase().split(' ')[0]) ||
            organizerName.toLowerCase().includes(participant.last_name?.toLowerCase() || '')) {
          data.cell.styles.fillColor = "#fef3c7"; // Light yellow
          data.cell.styles.fontStyle = "bold";
          if (data.column.index === 2) {
            data.cell.text = [`⭐ ${data.cell.text[0]}`];
          }
        }
        // Highlight encadrants
        else if (isEncadrant(participant.apnea_level)) {
          data.cell.styles.fillColor = "#dbeafe"; // Light blue
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Force new page after participants to maintain consistent 4-page layout
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

  autoTable(doc, {
    startY: y,
    head: [["Matériel", "Spécifications", "✓"]],
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
      2: { cellWidth: 20, halign: "center", fontSize: 12 }
    },
    didParseCell: (data) => {
      // Section headers styling
      if (data.row.index === 0 || data.row.index === 5 || data.row.index === 10) {
        data.cell.styles.fillColor = "#dbeafe";
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9;
        data.cell.styles.textColor = "#1e40af";
      }

      // Add checkbox in third column for non-header rows
      if (data.column.index === 2 && data.row.index !== 0 && data.row.index !== 5 && data.row.index !== 10) {
        data.cell.text = ["☐"];
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
  // Save PDF
  // ====================
  const siteName = location?.name?.replace(/\s+/g, "_") || "Sortie";
  const fileName = `POSS_${siteName}_${format(new Date(outingDateTime), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
};
