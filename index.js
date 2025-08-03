import express from "express";
import { Telegraf, Markup } from "telegraf";
import { supabase } from "./supabaseClient.js";

// Variablen aus Railway
const BOT_TOKEN = process.env.BOT_TOKEN || "DEIN_BOT_TOKEN";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "super-secret-chiara";
const RAILWAY_DOMAIN = process.env.RAILWAY_DOMAIN || "DEINE-DOMAIN.up.railway.app";

// Bot erstellen
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

  await ctx.reply('🔥 *Willkommen in deiner verbotenen Zone!* 🔥\n\nBereit für exklusiven Zugang, geheime Inhalte und private Erlebnisse? 😈\n\nWähle unten, wohin dein nächstes Abenteuer geht…', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'ℹ️ Info', callback_data: 'go_info' },
          { text: '🧾 Menu', callback_data: 'go_menu' }
        ],
        [{ text: '‼️ Regeln', callback_data: 'go_regeln' }],
        [
          { text: '📲 Mein Kanal', url: 'https://t.me/+XcpXcLb52vo0ZGNi' },
          { text: '💬 Schreib mir', url: 'https://t.me/ChiaraBadGirl' }
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

// Start Naricht
bot.action('info_wer', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *ChiaraBadGirl – About Me* 🔥\n\n' +
    'Hey Baby 😈, ich bin *Chiara*, 26 Jahre jung – mit Wurzeln in 🇱🇺 *Luxemburg* & 🇩🇪 *Germany*.\n\n' +
    '💦 *Squirt Queen* – ich weiß genau, wie man dich nass macht 😏\n' +
    '🔥 *BadBiitch* – wild, frech und immer ein bisschen gefährlich\n' +
    '🎨 *Tätowiert & einzigartig* – Kunst auf meiner Haut und in meinem Leben\n\n' +
    '📸 *Hier bekommst du*: Exklusive Pics, heiße Videos, private Chats & besondere Sessions\n' +
    '💎 Dein VIP-Zugang zu einer Welt ohne Grenzen...\n\n' +
    '⚡ *ChiaraBadGirl – Dein geheimes Vergnügen wartet!* ⚡',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Zurück', callback_data: 'go_info' }]
        ]
      }
    }
  );
});

// 📌 Social Media Menü
bot.action('info_social', async (ctx) => {
  await ctx.editMessageText('🌐 *Social Media & Offizielle Seiten*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌍 Offizielle Website', url: 'https://www.chiarabadgirl.eu' }],
        [{ text: '📸 Instagram', callback_data: 'instagram_menu' }],
        [{ text: '🐦 Twitter', url: 'https://www.x.com/chiarabadgirl' }],
        [{ text: '🎵 TikTok', url: 'https://www.tiktok.com/@biancanerini_offiziell' }],
        [{ text: '📘 Facebook', url: 'https://www.facebook.com/share/1QLd19Djha/?mibextid=wwXIfr' }],
        [{ text: '🔙 Zurück', callback_data: 'go_info' }]
      ]
    }
  });
});

// 📸 Instagram Menü
bot.action('instagram_menu', async (ctx) => {
  await ctx.editMessageText('📸 *Instagram Accounts*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '⭐ Hauptaccount', url: 'https://www.instagram.com/realchiaraoffiziell?igsh=Zmtuc3RwYWg4bzFi&utm_source=qr' }],
        [{ text: '🛟 Backup Account', url: 'https://www.instagram.com/chiarabadgiirl_offiziell?igsh=MW1tcmw5dWU1c2k0dQ%3D%3D&utm_source=qr' }],
        [{ text: '🔙 Zurück', callback_data: 'info_social' }]
      ]
    }
  });
});

