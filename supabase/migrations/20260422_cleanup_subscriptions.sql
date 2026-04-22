-- 1. Delete duplicate subscriptions, keeping only the most recent one for each user
DELETE FROM subscriptions a
USING subscriptions b
WHERE a.id < b.id
  AND a.user_id = b.user_id;

-- 2. Add a UNIQUE constraint to user_id so a user can only have ONE subscription
ALTER TABLE subscriptions
ADD CONSTRAINT unique_user_subscription UNIQUE (user_id);

-- 3. Ensure RLS allows updates (Double check)
DROP POLICY IF EXISTS "Users can only access their own subscription" ON subscriptions;
CREATE POLICY "Users can only access their own subscription"
  ON subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
