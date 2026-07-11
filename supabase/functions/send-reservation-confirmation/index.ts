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

interface ReservationRequest {
  outingId: string;
  type: "registration" | "cancellation" | "waitlist";
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

    console.log(`User ${user.id} requesting reservation confirmation`);

    const { outingId, type }: ReservationRequest = await req.json();

    // Use service role for data queries
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      throw new Error("Profil non trouvé");
    }

    // Get outing details
    const { data: outing, error: outingError } = await supabase
      .from("outings")
      .select(`
        *,
        location_details:locations(name, address),
        organizer:profiles!outings_organizer_id_fkey(first_name, last_name, email)
      `)
      .eq("id", outingId)
      .single();

    if (outingError || !outing) {
      console.error("Outing not found:", outingError);
      throw new Error("Sortie non trouvée");
    }

    console.log(`Processing ${type} confirmation for outing: ${outing.title}`);

    const dateFormatted = new Date(outing.date_time).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    });

    const fullName = `${profile.first_name} ${profile.last_name}`;
    let subject: string;
    let htmlContent: string;

    if (type === "registration") {
      subject = `✅ Inscription confirmée : ${outing.title}`;
      htmlContent = `
        <h1>Inscription confirmée !</h1>
        <p>Bonjour ${profile.first_name},</p>
        <p>Votre inscription à la sortie <strong>${outing.title}</strong> a bien été prise en compte.</p>
        <h2>📅 Détails de la sortie</h2>
        <ul>
          <li><strong>Date :</strong> ${dateFormatted}</li>
          <li><strong>Type :</strong> ${outing.outing_type}</li>
          <li><strong>Lieu :</strong> ${outing.location_details?.name || outing.location}</li>
          ${outing.location_details?.address ? `<li><strong>Adresse :</strong> ${outing.location_details.address}</li>` : ""}
          ${outing.organizer ? `<li><strong>Organisateur :</strong> ${outing.organizer.first_name} ${outing.organizer.last_name}</li>` : ""}
        </ul>
        ${outing.description ? `<p><strong>Description :</strong> ${outing.description}</p>` : ""}
        <p>En cas d'empêchement, merci d'annuler votre inscription dès que possible pour libérer une place.</p>
        <p>À bientôt !</p>
        <p>L'équipe Team Oxygen</p>
      `;
    } else if (type === "waitlist") {
      subject = `⏳ Liste d'attente : ${outing.title}`;
      htmlContent = `
        <h1>Vous êtes sur liste d'attente</h1>
        <p>Bonjour ${profile.first_name},</p>
        <p>La sortie <strong>${outing.title}</strong> est actuellement complète, mais vous avez été ajouté(e) à la liste d'attente.</p>
        <h2>📅 Détails de la sortie</h2>
        <ul>
          <li><strong>Date :</strong> ${dateFormatted}</li>
          <li><strong>Type :</strong> ${outing.outing_type}</li>
          <li><strong>Lieu :</strong> ${outing.location_details?.name || outing.location}</li>
        </ul>
        <p>Vous serez automatiquement inscrit(e) si une place se libère. Nous vous enverrons un email de confirmation dans ce cas.</p>
        <p>L'équipe Team Oxygen</p>
      `;
    } else {
      subject = `❌ Désinscription : ${outing.title}`;
      htmlContent = `
        <h1>Désinscription confirmée</h1>
        <p>Bonjour ${profile.first_name},</p>
        <p>Votre désinscription de la sortie <strong>${outing.title}</strong> prévue le ${dateFormatted} a bien été prise en compte.</p>
        <p>Nous espérons vous retrouver lors d'une prochaine sortie !</p>
        <p>L'équipe Team Oxygen</p>
      `;
    }

    try {
      await sendEmail(profile.email, fullName, subject, htmlContent);
      console.log(`Confirmation email sent to ${profile.email}`);

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (emailError) {
      console.error(`Failed to send email to ${profile.email}:`, emailError);
      return new Response(
        JSON.stringify({ success: false, error: String(emailError) }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in send-reservation-confirmation:", error);
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
