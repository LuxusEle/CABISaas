-- Remove PayPal and 2Checkout related tables and columns
-- Add Paddle related columns

-- 1. Drop webhook tables
DROP TABLE IF EXISTS paypal_webhooks;
DROP TABLE IF EXISTS twocheckout_webhooks;

-- 2. Remove PayPal and 2Checkout columns from subscriptions
ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS twocheckout_subscription_id,
DROP COLUMN IF EXISTS paypal_subscription_id,
DROP COLUMN IF EXISTS paypal_order_id,
DROP COLUMN IF EXISTS paypal_payer_id;

-- 3. Add Paddle columns to subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT;

-- 4. Create indexes for Paddle
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_subscription_id ON subscriptions(paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_customer_id ON subscriptions(paddle_customer_id);
