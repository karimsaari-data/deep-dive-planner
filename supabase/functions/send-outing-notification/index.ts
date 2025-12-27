import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, toName: string, subject: string, html: string) {
  const apiKey = Deno.env.get("BREVO_SMTP_KEY")!;
  
  console.log(`Attempting to send email to ${to} via Brevo API`);
  
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "Team Oxygen",
        email: "karimsaari.com@gmail.com",
      },
      to: [{ email: to, name: toName }],
      subject: subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error(`Brevo API error: ${response.status} - ${errorData}`);
    throw new Error(`Brevo API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  console.log(`Email sent successfully to ${to}:`, data);
  return { success: true, messageId: data.messageId };
}

interface NotificationRequest {
  outingId: string;
  type: "cancellation" | "reminder";
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get auth header from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Unauthorized: No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create client with user's token for authorization check
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

    console.log(`User ${user.id} attempting notification request`);

    const { outingId, type, reason }: NotificationRequest = await req.json();

    // Use service role for data queries
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get outing details
    const { data: outing, error: outingError } = await supabase
      .from("outings")
      .select(`
        *,
        location_details:locations(name, address)
      `)
      .eq("id", outingId)
      .single();

    if (outingError || !outing) {
      console.error("Outing not found:", outingError);
      throw new Error("Sortie non trouvée");
    }

    // Verify user is admin or organizer of this outing
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some(r => r.role === "admin");
    const isOrganizer = outing.organizer_id === user.id;

    if (!isAdmin && !isOrganizer) {
      console.error(`User ${user.id} not authorized for outing ${outingId}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Must be admin or organizer of this outing" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing ${type} notification for outing: ${outingId} by user ${user.id}`);

    // Get all reservations with user profiles (confirmed and waitlisted)
    const { data: reservations, error: resError } = await supabase
      .from("reservations")
      .select(`
        id,
        status,
        profile:profiles(email, first_name, last_name)
      `)
      .eq("outing_id", outingId)
      .in("status", ["confirmé", "en_attente"]);

    if (resError) {
      console.error("Error fetching reservations:", resError);
      throw resError;
    }

    console.log(`Found ${reservations?.length ?? 0} reservations to notify`);

    const dateFormatted = new Date(outing.date_time).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailResults = [];
    for (const reservation of reservations ?? []) {
      const profile = reservation.profile as any;
      if (!profile?.email) continue;

      const fullName = `${profile.first_name} ${profile.last_name}`;
      const subject = type === "cancellation"
        ? `❌ Annulation de la sortie : ${outing.title}`
        : `⏰ Rappel : ${outing.title} demain`;

      const htmlContent = type === "cancellation"
        ? `
          <h1>Sortie annulée</h1>
          <p>Bonjour ${profile.first_name},</p>
          <p>Nous sommes au regret de vous informer que la sortie <strong>${outing.title}</strong> prévue le ${dateFormatted} a été annulée.</p>
          ${reason ? `<p><strong>Motif :</strong> ${reason}</p>` : ""}
          <p>Lieu : ${outing.location_details?.name || outing.location}</p>
          <p>Nous espérons vous retrouver lors d'une prochaine sortie !</p>
          <p>L'équipe Team Oxygen</p>
        `
        : `
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
        `;

      try {
        const result = await sendEmail(profile.email, fullName, subject, htmlContent);
        emailResults.push({ email: profile.email, success: true });
        console.log(`Email sent to ${profile.email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
        emailResults.push({ email: profile.email, success: false, error: String(emailError) });
      }
    }

    // If cancellation, update all reservations to cancelled
    if (type === "cancellation") {
      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          status: "annulé",
          cancelled_at: new Date().toISOString(),
        })
        .eq("outing_id", outingId)
        .in("status", ["confirmé", "en_attente"]);

      if (updateError) {
        console.error("Error updating reservations:", updateError);
      }
    }

    // Mark reminder as sent
    if (type === "reminder") {
      await supabase
        .from("outings")
        .update({ reminder_sent: true })
        .eq("id", outingId);
    }

    const successCount = emailResults.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: successCount,
        total: reservations?.length ?? 0,
        results: emailResults
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-outing-notification:", error);
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
