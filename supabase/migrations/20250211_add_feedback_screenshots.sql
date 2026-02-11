-- Add screenshot_url column to feedback table
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Create index for screenshot lookups
CREATE INDEX IF NOT EXISTS idx_feedback_screenshot ON feedback(screenshot_url);

-- Create storage bucket for feedback screenshots
-- Note: This needs to be done via Supabase Dashboard or API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-screenshots', 'feedback-screenshots', true);

-- Enable storage policies for feedback-screenshots bucket
-- Note: These need to be configured in Supabase Dashboard
