-- Add PayPal subscription fields to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_payer_id TEXT;

-- Create index for PayPal lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_subscription_id ON subscriptions(paypal_subscription_id);

-- Create table for PayPal webhooks
CREATE TABLE IF NOT EXISTS paypal_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  subscription_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for webhook processing
CREATE INDEX IF NOT EXISTS idx_paypal_webhooks_processed ON paypal_webhooks(processed, created_at);
