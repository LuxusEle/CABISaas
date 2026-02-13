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

-- Set up storage policy for authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'project-logos' AND
    auth.role() = 'authenticated'
  );

-- Set up storage policy for authenticated users to update their own logos
CREATE POLICY "Authenticated users can update their logos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'project-logos' AND
    auth.role() = 'authenticated'
  );

-- Set up storage policy for authenticated users to delete their own logos
CREATE POLICY "Authenticated users can delete their logos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'project-logos' AND
    auth.role() = 'authenticated'
  );

-- Set up storage policy for public read access to logos
CREATE POLICY "Public can view logos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'project-logos');
