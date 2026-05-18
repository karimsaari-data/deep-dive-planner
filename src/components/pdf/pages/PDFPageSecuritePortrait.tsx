import { ReactNode } from "react";
import logoTeamOxygen from "@/assets/logo-team-oxygen.webp";

/* ── Equipment SVG icons ── */

const IconPalmes = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
    <ellipse cx="8" cy="18" rx="5" ry="9" fill="#0891b2" opacity="0.85" transform="rotate(-15 8 18)" />
    <rect x="6" y="9" width="4" height="12" rx="2" fill="#0e7490" transform="rotate(-15 8 18)" />
    <ellipse cx="20" cy="18" rx="5" ry="9" fill="#0891b2" opacity="0.85" transform="rotate(15 20 18)" />
    <rect x="18" y="9" width="4" height="12" rx="2" fill="#0e7490" transform="rotate(15 20 18)" />
    <rect x="4" y="21" width="8" height="4" rx="2" fill="#164e63" transform="rotate(-5 8 23)" />
    <rect x="16" y="21" width="8" height="4" rx="2" fill="#164e63" transform="rotate(5 20 23)" />
  </svg>
);

const IconMasque = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
    <rect x="3" y="8" width="22" height="14" rx="4" fill="#1e3a5f" />
    <rect x="4.5" y="9.5" width="8.5" height="11" rx="3" fill="#bae6fd" opacity="0.7" />
    <rect x="15" y="9.5" width="8.5" height="11" rx="3" fill="#bae6fd" opacity="0.7" />
    <rect x="12.5" y="12" width="3" height="4" rx="1" fill="#1e3a5f" />
    <rect x="1" y="13" width="2.5" height="2" rx="1" fill="#374151" />
    <rect x="24.5" y="13" width="2.5" height="2" rx="1" fill="#374151" />
    <path d="M3 18 Q14 23 25 18" stroke="#64748b" strokeWidth="1.5" fill="none" />
  </svg>
);

const IconTuba = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
    <path d="M10 24 Q10 14 16 10 Q19 7 20 4" stroke="#0891b2" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M10 24 Q10 14 16 10 Q19 7 20 4" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    <rect x="17" y="2" width="6" height="4" rx="2" fill="#0e7490" />
    <ellipse cx="10" cy="24" rx="4" ry="3" fill="#1e3a5f" />
    <ellipse cx="10" cy="24" rx="2.5" ry="1.5" fill="#374151" />
    <circle cx="13" cy="17" r="1.5" fill="#fbbf24" />
  </svg>
);

const IconCombinaison = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
    <rect x="8" y="7" width="12" height="13" rx="3" fill="#1e3a5f" />
    <path d="M8 9 Q3 11 3 16" stroke="#1e3a5f" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M20 9 Q25 11 25 16" stroke="#1e3a5f" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M11 20 Q10 25 9 27" stroke="#1e3a5f" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M17 20 Q18 25 19 27" stroke="#1e3a5f" strokeWidth="4" strokeLinecap="round" fill="none" />
    <line x1="14" y1="7" x2="14" y2="16" stroke="#0891b2" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
    <path d="M10 7 Q14 4 18 7" stroke="#0891b2" strokeWidth="1.5" fill="none" />
    <rect x="8" y="12" width="12" height="2" rx="1" fill="#0891b2" opacity="0.6" />
  </svg>
);

const IconCeinture = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
    <rect x="2" y="12" width="24" height="4" rx="2" fill="#374151" />
    <rect x="12" y="10" width="4" height="8" rx="1" fill="#9ca3af" />
    <rect x="13" y="11" width="2" height="6" rx="0.5" fill="#6b7280" />
    <rect x="3" y="11" width="5" height="6" rx="1" fill="#4b5563" />
    <line x1="5.5" y1="11" x2="5.5" y2="17" stroke="#6b7280" strokeWidth="0.8" />
    <rect x="9" y="11" width="2.5" height="6" rx="1" fill="#4b5563" />
    <rect x="16.5" y="11" width="2.5" height="6" rx="1" fill="#4b5563" />
    <rect x="20" y="11" width="5" height="6" rx="1" fill="#4b5563" />
    <line x1="22.5" y1="11" x2="22.5" y2="17" stroke="#6b7280" strokeWidth="0.8" />
  </svg>
);

const IconGourde = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
    <rect x="8" y="9" width="12" height="16" rx="4" fill="#0891b2" />
    <rect x="8" y="16" width="12" height="9" rx="4" fill="#0e7490" />
    <rect x="11" y="6" width="6" height="4" rx="2" fill="#0e7490" />
    <rect x="10" y="3" width="8" height="4" rx="2" fill="#1e3a5f" />
    <path d="M20 12 Q24 14 24 18 Q24 22 20 22" stroke="#0891b2" strokeWidth="2" fill="none" strokeLinecap="round" />
    <rect x="10" y="17" width="8" height="5" rx="1" fill="white" opacity="0.2" />
    <rect x="10" y="10" width="3" height="8" rx="1.5" fill="white" opacity="0.2" />
  </svg>
);

