import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    // Verify caller is an admin
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check that caller has admin role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return new Response(JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Cascade-delete all data linked to this member. Tables reference public.profiles
    // (not auth.users) with NO ACTION, so we must remove child rows explicitly and in
    // dependency order. Outings and equipment_inventory cascade to their own children.
    const steps: Array<[string, Promise<{ error: unknown }>]> = [
      ["reservations", supabaseAdmin.from("reservations").delete().eq("user_id", userId)],
      ["outings", supabaseAdmin.from("outings").delete().eq("organizer_id", userId)],
      ["equipment_inventory", supabaseAdmin.from("equipment_inventory").delete().eq("owner_id", userId)],
      ["equipment_history.created_by", supabaseAdmin.from("equipment_history").delete().eq("created_by", userId)],
      ["equipment_history.from_user_id", supabaseAdmin.from("equipment_history").delete().eq("from_user_id", userId)],
      ["equipment_history.to_user_id", supabaseAdmin.from("equipment_history").delete().eq("to_user_id", userId)],
      ["user_roles", supabaseAdmin.from("user_roles").delete().eq("user_id", userId)],
      ["profiles", supabaseAdmin.from("profiles").delete().eq("id", userId)],
    ];

    for (const [name, query] of steps) {
      const { error } = await query;
      if (error) throw new Error(`Echec suppression ${name}: ${(error as { message?: string }).message ?? error}`);
    }

    // Remove the auth account last. Tolerate "user not found" so orphan profiles
    // (no matching auth.users row) can still be cleaned up without erroring.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      const msg = (deleteError as { message?: string; status?: number }).message ?? "";
      const status = (deleteError as { status?: number }).status;
      const notFound = status === 404 || /not found/i.test(msg);
      if (!notFound) throw deleteError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in delete-user:", error);
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
