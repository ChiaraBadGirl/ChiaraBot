import express from "express";
import { Telegraf, Markup } from "telegraf";
import { supabase } from "./supabaseClient.js";

// Variablen aus Railway
const BOT_TOKEN = process.env.BOT_TOKEN || "DEIN_BOT_TOKEN";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "super-secret-chiara";
const RAILWAY_DOMAIN = process.env.RAILWAY_DOMAIN || "DEINE-DOMAIN.up.railway.app";

// 1️⃣ Bot erstellen (muss VOR Webhook Callback passieren!)
const bot = new Telegraf(BOT_TOKEN);

// Express App für Webhook
const app = express();
app.use(bot.webhookCallback(`/webhook/${WEBHOOK_SECRET}`));

// Webhook bei Telegram registrieren
bot.telegram.setWebhook(`https://${RAILWAY_DOMAIN}/webhook/${WEBHOOK_SECRET}`);

// Test Endpoint
app.get("/", (req, res) => {
  res.send("✅ ChiaraBot läuft über Webhook!");
});

// Server starten
app.listen(8080, () => {
  console.log(`🚀 Bot läuft über Webhook auf Port 8080`);
});

// Verbindungstest zu Supabase
(async () => {
  try {
    const { data, error } = await supabase.from('users').select('id');
    if (error) {
      console.error("❌ Fehler bei Supabase Verbindung:", error.message);
    } else {
      console.log(`✅ Supabase Verbindung OK – aktuell ${data.length} User gespeichert.`);
    }
  } catch (err) {
    console.error("❌ Unerwarteter Fehler bei Supabase Test:", err);
  }
})();

// User speichern
async function saveUser(user) {
  const { id, username, first_name, last_name, language_code } = user;

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('id', id)
    .single();

  if (!data) {
    await supabase.from('users').insert([
      { id, username, first_name, last_name, language_code }
    ]);
    console.log('✅ User gespeichert:', id);
  }
}

// Start
bot.start(async (ctx) => {
  const user = {
    id: ctx.from.id,
    username: ctx.from.username || null,
    first_name: ctx.from.first_name || null,
    last_name: ctx.from.last_name || null,
    language_code: ctx.from.language_code || null
  };
  await saveUser(user);

  await ctx.reply('👋 *Willkommen bei ChiaraBadGirlsBot!*\n\nNutze das Menü unten, um alles zu entdecken.', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'ℹ️Info', callback_data: 'go_info' },
          { text: '🧾Menu', callback_data: 'go_menu' }
        ],
        [{ text: '‼️Regeln', callback_data: 'go_regeln' }],
        [
          { text: '📲Mein Kanal', url: 'https://t.me/+XcpXcLb52vo0ZGNi' },
          { text: '💬Schreib mir', url: 'https://t.me/ChiaraBadGirl' }
        ]
      ]
    }
  });
});

// Admin-Befehl
bot.command('admin', async (ctx) => {
  if (ctx.from.id !== 5647887831) {
    return ctx.reply('❌ Nur der Admin darf diesen Befehl verwenden.');
  }

  await ctx.reply('🛠️ *Admin-Menü*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Statistik', callback_data: 'admin_stats' }],
        [{ text: '📢 Broadcast starten', callback_data: 'admin_broadcast_info' }],
        [{ text: '🔙 Zurück', callback_data: 'back_home' }]
      ]
    }
  });
});

// Info-Menü
bot.action('go_info', async (ctx) => {
  await ctx.editMessageText('ℹ️ *Info-Menü:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '👩‍💻 Wer bin ich', callback_data: 'info_wer' }],
        [{ text: '🌐 Social Media', callback_data: 'info_social' }],
        [{ text: '🔞 18+ Links', callback_data: 'info_links' }],
        [{ text: '🔙 Zurück', callback_data: 'back_home' }]
      ]
    }
  });
});

// Menü
bot.action('go_menu', async (ctx) => {
  await ctx.editMessageText('🧾 *Menu:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💰 Preisliste', callback_data: 'menu_preise' }],
        [{ text: '🎁 Angebote', callback_data: 'menu_angebote' }],
        [{ text: '💎 VIP Werden', callback_data: 'menu_vip' }],
        [{ text: '🔙 Zurück', callback_data: 'back_home' }]
      ]
    }
  });
});

