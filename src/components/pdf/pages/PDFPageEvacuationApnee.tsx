import logoTeamOxygen from "@/assets/logo-team-oxygen.webp";

const LINE_COLOR = "#1a1a1a";
const BORDER = `1px solid ${LINE_COLOR}`;
const SECTION_BG = "#1e3a5f";

const Line = ({ label, width = "100%", ml = 4 }: { label: string; width?: string; ml?: number }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", flex: width === "100%" ? 1 : undefined, width: width !== "100%" ? width : undefined }}>
    <span style={{ fontSize: "10px", whiteSpace: "nowrap" }}>{label}</span>
    <div style={{ flex: 1, borderBottom: BORDER, marginLeft: `${ml}px`, minWidth: "20px" }} />
  </div>
);

const CheckBox = ({ label, checked = false }: { label: string; checked?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
    <div style={{
      width: "12px", height: "12px", border: BORDER, flexShrink: 0,
      backgroundColor: checked ? LINE_COLOR : "white",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {checked && <span style={{ color: "white", fontSize: "9px", lineHeight: 1 }}>✓</span>}
    </div>
    <span style={{ fontSize: "10px" }}>{label}</span>
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div style={{
    backgroundColor: SECTION_BG,
    color: "white",
    padding: "4px 10px",
    fontSize: "10px",
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    marginBottom: "6px",
  }}>
    {title}
  </div>
);

export const PDFPageEvacuationApnee = () => {
  return (
    <div
      data-pdf-page
      style={{
        width: "794px",
        height: "1123px",
        backgroundColor: "#ffffff",
        color: LINE_COLOR,
        fontFamily: "Inter, system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
        padding: "24px 40px 20px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "0px",
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "9px", fontStyle: "italic", color: "#555" }}>
            « ANNEXE III-19 » — Article A.322-78 du code du sport
          </div>
          <div style={{ fontSize: "18px", fontWeight: "800", letterSpacing: "0.5px", marginTop: "2px" }}>
            Fiche d'évacuation de plongeur
          </div>
          <div style={{ fontSize: "10px", fontWeight: "600", color: SECTION_BG, marginTop: "1px" }}>
            Discipline : Apnée / Freediving
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <img src={logoTeamOxygen} alt="Team Oxygen" style={{ width: "44px", height: "auto" }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: SECTION_BG }}>TEAM OXYGEN</div>
            <div style={{ fontSize: "8px", color: "#555" }}>Martigues — Marseille</div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: `2px solid ${SECTION_BG}`, marginBottom: "10px" }} />

      {/* ── Identification ── */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", gap: "12px", marginBottom: "5px" }}>
          <Line label="NOM" />
          <Line label="PRÉNOM" />
          <Line label="Date de naissance" width="200px" />
        </div>
        <div style={{ display: "flex", gap: "12px", marginBottom: "5px" }}>
          <Line label="Date" width="120px" />
          <Line label="Tél club ou directeur de plongée" />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
          <span style={{ fontSize: "10px", whiteSpace: "nowrap" }}>Nom et adresse de l'établissement</span>
          <div style={{ flex: 1, borderBottom: BORDER, marginLeft: "4px", fontSize: "10px", paddingLeft: "4px", color: "#555", fontStyle: "italic" }}>
            Team Oxygen — Association d'apnée, Martigues / Marseille
          </div>
        </div>
      </div>

      {/* ── Caractéristiques ── */}
      <div style={{ border: BORDER, marginBottom: "10px" }}>
        <SectionHeader title="Caractéristiques de la plongée et de l'accident" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
          {/* Left */}
          <div style={{ padding: "0 10px 8px", borderRight: BORDER }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "6px" }}>
              <Line label="Lieu" />
            </div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "6px" }}>
              <Line label="Profondeur maximale" width="200px" />
              <span style={{ fontSize: "10px", alignSelf: "flex-end" }}>mètres</span>
            </div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "6px" }}>
              <Line label="Durée totale" width="190px" />
              <span style={{ fontSize: "10px", alignSelf: "flex-end" }}>minutes</span>
            </div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
              <Line label="Heure de sortie de l'eau" />
            </div>
            <div style={{ marginBottom: "4px" }}>
              <span style={{ fontSize: "10px" }}>Incidents :</span>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ borderBottom: "1px solid #aaa", marginTop: "10px" }} />
              ))}
            </div>
          </div>

          {/* Right — signes observés */}
          <div style={{ padding: "0 10px 8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: "700" }}>Signes observés</span>
              <span style={{ fontSize: "10px", fontWeight: "700" }}>Heure</span>
            </div>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                borderBottom: "1px solid #aaa", marginBottom: "8px", paddingBottom: "1px",
              }}>
                <div style={{ flex: 1 }} />
                <div style={{ width: "50px", borderLeft: "1px solid #aaa", paddingLeft: "6px", height: "14px" }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Premiers soins ── */}
      <div style={{ border: BORDER, marginBottom: "10px" }}>
        <SectionHeader title="Premiers soins" />
        <div style={{ padding: "6px 14px 10px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <CheckBox label="Position latérale de sécurité" />
          <CheckBox label="Massage cardiaque externe" />
          <CheckBox label="Bouche à bouche" />
          <CheckBox label="Oxygène" />
          <CheckBox label="Aspirine" />
          <CheckBox label="Boisson" />
        </div>
      </div>

      {/* ── Intervention médicale ── */}
      <div style={{ border: BORDER, marginBottom: "10px" }}>
        <SectionHeader title="Intervention médicale" />
        <div style={{ padding: "6px 10px 10px" }}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "6px" }}>
            <Line label="Nom du médecin" />
            <Line label="Tél" width="160px" />
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "6px" }}>
            <Line label="Heure de prise en charge" width="220px" />
            <Line label="Lieu" />
          </div>
          <div style={{ marginBottom: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: "600" }}>Examen clinique et diagnostic évoqué</span>
              <span style={{ fontSize: "10px", fontWeight: "600" }}>Heure</span>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                borderBottom: "1px solid #aaa", marginBottom: "8px",
              }}>
                <div style={{ flex: 1 }} />
                <div style={{ width: "50px", borderLeft: "1px solid #aaa", paddingLeft: "6px", height: "14px" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
            <span style={{ fontSize: "10px" }}>Traitement :</span>
            <div style={{ flex: 1, borderBottom: BORDER }} />
          </div>
          <div style={{ borderBottom: BORDER, marginTop: "10px" }} />
        </div>
      </div>

      {/* ── Évacuation primaire ── */}
      <div style={{ border: BORDER }}>
        <SectionHeader title="Évacuation primaire" />
        <div style={{ padding: "6px 10px 10px" }}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "6px" }}>
            <Line label="Service d'accueil" />
            <Line label="Moyen(s)" width="140px" />
            <Line label="Durée totale" width="120px" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "10px", whiteSpace: "nowrap" }}>Médicalisation</span>
            <CheckBox label="oui" />
            <CheckBox label="non" />
            <Line label="Médecin convoyeur" />
            <Line label="Tél" width="130px" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "auto", paddingTop: "8px", textAlign: "center", fontSize: "8px", color: "#888" }}>
        Fiche générée par MyOxygen — Team Oxygen • Conserver avec le registre de sécurité
      </div>
    </div>
  );
};
