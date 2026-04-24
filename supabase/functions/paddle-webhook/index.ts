import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const PADDLE_WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET") || ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function verifySignature(body: string, signatureHeader: string, secret: string): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  try {
    const parts = signatureHeader.split(';');
    const timestamp = parts.find(p => p.startsWith('ts='))?.split('=')[1];
    const h1 = parts.find(p => p.startsWith('h1='))?.split('=')[1];
    if (!timestamp || !h1) return false;
    const payload = `${timestamp}:${body}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);
    const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
    const hashHex = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === h1;
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

serve(async (req) => {
  try {
    const signature = req.headers.get("paddle-signature")
    const body = await req.text()

    if (!signature) {
      return new Response("Missing signature", { status: 401 })
    }

    const isValid = await verifySignature(body, signature, PADDLE_WEBHOOK_SECRET);
    if (!isValid) {
      console.error("Invalid Paddle signature");
      return new Response("Invalid signature", { status: 401 })
    }

    const event = JSON.parse(body)
    console.log(`Received verified event: ${event.event_type}`)

    const { event_type, data } = event

    if (event_type.startsWith("subscription.")) {
      const paddleSubscriptionId = data.id || data.subscription_id
      const paddleCustomerId = data.customer_id
      const status = data.status // 'active', 'canceled', 'past_due', etc.
      const planId = 'pro' // Usually you'd map data.items[0].price_id to your plan IDs
      
      // Get the userId from custom_data if it exists (set during checkout)
      const userId = data.custom_data?.userId

      if (userId) {
        const { error } = await supabase
          .from("subscriptions")
          .upsert({
            user_id: userId,
            plan_id: planId,
            status: status === 'active' ? 'active' : 'inactive',
            paddle_subscription_id: paddleSubscriptionId,
            paddle_customer_id: paddleCustomerId,
            current_period_start: data.current_billing_period?.starts_at || new Date().toISOString(),
            current_period_end: data.current_billing_period?.ends_at || new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: data.scheduled_change?.action === 'cancel',
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })

        if (error) {
          console.error("Error updating subscription:", error)
          return new Response("Database error", { status: 500 })
        }
      }
    }

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("Webhook error:", err)
    return new Response("Internal Server Error", { status: 500 })
  }
})
