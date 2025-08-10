// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // <-- Service-Role!
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';                 // optionaler Extra-Header

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt. Bitte in Railway setzen.');
  process.exit(1); // Server nicht starten, wenn kritische ENV fehlt
} else {
  console.log('✅ Supabase Service-Role geladen (serverseitig).');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    // Falls du den Header brauchst – sonst bleibt es einfach leer.
    headers: WEBHOOK_SECRET ? { 'x-bot-secret': WEBHOOK_SECRET } : {},
  },
});
