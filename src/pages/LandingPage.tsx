import { Link } from "react-router-dom";
import logoTeamOxygen from "@/assets/logo-team-oxygen-transparent.png";

const BUBBLES = [
  { left: "7%",  size: 4,  delay: "0s",    dur: "9s"    },
  { left: "15%", size: 3,  delay: "3s",    dur: "11s"   },
  { left: "22%", size: 6,  delay: "1s",    dur: "8s"    },
  { left: "33%", size: 3,  delay: "4s",    dur: "10s"   },
  { left: "44%", size: 5,  delay: "0.5s",  dur: "9.5s"  },
  { left: "55%", size: 3,  delay: "2s",    dur: "12s"   },
  { left: "63%", size: 7,  delay: "1.5s",  dur: "8.5s"  },
  { left: "72%", size: 4,  delay: "3.5s",  dur: "10.5s" },
  { left: "80%", size: 5,  delay: "0.8s",  dur: "9s"    },
  { left: "88%", size: 3,  delay: "2.8s",  dur: "11.5s" },
  { left: "38%", size: 4,  delay: "1.2s",  dur: "8s"    },
  { left: "58%", size: 5,  delay: "5s",    dur: "10s"   },
];

const KEYFRAMES = `
  @keyframes bubble-rise {
    0%   { transform: translateY(0) translateX(0);       opacity: 0;   }
    10%  { opacity: 0.55; }
    85%  { opacity: 0.2;  }
    100% { transform: translateY(-105vh) translateX(12px); opacity: 0; }
  }
  @keyframes ray-pulse {
    0%, 100% { opacity: 0.06; }
    50%       { opacity: 0.14; }
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  .myox-bubble  { animation: bubble-rise linear infinite; }
  .myox-ray     { animation: ray-pulse ease-in-out infinite; }
  .myox-fade-1  { animation: fade-up 0.9s ease forwards; animation-delay: 0.1s; opacity: 0; }
  .myox-fade-2  { animation: fade-up 0.9s ease forwards; animation-delay: 0.35s; opacity: 0; }
  .myox-fade-3  { animation: fade-up 0.9s ease forwards; animation-delay: 0.6s; opacity: 0; }
`;

const LandingPage = () => (
  <>
    <style>{KEYFRAMES}</style>

    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{
        background:
          "linear-gradient(168deg, #010c1c 0%, #051828 18%, #082d50 40%, #0b4f72 60%, #0d6f82 76%, #0e8c88 100%)",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* ── Light rays ───────────────────────────────────────────── */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="myox-ray-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#a8dcf0" stopOpacity="1" />
            <stop offset="60%"  stopColor="#a8dcf0" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#a8dcf0" stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon className="myox-ray" style={{ animationDuration: "5s",   animationDelay: "0s"   }} points="43,0 49,0 70,100 26,100" fill="url(#myox-ray-grad)" />
        <polygon className="myox-ray" style={{ animationDuration: "6.5s", animationDelay: "1.5s" }} points="47,0 51,0 58,100 42,100" fill="url(#myox-ray-grad)" />
        <polygon className="myox-ray" style={{ animationDuration: "4.5s", animationDelay: "0.8s" }} points="44,0 46,0 49,100 39,100" fill="url(#myox-ray-grad)" />
        <polygon className="myox-ray" style={{ animationDuration: "5.8s", animationDelay: "2.5s" }} points="51,0 55,0 76,100 58,100" fill="url(#myox-ray-grad)" />
        <polygon className="myox-ray" style={{ animationDuration: "6s",   animationDelay: "1s"   }} points="38,0 42,0 42,100 18,100" fill="url(#myox-ray-grad)" />
        <polygon className="myox-ray" style={{ animationDuration: "4.2s", animationDelay: "3.2s" }} points="56,0 59,0 82,100 70,100" fill="url(#myox-ray-grad)" />
      </svg>

      {/* ── Bubbles ───────────────────────────────────────────────── */}
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          className="myox-bubble absolute rounded-full"
          style={{
            left:   b.left,
            bottom: "-20px",
            width:  `${b.size}px`,
            height: `${b.size}px`,
            border: "1px solid rgba(180,230,255,0.28)",
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0.02))",
            animationDelay:    b.delay,
            animationDuration: b.dur,
          }}
        />
      ))}

      {/* ── Vignette bottom ───────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(1,12,28,0.55) 0%, transparent 100%)",
        }}
      />

      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-7">
        <div className="flex items-center gap-3">
          <img
            src={logoTeamOxygen}
            alt="MyOxygen"
            className="h-8 w-8 object-contain"
            style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }}
          />
          <span
            className="text-sm font-semibold text-white/85 tracking-widest uppercase"
          >
            My Oxygen
          </span>
        </div>

        <Link
          to="/auth"
          className="text-sm font-medium text-white/70 tracking-wide transition-colors duration-200 hover:text-white"
        >
          Se connecter
        </Link>
      </nav>

      {/* ── Hero content ──────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 z-20 px-10 pb-20 md:px-16 md:pb-28 max-w-2xl">
        <p
          className="myox-fade-1 mb-3 text-xs font-semibold tracking-widest text-white/50 uppercase"
          style={{ letterSpacing: "0.25em" }}
        >
          Association d'apnée • Côte bleue – Marseille
        </p>

        <h1
          className="myox-fade-2 mb-6 font-bold text-white"
          style={{
            fontSize: "clamp(3rem, 8vw, 6rem)",
            letterSpacing: "0.1em",
            textShadow: "0 4px 60px rgba(0,0,0,0.45)",
            lineHeight: 1,
          }}
        >
          MYOXYGEN
        </h1>

        <p
          className="myox-fade-2 mb-10 text-base text-white/60 leading-relaxed md:text-lg"
        >
          Planifiez vos sorties en apnée et gérez<br />
          vos plongées en toute sécurité.
        </p>

        <div className="myox-fade-3">
          <Link to="/auth">
            <button
              className="border border-white/70 bg-white px-10 py-3 text-xs font-bold text-[#082d50] transition-all duration-200 hover:bg-transparent hover:text-white"
              style={{ letterSpacing: "0.22em" }}
            >
              COMMENCER
            </button>
          </Link>
        </div>
      </div>
    </div>
  </>
);

export default LandingPage;
