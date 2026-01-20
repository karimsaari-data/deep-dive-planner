import { PDFPageWrapper } from "../PDFPageWrapper";

// SVG icons for PDF (inline to ensure they render in html2canvas)
const FacebookIcon = () => (
  <div style={{ 
    width: "48px", 
    height: "48px", 
    backgroundColor: "#1877F2", 
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  </div>
);

const InstagramIcon = () => (
  <div style={{ 
    width: "48px", 
    height: "48px", 
    background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", 
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  </div>
);

const LinkedInIcon = () => (
  <div style={{ 
    width: "48px", 
    height: "48px", 
    backgroundColor: "#0A66C2", 
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect width="4" height="12" x="2" y="9"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  </div>
);

const MapPinIcon = ({ color }: { color: string }) => (
  <div style={{ 
    width: "48px", 
    height: "48px", 
    backgroundColor: color, 
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  </div>
);

const AnchorIcon = () => (
  <div style={{ 
    width: "48px", 
    height: "48px", 
    backgroundColor: "#0891b2", 
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3"/>
      <line x1="12" x2="12" y1="22" y2="8"/>
      <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
    </svg>
  </div>
);

export const CONTACT_LINKS = {
  facebook: "https://www.facebook.com/share/1CXDANishJ/",
  instagram: "https://www.instagram.com/teamoxygen13",
  linkedin: "https://www.linkedin.com/company/team-oxygen/",
  siege: "https://maps.app.goo.gl/ApTRvvPsovBQaiZu9",
  local: "https://maps.app.goo.gl/ks6MUfDFpLx8RLyL7",
};

interface PDFPageContactProps {
  pageNumber?: number;
}

export const PDFPageContact = ({ pageNumber }: PDFPageContactProps) => {
  const socialLinks = [
    { 
      name: "Facebook", 
      icon: <FacebookIcon />, 
      url: "facebook.com/share/1CXDANishJ",
      fullUrl: CONTACT_LINKS.facebook
    },
    { 
      name: "Instagram", 
      icon: <InstagramIcon />, 
      url: "instagram.com/teamoxygen13",
      fullUrl: CONTACT_LINKS.instagram
    },
    { 
      name: "LinkedIn", 
      icon: <LinkedInIcon />, 
      url: "linkedin.com/company/team-oxygen",
      fullUrl: CONTACT_LINKS.linkedin
    },
  ];

  const locations = [
    { 
      name: "Siège Social", 
      icon: <MapPinIcon color="#dc2626" />, 
      address: "Association Team Oxygen",
      url: "maps.app.goo.gl/ApTRvvPsovBQaiZu9",
      fullUrl: CONTACT_LINKS.siege
    },
    { 
      name: "Local Club", 
      icon: <AnchorIcon />, 
      address: "Base nautique",
      url: "maps.app.goo.gl/ks6MUfDFpLx8RLyL7",
      fullUrl: CONTACT_LINKS.local
    },
  ];

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <div style={{ 
            width: "40px", 
            height: "40px", 
            backgroundColor: "#1e3a5f", 
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e3a5f", margin: 0 }}>
            Restons Connectés
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", flex: 1 }}>
          {/* Social Networks Column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>
                Nos Réseaux Sociaux
              </h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {socialLinks.map((link) => (
                <div 
                  key={link.name} 
                  data-link-type="social"
                  data-link-name={link.name.toLowerCase()}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "16px", 
                    padding: "20px", 
                    backgroundColor: "#ffffff", 
                    borderRadius: "12px", 
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                  }}
                >
                  {link.icon}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 4px 0" }}>
                      {link.name}
                    </h3>
                    <p style={{ fontSize: "13px", color: "#0891b2", margin: 0, textDecoration: "underline" }}>
                      {link.url}
                    </p>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" x2="21" y1="14" y2="3"/>
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Locations Column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>
                Nos Localisations
              </h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {locations.map((loc) => (
                <div 
                  key={loc.name} 
                  data-link-type="location"
                  data-link-name={loc.name.includes("Siège") ? "siege" : "local"}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "16px", 
                    padding: "20px", 
                    backgroundColor: "#ffffff", 
                    borderRadius: "12px", 
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                  }}
                >
                  {loc.icon}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 4px 0" }}>
                      {loc.name}
                    </h3>
                    <p style={{ fontSize: "12px", color: "#666666", margin: "0 0 2px 0" }}>
                      {loc.address}
                    </p>
                    <p style={{ fontSize: "13px", color: "#0891b2", margin: 0, textDecoration: "underline" }}>
                      {loc.url}
                    </p>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" x2="21" y1="14" y2="3"/>
                  </svg>
                </div>
              ))}
            </div>

            {/* Club Banner */}
            <div style={{ 
              marginTop: "32px", 
              padding: "24px", 
              background: "linear-gradient(135deg, #1e3a5f 0%, #0891b2 100%)", 
              borderRadius: "12px", 
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(30, 58, 95, 0.3)"
            }}>
              <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", margin: "0 0 8px 0" }}>
                Team Oxygen - Eco Exploration
              </h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.9)", margin: 0 }}>
                Club d'apnée éco-responsable à Marseille
              </p>
              <div style={{ 
                marginTop: "12px", 
                display: "flex", 
                justifyContent: "center", 
                gap: "8px" 
              }}>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", padding: "4px 10px", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "20px" }}>
                  🌊 Apnée
                </span>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", padding: "4px 10px", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "20px" }}>
                  🌿 Éco-responsable
                </span>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", padding: "4px 10px", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "20px" }}>
                  🤝 Convivialité
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PDFPageWrapper>
  );
};
