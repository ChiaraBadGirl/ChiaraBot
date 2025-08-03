import { createClient } from '@supabase/supabase-js';

// Variablen aus Railway lesen
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Testausgabe im Log
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !WEBHOOK_SECRET) {
  console.error("❌ Supabase Keys oder Secret fehlen! Bitte in Railway Variables setzen.");
} else {
  console.log("✅ Supabase Keys & Secret erfolgreich geladen!");
}

// Supabase Client mit Secret-Header erstellen
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-bot-secret': WEBHOOK_SECRET
    }
  }
});