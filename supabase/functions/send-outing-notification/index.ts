import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Team Oxygen <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  return res.json();
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { outingId, type, reason }: NotificationRequest = await req.json();

    console.log(`Processing ${type} notification for outing: ${outingId}`);

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

    const emailPromises = reservations?.map(async (reservation: any) => {
      const profile = reservation.profile;
      if (!profile?.email) return null;

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
          <p>L'équipe du club</p>
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
          <p>En cas d'empêchement, merci d'annuler votre inscription dès que possible pour libérer une place.</p>
          <p>À demain !</p>
          <p>L'équipe du club</p>
        `;

      try {
        const result = await sendEmail(profile.email, subject, htmlContent);
        console.log(`Email sent to ${profile.email}:`, result);
        return result;
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
        return null;
      }
    }) ?? [];

    await Promise.all(emailPromises);

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

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: reservations?.length ?? 0 
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