// 🔞 18+ Links Menü
bot.action('info_links', async (ctx) => {
  await ctx.editMessageText('😈 *18+ Accounts & Premium Inhalte*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔥 OnlyFans Sub', url: 'https://www.onlyfans.com/chiarabadg' }],
        [{ text: '👀 OnlyFans PPV', url: 'https://www.onlyfans.com/chiarabadgirl' }],
        [{ text: '🥰 MYM', url: 'https://www.mym.fans/chiarabadgirl' }],
        [{ text: '‼️ 4Based', url: 'https://4based.com/profile/chiarabadgirl' }],
        [{ text: '🍀 Fanseven', url: 'https://www.fanseven.com/chiarabadgirl' }],
        [{ text: '🫶🏻 Maloum', url: 'https://app.maloum.com/creator/chiarabadgirl' }],
        [{ text: '🔙 Zurück', callback_data: 'go_info' }]
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
        [{ text: '🎟 Full Access & Pässe', callback_data: 'preise_fullaccess' }],
        [{ text: '📦 Video Packs', callback_data: 'preise_videos' }],
        [{ text: '💬 Sexchat Sessions', callback_data: 'preise_sexchat' }],
        [{ text: '👑 Daddy / Domina & More', callback_data: 'preise_daddy' }],
        [{ text: '❤️ Girlfriend / Domina Pass', callback_data: 'preise_girlfriend' }],
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
bot.action('preise_fullaccess', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Full Access & Pässe* 🔥\n\n' +
    '💎 Dein Schlüssel zu exklusiven Inhalten, 40GB Galerie & unbegrenztem Zugriff auf Premium-Material!',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔥 Full Access Pass (1 Monat)', callback_data: 'fullaccess_1m' }],
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});

bot.action('fullaccess_1m', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Full Access Pass (1 Monat)*\n40GB Galerie – Zugang zu allen exklusiven Inhalten.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ℹ️ Info', callback_data: 'info_fullaccess_1m' }],
          [{ text: '💰 Preis', callback_data: 'preis_fullaccess_1m' }],
          [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_fullaccess_1m' }],
          [{ text: '🔙 Zurück', callback_data: 'preise_fullaccess' }]
        ]
      }
    }
  );
});

bot.action('info_fullaccess_1m', async (ctx) => {
  await ctx.editMessageText('ℹ️ *Info*\nZugang zu ALLEN Premiuminhalten für einen Monat.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'fullaccess_1m' }]] }
  });
});

bot.action('preis_fullaccess_1m', async (ctx) => {
  await ctx.editMessageText('💰 *Preis*: 50€', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'fullaccess_1m' }]] }
  });
});

bot.action('pay_fullaccess_1m', async (ctx) => {
  await ctx.editMessageText('💳 *Wähle deine Zahlungsmethode:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'fullaccess_1m' }]
      ]
    }
  });
});

// 📦 Video Packs
bot.action('preise_videos', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Video Packs* 🔥\n\n' +
    '🎥 Lifetime Access zu heißen Clips – wähle dein perfektes Paket!',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎥 5 Videos', callback_data: 'videos_5' }],
          [{ text: '🎥 10 Videos', callback_data: 'videos_10' }],
          [{ text: '🎥 15 Videos', callback_data: 'videos_15' }],
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});

