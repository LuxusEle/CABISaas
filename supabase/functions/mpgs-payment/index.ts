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
      case "process_payment":
        return await handleProcessPayment(params)
      case "create_session":
        return await handleCreateSession(params)
      case "update_session":
        return await handleUpdateSession(params)
      case "initiate_auth":
        return await handleInitiateAuth(params)
      case "authenticate_payer":
        return await handleAuthenticatePayer(params)
      case "initiate_checkout":
        return await handleInitiateCheckout(params)
      case "retrieve_order":
        return await handleRetrieveOrder(params)
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
  amount: number
  currency?: string
  authenticationTransactionId?: string
  orderId?: string
}) {
  const { userId, planId, sessionId, amount, currency, authenticationTransactionId, orderId: existingOrderId } = params

  console.log(`Processing payment for user=${userId.substring(0, 8)}... plan=${planId} amount=${amount} session=${sessionId}`)

  const orderId = existingOrderId || `order_${Date.now()}_${userId.substring(0, 8)}`
  const transactionId = `txn_${Date.now()}_${userId.substring(0, 8)}`

  const payPayload: Record<string, unknown> = {
    apiOperation: "PAY",
    session: { id: sessionId },
    sourceOfFunds: { type: "CARD" },
    order: {
      amount,
      currency: currency || "USD",
      reference: orderId,
    },
    transaction: {
      reference: transactionId,
      source: "INTERNET",
    },
  }

  if (authenticationTransactionId) {
    payPayload.authentication = { transactionId: authenticationTransactionId }
  }

  console.log("Calling PAY:", orderId, transactionId)

  const payResponse = await mpgsPost(`/order/${orderId}/transaction/${transactionId}`, payPayload, "PUT")
  const payResult = await payResponse.json()

  console.log("PAY response:", JSON.stringify(payResult))

  const payOk = payResult?.result === "SUCCESS"
  const gatewayCode = payResult?.response?.gatewayCode

  if (!payOk) {
    console.error("PAY failed:", gatewayCode, JSON.stringify(payResult))
    return new Response(
      JSON.stringify({
        error: "Payment failed",
        gatewayCode,
        result: payResult?.result,
        details: payResult?.error?.explanation || payResult?.response?.gatewayRecommendation || "Unknown error",
      }),
      { status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    )
  }

  const payTransactionId = payResult?.transaction?.id

  console.log(`PAY successful: transaction=${payTransactionId} order=${orderId} gatewayCode=${gatewayCode}`)

  let cardToken: string | undefined
  let tokenError: string | undefined

  const tokenPayload = {
    apiOperation: "CREATE_TOKEN_FROM_SESSION",
    session: { id: sessionId },
  }

  const tokenResponse = await mpgsPost("/token", tokenPayload)
  const tokenResult = await tokenResponse.json()

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
      gatewayCode,
      cardToken,
      tokenError,
    }),
    { status: 200, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
  )
}

async function handleCreateSession(_params: Record<string, unknown>) {
  const sessionResponse = await mpgsPost("/session", {
    session: { authenticationLimit: 25 },
  })
  const sessionResult = await sessionResponse.json()

  if (!sessionResponse.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to create session", details: sessionResult }),
      { status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    )
  }

  return new Response(
    JSON.stringify({
      sessionId: sessionResult.session.id,
      version: sessionResult.session.version,
    }),
    { status: 200, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
  )
}

async function handleUpdateSession(params: { sessionId: string; amount: number; currency?: string }) {
  const { sessionId, amount, currency } = params

  const updateResponse = await mpgsPost(`/session/${sessionId}`, {
    order: {
      amount,
      currency: currency || "USD",
    },
  }, "PUT")
  const updateResult = await updateResponse.json()

  if (!updateResponse.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to update session", details: updateResult }),
      { status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    )
  }

  return new Response(
    JSON.stringify({
      success: true,
      version: updateResult.session?.version,
    }),
    { status: 200, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
  )
}

async function handleInitiateAuth(params: { sessionId: string; orderId: string; transactionId: string }) {
  const { sessionId, orderId, transactionId } = params

  const authPayload = {
    apiOperation: "INITIATE_AUTHENTICATION",
    authentication: {
      acceptVersions: "3DS2",
      channel: "PAYER_BROWSER",
      purpose: "PAYMENT_TRANSACTION",
    },
    order: { reference: orderId },
    session: { id: sessionId },
    transaction: { reference: transactionId },
  }

  console.log(`INITIATE_AUTH: order=${orderId} txn=${transactionId} session=${sessionId}`)

  const response = await mpgsPost(`/order/${orderId}/transaction/${transactionId}`, authPayload, "PUT")
  const result = await response.json()

  console.log(`INITIATE_AUTH response:`, JSON.stringify(result))

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: "INITIATE_AUTHENTICATION failed", details: result }),
      { status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    )
  }

  return new Response(
    JSON.stringify({
      result: result.result,
      gatewayRecommendation: result.response?.gatewayRecommendation,
      authenticationStatus: result.authentication?.status,
      authenticationVersion: result.authentication?.version,
      error: result.error,
    }),
    { status: 200, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
  )
}

async function handleAuthenticatePayer(params: {
  sessionId: string
  orderId: string
  transactionId: string
  redirectResponseUrl: string
  device?: {
    browser?: string
    browserDetails?: Record<string, unknown>
    ipAddress?: string
  }
}) {
  const { sessionId, orderId, transactionId, redirectResponseUrl, device } = params

  const authPayload: Record<string, unknown> = {
    apiOperation: "AUTHENTICATE_PAYER",
    authentication: {
      redirectResponseUrl,
    },
    session: { id: sessionId },
  }

  if (device) {
    authPayload.device = device
  }

  const response = await mpgsPost(`/order/${orderId}/transaction/${transactionId}`, authPayload, "PUT")
  const result = await response.json()

  console.log(`AUTHENTICATE_PAYER response:`, JSON.stringify(result))

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: "AUTHENTICATE_PAYER failed", details: result }),
      { status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    )
  }

  return new Response(
    JSON.stringify(result),
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

async function handleInitiateCheckout(params: { amount: number; currency?: string; returnUrl: string }) {
  const { amount, currency, returnUrl } = params

  const payload = {
    apiOperation: "INITIATE_CHECKOUT",
    interaction: {
      operation: "PURCHASE",
      merchant: { name: "CABISaas" },
      returnUrl,
    },
    order: {
      id: `order_${Date.now()}`,
      amount,
      currency: currency || "USD",
      description: "CABEngine Pro Subscription",
    },
  }

  console.log(`INITIATE_CHECKOUT: amount=${amount} returnUrl=${returnUrl}`)

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
      successIndicator: result.successIndicator,
      version: result.session?.version,
      checkoutMode: result.checkoutMode,
    }),
    { status: 200, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
  )
}

async function handleRetrieveOrder(params: { sessionId: string }) {
  const { sessionId } = params

  console.log(`RETRIEVE_ORDER for session: ${sessionId}`)

  const response = await mpgsPost(`/session/${sessionId}`, {
    apiOperation: "RETRIEVE_ORDER",
  })
  const result = await response.json()

  console.log(`RETRIEVE_ORDER response:`, JSON.stringify(result))

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: "RETRIEVE_ORDER failed", details: result }),
      { status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    )
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  })
}
