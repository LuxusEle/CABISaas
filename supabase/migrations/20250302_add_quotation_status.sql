-- Add quotation_status column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS quotation_status TEXT DEFAULT 'quotation',
ADD COLUMN IF NOT EXISTS quotation_approved_date TIMESTAMPTZ;
