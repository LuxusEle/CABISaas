const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = await import('https://esm.sh/@supabase/supabase-js@2').then(m => 
      m.createClient(supabaseUrl, supabaseServiceKey)
    )

    // PayPal configuration
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID')!
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')!
    const isSandbox = true // Set to false for production

    const paypalBaseUrl = isSandbox 
      ? 'https://api-m.sandbox.paypal.com' 
      : 'https://api-m.paypal.com'

    // Get authorization
    const authResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`
      },
      body: 'grant_type=client_credentials'
    })

    const authData = await authResponse.json()
    const accessToken = authData.access_token

    if (!accessToken) {
      throw new Error('Failed to get PayPal access token')
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get user's current subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Plan ID - You need to create this in PayPal Dashboard first
    // For sandbox, create a product and plan in PayPal Developer Dashboard
    const planId = Deno.env.get('PAYPAL_PLAN_ID') || 'P-PRO-29-MONTHLY'

    // Use production URL for returns (configure in Supabase secrets)
    const appUrl = Deno.env.get('APP_URL') || 'https://cabengine.com'

    // Create subscription
    const subscriptionBody = {
      plan_id: planId,
      subscriber: {
        email_address: user.email,
        name: {
          given_name: user.email?.split('@')[0] || 'Customer'
        }
      },
      application_context: {
        brand_name: 'CabEngine',
        landing_page: 'NO_PREFERENCE',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${appUrl}/pricing?success=true`,
        cancel_url: `${appUrl}/pricing?cancelled=true`
      }
    }

    const subscriptionResponse = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(subscriptionBody)
    })

    const subscriptionData = await subscriptionResponse.json()

    if (subscriptionResponse.status >= 400) {
      console.error('PayPal subscription error:', subscriptionData)
      return new Response(JSON.stringify({ 
        error: 'Failed to create PayPal subscription',
        details: subscriptionData
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find approval URL
    const approvalUrl = subscriptionData.links?.find(
      (link: any) => link.rel === 'approve'
    )?.href

    // Store PayPal subscription ID in database
    await supabase
      .from('subscriptions')
      .update({
        paypal_subscription_id: subscriptionData.id,
        paypal_order_id: subscriptionData.id,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    return new Response(JSON.stringify({
      subscriptionId: subscriptionData.id,
      approvalUrl: approvalUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error creating PayPal subscription:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to create subscription' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
