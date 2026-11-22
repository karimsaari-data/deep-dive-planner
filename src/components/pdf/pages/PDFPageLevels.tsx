import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFFishLevel, PDFStats } from "@/hooks/usePDFReportData";
import { formatPeriod } from "../period";


interface PDFPageLevelsProps {
  levels: PDFFishLevel[];
  stats: PDFStats;
  year: number;
  pageNumber?: number;
}

const COLORS: Record<string, string> = {
  Inactif: "#9ca3af",
  Castagnole: "#60a5fa",
  Crabe: "#22d3ee",
  Méduse: "#ef4444",
  Poulpe: "#d946ef",
  Dauphin: "#1e3a5f",
  Requin: "#f59e0b",
};

export const PDFPageLevels = ({ levels, stats, year, pageNumber }: PDFPageLevelsProps) => {
  const total = levels.reduce((sum, l) => sum + l.count, 0);
  const maxCount = Math.max(...levels.map(l => l.count), 1);
  const active = levels.filter(l => l.min > 0).reduce((sum, l) => sum + l.count, 0);

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <span style={{ fontSize: "28px" }}>🐬</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e3a5f", margin: 0 }}>
            Niveaux des adhérents {year}
          </h1>
        </div>
        <p style={{ fontSize: "14px", color: "#666666", margin: "0 0 24px 0", lineHeight: "20px" }}>
          Niveau selon le nombre de sorties {formatPeriod(stats)} (application en service depuis mai) · {total} adhérents saison {stats.seasonYear - 1}-{stats.seasonYear}
          {" "}· dont {active} actifs
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {levels.map((l) => {
            const color = COLORS[l.name] || "#1e3a5f";
            const pct = total > 0 ? Math.round((l.count / total) * 100) : 0;
            const range = l.max === null ? `${l.min}+ sorties` : l.min === l.max ? `${l.min} sortie` : `${l.min}-${l.max} sorties`;
            return (
              <div
                key={l.name}
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "16px",
                  padding: "10px 16px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  height: "52px",
                  boxSizing: "border-box",
                }}
              >
                <span style={{ fontSize: "24px", width: "36px", height: "32px", lineHeight: "32px" }}>{l.emoji}</span>
                <div style={{ width: "150px", height: "32px" }}>
                  <div style={{ fontSize: "15px", fontWeight: "600", lineHeight: "18px", color: "#1a1a1a" }}>{l.name}</div>
                  <div style={{ fontSize: "11px", lineHeight: "14px", color: "#666666" }}>{range}</div>
                </div>
                <div style={{ flex: 1, height: "22px", marginBottom: "5px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${(l.count / maxCount) * 100}%`, height: "100%", backgroundColor: color, borderRadius: "4px" }} />
                </div>
                <span style={{ width: "50px", textAlign: "right", fontSize: "20px", fontWeight: "700", lineHeight: "28px", color }}>{l.count}</span>
                <span style={{ width: "50px", textAlign: "right", fontSize: "13px", lineHeight: "28px", color: "#666666" }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </PDFPageWrapper>
  );
};
