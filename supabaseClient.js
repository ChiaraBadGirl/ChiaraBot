import { createClient } from '@supabase/supabase-js';

// 🔑 Variablen aus Railway lesen
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// 🛠 Testausgabe im Log
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Supabase Keys fehlen! Bitte in Railway Variables setzen.");
} else {
  console.log("✅ Supabase Keys erfolgreich geladen!");
}

// 🚀 Supabase Client erstellen (ohne Secret-Header)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);