import { ReactNode } from "react";
import logoTeamOxygen from "@/assets/logo-team-oxygen.webp";

type Step = {
  number: number;
  color: string;
  title: string;
  bullets: string[];
  timingLabel: string;
  timingDetail: string;
};

const steps: Step[] = [
  {
    number: 1,
    color: "#dc2626",
    title: "Sécuriser – Alerter – Porter secours",
    bullets: [
      "Sécuriser la zone et la victime.",
      "Alerter les secours (15 / 112 / CROSS selon le lieu).",
      "Prendre en charge la victime selon ses besoins en attendant les secours.",
    ],
    timingLabel: "Immédiat",
    timingDetail: "Avant tout, la santé de la victime.",
  },
  {
    number: 2,
    color: "#f97316",
    title: "Faire un compte-rendu écrit immédiatement",
    bullets: [
      "Date, heure, lieu. Personnes présentes (noms, fonctions).",
      "Déroulement chronologique des faits.",
      "Conditions (météo, mer, matériel, profils des participants).",
      "Prise en charge effectuée et évolution. Si possible : diagnostic médical connu.",
    ],
    timingLabel: "Immédiat",
    timingDetail: "Tant que les souvenirs sont frais.",
  },
  {
    number: 3,
    color: "#16a34a",
    title: "Informer le président de l'association",
    bullets: ["Lui transmettre tous les éléments et le compte-rendu."],
    timingLabel: "Dès que possible",
    timingDetail: "Dans la journée.",
  },
  {
    number: 4,
    color: "#2563eb",
    title: "Déclarer l'accident à l'assurance FSGT",
    bullets: [
      "Obligation pour tout accident corporel d'un licencié FSGT.",
      "Remplir le formulaire de déclaration d'accident.",
      "À envoyer à l'assurance dans les 5 jours ouvrés.",
    ],
    timingLabel: "Sous 5 jours ouvrés",
    timingDetail: "Maximum.",
  },
  {
    number: 5,
    color: "#7c3aed",
    title: "Déclarer ou informer le SDJES",
    bullets: [
      "Obligation sous 48 h en cas d'accident corporel grave ou d'incident grave.",
      "À faire si : hospitalisation, urgences, détresse respiratoire, oxygénothérapie, intervention des secours, risque vital avéré.",
      "En cas de doute : contacter le SDJES pour avis.",
    ],
    timingLabel: "Sous 48 heures",
    timingDetail: "Maximum.",
  },
  {
    number: 6,
    color: "#0d9488",
    title: "Analyser l'événement et agir",
    bullets: [
      "Identifier les causes et facteurs favorisants.",
      "Mettre en place des actions correctives.",
      "Conserver le compte-rendu et tous les documents.",
    ],
    timingLabel: "Dans les jours suivants",
    timingDetail: "Pour progresser et prévenir.",
  },
];

