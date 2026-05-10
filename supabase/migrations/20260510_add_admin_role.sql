
-- 1. Add role column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Update projects table RLS policies
-- First, drop the existing select policy if you want to replace it, 
-- or just add a new one that grants additional access.
-- I'll add a new one specifically for admins.

CREATE POLICY "Admins can view all projects" 
ON projects FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.role = 'admin'
  )
);

-- 3. Also allow admins to delete any project (optional but useful)
CREATE POLICY "Admins can delete any project" 
ON projects FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.role = 'admin'
  )
);

-- 4. Set a specific user as admin (OPTIONAL - uncomment and replace with your email)
-- UPDATE user_profiles 
-- SET role = 'admin' 
-- WHERE id IN (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
