// Fonction serverless Vercel : rendu d'aperçus de lien enrichis pour les sorties.
//
// Les réseaux (WhatsApp, Messenger, iMessage, Facebook, X…) n'exécutent PAS le
// JavaScript : ils lisent uniquement le HTML brut renvoyé par le serveur. Comme
// l'appli est une SPA, /outing/:id renvoie toujours le index.html générique.
//
// Cette fonction intercepte /outing/:id (via une réécriture dans vercel.json),
// récupère la sortie dans Supabase avec la clé publique (anon), puis renvoie le
// même index.html mais avec des balises Open Graph / Twitter enrichies (titre,
// description, image). Les vrais utilisateurs récupèrent l'appli React normale
// (le bundle JS est toujours présent) ; seuls les robots exploitent les metas.
//
// Sécurité : la clé anon est publique par nature (déjà présente dans le bundle
// front). La RLS de la table `outings` n'autorise la lecture anonyme que des
// sorties publiques (is_staff_only = false), donc une sortie réservée au staff
// ne fuitera JAMAIS dans un aperçu : on retombe alors sur l'aperçu générique.

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://hyoudezyqbivfthcgpma.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5b3VkZXp5cWJpdmZ0aGNncG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDUwNjQsImV4cCI6MjA4NTkwNTA2NH0.ChFci6QjltlJmpN7t1m2cP0suC038JvJuFJ39E2XlK4";

// Image de repli (bannière générique du club) si la sortie n'a pas de visuel.
const FALLBACK_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/MhdLQa49HgQ7wP5SaiG7PnjvCo53/social-images/social-1770364356430-1000059317.jpg";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncate(str, max) {
  const s = String(str).trim().replace(/\s+/g, " ");
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

function formatDate(dateTime) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    }).format(new Date(dateTime));
  } catch {
    return "";
  }
}

// Remplace la valeur `content` d'une balise meta ciblée par property/name.
function setMeta(html, attr, key, value) {
  const re = new RegExp(
    `(<meta ${attr}="${key}" content=")[^"]*(")`,
    "i"
  );
  if (re.test(html)) {
    return html.replace(re, `$1${value}$2`);
  }
  // La balise n'existe pas encore : on l'injecte avant </head>.
  return html.replace(
    /<\/head>/i,
    `  <meta ${attr}="${key}" content="${value}" />\n</head>`
  );
}

async function fetchShell(origin) {
  const res = await fetch(`${origin}/index.html`);
  return res.text();
}

async function fetchOuting(id) {
  const params = new URLSearchParams({
    id: `eq.${id}`,
    is_deleted: "eq.false",
    select: "title,description,location,date_time,cover_image_url,photos",
    limit: "1",
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/outings?${params}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export default async function handler(req, res) {
  const id = req.query.id;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const origin = `${proto}://${req.headers.host}`;

  let html = await fetchShell(origin);

  try {
    const outing = id ? await fetchOuting(id) : null;

    if (outing) {
      const title = truncate(outing.title || "Sortie Team Oxygen", 90);

      const dateStr = outing.date_time ? formatDate(outing.date_time) : "";
      const parts = [];
      if (dateStr) parts.push(dateStr.charAt(0).toUpperCase() + dateStr.slice(1));
      if (outing.location) parts.push(outing.location);
      let description = parts.join(" · ");
      if (outing.description) {
        description += (description ? " — " : "") + outing.description;
      }
      description = truncate(description || "Sortie du club Team Oxygen", 200);

      const image =
        outing.cover_image_url ||
        (Array.isArray(outing.photos) && outing.photos[0]) ||
        FALLBACK_IMAGE;

      const t = escapeHtml(title);
      const d = escapeHtml(description);
      const img = escapeHtml(image);
      const url = escapeHtml(`${origin}/outing/${id}`);

      html = html.replace(/<title>[^<]*<\/title>/i, `<title>${t}</title>`);
      html = setMeta(html, "name", "description", d);
      html = setMeta(html, "property", "og:title", t);
      html = setMeta(html, "property", "og:description", d);
      html = setMeta(html, "property", "og:image", img);
      html = setMeta(html, "property", "og:url", url);
      html = setMeta(html, "name", "twitter:title", t);
      html = setMeta(html, "name", "twitter:description", d);
      html = setMeta(html, "name", "twitter:image", img);
    }
  } catch (err) {
    // En cas d'erreur, on renvoie le shell générique inchangé : l'appli
    // fonctionne, seul l'aperçu enrichi est perdu.
    console.error("outing OG error", err);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=600, stale-while-revalidate=86400"
  );
  return res.status(200).send(html);
}
