import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dailaqknciqwimozyvkk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaWxhcWtuY2lxd2ltb3p5dmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODM0NjcsImV4cCI6MjA2ODk1OTQ2N30.8Z4MhwKgUJ3mlnPf_kw8fVnfCRPVBRBSVWOnXK3AZsM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
