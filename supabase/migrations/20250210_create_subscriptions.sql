-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  twocheckout_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_twocheckout_id ON subscriptions(twocheckout_subscription_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to only allow users to see their own subscription
CREATE POLICY "Users can only access their own subscription"
  ON subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically create free subscription for new users
CREATE OR REPLACE FUNCTION create_free_subscription_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
  VALUES (
    NEW.id,
    'free',
    'active',
    NOW(),
    NOW() + INTERVAL '100 years',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_free_subscription_for_user();

-- Create table for 2Checkout webhooks
CREATE TABLE IF NOT EXISTS twocheckout_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for webhook processing
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON twocheckout_webhooks(processed, created_at);
