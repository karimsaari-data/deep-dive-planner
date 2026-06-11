import logoTeamOxygen from "@/assets/logo-team-oxygen.webp";

const LINE_COLOR = "#1a1a1a";
const BORDER = `1px solid ${LINE_COLOR}`;
const SECTION_BG = "#1e3a5f";
const LINE_HEIGHT = "13px";

/**
 * Label + fill-in line, bottom-aligned so the rule sits exactly at the text
 * baseline (html2canvas renders empty flex divs poorly with baseline alignment).
 * Optional `value` is printed just above the rule.
 */
const Line = ({
  label,
  width = "100%",
  value,
}: {
  label: string;
  width?: string;
  value?: string;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
      gap: "6px",
      flex: width === "100%" ? 1 : undefined,
      width: width !== "100%" ? width : undefined,
    }}
  >
    <span style={{ fontSize: "10px", whiteSpace: "nowrap", lineHeight: LINE_HEIGHT }}>{label}</span>
    <div
      style={{
        flex: 1,
        minWidth: "20px",
        height: LINE_HEIGHT,
        position: "relative",
      }}
    >
      {value && (
        <span
          style={{
            position: "absolute",
            left: "4px",
            bottom: "2px",
            fontSize: "10px",
            lineHeight: "10px",
            color: "#555",
            fontStyle: "italic",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
      )}
      {/* Rule pinned to the bottom so the value text can never overlap it */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, borderBottom: BORDER }} />
    </div>
  </div>
);

/** Row of Line components, bottom-aligned, with optional trailing unit label */
const LineRow = ({
  children,
  unit,
  mb = 6,
}: {
  children: React.ReactNode;
  unit?: string;
  mb?: number;
}) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", marginBottom: `${mb}px` }}>
    {children}
    {unit && (
      <span style={{ fontSize: "10px", lineHeight: LINE_HEIGHT, whiteSpace: "nowrap" }}>{unit}</span>
    )}
  </div>
);

/**
 * Checkbox bottom-aligned with its label (html2canvas does not center flex
 * items reliably). Box and text share the same fixed row height; the box is
 * lifted 1px so it sits on the text baseline.
 */
const CheckBox = ({ label, checked = false }: { label: string; checked?: boolean }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: LINE_HEIGHT }}>
    <div
      style={{
        width: "11px",
        height: "11px",
        border: BORDER,
        flexShrink: 0,
        marginBottom: "1px",
        backgroundColor: checked ? LINE_COLOR : "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked && <span style={{ color: "white", fontSize: "9px", lineHeight: 1 }}>✓</span>}
    </div>
    <span style={{ fontSize: "10px", lineHeight: LINE_HEIGHT, whiteSpace: "nowrap" }}>{label}</span>
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div
    style={{
      backgroundColor: SECTION_BG,
      color: "white",
      padding: "4px 10px",
      fontSize: "10px",
      fontWeight: "700",
      textAlign: "center",
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      marginBottom: "8px",
    }}
  >
    {title}
  </div>
);

/** Ruled row with a fixed-width "Heure" cell on the right */
const TimedRow = () => (
  <div
    style={{
      display: "flex",
      alignItems: "stretch",
      borderBottom: "1px solid #aaa",
      marginBottom: "9px",
      height: "14px",
    }}
  >
    <div style={{ flex: 1 }} />
    <div style={{ width: "52px", borderLeft: "1px solid #aaa" }} />
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

      <div style={{ borderTop: `2px solid ${SECTION_BG}`, marginBottom: "12px" }} />

      {/* ── Identification ── */}
      <div style={{ marginBottom: "12px" }}>
        <LineRow mb={7}>
          <Line label="NOM" />
          <Line label="PRÉNOM" />
          <Line label="Date de naissance" width="200px" />
        </LineRow>
        <LineRow mb={7}>
          <Line label="Date" width="160px" />
          <Line label="Tél club ou directeur de plongée" />
        </LineRow>
        <LineRow mb={0}>
          <Line
            label="Nom et adresse de l'établissement"
            value="Team Oxygen — Association d'apnée, Martigues / Marseille"
          />
        </LineRow>
      </div>

      {/* ── Caractéristiques ── */}
      <div style={{ border: BORDER, marginBottom: "10px" }}>
        <SectionHeader title="Caractéristiques de la plongée et de l'accident" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
          {/* Left */}
          <div style={{ padding: "0 10px 8px", borderRight: BORDER }}>
            <LineRow mb={7}>
              <Line label="Lieu" />
            </LineRow>
            <LineRow mb={7} unit="mètres">
              <Line label="Profondeur maximale" width="220px" />
            </LineRow>
            <LineRow mb={7} unit="minutes">
              <Line label="Durée totale" width="220px" />
            </LineRow>
            <LineRow mb={9}>
              <Line label="Heure de sortie de l'eau" />
            </LineRow>
            <div style={{ marginBottom: "4px" }}>
              <span style={{ fontSize: "10px", lineHeight: LINE_HEIGHT }}>Incidents :</span>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ borderBottom: "1px solid #aaa", marginTop: "13px" }} />
              ))}
            </div>
          </div>

          {/* Right — signes observés */}
          <div style={{ padding: "0 10px 8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "10px", fontWeight: "700" }}>Signes observés</span>
              <span style={{ fontSize: "10px", fontWeight: "700", width: "52px", paddingLeft: "6px", boxSizing: "border-box" }}>
                Heure
              </span>
            </div>
            {Array.from({ length: 9 }).map((_, i) => (
              <TimedRow key={i} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Premiers soins ── */}
      <div style={{ border: BORDER, marginBottom: "10px" }}>
        <SectionHeader title="Premiers soins" />
        <div style={{ padding: "2px 14px 10px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", rowGap: "8px", columnGap: "8px" }}>
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
        <div style={{ padding: "2px 10px 10px" }}>
          <LineRow mb={7}>
            <Line label="Nom du médecin" />
            <Line label="Tél" width="160px" />
          </LineRow>
          <LineRow mb={9}>
            <Line label="Heure de prise en charge" width="220px" />
            <Line label="Lieu" />
          </LineRow>
          <div style={{ marginBottom: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "10px", fontWeight: "600" }}>Examen clinique et diagnostic évoqué</span>
              <span style={{ fontSize: "10px", fontWeight: "600", width: "52px", paddingLeft: "6px", boxSizing: "border-box" }}>
                Heure
              </span>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <TimedRow key={i} />
            ))}
          </div>
          <LineRow mb={0}>
            <Line label="Traitement :" />
          </LineRow>
          <div style={{ borderBottom: BORDER, marginTop: "13px" }} />
        </div>
      </div>

      {/* ── Évacuation primaire ── */}
      <div style={{ border: BORDER }}>
        <SectionHeader title="Évacuation primaire" />
        <div style={{ padding: "2px 10px 10px" }}>
          <LineRow mb={8}>
            <Line label="Service d'accueil" />
            <Line label="Moyen(s)" width="160px" />
            <Line label="Durée totale" width="140px" />
          </LineRow>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "14px" }}>
            <span style={{ fontSize: "10px", whiteSpace: "nowrap", lineHeight: LINE_HEIGHT }}>Médicalisation</span>
            <CheckBox label="oui" />
            <CheckBox label="non" />
            <Line label="Médecin convoyeur" />
            <Line label="Tél" width="140px" />
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
