import { createClient } from '@supabase/supabase-js';

// Variablen aus Railway (müssen in Railway als ENV gesetzt sein)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_BOT_SECRET = process.env.SUPABASE_BOT_SECRET; // 👈 Dein geheimer Header-Token

// Testausgabe im Log
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_BOT_SECRET) {
  console.error("❌ Supabase Keys oder Secret fehlen! Bitte in Railway Variables setzen.");
} else {
  console.log("✅ Supabase Keys & Secret erfolgreich geladen!");
}

// Client erstellen MIT Secret-Header
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-bot-secret': SUPABASE_BOT_SECRET
    }
  }
});