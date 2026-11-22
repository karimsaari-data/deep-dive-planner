import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFEquipmentItem } from "@/hooks/usePDFReportData";

interface PDFPageEquipmentProps {
  equipment: {
    items: PDFEquipmentItem[];
    totalValue: number;
  };
  pageNumber?: number;
}

export const PDFPageEquipment = ({ equipment, pageNumber }: PDFPageEquipmentProps) => {
  const maxValue = Math.max(...equipment.items.map(e => e.totalValue), 1);

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <span style={{ fontSize: "28px" }}>🎒</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e3a5f", margin: 0 }}>
            Parc Matériel & Valorisation
          </h1>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div style={{ padding: "12px 48px", backgroundColor: "#ecfdf5", borderRadius: "16px", border: "3px solid #059669", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "#166534", margin: "0 0 8px 0" }}>Valeur Totale du Parc</p>
            <p style={{ fontSize: "40px", lineHeight: "48px", fontWeight: "700", color: "#059669", margin: 0 }}>
              {equipment.totalValue.toLocaleString("fr-FR")} €
            </p>
            <p style={{ fontSize: "12px", color: "#666666", margin: "8px 0 0 0" }}>Valeur de remplacement estimée</p>
          </div>
        </div>

        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 10px 0" }}>
          Top 15 des équipements par valeur
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {equipment.items.slice(0, 15).map((item, index) => (
            <div key={item.name + index} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "12px", lineHeight: "20px", color: "#666666", width: "180px", display: "block", whiteSpace: "nowrap" }}>
                {item.name}
              </span>
              <span style={{ fontSize: "11px", lineHeight: "20px", color: "#999999", width: "50px" }}>x{item.quantity}</span>
              <div style={{ flex: 1, height: "20px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${(item.totalValue / maxValue) * 100}%`, height: "100%", backgroundColor: index < 3 ? "#059669" : "#0891b2", borderRadius: "4px" }} />
              </div>
              <span style={{ fontSize: "12px", lineHeight: "20px", fontWeight: "600", color: "#1a1a1a", width: "80px", textAlign: "right" }}>
                {item.totalValue.toLocaleString("fr-FR")} €
              </span>
            </div>
          ))}
        </div>
      </div>
    </PDFPageWrapper>
  );
};
