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

    // Verify webhook signature (optional but recommended)
    // For production, implement PayPal webhook verification
    
    const payload = await req.json()
    
    // Log webhook for debugging
    console.log('PayPal webhook received:', JSON.stringify(payload))

    const eventType = payload.event_type
    const resource = payload.resource

    // Store webhook for processing
    await supabase
      .from('paypal_webhooks')
      .insert({
        event_type: eventType,
        subscription_id: resource?.id,
        payload: payload,
        processed: false
      })

    // Process based on event type
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.CREATED':
        // Subscription created - update status
        if (resource?.id) {
          await supabase
            .from('subscriptions')
            .update({
              paypal_subscription_id: resource.id,
              status: 'active',
              current_period_start: new Date(resource.start_time).toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('paypal_subscription_id', resource.id)
        }
        break

      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        // Subscription activated
        if (resource?.id) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('paypal_subscription_id', resource.id)
        }
        break

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        // Subscription cancelled/expired
        if (resource?.id) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              cancel_at_period_end: true,
              updated_at: new Date().toISOString()
            })
            .eq('paypal_subscription_id', resource.id)
        }
        break

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        // Subscription suspended
        if (resource?.id) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'suspended',
              updated_at: new Date().toISOString()
            })
            .eq('paypal_subscription_id', resource.id)
        }
        break

      case 'PAYMENT.SALE.COMPLETED':
        // Payment successful - extend subscription
        if (resource?.billing_agreement_id) {
          const currentPeriodEnd = new Date()
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
          
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_end: currentPeriodEnd.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('paypal_subscription_id', resource.billing_agreement_id)
        }
        break

      default:
        console.log('Unhandled PayPal webhook event:', eventType)
    }

    // Mark webhook as processed
    await supabase
      .from('paypal_webhooks')
      .update({ processed: true })
      .eq('event_type', eventType)
      .eq('subscription_id', resource?.id)
      .eq('processed', false)

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error processing PayPal webhook:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process webhook' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
