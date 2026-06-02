import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MPGS_WEBHOOK_SECRET = Deno.env.get("MPGS_WEBHOOK_SECRET") || ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const body = await req.text()
    const notification = JSON.parse(body)

    const notificationSecret = req.headers.get("x-notification-secret") || ""
    if (MPGS_WEBHOOK_SECRET && notificationSecret !== MPGS_WEBHOOK_SECRET) {
      console.error("Invalid webhook notification secret")
      return new Response("Unauthorized", { status: 401 })
    }

    console.log(`Received MPGS notification: ${notification.eventType || notification.notificationId}`)

    const { error: insertError } = await supabase
      .from("mpgs_webhooks")
      .insert({
        event_type: notification.eventType || "unknown",
        transaction_id: notification.transaction?.id || null,
        payload: notification,
        processed: false,
      })

    if (insertError) {
      console.error("Error storing webhook:", insertError)
    }

    const transactionId = notification.transaction?.id
    const transactionStatus = notification.transaction?.status
    const orderId = notification.order?.id
    const merchantRef = notification.merchant?.merchantReference

    if (transactionId && (transactionStatus === "SUCCESS" || transactionStatus === "CAPTURED" || transactionStatus === "SETTLED")) {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          mpgs_transaction_id: transactionId,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("mpgs_order_id", orderId)

      if (updateError) {
        console.error("Error updating subscription from webhook:", updateError)
      }
    }

    if (transactionStatus === "FAILED" || transactionStatus === "DECLINED") {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          mpgs_transaction_id: transactionId,
          status: "unpaid",
          updated_at: new Date().toISOString(),
        })
        .eq("mpgs_order_id", orderId)

      if (updateError) {
        console.error("Error marking subscription as unpaid:", updateError)
      }
    }

    await supabase
      .from("mpgs_webhooks")
      .update({ processed: true })
      .eq("transaction_id", transactionId)
      .eq("processed", false)

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("Webhook error:", err)
    return new Response("Internal Server Error", { status: 500 })
  }
})
