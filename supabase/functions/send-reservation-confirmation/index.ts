import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  console.log(`Sending email to ${to} with subject: ${subject}`);
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
  const result = await res.json();
  console.log("Email send result:", result);
  return result;
}

interface ConfirmationRequest {
  outingId: string;
  userId: string;
  type: "confirmation" | "cancellation";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { outingId, userId, type }: ConfirmationRequest = await req.json();

    console.log(`Processing ${type} for user ${userId} on outing ${outingId}`);

    // Get outing details with organizer
    const { data: outing, error: outingError } = await supabase
      .from("outings")
      .select(`
        *,
        organizer:profiles!outings_organizer_id_fkey(first_name, last_name),
        location_details:locations(name, address, maps_url)
      `)
      .eq("id", outingId)
      .single();

    if (outingError || !outing) {
      console.error("Outing not found:", outingError);
      throw new Error("Sortie non trouvée");
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", userId)
      .single();

    if (userError || !userProfile?.email) {
      console.error("User not found:", userError);
      throw new Error("Utilisateur non trouvé");
    }

    const dateFormatted = new Date(outing.date_time).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const organizerName = outing.organizer 
      ? `${outing.organizer.first_name} ${outing.organizer.last_name}`
      : "L'équipe";

    const locationName = outing.location_details?.name || outing.location;
    const locationAddress = outing.location_details?.address || "";
    const mapsUrl = outing.location_details?.maps_url || "";

    let subject: string;
    let htmlContent: string;

    if (type === "confirmation") {
      subject = `✅ Inscription confirmée : ${outing.title}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0066cc, #0099ff); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .info-box { background: white; border-radius: 8px; padding: 15px; margin: 15px 0; border-left: 4px solid #0066cc; }
            .safety-box { background: #fff3cd; border-radius: 8px; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107; }
            .safety-box h3 { color: #856404; margin-top: 0; }
            .safety-box ul { margin: 10px 0; padding-left: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌊 Inscription Confirmée !</h1>
            </div>
            <div class="content">
              <p>Bonjour ${userProfile.first_name},</p>
              <p>Votre inscription à la sortie <strong>${outing.title}</strong> est confirmée !</p>
              
              <div class="info-box">
                <h3>📋 Informations de la sortie</h3>
                <p><strong>📅 Date :</strong> ${dateFormatted}</p>
                <p><strong>📍 Lieu :</strong> ${locationName}</p>
                ${locationAddress ? `<p><strong>🗺️ Adresse :</strong> ${locationAddress}</p>` : ""}
                <p><strong>👤 Encadrant :</strong> ${organizerName}</p>
                ${mapsUrl ? `<p><a href="${mapsUrl}" class="button" target="_blank">🧭 Voir sur la carte</a></p>` : ""}
              </div>

              ${outing.description ? `
              <div class="info-box">
                <h3>💬 Message de l'encadrant</h3>
                <p>${outing.description}</p>
              </div>
              ` : ""}

              <div class="safety-box">
                <h3>⚠️ Rappel Sécurité AIDA</h3>
                <p>Pour votre sécurité et celle des autres, veuillez respecter ces règles essentielles :</p>
                <ul>
                  <li><strong>Binôme obligatoire</strong> : Ne jamais plonger seul, toujours avoir un binôme de sécurité en surface.</li>
                  <li><strong>Ne jamais forcer</strong> : Écoutez votre corps, ne forcez jamais une apnée. Si vous ressentez des difficultés, remontez immédiatement.</li>
                  <li><strong>Respiration de sécurité</strong> : En surface, effectuez toujours plusieurs respirations de récupération lentes et profondes avant de communiquer avec votre binôme.</li>
                  <li><strong>Signes de détresse</strong> : Surveillez les signes de syncope (perte de contrôle moteur, regard fixe) chez votre binôme.</li>
                  <li><strong>Hydratation</strong> : Restez bien hydraté avant et après les plongées.</li>
                </ul>
              </div>

              <p>En cas d'empêchement, merci d'annuler votre inscription dès que possible pour libérer une place.</p>
              
              <p>À bientôt dans l'eau ! 🐠</p>
            </div>
            <div class="footer">
              <p>Team Oxygen - Club d'Apnée</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Cancellation by member
      subject = `❌ Désinscription confirmée : ${outing.title}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6c757d; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .info-box { background: white; border-radius: 8px; padding: 15px; margin: 15px 0; border-left: 4px solid #6c757d; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Désinscription Confirmée</h1>
            </div>
            <div class="content">
              <p>Bonjour ${userProfile.first_name},</p>
              <p>Nous confirmons que votre désinscription à la sortie suivante a bien été prise en compte :</p>
              
              <div class="info-box">
                <p><strong>📋 Sortie :</strong> ${outing.title}</p>
                <p><strong>📅 Date :</strong> ${dateFormatted}</p>
                <p><strong>📍 Lieu :</strong> ${locationName}</p>
              </div>

              <p>Nous espérons vous retrouver lors d'une prochaine sortie !</p>
              
              <p>À bientôt,</p>
              <p>L'équipe Team Oxygen</p>
            </div>
            <div class="footer">
              <p>Team Oxygen - Club d'Apnée</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    await sendEmail(userProfile.email, subject, htmlContent);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
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
