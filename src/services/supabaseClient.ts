import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fejzgyzzqszsvjzvkois.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlanpneXp6cXN6c3ZqenZrb2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NDkxMDAsImV4cCI6MjA4NjAyNTEwMH0.hjknWbi981ooo544oU1bHCwedRgLXnK5aR_Vz8lZ0jk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
