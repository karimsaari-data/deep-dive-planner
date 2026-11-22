import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFGenderSplit, PDFMembership } from "@/hooks/usePDFReportData";

interface PDFPageMembershipProps {
  membership: PDFMembership;
  year: number;
  pageNumber?: number;
}

const COLOR_H = "#0891b2";
const COLOR_F = "#ec4899";
const COLOR_O = "#9ca3af";

const total = (g: PDFGenderSplit) => g.homme + g.femme + g.autre;
const pct = (n: number, t: number) => (t > 0 ? Math.round((n / t) * 100) : 0);

// Barre empilée H / F / non renseigné, en largeurs de div (rendu fiable avec html2canvas)
const SplitRow = ({ label, split }: { label: string; split: PDFGenderSplit }) => {
  const t = total(split);
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ fontSize: "14px", lineHeight: "20px", fontWeight: "600", color: "#1a1a1a", marginBottom: "6px" }}>
        {label} <span style={{ fontWeight: "400", color: "#666666" }}>({t})</span>
      </div>
      <div style={{ display: "flex", height: "30px", borderRadius: "6px", overflow: "hidden", backgroundColor: "#e2e8f0" }}>
        {split.homme > 0 && (
          <div style={{ width: `${(split.homme / t) * 100}%`, height: "30px", backgroundColor: COLOR_H, color: "#ffffff", fontSize: "13px", fontWeight: "700", lineHeight: "30px", textAlign: "center" }}>
            {split.homme} · {pct(split.homme, t)}%
          </div>
        )}
        {split.femme > 0 && (
          <div style={{ width: `${(split.femme / t) * 100}%`, height: "30px", backgroundColor: COLOR_F, color: "#ffffff", fontSize: "13px", fontWeight: "700", lineHeight: "30px", textAlign: "center" }}>
            {split.femme} · {pct(split.femme, t)}%
          </div>
        )}
        {split.autre > 0 && (
          <div style={{ width: `${(split.autre / t) * 100}%`, height: "30px", backgroundColor: COLOR_O, color: "#ffffff", fontSize: "13px", fontWeight: "700", lineHeight: "30px", textAlign: "center" }}>
            {split.autre}
          </div>
        )}
      </div>
    </div>
  );
};

export const PDFPageMembership = ({ membership: m, pageNumber }: PDFPageMembershipProps) => {
  const delta = m.total - m.previousSeasonTotal;
  const deltaPct = pct(Math.abs(delta), m.previousSeasonTotal);
  const kpis = [
    { label: "Adhérents saison", value: m.total, sub: `${m.seasonYear - 1}-${m.seasonYear}`, color: "#1e3a5f" },
    {
      label: "Nouveaux adhérents",
      value: m.newCount,
      sub: `${pct(m.newCount, m.total)}% des adhérents`,
      color: "#059669",
    },
    { label: "Renouvellements", value: m.renewedCount, sub: `${pct(m.renewedCount, m.total)}% des adhérents`, color: "#0891b2" },
  ];

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
          <span style={{ fontSize: "28px" }}>⚖️</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e3a5f", margin: 0 }}>
            Parité & Nouveaux Adhérents
          </h1>
        </div>
        <p style={{ fontSize: "14px", lineHeight: "20px", color: "#666666", margin: "0 0 18px 0" }}>
          Saison {m.seasonYear - 1}-{m.seasonYear}
          {m.previousSeasonTotal > 0 &&
            ` · ${delta >= 0 ? "+" : "-"}${Math.abs(delta)} adhérents vs saison précédente (${m.previousSeasonTotal}, ${delta >= 0 ? "+" : "-"}${deltaPct}%)`}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "24px" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ backgroundColor: "#f8fafc", border: `3px solid ${k.color}`, borderRadius: "16px", padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "56px", lineHeight: "62px", fontWeight: "700", color: k.color }}>{k.value}</div>
              <div style={{ fontSize: "17px", lineHeight: "24px", fontWeight: "500", color: "#444444" }}>{k.label}</div>
              <div style={{ fontSize: "12px", lineHeight: "18px", color: "#888888" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px 24px 6px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "16px", lineHeight: "22px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>Parité Homme / Femme</h3>
            <span style={{ fontSize: "12px", lineHeight: "18px", color: COLOR_H, fontWeight: "600" }}>■ Hommes</span>
            <span style={{ fontSize: "12px", lineHeight: "18px", color: COLOR_F, fontWeight: "600" }}>■ Femmes</span>
          </div>
          <SplitRow label="Tous les adhérents" split={m.all} />
          <SplitRow label="Nouveaux adhérents" split={m.newMembers} />
          <SplitRow label="Renouvellements" split={m.renewed} />
        </div>

        <p style={{ fontSize: "11px", lineHeight: "16px", color: "#888888", margin: "10px 0 0 0" }}>
          Nouvel adhérent : date d'entrée dans le club à partir du 1er septembre {m.seasonYear - 1}.
        </p>
      </div>
    </PDFPageWrapper>
  );
};
