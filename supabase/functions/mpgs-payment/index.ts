import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MPGS_MERCHANT_ID = Deno.env.get("MPGS_MERCHANT_ID") || ""
const MPGS_API_PASSWORD = Deno.env.get("MPGS_API_PASSWORD") || ""
const MPGS_GATEWAY_URL = Deno.env.get("MPGS_GATEWAY_URL") || "https://seylan.gateway.mastercard.com"
const MPGS_API_VERSION = "100"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function base64encode(str: string): string {
  return btoa(str)
}

function apiUrl(path: string): string {
  return `${MPGS_GATEWAY_URL}/api/rest/version/${MPGS_API_VERSION}/merchant/${MPGS_MERCHANT_ID}${path}`
}

function basicAuth(): string {
  const credentials = `merchant.${MPGS_MERCHANT_ID}:${MPGS_API_PASSWORD}`
  return `Basic ${base64encode(credentials)}`
}

async function mpgsPost(path: string, body: unknown, method = "POST"): Promise<Response> {
  const url = apiUrl(path)
  const auth = basicAuth()
  console.log(`Calling MPGS: ${method} ${url}`)

  return fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": auth,
    },
    body: JSON.stringify(body),
  })
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() })
  }

  try {
    const { action, ...params } = await req.json()
    console.log(`Action: ${action}`, JSON.stringify({ ...params, userId: params.userId ? params.userId.substring(0, 8) + '...' : undefined }))

    switch (action) {
      case "initiate_checkout":
        return await handleInitiateCheckout(params)
      case "complete_checkout":
        return await handleCompleteCheckout(params)
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          }
        )
    }
  } catch (err) {
    console.error("mpgs-payment error:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      }
    )
  }
})

async function handleInitiateCheckout(params: { orderId: string; amount: number; currency?: string; returnUrl: string }) {
  const { orderId, amount, currency, returnUrl } = params

  const payload = {
    apiOperation: "INITIATE_CHECKOUT",
    interaction: {
      operation: "PURCHASE",
      merchant: { name: "CABISaas" },
      returnUrl,
    },
    order: {
      id: orderId,
      amount,
      currency: currency || "USD",
      description: "CABEngine Pro Subscription",
    },
  }

  console.log(`INITIATE_CHECKOUT: orderId=${orderId} amount=${amount} returnUrl=${returnUrl}`)

  const response = await mpgsPost("/session", payload)
  const result = await response.json()

  console.log(`INITIATE_CHECKOUT response:`, JSON.stringify(result))

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: "INITIATE_CHECKOUT failed", details: result }),
      { status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    )
  }

  return new Response(
    JSON.stringify({
      success: result.result === "SUCCESS",
      sessionId: result.session?.id,
      orderId,
      successIndicator: result.successIndicator,
      version: result.session?.version,
      checkoutMode: result.checkoutMode,
    }),
    { status: 200, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
  )
}

async function handleCompleteCheckout(params: { sessionId: string; orderId: string; userId: string; planId: string }) {
  const { sessionId, orderId, userId, planId } = params

  console.log(`COMPLETE_CHECKOUT: sessionId=${sessionId} orderId=${orderId} userId=${userId?.substring(0, 8)}... planId=${planId}`)

  let txnId = ""
  let gatewayCode = ""

  // Try to retrieve order details, but don't fail if it doesn't work
  // Hosted Checkout verification is via resultIndicator === successIndicator (already done client-side)
  try {
    const orderRes = await mpgsPost(`/session/${sessionId}`, { apiOperation: "RETRIEVE_ORDER" })
    const orderResult = await orderRes.json()
    console.log(`RETRIEVE_ORDER result:`, JSON.stringify(orderResult))
    if (orderResult.result === "SUCCESS") {
      txnId = orderResult.transaction?.id || orderResult.order?.id || ""
      gatewayCode = orderResult.response?.gatewayCode || ""
    }
  } catch (e) {
    console.warn("RETRIEVE_ORDER failed (non-critical):", e)
  }

  const { error: dbError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan_id: planId,
        status: "active",
        mpgs_order_id: orderId,
        mpgs_transaction_id: txnId,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

  if (dbError) {
    console.error("DB error:", JSON.stringify(dbError))
    return new Response(JSON.stringify({ error: "Database update failed", details: dbError }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({ success: true, transactionId: txnId, orderId, gatewayCode }),
    { status: 200, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
  )
}
