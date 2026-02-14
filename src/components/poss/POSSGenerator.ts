import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Waypoint, getWaypointLabel } from "@/hooks/useWaypoints";
import logoTeamOxygen from "@/assets/logo-team-oxygen.webp";

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
  organizerApneaLevel?: string | null;
  waterEntryTime?: string;
  expectedExitTime?: string;
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

  // FSGT levels
  if (level.includes("EA1")) return 6;
  if (level.includes("EA2")) return 20;
  if (level.includes("EA3")) return 40;
  if (level.includes("EA4")) return 60;

  // FFESSM levels (if needed)
  if (level.includes("E1")) return 20;
  if (level.includes("E2")) return 40;
  if (level.includes("E3") || level.includes("E4")) return 60;

  return null;
};

// Main POSS Generator
export const generatePOSS = async (data: POSSData): Promise<void> => {
  const { outingTitle, outingDateTime, outingLocation, diveMode, location, boat, waypoints, participants, organizerName, organizerApneaLevel, waterEntryTime, expectedExitTime } = data;
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
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
  // A. EN-TÊTE INSTITUTIONNEL (COMPACT)
  // ====================
  const headerHeight = 28;
  drawBox(doc, margin, y, contentWidth, headerHeight, { fill: "#f3f4f6" });

  // Logo (left - smaller)
  if (logoBase64) {
    doc.addImage(logoBase64, "WEBP", margin + 2, y + 2, 18, 18);
  }

  // Title (center - one line)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor("#000000");
  doc.text("PLAN D'ORGANISATION DES SECOURS (P.O.S.S.)", pageWidth / 2, y + 7, { align: "center" });

  // Session info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const dateStr = format(new Date(outingDateTime), "EEEE d MMMM yyyy", { locale: fr });
  doc.text(`Date : ${dateStr}`, margin + 25, y + 13);
  doc.text(`Lieu : ${location?.name || outingLocation}`, margin + 25, y + 17);

  // Horaires et profondeur basée sur le niveau de l'encadrant
  const maxDepth = getMaxDepthForLevel(organizerApneaLevel);
  const maxDepthStr = maxDepth ? `${maxDepth}m` : "N/A";
  doc.text(`Profondeur max (basée sur ${organizerApneaLevel || "niveau encadrant"}) : ${maxDepthStr}`, margin + 25, y + 21);

  if (waterEntryTime) {
    doc.text(`Heure mise à l'eau : ${waterEntryTime}`, margin + 25, y + 25);
  }

  // Organizer in red (top right)
  doc.setTextColor("#dc2626");
  doc.setFont("helvetica", "bold");
  doc.text(`Responsable : ${organizerName}`, pageWidth - margin - 55, y + 15);
  doc.setTextColor("#000000");

  y += headerHeight + 5;

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

  // Maps side by side
  const mapHeight = 55;
  const mapWidth = (contentWidth - 5) / 2;

  // Try to load satellite map
  let satelliteBase64: string | null = null;
  if (location?.satellite_map_url) {
    satelliteBase64 = await getDataUri(location.satellite_map_url);
  }

  // Try to load bathymetric map
  let bathyBase64: string | null = null;
  if (location?.bathymetric_map_url) {
    bathyBase64 = await getDataUri(location.bathymetric_map_url);
  }

  if (satelliteBase64 || bathyBase64) {
    // Draw maps
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

    if (bathyBase64) {
      doc.addImage(bathyBase64, "PNG", margin + mapWidth + 5, y, mapWidth, mapHeight);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Carte bathymétrique (SHOM)", margin + mapWidth + 5 + mapWidth / 2, y + mapHeight + 4, { align: "center" });
    } else {
      drawBox(doc, margin + mapWidth + 5, y, mapWidth, mapHeight, { fill: "#e5e7eb" });
      doc.setFontSize(10);
      doc.text("Carte marine non disponible", margin + mapWidth + 5 + mapWidth / 2, y + mapHeight / 2, { align: "center" });
    }
    y += mapHeight + 10;
  } else {
    // No maps available
    drawBox(doc, margin, y, contentWidth, 25, { fill: "#e5e7eb" });
    doc.setFontSize(10);
    doc.text("Visuels cartographiques non disponibles", pageWidth / 2, y + 13, { align: "center" });
    y += 30;
  }

  // Waypoints legend
  const diveZones = waypoints.filter(w => w.point_type === "dive_zone");
  const otherWaypoints = waypoints.filter(w => w.point_type !== "dive_zone");

  if (diveZones.length > 0 || otherWaypoints.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Légende des points :", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    if (diveZones.length > 0) {
      diveZones.forEach((zone, idx) => {
        doc.text(`${idx + 1}. ${zone.name} (${formatGPS(zone.latitude, zone.longitude)})`, margin + 5, y);
        y += 3.5;
      });
    }
    
    if (otherWaypoints.length > 0) {
      otherWaypoints.forEach((wp) => {
        doc.text(`${getWaypointLabel(wp.point_type)} : ${wp.name} (${formatGPS(wp.latitude, wp.longitude)})`, margin + 5, y);
        y += 3.5;
      });
    }
    y += 3;
  }

  // ====================
  // C. NUMÉROS D'URGENCE
  // ====================
  const emergencyHeight = 12;
  drawBox(doc, margin, y, contentWidth, emergencyHeight, { fill: "#fef2f2", stroke: "#dc2626", lineWidth: 1.5 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#dc2626");
  doc.text("NUMÉROS D'URGENCE", margin + 5, y + 5);

  doc.setFontSize(10);
  doc.setTextColor("#000000");
  doc.text("VHF : Canal 16  |  CROSS : 196  |  SAMU : 15", margin + 5, y + 9);

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
  // E. TABLEAU DES PLONGEURS
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
    "", // Heure mise à l'eau
    "", // Heure sortie
  ]);

  autoTable(doc, {
    startY: y,
    head: [["NOM", "Prénom", "Niveau", "Contact Urgence", "H. Mise à l'eau", "H. Sortie"]],
    body: participantData.length > 0 ? participantData : [["Aucun participant", "", "", "", "", ""]],
    theme: "striped",
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20 },
      3: { cellWidth: 50 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
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

    // Draw checkbox
    drawBox(doc, checkX, itemY - 3, 4, 4);
    doc.text(item, checkX + 6, itemY);
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

  y += 10;

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
