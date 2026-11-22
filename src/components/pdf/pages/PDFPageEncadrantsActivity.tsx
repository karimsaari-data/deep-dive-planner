import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFStaffStats, PDFStats } from "@/hooks/usePDFReportData";
import { formatPeriod, periodLabel } from "../period";


interface PDFPageEncadrantsActivityProps {
  staff: PDFStaffStats;
  stats: PDFStats;
  year: number;
  pageNumber?: number;
}

const COLOR_OUTINGS = "#0891b2";
const COLOR_STAFF = "#f08814";

const fmtNum = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

// Courbe lissée (Catmull-Rom -> Bézier) en SVG, rendu fiable avec html2canvas
const smoothPath = (pts: { x: number; y: number }[]): string => {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    // Points de contrôle bornés entre les deux valeurs : pas de dépassement sous zéro
    const c1y = Math.min(hi, Math.max(lo, p1.y + (p2.y - p0.y) / 6));
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = Math.min(hi, Math.max(lo, p2.y - (p3.y - p1.y) / 6));
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
};

const LineChart = ({ staff }: { staff: PDFStaffStats }) => {
  const W = 1020;
  const H = 290;
  const padL = 40, padR = 20, padT = 30, padB = 40;
  const months = staff.monthly;
  const maxVal = Math.max(...months.flatMap((m) => [m.outings, m.encadrants]), 1);
  const yMax = Math.ceil(maxVal * 1.15);
  const x = (i: number) => padL + (months.length === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (months.length - 1));
  const y = (v: number) => padT + (1 - v / yMax) * (H - padT - padB);
  const series = [
    { key: "outings" as const, color: COLOR_OUTINGS, labelDy: -10 },
    { key: "encadrants" as const, color: COLOR_STAFF, labelDy: 20 },
  ];
  const ticks = Array.from({ length: yMax + 1 }, (_, i) => i).filter((v) => yMax <= 6 || v % Math.ceil(yMax / 5) === 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#888888" fontFamily="Arial, sans-serif">{v}</text>
        </g>
      ))}
      {months.map((m, i) => (
        <text key={m.month} x={x(i)} y={H - 14} textAnchor="middle" fontSize="12" fill="#666666" fontFamily="Arial, sans-serif">{m.month}</text>
      ))}
      {series.map((s) => (
        <g key={s.key}>
          <path d={smoothPath(months.map((m, i) => ({ x: x(i), y: y(m[s.key]) })))} fill="none" stroke={s.color} strokeWidth="3" strokeLinecap="round" />
          {months.map((m, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(m[s.key])} r="4.5" fill="#ffffff" stroke={s.color} strokeWidth="2.5" />
              <text x={x(i)} y={y(m[s.key]) + s.labelDy} textAnchor="middle" fontSize="11" fontWeight="bold" fill={s.color} fontFamily="Arial, sans-serif">{m[s.key]}</text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
};

export const PDFPageEncadrantsActivity = ({ staff, stats, year, pageNumber }: PDFPageEncadrantsActivityProps) => {
  const kpis = [
    { label: "Encadrants actifs", value: fmtNum(staff.activeEncadrants), sub: "ont encadré au moins une sortie", color: "#0a3a49" },
    { label: "Sorties par encadrant", value: fmtNum(staff.avgOutingsPerEncadrant), sub: "en moyenne sur l'année", color: "#0891b2" },
    { label: "Encadrants par sortie", value: fmtNum(staff.avgEncadrantsPerOuting), sub: "en moyenne", color: "#059669" },
    { label: "Sorties co-encadrées", value: `${staff.coEncadrementRate}%`, sub: "au moins 2 encadrants", color: "#f08814" },
  ];

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
          <span style={{ fontSize: "28px" }}>🎓</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#0a3a49", margin: 0 }}>
            Implication du Staff {year}
          </h1>
        </div>
        <p style={{ fontSize: "14px", lineHeight: "20px", color: "#666666", margin: "0 0 18px 0" }}>
          {periodLabel(stats)} · {staff.totalOutings} sorties
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ backgroundColor: "#f8fafc", border: `3px solid ${k.color}`, borderRadius: "14px", padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: "44px", lineHeight: "50px", fontWeight: "700", color: k.color }}>{k.value}</div>
              <div style={{ fontSize: "15px", lineHeight: "22px", fontWeight: "600", color: "#444444" }}>{k.label}</div>
              <div style={{ fontSize: "11px", lineHeight: "16px", color: "#888888" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 20px 8px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <h3 style={{ fontSize: "16px", lineHeight: "22px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>Évolution mensuelle</h3>
            <span style={{ fontSize: "12px", lineHeight: "18px", fontWeight: "600", color: COLOR_OUTINGS }}>● Sorties</span>
            <span style={{ fontSize: "12px", lineHeight: "18px", fontWeight: "600", color: COLOR_STAFF }}>● Encadrants mobilisés</span>
          </div>
          {staff.monthly.length > 0 ? (
            <LineChart staff={staff} />
          ) : (
            <p style={{ fontSize: "14px", color: "#666666", textAlign: "center", padding: "60px 0" }}>Aucune sortie sur la période</p>
          )}
        </div>
        <p style={{ fontSize: "11px", lineHeight: "16px", color: "#888888", margin: "10px 0 0 0" }}>
          Une sortie compte pour chaque encadrant, co-encadrement inclus.
        </p>
      </div>
    </PDFPageWrapper>
  );
};
