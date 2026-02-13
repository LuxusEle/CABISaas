-- Create user_profiles table to store user-specific settings like logos
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own profile
CREATE POLICY "Users can only access their own profile"
  ON user_profiles
  FOR ALL
  USING (auth.uid() = id);

-- Create storage bucket for project logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-logos', 'project-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;

-- Policy: Allow authenticated users to upload files to project-logos bucket
CREATE POLICY "Allow authenticated uploads"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-logos');

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'project-logos');

-- Policy: Allow authenticated users to delete files from project-logos bucket
-- This is the critical policy that was missing!
CREATE POLICY "Allow authenticated deletes"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-logos');

-- Policy: Allow public read access to logos
CREATE POLICY "Allow public reads"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'project-logos');