// 5 Videos
bot.action('videos_5', async (ctx) => {
  await ctx.editMessageText('🎥 *5 Videos – Lifetime Access*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'info_videos_5' }],
        [{ text: '💰 Preis', callback_data: 'preis_videos_5' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_videos_5' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_videos' }]
      ]
    }
  });
});
bot.action('info_videos_5', async (ctx) => ctx.editMessageText('ℹ️ *Info*: 5 exklusive Videos für einmalige Zahlung.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'videos_5' }]] } }));
bot.action('preis_videos_5', async (ctx) => ctx.editMessageText('💰 *Preis*: 50€', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'videos_5' }]] } }));
bot.action('pay_videos_5', async (ctx) => ctx.editMessageText('💳 *Wähle Zahlungsmethode:*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],[{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],[{ text: '🔙 Zurück', callback_data: 'videos_5' }]] } }));

// 10 Videos
bot.action('videos_10', async (ctx) => {
  await ctx.editMessageText('🎥 *10 Videos – Lifetime Access*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'info_videos_10' }],
        [{ text: '💰 Preis', callback_data: 'preis_videos_10' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_videos_10' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_videos' }]
      ]
    }
  });
});
bot.action('info_videos_10', async (ctx) => ctx.editMessageText('ℹ️ *Info*: 10 exklusive Videos für einmalige Zahlung.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'videos_10' }]] } }));
bot.action('preis_videos_10', async (ctx) => ctx.editMessageText('💰 *Preis*: 90€', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'videos_10' }]] } }));
bot.action('pay_videos_10', async (ctx) => ctx.editMessageText('💳 *Wähle Zahlungsmethode:*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],[{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],[{ text: '🔙 Zurück', callback_data: 'videos_10' }]] } }));

// 15 Videos
bot.action('videos_15', async (ctx) => {
  await ctx.editMessageText('🎥 *15 Videos – Lifetime Access*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'info_videos_15' }],
        [{ text: '💰 Preis', callback_data: 'preis_videos_15' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_videos_15' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_videos' }]
      ]
    }
  });
});
bot.action('info_videos_15', async (ctx) => ctx.editMessageText('ℹ️ *Info*: 15 exklusive Videos für einmalige Zahlung.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'videos_15' }]] } }));
bot.action('preis_videos_15', async (ctx) => ctx.editMessageText('💰 *Preis*: 120€', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'videos_15' }]] } }));
bot.action('pay_videos_15', async (ctx) => ctx.editMessageText('💳 *Wähle Zahlungsmethode:*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],[{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],[{ text: '🔙 Zurück', callback_data: 'videos_15' }]] } }));

// 💬 Sexchat Sessions
bot.action('preise_sexchat', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Sexchat Sessions* 🔥\n\n' +
    '💬 Heiße, private Chats nur für dich – intensiv, direkt & diskret.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ℹ Info', callback_data: 'info_sexchat' }],
          [{ text: '💰 Preis', callback_data: 'preis_sexchat' }],
          [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_sexchat' }],
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});

bot.action('pay_sexchat', async (ctx) => {
  await ctx.editMessageText('💳 *Wähle Zahlungsmethode:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_sexchat' }]
      ]
    }
  });
});

// 👑 Daddy / Domina & More
bot.action('preise_daddy', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Daddy / Domina & More* 🔥\n\n' +
    '👑 Exklusive Pässe für deine VIP-Behandlung – wähle dein Level!',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🥉 Daddy Bronze', callback_data: 'preise_daddy_bronze' }],
          [{ text: '🥈 Daddy Silber', callback_data: 'preise_daddy_silber' }],
          [{ text: '🥇 Daddy Gold', callback_data: 'preise_daddy_gold' }],
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});

// 🥉 Daddy Bronze
bot.action('preise_daddy_bronze', async (ctx) => {
  await ctx.editMessageText(
    '🥉 *Daddy Bronze*\nFull Access + 1x Sexchat – *80€/Monat*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ℹ️ Info', callback_data: 'info_daddy_bronze' }],
          [{ text: '💰 Preis', callback_data: 'preis_daddy_bronze' }],
          [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_daddy_bronze' }],
          [{ text: '🔙 Zurück', callback_data: 'preise_daddy' }]
        ]
      }
    }
  );
});
bot.action('info_daddy_bronze', async (ctx) => ctx.editMessageText('ℹ️ Full Access + 1 Sexchat pro Monat.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_bronze' }]] } }));
bot.action('preis_daddy_bronze', async (ctx) => ctx.editMessageText('💰 Preis: 80€/Monat', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_bronze' }]] } }));
bot.action('pay_daddy_bronze', async (ctx) => ctx.editMessageText('💳 Zahlungsmethode:', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],[{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],[{ text: '🔙 Zurück', callback_data: 'preise_daddy_bronze' }]] } }));

