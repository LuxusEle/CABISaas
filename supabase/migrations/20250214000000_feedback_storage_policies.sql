-- Enable RLS on storage.objects (if not already enabled)
alter table storage.objects enable row level security;

-- Drop existing policies for feedback-attachments bucket if they exist
drop policy if exists "Allow authenticated uploads" on storage.objects;
drop policy if exists "Allow public read access" on storage.objects;

-- Create policy to allow authenticated users to upload to feedback-attachments bucket
create policy "Allow authenticated uploads to feedback-attachments"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'feedback-attachments'
);

-- Create policy to allow authenticated users to delete their own files
create policy "Allow authenticated deletes from feedback-attachments"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'feedback-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow public read access to feedback-attachments bucket
create policy "Allow public read from feedback-attachments"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'feedback-attachments'
);

-- Also ensure feedback bucket has proper policies
-- Drop existing policies for feedback-screenshots if they exist
drop policy if exists "Allow authenticated uploads to feedback-screenshots" on storage.objects;
drop policy if exists "Allow public read from feedback-screenshots" on storage.objects;

-- Create policy for feedback-screenshots uploads
create policy "Allow authenticated uploads to feedback-screenshots"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'feedback-screenshots'
);

-- Create policy for feedback-screenshots read access
create policy "Allow public read from feedback-screenshots"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'feedback-screenshots'
);
