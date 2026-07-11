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
        email: "email@karimsaari.com",
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
  type: "cancellation" | "reminder" | "removal";
  reason?: string;
  targetUserId?: string;
}

/**
 * Adapte le corps du mail d'annulation au motif choisi par l'organisateur.
 * Renvoie le HTML des paragraphes situés entre la salutation et la formule de fin.
 * Les motifs connus donnent un message dédié ; un motif libre garde une phrase
 * générique suivie d'une ligne « Motif : … ».
 */
function buildCancellationBody(reason: string | undefined, title: string, dateFormatted: string): string {
  const outingRef = `la sortie <strong>${title}</strong> prévue le ${dateFormatted}`;
  const normalized = (reason ?? "").trim().toLowerCase();

  switch (normalized) {
    case "météo défavorable":
      return `<p>Nous sommes au regret de vous informer que ${outingRef} est annulée en raison de conditions météo défavorables. La sécurité de tous reste notre priorité.</p>`;
    case "nombre d'inscrits insuffisant":
      return `<p>Nous sommes au regret de vous informer que ${outingRef} est annulée faute d'un nombre suffisant d'inscrits pour la maintenir dans de bonnes conditions.</p>`;
    case "encadrant indisponible":
      return `<p>Nous sommes au regret de vous informer que ${outingRef} est annulée en raison de l'indisponibilité de l'encadrant.</p>`;
    case "problème logistique":
      return `<p>Nous sommes au regret de vous informer que ${outingRef} est annulée pour un problème logistique.</p>`;
    default: {
      const base = `<p>Nous sommes au regret de vous informer que ${outingRef} a été annulée.</p>`;
      const motif = reason?.trim() ? `<p><strong>Motif :</strong> ${reason.trim()}</p>` : "";
      return base + motif;
    }
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

    const { outingId, type, reason, targetUserId }: NotificationRequest = await req.json();

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

    // Single-participant removal (e.g. not selected in a lottery draw)
    if (type === "removal") {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "targetUserId is required for a removal notification" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: reservation, error: resError } = await supabase
        .from("reservations")
        .select(`id, status, profile:profiles(email, first_name, last_name)`)
        .eq("outing_id", outingId)
        .eq("user_id", targetUserId)
        .in("status", ["confirmé", "en_attente"])
        .maybeSingle();

      if (resError) {
        console.error("Error fetching reservation:", resError);
        throw resError;
      }

      if (!reservation) {
        return new Response(
          JSON.stringify({ error: "Réservation active introuvable pour ce participant" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error: updateError } = await supabase
        .from("reservations")
        .update({ status: "annulé", cancelled_at: new Date().toISOString() })
        .eq("id", reservation.id);

      if (updateError) {
        console.error("Error updating reservation:", updateError);
        throw updateError;
      }

      const dateFormattedRemoval = new Date(outing.date_time).toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      });

      const profile = reservation.profile as any;
      let emailSent = false;
      if (profile?.email) {
        const fullName = `${profile.first_name} ${profile.last_name}`;
        const subject = `Votre place pour la sortie : ${outing.title}`;
        const defaultMessage = `Votre place pour la sortie <strong>${outing.title}</strong> prévue le ${dateFormattedRemoval} n'a malheureusement pas pu être maintenue.`;
        const htmlContent = `
          <h1>Concernant votre inscription</h1>
          <p>Bonjour ${profile.first_name},</p>
          <p>${reason || defaultMessage}</p>
          <p>Nous espérons vous retrouver lors d'une prochaine sortie !</p>
          <p>L'équipe Team Oxygen</p>
        `;
        try {
          await sendEmail(profile.email, fullName, subject, htmlContent);
          emailSent = true;
        } catch (emailError) {
          console.error(`Failed to send removal email to ${profile.email}:`, emailError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, notified: emailSent ? 1 : 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
      timeZone: "Europe/Paris",
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
          ${buildCancellationBody(reason, outing.title, dateFormatted)}
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