// 🥈 Daddy Silber
bot.action('preise_daddy_silber', async (ctx) => {
  await ctx.editMessageText(
    '🥈 *Daddy Silber*\nFull Access + 2x Sexchat + Dirty Panty + Privat Chat – *150€/Monat*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ℹ️ Info', callback_data: 'info_daddy_silber' }],
          [{ text: '💰 Preis', callback_data: 'preis_daddy_silber' }],
          [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_daddy_silber' }],
          [{ text: '🔙 Zurück', callback_data: 'preise_daddy' }]
        ]
      }
    }
  );
});
bot.action('info_daddy_silber', async (ctx) => ctx.editMessageText('ℹ️ Full Access + 2 Sexchats + Dirty Panty + Privat Chat.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_silber' }]] } }));
bot.action('preis_daddy_silber', async (ctx) => ctx.editMessageText('💰 Preis: 150€/Monat', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_silber' }]] } }));
bot.action('pay_daddy_silber', async (ctx) => ctx.editMessageText('💳 Zahlungsmethode:', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],[{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],[{ text: '🔙 Zurück', callback_data: 'preise_daddy_silber' }]] } }));

// 🥇 Daddy Gold
bot.action('preise_daddy_gold', async (ctx) => {
  await ctx.editMessageText(
    '🥇 *Daddy Gold*\nFull Access + 3x Sexchat + Dick Rating + Dirty Panty + Privat Chat + Sextoys – *225€/Monat*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ℹ️ Info', callback_data: 'info_daddy_gold' }],
          [{ text: '💰 Preis', callback_data: 'preis_daddy_gold' }],
          [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_daddy_gold' }],
          [{ text: '🔙 Zurück', callback_data: 'preise_daddy' }]
        ]
      }
    }
  );
});
bot.action('info_daddy_gold', async (ctx) => ctx.editMessageText('ℹ️ Full Access + 3 Sexchats + Dick Rating + Dirty Panty + Privat Chat + Sextoys.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_gold' }]] } }));
bot.action('preis_daddy_gold', async (ctx) => ctx.editMessageText('💰 Preis: 225€/Monat', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_gold' }]] } }));
bot.action('pay_daddy_gold', async (ctx) => ctx.editMessageText('💳 Zahlungsmethode:', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],[{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],[{ text: '🔙 Zurück', callback_data: 'preise_daddy_gold' }]] } }));

// ❤️ Girlfriend / Domina Pass
bot.action('preise_girlfriend', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Girlfriend / Domina Pass* 🔥\n\n' +
    '❤️ Deine tägliche Dosis Chiara – Chats, Aufgaben & intime Momente nur für dich.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ℹ Info', callback_data: 'info_girlfriend' }],
          [{ text: '💰 Preis', callback_data: 'preis_girlfriend' }],
          [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_girlfriend' }],
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});
bot.action('info_girlfriend', async (ctx) => ctx.editMessageText('ℹ️ Daily Chats (30 Min) + Full Access + Private Nummer.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_girlfriend' }]] } }));
bot.action('preis_girlfriend', async (ctx) => ctx.editMessageText('💰 Preis: 150€/Woche', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_girlfriend' }]] } }));
bot.action('pay_girlfriend', async (ctx) => ctx.editMessageText('💳 Zahlungsmethode:', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],[{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],[{ text: '🔙 Zurück', callback_data: 'preise_girlfriend' }]] } }));

// 🌟 Premium & VIP
bot.action('preise_vip', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Premium & VIP* 🔥\n\n' +
    '🌟 Werde Teil des exklusiven VIP-Kreises – mehr Nähe, mehr Content, mehr Chiara.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ℹ Info', callback_data: 'info_vip' }],
          [{ text: '💰 Preis', callback_data: 'preis_vip' }],
          [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_vip' }],
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});
bot.action('info_vip', async (ctx) => ctx.editMessageText('ℹ️ Snapchat VIP & Telegram Premium Zugang.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_vip' }]] } }));
bot.action('preis_vip', async (ctx) => ctx.editMessageText('💰 Preis: Snapchat 35€, Telegram 40€', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_vip' }]] } }));
bot.action('pay_vip', async (ctx) => ctx.editMessageText('💳 Zahlungsmethode:', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],[{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],[{ text: '🔙 Zurück', callback_data: 'preise_vip' }]] } }));

