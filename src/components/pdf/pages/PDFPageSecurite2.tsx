import { PDFPageWrapper } from "../PDFPageWrapper";
import logoTeamOxygen from "@/assets/logo-team-oxygen.webp";

export const PDFPageSecurite2 = () => {
  return (
    <PDFPageWrapper pageNumber={2} totalPages={2}>
      <div style={{ display: "flex", height: "100%", gap: "20px" }}>

        {/* LEFT: Section 4 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          <SectionCard number="4" title="Prendre soin de son binôme" subtitle="Sécurité collective" color="#7c3aed">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <Item label="Niveau équivalent">
                Les binômes doivent être de même niveau pour garantir une sécurité optimale en toutes circonstances.
              </Item>
              <Item label="Responsabilité">
                Prendre son rôle de binôme aussi sérieusement que ses propres apnées.
              </Item>
              <Item label="Communication">
                Bien communiquer avec son binôme — avant, pendant et après les plongées.
              </Item>
              <Item label="Cohésion">
                Garder un esprit d'équipe et de partage en toutes circonstances.
              </Item>
            </div>
          </SectionCard>

          {/* Binôme visual rules */}
          <div style={{
            border: "1.5px solid #7c3aed30",
            borderRadius: "10px",
            overflow: "hidden",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ backgroundColor: "#7c3aed", padding: "8px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "16px" }}>🤝</span>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>Mes engagements de binôme</div>
            </div>
            <div style={{ padding: "14px", flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", alignContent: "start" }}>
              {[
                { icon: "👁️", text: "Je surveille mon binôme en permanence" },
                { icon: "🚫", text: "Je ne le quitte jamais des yeux en plongée" },
                { icon: "🤙", text: "Je signale tout inconfort ou malaise immédiatement" },
                { icon: "⏱️", text: "Je respecte les temps de surface imposés" },
                { icon: "🔄", text: "Un plonge, l'autre surveille — j'alterne toujours" },
                { icon: "📢", text: "Je donne l'alerte sans hésitation si besoin" },
              ].map((rule) => (
                <div key={rule.text} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  backgroundColor: "#faf5ff",
                  borderRadius: "8px",
                  border: "1px solid #e9d5ff",
                }}>
                  <span style={{ fontSize: "18px", flexShrink: 0 }}>{rule.icon}</span>
                  <span style={{ fontSize: "11px", color: "#374151", lineHeight: 1.4 }}>{rule.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Recap + Footer */}
        <div style={{ width: "320px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Recap card */}
          <div style={{
            border: "1.5px solid #0891b230",
            borderRadius: "10px",
            overflow: "hidden",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ backgroundColor: "#1e3a5f", padding: "8px 14px" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>Récapitulatif sécurité</div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.75)" }}>À retenir avant chaque sortie</div>
            </div>
            <div style={{ padding: "14px", flex: 1 }}>
              {[
                { num: "1", color: "#0891b2", text: "Je suis à l'écoute de moi-même" },
                { num: "2", color: "#dc2626", text: "Mon équipement est complet et vérifié" },
                { num: "3", color: "#0d9488", text: "Je suis ponctuel et organisé" },
                { num: "4", color: "#7c3aed", text: "Je prends soin de mon binôme" },
                { num: "5", color: "#059669", text: "Je respecte la mer et ses habitants" },
              ].map((item) => (
                <div key={item.num} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 10px",
                  marginBottom: "7px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "7px",
                  border: `1.5px solid ${item.color}30`,
                }}>
                  <div style={{
                    width: "24px", height: "24px", borderRadius: "50%",
                    backgroundColor: item.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: "800", color: "white", flexShrink: 0,
                  }}>
                    {item.num}
                  </div>
                  <span style={{ fontSize: "11px", color: "#1e3a5f", fontWeight: "600" }}>{item.text}</span>
                </div>
              ))}

              {/* Motto */}
              <div style={{
                marginTop: "12px",
                padding: "12px",
                background: "linear-gradient(135deg, #eff6ff, #ecfdf5)",
                borderRadius: "8px",
                border: "1px solid #bfdbfe",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#1e3a5f", marginBottom: "3px" }}>
                  Notre philosophie
                </div>
                <div style={{ fontSize: "10px", fontStyle: "italic", color: "#374151", lineHeight: 1.5 }}>
                  « Prendre soin de soi, des autres et de la mer »
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            background: "linear-gradient(135deg, #0c2340 0%, #1e3a5f 60%, #0891b2 100%)",
            borderRadius: "10px",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}>
            <img src={logoTeamOxygen} alt="Team Oxygen" style={{ width: "48px", height: "auto", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "13px", fontWeight: "800", color: "white", marginBottom: "2px" }}>Team Oxygen</div>
              <div style={{ fontSize: "9px", color: "#bae6fd", marginBottom: "3px" }}>
                Association éco-responsable de plongée et apnée
              </div>
              <div style={{ fontSize: "9px", color: "#7dd3fc" }}>
                Région Martigues-Marseille · BE AN ECO EXPLORER
              </div>
            </div>
          </div>
        </div>
      </div>
    </PDFPageWrapper>
  );
};

const SectionCard = ({
  number, title, subtitle, color, children,
}: {
  number: string; title: string; subtitle?: string; color: string; children: React.ReactNode;
}) => (
  <div style={{ border: `1.5px solid ${color}30`, borderRadius: "10px", overflow: "hidden" }}>
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
    <div style={{ padding: "12px 14px" }}>{children}</div>
  </div>
);

const Item = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", gap: "8px" }}>
    <div style={{ width: "3px", minWidth: "3px", borderRadius: "2px", backgroundColor: "#7c3aed", marginTop: "3px" }} />
    <div style={{ lineHeight: 1.45 }}>
      <span style={{ fontSize: "10px", fontWeight: "700", color: "#1e3a5f" }}>{label} : </span>
      <span style={{ fontSize: "10px", color: "#374151" }}>{children}</span>
    </div>
  </div>
);