// 📋 Preisliste Hauptmenü
bot.action('menu_preise', async (ctx) => {
  await ctx.editMessageText('🧾 *Chiara Preisliste*\n\nWähle eine Kategorie aus:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎟 Full Access & Pässe', callback_data: 'preise_access' }],
        [{ text: '📦 Video Packs', callback_data: 'preise_videos' }],
        [{ text: '💬 Sexchat Sessions', callback_data: 'preise_sexchat' }],
        [{ text: '👑 Daddy / Domina & More', callback_data: 'preise_daddy' }],
        [{ text: '❤️ Girlfriend / Domina Pass', callback_data: 'preise_gf_domina' }],
        [{ text: '📹 Livecam Sessions', callback_data: 'preise_livecam' }],
        [{ text: '🌟 Premium & VIP', callback_data: 'preise_vip' }],
        [{ text: '📀 Custom Videos', callback_data: 'preise_custom' }],
        [{ text: '🧦 Dirty Panties & Socks', callback_data: 'preise_panties' }],
        [{ text: '🔙 Zurück', callback_data: 'go_menu' }]
      ]
    }
  });
});

// 🎟 Full Access & Pässe
bot.action('preise_access', async (ctx) => {
  await ctx.editMessageText(
    '🎟 *Full Access & Pässe*\n\n' +
    '🔥 *Full Access Pass* (40GB Galerie – 1 Monat) – *50€*\n\n' +
    '💎 Zugriff auf exklusive Inhalte und Premium-Material für einen Monat.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});

// 📦 Video Packs
bot.action('preise_videos', async (ctx) => {
  await ctx.editMessageText(
    '📦 *Video Packs – Lifetime Access*\n\n' +
    '🎥 *5 Videos* – 50€\n' +
    '🎥 *10 Videos* – 90€\n' +
    '🎥 *15 Videos* – 120€\n\n' +
    '💎 Einmal zahlen – für immer genießen!',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});

// 💬 Sexchat Sessions
bot.action('preise_sexchat', async (ctx) => {
  await ctx.editMessageText(
    '💬 *Sexchat Sessions (30 Min)*\n\n' +
    '🔥 *Normal* – 30€\n' +
    '🔥 *Extra* – 60€\n\n' +
    '💦 Deine ganz private Session – direkt und intensiv.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});

// 👑 Daddy / Domina & More
bot.action('preise_daddy', async (ctx) => {
  await ctx.editMessageText(
    '👑 *Daddy / Domina & More*\n\n' +
    '🥉 *Daddy Bronze* – Full Access + 1x Sexchat – 80€/Monat\n' +
    '🥈 *Daddy Silber* – Full Access + 2x Sexchat + Dirty Panty + Privat Chat – 150€/Monat\n' +
    '🥇 *Daddy Gold* – Full Access + 3x Sexchat + Dick Rating + Dirty Panty + Privat Chat + Sextoys – 225€/Monat',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});

// ❤️ Girlfriend / Domina Pass
bot.action('preise_gf_domina', async (ctx) => {
  await ctx.editMessageText(
    '❤️ *Girlfriend & Domina Pass*\n\n' +
    '💖 *Girlfriend Pass* – Daily Chats (30 Min) + Full Access + Private Nummer – 150€/Woche\n' +
    '👠 *Domina Pass* – Daily Chats (30 Min) + Aufgaben + Beweisvideos – 150€/Woche',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});

// 🌟 Premium & VIP
bot.action('preise_vip', async (ctx) => {
  await ctx.editMessageText(
    '🌟 *Premium & VIP*\n\n' +
    '👑 *Snapchat VIP (XXX Stories)* – 35€\n' +
    '📲 *Telegram Premium* – 40€',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});

// 📀 Custom Videos
bot.action('preise_custom', async (ctx) => {
  await ctx.editMessageText(
    '📀 *Custom Videos*\n\n' +
    '🎥 *3 Minuten* – 100€\n' +
    '🎥 *5 Minuten* – 140€\n' +
    '🔥 Individueller Wunsch-Content möglich!',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});

// 🧦 Dirty Panties & Socks
bot.action('preise_panties', async (ctx) => {
  await ctx.editMessageText(
    '🧦 *Dirty Panties & Socks*\n\n' +
    '👙 *Panty* – 40€\n' +
    '🧦 *Socks* – 30€\n' +
    '🔥 Jeder weitere Tag getragen – +20€',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});

// Regeln
bot.action('go_regeln', async (ctx) => {
  await ctx.editMessageText('‼️ *ALLE REGELN:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📜 Was ist erlaubt', callback_data: 'regeln_erlaubt' }],
        [{ text: '⏱️ Sessions', callback_data: 'regeln_sessions' }],
        [{ text: '📷 Cam', callback_data: 'regeln_cam' }],
        [{ text: '🔙 Zurück', callback_data: 'back_home' }]
      ]
    }
  });
});

// Back to home
bot.action('back_home', async (ctx) => {
  await ctx.editMessageText('👋 *Willkommen bei ChiaraBadGirlsBot!*\n\nNutze das Menü unten, um alles zu entdecken.', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'ℹ️Info', callback_data: 'go_info' },
          { text: '🧾Menu', callback_data: 'go_menu' }
        ],
        [{ text: '‼️Regeln', callback_data: 'go_regeln' }],
        [
          { text: '📲Mein Kanal', url: 'https://t.me/+XcpXcLb52vo0ZGNi' },
          { text: '💬Schreib mir', url: 'https://t.me/ChiaraBadGirl' }
        ]
      ]
    }
  });
});

// Admin: Statistik
bot.action('admin_stats', async (ctx) => {
  if (ctx.from.id !== 5647887831) return;

  const { data, error } = await supabase.from('users').select('id');

  if (error) {
    console.error(error);
    return ctx.reply('Fehler beim Abrufen der Statistik.');
  }

  await ctx.editMessageText(`📊 *Gespeicherte User: ${data.length}*`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Zurück', callback_data: 'admin_menu' }]
      ]
    }
  });
}); // ✅ ← Diese Klammer hatte vorher gefehlt!