// 📀 Custom Videos
bot.action('preise_custom', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Custom Videos* 🔥\n\n' +
    '📀 Dein persönliches Video – individuell, heiß & genau nach deinem Wunsch.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎥 3 Minuten', callback_data: 'custom_3' }],
          [{ text: '🎥 5 Minuten', callback_data: 'custom_5' }],
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});
bot.action('custom_3', async (ctx) => {
  await ctx.editMessageText('🎥 3 Min Custom Video', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'custom3_info' }],
        [{ text: '💰 Preis', callback_data: 'custom3_price' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'custom3_pay' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_custom' }]
      ]
    }
  });
});
bot.action('custom3_info', async (ctx) => ctx.editMessageText('ℹ️ Individuelles Video (3 Min).', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'custom_3' }]] } }));
bot.action('custom3_price', async (ctx) => ctx.editMessageText('💰 Preis: 100€', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'custom_3' }]] } }));
bot.action('custom3_pay', async (ctx) => ctx.editMessageText('💳 Zahlungsmethode:', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],[{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],[{ text: '🔙 Zurück', callback_data: 'custom_3' }]] } }));

// 5 Min Custom
bot.action('custom_5', async (ctx) => {
  await ctx.editMessageText('🎥 5 Min Custom Video', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'custom5_info' }],
        [{ text: '💰 Preis', callback_data: 'custom5_price' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'custom5_pay' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_custom' }]
      ]
    }
  });
});
bot.action('custom5_info', async (ctx) => ctx.editMessageText('ℹ️ Individuelles Video (5 Min).', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'custom_5' }]] } }));
bot.action('custom5_price', async (ctx) => ctx.editMessageText('💰 Preis: 140€', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'custom_5' }]] } }));
bot.action('custom5_pay', async (ctx) => ctx.editMessageText('💳 Zahlungsmethode:', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],[{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],[{ text: '🔙 Zurück', callback_data: 'custom_5' }]] } }));

// 🧦 Dirty Panties & Socks
bot.action('preise_panties', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Dirty Panties & Socks* 🔥\n\n' +
    '🧦 Getragene Panties & Socks – heiß, persönlich & mit Beweis.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '👙 Panty', callback_data: 'panty_item' }],
          [{ text: '🧦 Socks', callback_data: 'socks_item' }],
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});
bot.action('panty_item', async (ctx) => {
  await ctx.editMessageText('👙 Panty', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'panty_info' }],
        [{ text: '💰 Preis', callback_data: 'panty_price' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'panty_pay' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_panties' }]
      ]
    }
  });
});
bot.action('panty_info', async (ctx) => ctx.editMessageText('ℹ️ Getragene Panty + Foto-Beweis.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'panty_item' }]] } }));
bot.action('panty_price', async (ctx) => ctx.editMessageText('💰 Preis: 40€ (+20€/Tag extra)', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'panty_item' }]] } }));
bot.action('panty_pay', async (ctx) => ctx.editMessageText('💳 Zahlungsmethode:', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],[{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],[{ text: '🔙 Zurück', callback_data: 'panty_item' }]] } }));

bot.action('socks_item', async (ctx) => {
  await ctx.editMessageText('🧦 Socks', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'socks_info' }],
        [{ text: '💰 Preis', callback_data: 'socks_price' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'socks_pay' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_panties' }]
      ]
    }
  });
});
bot.action('socks_info', async (ctx) => ctx.editMessageText('ℹ️ Getragene Socken + Foto-Beweis.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'socks_item' }]] } }));
bot.action('socks_price', async (ctx) => ctx.editMessageText('💰 Preis: 30€ (+20€/Tag extra)', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'socks_item' }]] } }));
bot.action('socks_pay', async (ctx) => ctx.editMessageText('💳 Zahlungsmethode:', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],[{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],[{ text: '🔙 Zurück', callback_data: 'socks_item' }]] } }));

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