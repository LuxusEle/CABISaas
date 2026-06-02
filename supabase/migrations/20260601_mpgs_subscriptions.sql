-- Replace Paddle with MPGS (Mastercard Payment Gateway Services)
-- Drop Paddle columns, add MPGS columns

-- 1. Remove Paddle columns and indexes
DROP INDEX IF EXISTS idx_subscriptions_paddle_subscription_id;
DROP INDEX IF EXISTS idx_subscriptions_paddle_customer_id;

ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS paddle_subscription_id,
DROP COLUMN IF EXISTS paddle_customer_id;

-- 2. Add MPGS columns
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS mpgs_card_token TEXT,
ADD COLUMN IF NOT EXISTS mpgs_agreement_id TEXT,
ADD COLUMN IF NOT EXISTS mpgs_order_id TEXT,
ADD COLUMN IF NOT EXISTS mpgs_session_id TEXT,
ADD COLUMN IF NOT EXISTS mpgs_transaction_id TEXT;

-- 3. Create indexes for MPGS lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_mpgs_card_token ON subscriptions(mpgs_card_token);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mpgs_agreement_id ON subscriptions(mpgs_agreement_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mpgs_order_id ON subscriptions(mpgs_order_id);

-- 4. Create table for MPGS webhook events
CREATE TABLE IF NOT EXISTS mpgs_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  transaction_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mpgs_webhooks_processed ON mpgs_webhooks(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_mpgs_webhooks_transaction_id ON mpgs_webhooks(transaction_id);