export const PDFPageSecuritePortrait = () => {
  return (
    <div
      data-pdf-page
      style={{
        width: "794px",
        height: "1123px",
        backgroundColor: "#ffffff",
        color: "#1a1a1a",
        fontFamily: "Inter, system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
        padding: "28px 36px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "9px",
      }}
    >
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0c2340 0%, #1e3a5f 60%, #0891b2 100%)",
        borderRadius: "12px",
        padding: "13px 18px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexShrink: 0,
      }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "10px",
          padding: "6px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <img src={logoTeamOxygen} alt="Team Oxygen" style={{ width: "52px", height: "auto" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "8px", fontWeight: "700", letterSpacing: "2px", color: "#7dd3fc", textTransform: "uppercase" }}>
            Fiche Sécurité
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", lineHeight: 1.1, margin: "2px 0" }}>
            TEAM OXYGEN
          </div>
          <div style={{ fontSize: "9px", color: "#bae6fd", fontStyle: "italic" }}>
            BE AN ECO EXPLORER — Prendre soin de soi, des autres et de la mer
          </div>
        </div>
        <div style={{
          padding: "6px 12px",
          backgroundColor: "rgba(255,255,255,0.15)",
          borderRadius: "8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "9px", color: "#7dd3fc", fontWeight: "700" }}>Association</div>
          <div style={{ fontSize: "9px", color: "#bae6fd" }}>Plongée & Apnée</div>
          <div style={{ fontSize: "9px", color: "#bae6fd" }}>Martigues-Marseille</div>
        </div>
      </div>

      {/* Section 1 */}
      <SectionCard number="1" title="Prendre soin de soi" subtitle="Sécurité individuelle" color="#0891b2">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <Item color="#0891b2" label="Écoute & modération">Être à l'écoute de soi et raisonnable. Nous sommes notre première sécurité.</Item>
          <Item color="#0891b2" label="Préparation mentale">Engager la pratique de l'apnée dans un état relaxé.</Item>
          <Item color="#0891b2" label="Philosophie de pratique">Ne pas rechercher la performance à tout prix — progresser dans le plaisir.</Item>
          <Item color="#0891b2" label="Hydratation">Bien s'hydrater avant et après chaque plongée.</Item>
        </div>
      </SectionCard>

      {/* Section 2 */}
      <SectionCard number="2" title="Équipement Obligatoire & Check-list Matériel" subtitle="À vérifier avant chaque sortie" color="#dc2626">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {/* Equipment list */}
          <div>
            <div style={{ fontSize: "8px", fontWeight: "700", color: "#374151", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Équipement requis par apnéiste
            </div>
            {[
              { svg: <IconPalmes />, label: "Palmes" },
              { svg: <IconMasque />, label: "Masque" },
              { svg: <IconTuba />, label: "Tuba" },
              { svg: <IconCombinaison />, label: "Combinaison (néoprène refendu recommandé)" },
              { svg: <IconCeinture />, label: "Ceinture de plombs" },
              { svg: <IconGourde />, label: "Gourde d'eau (obligatoire)" },
            ].map((item) => (
              <div key={item.label} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "4px 8px", marginBottom: "3px",
                backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0",
              }}>
                <div style={{ width: "26px", height: "26px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.svg}
                </div>
                <span style={{ fontSize: "10px", color: "#374151", fontWeight: "500", flex: 1 }}>{item.label}</span>
                <CheckIcon />
              </div>
            ))}
          </div>

          {/* Checks + warning */}
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <div style={{ fontSize: "9px", fontWeight: "700", color: "#374151", marginBottom: "0px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Vérifications
            </div>
            <div style={{ padding: "8px 11px", backgroundColor: "#fef3c7", borderRadius: "7px", border: "1px solid #fcd34d" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#92400e", marginBottom: "3px" }}>✓ Check avant départ</div>
              <div style={{ fontSize: "10px", color: "#78350f" }}>Faire un check matos avant de quitter la maison et d'aller à l'eau.</div>
            </div>
            <div style={{ padding: "8px 11px", backgroundColor: "#f0fdf4", borderRadius: "7px", border: "1px solid #86efac" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#166534", marginBottom: "3px" }}>✓ Adaptation météo</div>
              <div style={{ fontSize: "10px", color: "#14532d" }}>Choisir le matériel en fonction des conditions météo et de l'activité.</div>
            </div>
            <div style={{
              padding: "9px 11px", backgroundColor: "#fef2f2",
              border: "2px solid #dc2626", borderRadius: "8px",
              display: "flex", alignItems: "flex-start", gap: "8px", flex: 1,
            }}>
              <span style={{ fontSize: "18px", flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#dc2626", marginBottom: "3px", textTransform: "uppercase" }}>Règle stricte</div>
                <div style={{ fontSize: "10px", color: "#7f1d1d", lineHeight: 1.5 }}>
                  En cas de manquement,{" "}
                  <strong>le refus de sortir en mer sera appliqué immédiatement.</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Sections 3 + 4 side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", flexShrink: 0 }}>
        <SectionCard number="3" title="Organisation & Ponctualité" subtitle="Respect des engagements" color="#0d9488">
          <Item color="#0d9488" label="Respect des horaires">Horaires scrupuleusement respectés, avec une marge de sécurité systématique.</Item>
          <Item color="#0d9488" label="Anticipation">Éviter toute annulation à moins de 24h de la sortie.</Item>
        </SectionCard>

        <SectionCard number="4" title="Prendre soin de son binôme" subtitle="Sécurité collective" color="#7c3aed">
          <Item color="#7c3aed" label="Niveau équivalent">Les binômes doivent être de même niveau.</Item>
          <Item color="#7c3aed" label="Responsabilité">Prendre son rôle aussi sérieusement que ses propres apnées.</Item>
          <Item color="#7c3aed" label="Communication">Communiquer avant, pendant et après les plongées.</Item>
          <Item color="#7c3aed" label="Cohésion">Garder un esprit d'équipe et de partage.</Item>
        </SectionCard>
      </div>

      {/* Section 5 */}
      <SectionCard number="5" title="Respect de l'environnement & Encadrement" subtitle="Éco-responsabilité" color="#059669">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 20px", alignItems: "center" }}>
          <Item color="#059669" label="Consignes encadrant">Rester vigilant aux dangers liés à la mer et respecter les consignes de l'encadrant.</Item>
          <Item color="#059669" label="Éco-responsabilité">Respecter la faune et la flore — nous sommes des invités dans leur milieu.</Item>
          <div style={{
            padding: "8px 10px",
            background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
            border: "1.5px solid #059669", borderRadius: "7px",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span style={{ fontSize: "16px" }}>🌿</span>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#065f46" }}>
              Zéro déchet · Zéro impact · Maximum de respect
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Règles binôme */}
      <div style={{
        border: "1.5px solid #7c3aed30", borderRadius: "10px", overflow: "hidden", flexShrink: 0,
      }}>
        <div style={{ backgroundColor: "#7c3aed", padding: "7px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px" }}>🤝</span>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "white" }}>Mes engagements de binôme</div>
        </div>
        <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px" }}>
          {[
            { icon: "👁️", text: "Je surveille mon binôme en permanence" },
            { icon: "🚫", text: "Je ne le quitte jamais des yeux en plongée" },
            { icon: "🤙", text: "Je signale tout inconfort ou malaise" },
            { icon: "⏱️", text: "Je respecte les temps de surface" },
            { icon: "🔄", text: "Un plonge, l'autre surveille — j'alterne" },
            { icon: "📢", text: "Je donne l'alerte sans hésitation" },
          ].map((rule) => (
            <div key={rule.text} style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "6px 9px",
              backgroundColor: "#faf5ff", borderRadius: "6px", border: "1px solid #e9d5ff",
            }}>
              <span style={{ fontSize: "14px", flexShrink: 0 }}>{rule.icon}</span>
              <span style={{ fontSize: "10px", color: "#374151" }}>{rule.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CheckIcon = () => (
  <svg style={{ width: "13px", height: "13px", color: "#16a34a", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SectionCard = ({
  number, title, subtitle, color, children,
}: {
  number: string; title: string; subtitle?: string; color: string; children: ReactNode;
}) => (
  <div style={{ border: `1.5px solid ${color}30`, borderRadius: "9px", overflow: "hidden", flexShrink: 0 }}>
    <div style={{ backgroundColor: color, padding: "6px 12px", display: "flex", alignItems: "center", gap: "9px" }}>
      <div style={{
        width: "20px", height: "20px", borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.25)",
        flexShrink: 0,
        position: "relative",
      }}>
        <span style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "11px", fontWeight: "800", color: "white", lineHeight: 1,
        }}>{number}</span>
      </div>
      <div>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "white" }}>{title}</div>
        {subtitle && <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.85)" }}>{subtitle}</div>}
      </div>
    </div>
    <div style={{ padding: "8px 12px" }}>{children}</div>
  </div>
);

const Item = ({ label, children, color }: { label: string; children: ReactNode; color: string }) => (
  <div style={{ marginBottom: "5px", display: "flex", gap: "7px" }}>
    <div style={{ width: "3px", minWidth: "3px", borderRadius: "2px", backgroundColor: color, marginTop: "3px" }} />
    <div style={{ lineHeight: 1.45 }}>
      <span style={{ fontSize: "10px", fontWeight: "700", color: "#1e3a5f" }}>{label} : </span>
      <span style={{ fontSize: "10px", color: "#374151" }}>{children}</span>
    </div>
  </div>
);