// Admin: Broadcast-Info anzeigen
bot.action('admin_broadcast_info', async (ctx) => {
  if (ctx.from.id !== 5647887831) return;

  await ctx.editMessageText(
    '📢 *Broadcast starten:*\n\nNutze den Befehl:\n`/broadcast Dein Text`\num allen gespeicherten Usern eine Nachricht zu senden.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Zurück', callback_data: 'admin_menu' }]
        ]
      }
    }
  );
});

// Admin: Menü zurück
bot.action('admin_menu', async (ctx) => {
  if (ctx.from.id !== 5647887831) return;

  await ctx.editMessageText('🛠️ *Admin-Menü*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Statistik', callback_data: 'admin_stats' }],
        [{ text: '📢 Broadcast starten', callback_data: 'admin_broadcast_info' }],
        [{ text: '🔙 Zurück', callback_data: 'back_home' }]
      ]
    }
  });
});

// Broadcast-Befehl
bot.command('broadcast', async (ctx) => {
  const userId = ctx.from.id;
  const message = ctx.message.text.split(' ').slice(1).join(' ');

  if (userId !== 5647887831) {
    return ctx.reply('❌ Du darfst diesen Befehl nicht verwenden.');
  }

  if (!message) {
    return ctx.reply('❗ Bitte gib einen Nachrichtentext an: `/broadcast Dein Text`', {
      parse_mode: 'Markdown'
    });
  }

  const { data, error } = await supabase.from('users').select('id');

  if (error) {
    console.error('❌ Fehler beim Abrufen der User:', error);
    return ctx.reply('Fehler beim Abrufen der Benutzer.');
  }

  let count = 0;

  for (const user of data) {
    try {
      await ctx.telegram.sendMessage(user.id, message);
      count++;
    } catch (err) {
      console.log(`⚠️ Konnte Nachricht nicht an ${user.id} senden`);
    }
  }

  ctx.reply(`📨 Nachricht wurde an ${count} Nutzer gesendet.`);
});

bot.launch();
