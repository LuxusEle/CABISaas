import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MPGS_MERCHANT_ID = Deno.env.get("MPGS_MERCHANT_ID") || ""
const MPGS_API_PASSWORD = Deno.env.get("MPGS_API_PASSWORD") || ""
const MPGS_GATEWAY_URL = Deno.env.get("MPGS_GATEWAY_URL") || "https://test-seylan.mtf.gateway.mastercard.com"
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

async function mpgsPost(path: string, body: unknown): Promise<Response> {
  const url = apiUrl(path)
  const auth = basicAuth()
  console.log(`Calling MPGS: POST ${url}`)
  console.log(`Auth: ${auth.substring(0, 20)}...`)

  return fetch(url, {
    method: "POST",
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
      case "process_payment":
        return await handleProcessPayment(params)
      case "get_order":
        return await handleGetOrder(params)
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

async function handleProcessPayment(params: {
  userId: string
  planId: string
  sessionId: string
}) {
  const { userId, planId, sessionId } = params

  console.log(`Processing payment for user=${userId.substring(0, 8)}... plan=${planId} session=${sessionId}`)

  let transactionId: string | undefined
  let orderId: string | undefined

  const tokenPayload = {
    apiOperation: "CREATE_TOKEN_FROM_SESSION",
    session: { id: sessionId },
  }

  const tokenResponse = await mpgsPost("/token", tokenPayload)
  const tokenResult = await tokenResponse.json()

  let cardToken: string | undefined
  let tokenError: string | undefined
  if (!tokenResponse.ok) {
    tokenError = tokenResult?.error?.explanation || tokenResult?.result || "Token creation failed"
    console.warn("Token creation failed:", JSON.stringify(tokenResult))
  } else {
    cardToken = tokenResult.token
    console.log("Card token created:", cardToken?.substring(0, 12) + "...")
  }

  const { error: dbError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan_id: planId,
        status: "active",
        mpgs_card_token: cardToken,
        mpgs_order_id: orderId || sessionId,
        mpgs_session_id: sessionId,
        mpgs_transaction_id: transactionId || null,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

  if (dbError) {
    console.error("Database error:", JSON.stringify(dbError))
    return new Response(JSON.stringify({ error: "Database update failed", details: dbError }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({
      success: true,
      transactionId,
      orderId: orderId || sessionId,
      cardToken,
      tokenError,
    }),
    { status: 200, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
  )
}

async function handleGetOrder(params: { sessionId: string }) {
  const { sessionId } = params

  const response = await mpgsPost(`/session/${sessionId}`, {
    apiOperation: "RETRIEVE_ORDER",
  })
  const result = await response.json()

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to retrieve order", details: result }),
      {
        status: 502,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      }
    )
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  })
}
