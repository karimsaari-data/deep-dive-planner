import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const isValid = (lat: number, lng: number): boolean =>
  !Number.isNaN(lat) &&
  !Number.isNaN(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

// Try to extract coordinates from a URL/string without any network call.
function parseFromString(value: string): { lat: number; lng: number } | null {
  const num = "(-?\\d+(?:\\.\\d+)?)";
  const patterns = [
    new RegExp(`[?&](?:q|query|ll|sll|center|destination|daddr)=${num},${num}`, "i"),
    new RegExp(`@${num},${num}`),
    new RegExp(`!3d${num}!4d${num}`),
    new RegExp(`/${num},${num}`),
  ];
  for (const re of patterns) {
    const match = value.match(re);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (isValid(lat, lng)) return { lat, lng };
    }
  }
  const generic = value.match(/(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/);
  if (generic) {
    const lat = parseFloat(generic[1]);
    const lng = parseFloat(generic[2]);
    if (isValid(lat, lng)) return { lat, lng };
  }
  return null;
}

// Resolve coordinates for a maps link, following short-link redirects
// (maps.app.goo.gl, goo.gl/maps) server-side — which the browser cannot do.
async function extractCoordinates(mapsUrl: string): Promise<{ lat: number; lng: number } | null> {
  // Fast path: coordinates already present in the link itself.
  const direct = parseFromString(mapsUrl);
  if (direct) return direct;

  try {
    const response = await fetch(mapsUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
    });

    // Coordinates in the final (redirected) URL.
    const fromUrl = parseFromString(response.url);
    if (fromUrl) return fromUrl;

    // Last resort: scan the HTML body for a coordinate pair.
    const html = await response.text();
    const htmlMatch = html.match(/"(-?\d{1,3}\.\d+)",\s*"(-?\d{1,3}\.\d+)"/);
    if (htmlMatch) {
      const lat = parseFloat(htmlMatch[1]);
      const lng = parseFloat(htmlMatch[2]);
      if (isValid(lat, lng)) return { lat, lng };
    }

    return null;
  } catch (error) {
    console.error(`Error resolving ${mapsUrl}:`, error);
    return null;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Accept a batch ({ links: [{ id, url }] }) or a single ({ url }).
    const links: { id: string; url: string }[] = Array.isArray(body.links)
      ? body.links
      : body.url
        ? [{ id: body.url, url: body.url }]
        : [];

    const results: Record<string, { lat: number; lng: number }> = {};

    // Cap the batch size to keep the function responsive.
    await Promise.all(
      links.slice(0, 30).map(async ({ id, url }) => {
        if (!id || !url) return;
        const coords = await extractCoordinates(url);
        if (coords) results[id] = coords;
      })
    );

    return new Response(JSON.stringify({ coordinates: results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in resolve-maps-link:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
