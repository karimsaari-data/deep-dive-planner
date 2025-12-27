import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  const client = new SMTPClient({
    connection: {
      hostname: "smtp-relay.brevo.com",
      port: 587,
      tls: true,
      auth: {
        username: Deno.env.get("BREVO_SMTP_USER")!,
        password: Deno.env.get("BREVO_SMTP_KEY")!,
      },
    },
  });

  try {
    await client.send({
      from: "Team Oxygen <noreply@teamoxygen.fr>",
      to: to,
      subject: subject,
      content: "auto",
      html: html,
    });
    console.log(`Email sent successfully to ${to}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  } finally {
    await client.close();
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

    // Authorization check: either cron secret or admin user
    const authHeader = req.headers.get("Authorization");
    
    // Check for cron secret authorization
    if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
      console.log("Authorized via CRON_SECRET");
    } else if (authHeader) {
      // Check for admin user authorization
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
      if (userError || !user) {
        console.error("Unauthorized: Invalid token", userError);
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid token" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Use service role to check if user is admin
      const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
      const { data: userRoles } = await supabaseService
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAdmin = userRoles?.some(r => r.role === "admin");
      if (!isAdmin) {
        console.error(`User ${user.id} is not an admin`);
        return new Response(
          JSON.stringify({ error: "Unauthorized: Admin access required" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log(`Authorized via admin user: ${user.id}`);
    } else {
      console.error("Unauthorized: No authorization provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization provided" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting reminder check...");

    // Find outings happening in the next 24-26 hours that haven't had reminders sent
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in26Hours = new Date(now.getTime() + 26 * 60 * 60 * 1000);

    const { data: upcomingOutings, error: outingsError } = await supabase
      .from("outings")
      .select(`
        *,
        location_details:locations(name, address)
      `)
      .eq("reminder_sent", false)
      .gte("date_time", in24Hours.toISOString())
      .lte("date_time", in26Hours.toISOString());

    if (outingsError) {
      console.error("Error fetching outings:", outingsError);
      throw outingsError;
    }

    console.log(`Found ${upcomingOutings?.length ?? 0} outings needing reminders`);

    let totalNotified = 0;

    for (const outing of upcomingOutings ?? []) {
      // Get confirmed reservations
      const { data: reservations, error: resError } = await supabase
        .from("reservations")
        .select(`
          id,
          profile:profiles(email, first_name, last_name)
        `)
        .eq("outing_id", outing.id)
        .eq("status", "confirmé");

      if (resError) {
        console.error(`Error fetching reservations for ${outing.id}:`, resError);
        continue;
      }

      const dateFormatted = new Date(outing.date_time).toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      for (const reservation of reservations ?? []) {
        const profile = reservation.profile as any;
        if (!profile?.email) continue;

        try {
          await sendEmail(
            profile.email,
            `⏰ Rappel : ${outing.title} demain`,
            `
              <h1>Rappel de sortie</h1>
              <p>Bonjour ${profile.first_name},</p>
              <p>Nous vous rappelons que vous êtes inscrit(e) à la sortie <strong>${outing.title}</strong> prévue demain :</p>
              <ul>
                <li><strong>Date :</strong> ${dateFormatted}</li>
                <li><strong>Lieu :</strong> ${outing.location_details?.name || outing.location}</li>
                ${outing.location_details?.address ? `<li><strong>Adresse :</strong> ${outing.location_details.address}</li>` : ""}
              </ul>
              <h2>⚠️ Rappels de sécurité AIDA</h2>
              <ul>
                <li>Ne jamais pratiquer l'apnée seul</li>
                <li>Toujours avoir un binôme de surveillance</li>
                <li>Respecter les temps de récupération entre les apnées</li>
                <li>S'hydrater correctement avant et après la session</li>
                <li>Signaler tout malaise ou fatigue à l'encadrant</li>
              </ul>
              <p>En cas d'empêchement, merci d'annuler votre inscription dès que possible pour libérer une place.</p>
              <p>À demain !</p>
              <p>L'équipe Team Oxygen</p>
            `
          );
          totalNotified++;
          console.log(`Reminder sent to ${profile.email} for outing ${outing.title}`);
        } catch (emailError) {
          console.error(`Failed to send reminder to ${profile.email}:`, emailError);
        }
      }

      // Mark reminder as sent
      await supabase
        .from("outings")
        .update({ reminder_sent: true })
        .eq("id", outing.id);
    }

    console.log(`Reminder process completed. Total notified: ${totalNotified}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        outingsProcessed: upcomingOutings?.length ?? 0,
        totalNotified 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-reminders:", error);
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
