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
}

export interface POSSBoat {
  name: string;
  registration_number: string | null;
  pilot_name: string | null;
  pilot_phone: string | null;
  oxygen_location: string | null;
  home_port: string | null;
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

// Helper: Extract max depth from apnea level prerogatives
const getMaxDepth = (apneaLevel: string | null): string => {
  if (!apneaLevel) return "N/A";

  // Extract depth from prerogatives (e.g., "-20m", "-30 à -40m", etc.)
  const depthMatch = apneaLevel.match(/-(\d+)m/);
  if (depthMatch) {
    return depthMatch[1] + "m";
  }

  // Check for specific levels with known depths
  const levelDepths: Record<string, string> = {
    'E1': '20m',
    'E2': '30m',
    'E3': '40m',
    'E4': '40m',
    'BPJEPS': '30m',
    'DEJEPS': '40m',
    'AIDA Instructor': '30m',
  };

  for (const [key, depth] of Object.entries(levelDepths)) {
    if (apneaLevel.includes(key)) {
      return depth;
    }
  }

  return "N/A";
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
  const { outingTitle, outingDateTime, outingLocation, diveMode, location, boat, waypoints, participants, organizerName, organizerLevel, waterEntryTime, waterExitTime } = data;

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
  // A. EN-TÊTE INSTITUTIONNEL
  // ====================
  const headerHeight = 35;
  drawBox(doc, margin, y, contentWidth, headerHeight, { fill: "#f3f4f6" });

  // Logo (left)
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin + 3, y + 3, 25, 25);
  }

  // Title (center)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#000000");
  doc.text("PLAN D'ORGANISATION", pageWidth / 2, y + 10, { align: "center" });
  doc.text("DES SECOURS (P.O.S.S.)", pageWidth / 2, y + 17, { align: "center" });

  // Session info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const dateStr = format(new Date(outingDateTime), "EEEE d MMMM yyyy", { locale: fr });
  doc.text(`Date : ${dateStr}`, margin + 35, y + 25);
  doc.text(`Lieu : ${location?.name || outingLocation}`, margin + 35, y + 30);
  
  // Organizer in red
  doc.setTextColor("#dc2626");
  doc.setFont("helvetica", "bold");
  doc.text(`Responsable : ${organizerName}`, pageWidth - margin - 60, y + 27);
  doc.setTextColor("#000000");

  y += headerHeight + 8;

  // ====================
  // B. CARTOGRAPHIE OPÉRATIONNELLE
  // ====================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ZONES D'ÉVOLUTION & LOCALISATION", margin, y);
  y += 6;

  // GPS CRITICAL BOX (High visibility)
  if (location?.latitude && location?.longitude) {
    drawBox(doc, margin, y, contentWidth, 12, { fill: "#fef3c7", stroke: "#f59e0b", lineWidth: 1 });
    doc.setFont("courier", "bold");
    doc.setFontSize(14);
    doc.setTextColor("#b45309");
    doc.text(`GPS SITE (URGENCE) : ${formatGPS(location.latitude, location.longitude)}`, margin + 5, y + 8);
    doc.setTextColor("#000000");
    y += 16;
  }

  // Satellite map - full width (no bathymetric map)
  const mapHeight = 70;
  const mapWidth = contentWidth * 0.55; // Use 55% of width for map, leaving space for legend

  // Try to load satellite map
  let satelliteBase64: string | null = null;
  if (location?.satellite_map_url) {
    satelliteBase64 = await getDataUri(location.satellite_map_url);
  }

  if (satelliteBase64) {
    doc.addImage(satelliteBase64, "PNG", margin, y, mapWidth, mapHeight);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Plan logistique (Satellite)", margin + mapWidth / 2, y + mapHeight + 4, { align: "center" });
  } else {
    drawBox(doc, margin, y, mapWidth, mapHeight, { fill: "#e5e7eb" });
    doc.setFontSize(10);
    doc.text("Carte satellite non disponible", margin + mapWidth / 2, y + mapHeight / 2, { align: "center" });
  }

  // Waypoints legend table (to the right of the map)
  const legendX = margin + mapWidth + 5;
  const legendWidth = contentWidth - mapWidth - 5;
  const legendY = y;

  const diveZones = waypoints.filter(w => w.point_type === "dive_zone");
  const otherWaypoints = waypoints.filter(w => w.point_type !== "dive_zone");

  if (diveZones.length > 0 || otherWaypoints.length > 0) {
    const legendData = [];

    if (diveZones.length > 0) {
      diveZones.forEach((zone, idx) => {
        legendData.push([
          `Zone ${idx + 1}`,
          zone.name,
          formatGPS(zone.latitude, zone.longitude)
        ]);
      });
    }

    if (otherWaypoints.length > 0) {
      otherWaypoints.forEach((wp) => {
        legendData.push([
          getWaypointLabel(wp.point_type),
          wp.name,
          formatGPS(wp.latitude, wp.longitude)
        ]);
      });
    }

    autoTable(doc, {
      startY: legendY,
      head: [["Type", "Nom", "Coordonnées GPS"]],
      body: legendData,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: legendWidth * 0.25 },
        1: { cellWidth: legendWidth * 0.35 },
        2: { cellWidth: legendWidth * 0.4 },
      },
      margin: { left: legendX, right: margin },
      tableWidth: legendWidth,
    });
  }

  y += mapHeight + 10;

  // ====================
  // C. PROCÉDURE D'URGENCE
  // ====================
  const emergencyHeight = 45;
  drawBox(doc, margin, y, contentWidth, emergencyHeight, { fill: "#fef2f2", stroke: "#dc2626", lineWidth: 1.5 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor("#dc2626");
  doc.text("PROCÉDURE D'ALERTE", margin + 5, y + 7);
  
  doc.setFontSize(11);
  doc.setTextColor("#000000");
  doc.text("VHF : Canal 16  |  CROSS : 196  |  SAMU : 15", margin + 5, y + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("SCRIPT D'APPEL :", margin + 5, y + 21);

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  const callerName = boat?.name || organizerName.split(" ")[0].toUpperCase();
  const scriptLines = [
    `"ICI ${callerName}. Position : ${formatGPS(location?.latitude ?? null, location?.longitude ?? null)}.`,
    `Nature : ACCIDENT APNÉE. Victime : [Âge]. Conscience : [OUI/NON].`,
    `Je demande une ÉVACUATION MÉDICALE."`,
  ];
  let scriptY = y + 26;
  scriptLines.forEach((line) => {
    doc.text(line, margin + 5, scriptY);
    scriptY += 4;
  });

  y += emergencyHeight + 5;

  // ====================
  // D. MOYENS LOGISTIQUES
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
  } else {
    doc.text("ACCÈS TERRE", margin, y);
    y += 5;
    doc.setTextColor("#000000");

    const parkingWp = waypoints.find(w => w.point_type === "parking");
    const exitWp = waypoints.find(w => w.point_type === "water_exit");

    const shoreInfo = [
      ["Parking", parkingWp ? `${parkingWp.name} (${formatGPS(parkingWp.latitude, parkingWp.longitude)})` : "Non défini"],
      ["Point évacuation", exitWp ? `${exitWp.name} (${formatGPS(exitWp.latitude, exitWp.longitude)})` : location?.maps_url || "Non défini"],
    ];

    autoTable(doc, {
      startY: y,
      head: [],
      body: shoreInfo,
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
  // E. PROFONDEUR MAX & HORAIRES SESSION
  // ====================
  const maxDepth = getMaxDepth(organizerLevel);
  const duration = calculateDuration(waterEntryTime, waterExitTime);

  // Big depth display
  drawBox(doc, margin, y, contentWidth * 0.3, 25, { fill: "#dbeafe", stroke: "#0369a1", lineWidth: 2 });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor("#0369a1");
  doc.text(`PROFONDEUR MAX : ${maxDepth}`, margin + contentWidth * 0.15, y + 10, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor("#64748b");
  doc.text(`(Basée sur le niveau encadrant: ${organizerLevel || 'N/A'})`, margin + contentWidth * 0.15, y + 17, { align: "center" });

  // Session times
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor("#000000");
  const timeX = margin + contentWidth * 0.32;
  doc.text(`Heure de mise à l'eau : ${waterEntryTime || 'N/A'}`, timeX, y + 10);
  doc.text(`Heure de sortie prévue : ${waterExitTime || 'N/A'}`, timeX, y + 16);
  doc.setFont("helvetica", "bold");
  doc.text(`Durée théorique session : ${duration}`, timeX, y + 22);
  doc.setFont("helvetica", "normal");

  y += 30;

  // ====================
  // F. TABLEAU DES PLONGEURS
  // ====================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("LISTE DES PARTICIPANTS", margin, y);
  y += 3;

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
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      3: { cellWidth: 70 },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ====================
  // F. CHECK-LIST DE SÉCURITÉ
  // ====================
  const checklistItems = [
    "Oxygène (Pression > 100b + Masque)",
    "Trousse de Secours Complète",
    "VHF Testée / Batterie OK + Tél Chargé",
    "Pavillon Alpha (Visibilité)",
    "Eau Potable / Hydratation",
    "Check Matériel Membres (Longe, Plombs...)",
    "Constitution des Binômes",
    "Speech Sécurité (Briefing effectué)",
  ];

  const checklistHeight = 55;

  // Check if we need a new page
  if (y + checklistHeight > pageHeight - 30) {
    doc.addPage();
    y = margin;
  }

  drawBox(doc, margin, y, contentWidth, checklistHeight, { fill: "#f0fdf4", stroke: "#22c55e", lineWidth: 1 });
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#166534");
  doc.text("VÉRIFICATIONS AVANT DÉPART", margin + 5, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#000000");

  let checkY = y + 14;
  const colWidth = (contentWidth - 10) / 2;

  checklistItems.forEach((item, idx) => {
    const col = idx < 4 ? 0 : 1;
    const row = idx % 4;
    const checkX = margin + 5 + col * colWidth;
    const itemY = checkY + row * 9;

    // Draw checkbox (well-defined for manual checking)
    const checkBoxSize = 5;
    drawBox(doc, checkX, itemY - 3.5, checkBoxSize, checkBoxSize, { lineWidth: 0.8 });

    doc.text(item, checkX + 7, itemY);
  });

  y += checklistHeight + 8;

  // Signature line
  if (y + 15 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Signature du Responsable :", margin, y);
  doc.line(margin + 45, y, margin + 100, y);
  
  doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`, pageWidth - margin - 50, y);

  // ====================
  // Save PDF
  // ====================
  const siteName = location?.name?.replace(/\s+/g, "_") || "Sortie";
  const fileName = `POSS_${siteName}_${format(new Date(outingDateTime), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
};
