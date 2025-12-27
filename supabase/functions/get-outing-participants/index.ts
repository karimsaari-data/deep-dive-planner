import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OutingParticipantsRequest {
  outingId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      console.error("Unauthorized: Invalid token", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { outingId }: OutingParticipantsRequest = await req.json();
    if (!outingId) {
      return new Response(JSON.stringify({ error: "outingId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate outing exists
    const { data: outing, error: outingError } = await supabase
      .from("outings")
      .select("id, organizer_id, is_deleted")
      .eq("id", outingId)
      .maybeSingle();

    if (outingError) {
      console.error("Error fetching outing:", outingError);
      throw outingError;
    }

    if (!outing || outing.is_deleted) {
      return new Response(JSON.stringify({ error: "Sortie non trouvée" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: reservations, error: resError } = await supabase
      .from("reservations")
      .select(
        `
        id,
        user_id,
        status,
        carpool_option,
        carpool_seats,
        profile:profiles(first_name, last_name, avatar_url)
      `
      )
      .eq("outing_id", outingId)
      .in("status", ["confirmé", "en_attente"]);

    if (resError) {
      console.error("Error fetching reservations:", resError);
      throw resError;
    }

    const confirmed = (reservations ?? []).filter((r) => r.status === "confirmé");
    const waitlist = (reservations ?? []).filter((r) => r.status === "en_attente");

    // Ensure organizer is present in confirmed list (older outings may not auto-register organizer)
    if (outing.organizer_id) {
      const organizerAlreadyPresent = confirmed.some(
        (r) => r.user_id === outing.organizer_id
      );

      if (!organizerAlreadyPresent) {
        const { data: organizerProfile } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .eq("id", outing.organizer_id)
          .maybeSingle();

        if (organizerProfile) {
          confirmed.unshift({
            id: `organizer-${organizerProfile.id}`,
            user_id: organizerProfile.id,
            status: "confirmé",
            carpool_option: "none",
            carpool_seats: 0,
            profile: [{
              first_name: organizerProfile.first_name,
              last_name: organizerProfile.last_name,
              avatar_url: organizerProfile.avatar_url,
            }],
          } as any);
        }
      }
    }

    return new Response(
      JSON.stringify({
        organizerId: outing.organizer_id,
        confirmed,
        waitlist,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in get-outing-participants:", error);
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
