-- Create storage bucket for downloadable resources (DXF, spreadsheets, layouts)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts on re-run)
DROP POLICY IF EXISTS "Public read resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete resources" ON storage.objects;

-- Allow public (anonymous) read access to resources bucket
CREATE POLICY "Public read resources"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'resources');

-- Allow authenticated users to upload to resources bucket
CREATE POLICY "Authenticated upload resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resources');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated delete resources"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
