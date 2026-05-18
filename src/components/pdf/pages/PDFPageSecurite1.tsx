import { PDFPageWrapper } from "../PDFPageWrapper";
import logoTeamOxygen from "@/assets/logo-team-oxygen.webp";

export const PDFPageSecurite1 = () => {
  return (
    <PDFPageWrapper pageNumber={1} totalPages={2}>
      <div style={{ display: "flex", height: "100%", gap: "20px" }}>

        {/* LEFT: Header + Sections 1, 3, 5 */}
        <div style={{ width: "430px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #0c2340 0%, #1e3a5f 60%, #0891b2 100%)",
            borderRadius: "12px",
            padding: "16px 20px",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}>
            <img src={logoTeamOxygen} alt="Team Oxygen" style={{ width: "64px", height: "auto", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "2px", color: "#7dd3fc", textTransform: "uppercase", marginBottom: "3px" }}>
                Fiche Sécurité
              </div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff", lineHeight: 1.1, marginBottom: "3px" }}>
                TEAM OXYGEN
              </div>
              <div style={{ fontSize: "10px", fontStyle: "italic", color: "#bae6fd", marginBottom: "5px" }}>
                BE AN ECO EXPLORER
              </div>
              <div style={{ fontSize: "10px", color: "#7dd3fc", fontStyle: "italic" }}>
                Prendre soin de soi, des autres et de la mer
              </div>
            </div>
          </div>

          {/* Section 1 */}
          <SectionCard number="1" title="Prendre soin de soi" subtitle="Sécurité individuelle" color="#0891b2">
            <Item label="Écoute & modération">
              Être à l'écoute de soi et raisonnable. Nous sommes notre première sécurité.
            </Item>
            <Item label="Préparation mentale">
              Engager la pratique de l'apnée dans un état relaxé.
            </Item>
            <Item label="Philosophie de pratique">
              Ne pas rechercher la performance à tout prix — progresser dans le plaisir.
            </Item>
            <Item label="Hydratation">
              Bien s'hydrater avant et après chaque plongée.
            </Item>
          </SectionCard>

          {/* Section 3 */}
          <SectionCard number="3" title="Organisation & Ponctualité" subtitle="Respect des engagements" color="#0d9488">
            <Item label="Respect des horaires">
              Les horaires doivent être scrupuleusement respectés, avec une marge de sécurité intégrée.
            </Item>
            <Item label="Anticipation des annulations">
              Éviter les annulations à moins de 24 heures de la sortie pour respecter les encadrants.
            </Item>
          </SectionCard>

          {/* Section 5 */}
          <SectionCard number="5" title="Respect de l'environnement" subtitle="Éco-responsabilité & Encadrement" color="#059669">
            <Item label="Consignes encadrant">
              Rester vigilant aux dangers liés à la mer et bien respecter les consignes de l'encadrant.
            </Item>
            <Item label="Éco-responsabilité">
              Respecter la faune et la flore — nous sommes des invités dans leur milieu.
            </Item>
            <div style={{
              marginTop: "8px",
              padding: "8px 10px",
              background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
              border: "1.5px solid #059669",
              borderRadius: "7px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span style={{ fontSize: "18px" }}>🌿</span>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#065f46" }}>
                Zéro déchet · Zéro impact · Maximum de respect
              </span>
            </div>
          </SectionCard>
        </div>

        {/* RIGHT: Section 2 full height */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <SectionCard number="2" title="Équipement Obligatoire & Check-list Matériel" subtitle="À vérifier avant chaque sortie" color="#dc2626" fullHeight>

            <div style={{ fontSize: "10px", fontWeight: "700", color: "#374151", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Équipement requis par apnéiste
            </div>

            {[
              { icon: "🦵", label: "Palmes" },
              { icon: "🤿", label: "Masque" },
              { icon: "🌊", label: "Tuba" },
              { icon: "🩱", label: "Combinaison (néoprène refendu recommandé pour une isolation thermique optimale)" },
              { icon: "⚖️", label: "Ceinture de plombs" },
              { icon: "💧", label: "Gourde d'eau — obligatoire sur toutes les sorties" },
            ].map((item) => (
              <div key={item.label} style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "7px 10px",
                marginBottom: "5px",
                backgroundColor: "#f8fafc",
                borderRadius: "7px",
                border: "1px solid #e2e8f0",
              }}>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: "11px", color: "#374151", fontWeight: "500", flex: 1 }}>{item.label}</span>
                <CheckIcon />
              </div>
            ))}

            <div style={{ marginTop: "14px", display: "flex", gap: "12px" }}>
              <div style={{ flex: 1, padding: "10px 12px", backgroundColor: "#fef3c7", borderRadius: "8px", border: "1px solid #fcd34d" }}>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "#92400e", marginBottom: "4px" }}>✓ Check avant départ</div>
                <div style={{ fontSize: "10px", color: "#78350f" }}>Faire un check matos avant de quitter la maison et d'aller à l'eau.</div>
              </div>
              <div style={{ flex: 1, padding: "10px 12px", backgroundColor: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "#166534", marginBottom: "4px" }}>✓ Adaptation météo</div>
                <div style={{ fontSize: "10px", color: "#14532d" }}>Choisir le matériel en fonction des conditions météo et de l'activité ciblée.</div>
              </div>
            </div>

            {/* Warning */}
            <div style={{
              marginTop: "14px",
              padding: "12px 16px",
              backgroundColor: "#fef2f2",
              border: "2px solid #dc2626",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}>
              <span style={{ fontSize: "24px", flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#dc2626", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Règle stricte
                </div>
                <div style={{ fontSize: "10px", color: "#7f1d1d", lineHeight: 1.5 }}>
                  En cas de manquement à l'un de ces éléments de sécurité,{" "}
                  <strong>le refus de sortir en mer sera appliqué immédiatement.</strong>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </PDFPageWrapper>
  );
};

const CheckIcon = () => (
  <svg style={{ width: "14px", height: "14px", color: "#16a34a", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SectionCard = ({
  number, title, subtitle, color, children, fullHeight,
}: {
  number: string; title: string; subtitle?: string; color: string;
  children: React.ReactNode; fullHeight?: boolean;
}) => (
  <div style={{
    border: `1.5px solid ${color}30`,
    borderRadius: "10px",
    overflow: "hidden",
    flex: fullHeight ? 1 : undefined,
    display: "flex",
    flexDirection: "column",
  }}>
    <div style={{ backgroundColor: color, padding: "8px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        width: "22px", height: "22px", borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", fontWeight: "800", color: "white", flexShrink: 0,
      }}>
        {number}
      </div>
      <div>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>{title}</div>
        {subtitle && <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.85)" }}>{subtitle}</div>}
      </div>
    </div>
    <div style={{ padding: "12px 14px", flex: fullHeight ? 1 : undefined }}>{children}</div>
  </div>
);

const Item = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: "8px", display: "flex", gap: "8px" }}>
    <div style={{ width: "3px", minWidth: "3px", borderRadius: "2px", backgroundColor: "#0891b2", marginTop: "3px" }} />
    <div style={{ lineHeight: 1.45 }}>
      <span style={{ fontSize: "10px", fontWeight: "700", color: "#1e3a5f" }}>{label} : </span>
      <span style={{ fontSize: "10px", color: "#374151" }}>{children}</span>
    </div>
  </div>
);
