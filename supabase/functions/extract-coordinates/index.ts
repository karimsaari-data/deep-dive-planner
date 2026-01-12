import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract coordinates from a Google Maps URL
async function extractCoordinates(mapsUrl: string): Promise<{ lat: number; lng: number } | null> {
  try {
    console.log(`Processing URL: ${mapsUrl}`);
    
    // Follow redirects to get the full URL
    const response = await fetch(mapsUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    const finalUrl = response.url;
    console.log(`Final URL: ${finalUrl}`);
    
    // Try multiple patterns to extract coordinates
    
    // Pattern 1: @lat,lng in URL path (most common)
    const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    let match = finalUrl.match(atPattern);
    
    if (match) {
      console.log(`Found coordinates with @ pattern: ${match[1]}, ${match[2]}`);
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    
    // Pattern 2: !3d and !4d in URL (place URLs)
    const dPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
    match = finalUrl.match(dPattern);
    
    if (match) {
      console.log(`Found coordinates with !3d!4d pattern: ${match[1]}, ${match[2]}`);
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    
    // Pattern 3: ll= query parameter
    const llPattern = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    match = finalUrl.match(llPattern);
    
    if (match) {
      console.log(`Found coordinates with ll= pattern: ${match[1]}, ${match[2]}`);
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    
    // Pattern 4: q= query parameter with coordinates
    const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    match = finalUrl.match(qPattern);
    
    if (match) {
      console.log(`Found coordinates with q= pattern: ${match[1]}, ${match[2]}`);
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    
    // If no pattern matched, try to parse the HTML for coordinates
    const html = await response.text();
    
    // Look for coordinates in the HTML content
    const htmlPattern = /"(-?\d{1,3}\.\d+)",\s*"(-?\d{1,3}\.\d+)"/;
    match = html.match(htmlPattern);
    
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      // Validate that they look like valid coordinates
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        console.log(`Found coordinates in HTML: ${lat}, ${lng}`);
        return { lat, lng };
      }
    }
    
    console.log("No coordinates found");
    return null;
  } catch (error) {
    console.error(`Error extracting coordinates from ${mapsUrl}:`, error);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Require authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user token using getClaims
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.log("Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log(`Authenticated user: ${userId}`);

    // Check admin role using service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAdmin = userRoles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      console.log(`User ${userId} is not an admin`);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Admin access granted for user ${userId}`);

    // Check if a specific location ID is provided (for single location update)
    let locationId: string | null = null;
    let forceUpdate = false;
    
    if (req.method === "POST") {
      try {
        const body = await req.json();
        locationId = body.locationId || null;
        forceUpdate = body.forceUpdate || false;
        console.log(`Received request for locationId: ${locationId}, forceUpdate: ${forceUpdate}`);
      } catch {
        // No body or invalid JSON, proceed with batch processing
      }
    }

    let query = supabase
      .from("locations")
      .select("id, name, maps_url, latitude, longitude")
      .not("maps_url", "is", null);

    // If a specific location is requested, filter by ID
    if (locationId) {
      query = query.eq("id", locationId);
    }

    const { data: locations, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${locations?.length ?? 0} locations to process`);

    const results: { name: string; success: boolean; coordinates?: { lat: number; lng: number } }[] = [];

    for (const location of locations ?? []) {
      // Skip if already has coordinates AND not forcing update
      if (location.latitude && location.longitude && !forceUpdate) {
        console.log(`Skipping ${location.name} - already has coordinates (use forceUpdate to override)`);
        results.push({ 
          name: location.name, 
          success: true, 
          coordinates: { lat: location.latitude, lng: location.longitude } 
        });
        continue;
      }

      if (!location.maps_url) {
        console.log(`Skipping ${location.name} - no maps_url`);
        results.push({ name: location.name, success: false });
        continue;
      }

      console.log(`Extracting coordinates for ${location.name}...`);
      const coordinates = await extractCoordinates(location.maps_url);

      if (coordinates) {
        // Update the location with coordinates
        const { error: updateError } = await supabase
          .from("locations")
          .update({
            latitude: coordinates.lat,
            longitude: coordinates.lng,
          })
          .eq("id", location.id);

        if (updateError) {
          console.error(`Error updating ${location.name}:`, updateError);
          results.push({ name: location.name, success: false });
        } else {
          console.log(`Updated ${location.name} with coordinates: ${coordinates.lat}, ${coordinates.lng}`);
          results.push({ name: location.name, success: true, coordinates });
        }
      } else {
        console.log(`No coordinates found for ${location.name}`);
        results.push({ name: location.name, success: false });
      }

      // Small delay to avoid rate limiting (only in batch mode)
      if (!locationId) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Coordonnées extraites pour ${successCount}/${results.length} lieux`,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in extract-coordinates:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
