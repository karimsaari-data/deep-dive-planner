import { PDFPageWrapper } from "../PDFPageWrapper";

export const PDFPageContact = () => {
  const socialLinks = [
    { name: "Facebook", icon: "📘", url: "facebook.com/share/1CXDANishJ" },
    { name: "Instagram", icon: "📸", url: "instagram.com/teamoxygen13" },
    { name: "LinkedIn", icon: "💼", url: "linkedin.com/company/team-oxygen" },
  ];

  const locations = [
    { name: "Siège Social", icon: "🏠", url: "maps.app.goo.gl/ApTRvvPsovBQaiZu9" },
    { name: "Local Club", icon: "🏊", url: "maps.app.goo.gl/ks6MUfDFpLx8RLyL7" },
  ];

  return (
    <PDFPageWrapper pageNumber={12}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <span style={{ fontSize: "28px" }}>📱</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e3a5f", margin: 0 }}>
            Restons Connectés
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", flex: 1 }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 20px 0" }}>
              🌐 Nos Réseaux Sociaux
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {socialLinks.map((link) => (
                <div key={link.name} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "40px" }}>{link.icon}</span>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 4px 0" }}>{link.name}</h3>
                    <p style={{ fontSize: "13px", color: "#0891b2", margin: 0 }}>{link.url}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 20px 0" }}>
              📍 Nos Localisations
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {locations.map((loc) => (
                <div key={loc.name} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "40px" }}>{loc.icon}</span>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 4px 0" }}>{loc.name}</h3>
                    <p style={{ fontSize: "13px", color: "#0891b2", margin: 0 }}>{loc.url}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "32px", padding: "24px", backgroundColor: "#fff7ed", borderRadius: "12px", border: "2px solid #e67e22", textAlign: "center" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#e67e22", margin: "0 0 8px 0" }}>
                Team Oxygen - Eco Exploration
              </h3>
              <p style={{ fontSize: "14px", color: "#666666", margin: 0 }}>
                Club d'apnée éco-responsable à Marseille
              </p>
            </div>
          </div>
        </div>
      </div>
    </PDFPageWrapper>
  );
};
