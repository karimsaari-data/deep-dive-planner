import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("BREVO_SMTP_KEY")!;
  
  console.log(`Attempting to send email to ${to} via Brevo HTTP API`);
  
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
      to: [{ email: to, name: to }],
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to } = await req.json();
    
    if (!to) {
      return new Response(
        JSON.stringify({ error: "Email 'to' is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending test email to ${to} via Brevo HTTP API`);

    const result = await sendEmail(
      to,
      "✅ Test API Brevo - Team Oxygen",
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0EA5E9;">🎉 Configuration API Brevo réussie !</h1>
          <p>Félicitations ! Cet email confirme que la configuration de l'API HTTP Brevo fonctionne parfaitement.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <h2>Détails de la configuration :</h2>
          <ul>
            <li><strong>API Endpoint :</strong> https://api.brevo.com/v3/smtp/email</li>
            <li><strong>Méthode :</strong> HTTP POST (plus stable que SMTP)</li>
            <li><strong>Expéditeur :</strong> Team Oxygen (karimsaari.com@gmail.com)</li>
            <li><strong>Mode :</strong> Production</li>
          </ul>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Cet email a été envoyé automatiquement depuis l'application Team Oxygen via l'API Brevo.
          </p>
        </div>
      `
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email de test envoyé avec succès à ${to}`,
        messageId: result.messageId
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-test-email:", error);
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
