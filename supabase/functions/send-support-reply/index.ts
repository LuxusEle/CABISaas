import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recipient, message, originalFeedbackId } = await req.json();

    // Call Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CABENGINE Support <support@cabenginepro.com>",
        to: [recipient],
        subject: `Support Response: CABENGINE Feedback #${originalFeedbackId.substring(0, 5).toUpperCase()}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
            <h2 style="color: #f59e0b; text-transform: uppercase; font-style: italic;">Support Response</h2>
            <p style="color: #475569; line-height: 1.6;">Hello,</p>
            <p style="color: #475569; line-height: 1.6;">Thank you for your feedback regarding CABENGINE. Our team has reviewed your request.</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="margin: 0; color: #1e293b; font-weight: 600;">ADMIN RESPONSE:</p>
              <p style="margin-top: 10px; color: #334155;">${message.replace(/\n/g, '<br>')}</p>
            </div>

            <p style="color: #64748b; font-size: 12px;">You can also view the status of your request directly in the app dashboard.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 11px; text-align: center;">Sent by CABENGINE Intelligence System</p>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to send email via Resend");
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Resend Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