export const PDFPageAccidentApnee = () => {
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
        padding: "20px 32px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "9px",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0c2340 0%, #1e3a5f 60%, #0891b2 100%)",
          borderRadius: "12px",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "10px",
            padding: "6px",
            flexShrink: 0,
          }}
        >
          <img src={logoTeamOxygen} alt="Team Oxygen" style={{ width: "46px", height: "auto", display: "block" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "2px", color: "#7dd3fc", textTransform: "uppercase" }}>
            Procédure d'urgence — Encadrants
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", lineHeight: 1.15, margin: "2px 0" }}>
            ACCIDENT LORS D'UNE SORTIE APNÉE
          </div>
          <div style={{ fontSize: "10px", color: "#bae6fd", fontWeight: 600 }}>
            Les actions à mener impérativement
          </div>
        </div>
      </div>

      {/* Bandeau priorité */}
      <div
        style={{
          backgroundColor: "#fef2f2",
          border: "1.5px solid #dc2626",
          borderRadius: "8px",
          padding: "7px 12px",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          ⚠ La sécurité des personnes est la priorité absolue ⚠
        </span>
      </div>

      {/* Étapes */}
      {steps.map((step) => (
        <div
          key={step.number}
          style={{
            border: `1.5px solid ${step.color}40`,
            borderRadius: "9px",
            overflow: "hidden",
            display: "flex",
            flexShrink: 0,
          }}
        >
          {/* Numéro */}
          <div
            style={{
              backgroundColor: step.color,
              width: "44px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 800,
              color: "white",
            }}
          >
            {step.number}
          </div>

          {/* Contenu */}
          <div style={{ flex: 1, padding: "7px 12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#1e3a5f", textTransform: "uppercase", lineHeight: 1.2, marginBottom: "3px" }}>
              {step.title}
            </div>
            {step.bullets.map((b, i) => (
              <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "2px" }}>
                <div style={{ width: "4px", minWidth: "4px", height: "4px", borderRadius: "50%", backgroundColor: step.color, marginTop: "5px" }} />
                <span style={{ fontSize: "9.5px", color: "#374151", lineHeight: 1.4 }}>{b}</span>
              </div>
            ))}
          </div>

          {/* Délai */}
          <div
            style={{
              width: "150px",
              flexShrink: 0,
              borderLeft: `1px solid ${step.color}30`,
              padding: "7px 10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: "10.5px", fontWeight: 800, color: step.color, textTransform: "uppercase", lineHeight: 1.2 }}>
              ⏱ {step.timingLabel}
            </div>
            <div style={{ fontSize: "8.5px", color: "#64748b", marginTop: "2px", lineHeight: 1.3 }}>{step.timingDetail}</div>
          </div>
        </div>
      ))}

      {/* Accident grave + Rappels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px", flexShrink: 0 }}>
        <Panel title="Accident grave : qu'est-ce que c'est ?" color="#dc2626" bg="#fef2f2">
          <div style={{ fontSize: "9px", color: "#7f1d1d", lineHeight: 1.45 }}>
            Hospitalisation, passage aux urgences, détresse respiratoire, oxygénothérapie,
            intervention des secours (15, pompiers, CROSS…), risque vital avéré.
          </div>
          <div style={{ marginTop: "5px", fontSize: "9px", fontWeight: 700, color: "#dc2626", lineHeight: 1.4 }}>
            En cas de doute, déclarez et demandez conseil — mieux vaut déclarer une fois de trop que pas assez.
          </div>
        </Panel>

        <Panel title="Rappels importants" color="#1e3a5f" bg="#f1f5f9">
          {[
            "Seul un compte-rendu écrit et daté protège l'association et les encadrants.",
            "Même si la victime va bien, déclarez l'accident à l'assurance.",
            "Conservez tous les documents (compte-rendu, mails, certificats, déclarations).",
            "La transparence et la réactivité sont essentielles.",
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "3px" }}>
              <div style={{ width: "4px", minWidth: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#0891b2", marginTop: "4px" }} />
              <span style={{ fontSize: "9px", color: "#374151", lineHeight: 1.4 }}>{r}</span>
            </div>
          ))}
        </Panel>
      </div>

      {/* Footer banner */}
      <div
        style={{
          marginTop: "auto",
          background: "linear-gradient(135deg, #0c2340, #0891b2)",
          borderRadius: "9px",
          padding: "9px 14px",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "10px", fontWeight: 700, color: "#ffffff", lineHeight: 1.4 }}>
          La prévention, l'anticipation et la déclaration protègent tout le monde :
          la victime, les encadrants et l'association.
        </span>
      </div>
    </div>
  );
};

const Panel = ({
  title,
  color,
  bg,
  children,
}: {
  title: string;
  color: string;
  bg: string;
  children: ReactNode;
}) => (
  <div style={{ border: `1.5px solid ${color}40`, borderRadius: "9px", overflow: "hidden" }}>
    <div style={{ backgroundColor: color, padding: "5px 11px" }}>
      <span style={{ fontSize: "10.5px", fontWeight: 700, color: "white" }}>{title}</span>
    </div>
    <div style={{ padding: "8px 11px", backgroundColor: bg }}>{children}</div>
  </div>
);
