import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    console.log(`Attempting to send test email to ${to}`);
    console.log(`SMTP User: ${Deno.env.get("BREVO_SMTP_USER")}`);

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
        subject: "✅ Test SMTP Brevo - Team Oxygen",
        content: "auto",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0EA5E9;">🎉 Configuration SMTP réussie !</h1>
            <p>Félicitations ! Cet email confirme que la configuration SMTP Brevo fonctionne parfaitement.</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
            <h2>Détails de la configuration :</h2>
            <ul>
              <li><strong>Serveur SMTP :</strong> smtp-relay.brevo.com</li>
              <li><strong>Port :</strong> 587</li>
              <li><strong>Expéditeur :</strong> Team Oxygen</li>
              <li><strong>Mode :</strong> Production (envoi illimité)</li>
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Cet email a été envoyé automatiquement depuis l'application Team Oxygen.
            </p>
          </div>
        `,
      });
      
      console.log(`Test email sent successfully to ${to}`);
      await client.close();

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Email de test envoyé avec succès à ${to}` 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (smtpError) {
      console.error("SMTP Error:", smtpError);
      await client.close();
      throw smtpError;
    }
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
