-- Add attachment_url column to feedback table for file attachments
alter table public.feedback 
add column if not exists attachment_url text;

-- Create index for faster queries on attachment_url
create index if not exists idx_feedback_attachment_url 
on public.feedback(attachment_url) 
where attachment_url is not null;

comment on column public.feedback.attachment_url is 'URL to attached file (PDF, Word, etc.)';
