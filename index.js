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
  await ctx.editMessageText('🎟 *Full Access & Pässe*\n\nWähle deinen Pass:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔥 Full Access Pass (1 Monat)', callback_data: 'fullaccess_1m' }],
        [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
      ]
    }
  });
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
  await ctx.editMessageText('📦 *Video Packs – Lifetime Access*\n\nWähle dein Paket:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎥 5 Videos', callback_data: 'videos_5' }],
        [{ text: '🎥 10 Videos', callback_data: 'videos_10' }],
        [{ text: '🎥 15 Videos', callback_data: 'videos_15' }],
        [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
      ]
    }
  });
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
  await ctx.editMessageText('💬 *Sexchat Sessions*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ Info', callback_data: 'info_sexchat' }],
        [{ text: '💰 Preis', callback_data: 'preis_sexchat' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_sexchat' }],
        [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
      ]
    }
  });
});

// Jetzt bezahlen (Sexchat)
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

// Daddy / Domina & More Menü
bot.action('preise_daddy', async (ctx) => {
  await ctx.editMessageText('👑 *Daddy / Domina & More*\n\nWähle dein Paket:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🥉 Daddy Bronze', callback_data: 'preise_daddy_bronze' }],
        [{ text: '🥈 Daddy Silber', callback_data: 'preise_daddy_silber' }],
        [{ text: '🥇 Daddy Gold', callback_data: 'preise_daddy_gold' }],
        [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
      ]
    }
  });
});

// 🥉 Daddy Bronze Menü
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

bot.action('info_daddy_bronze', async (ctx) => {
  await ctx.editMessageText(
    'ℹ️ *Daddy Bronze Info*\n\nEnthält exklusiven Zugang + 1 Sexchat Session pro Monat.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_bronze' }]]
      }
    }
  );
});

bot.action('preis_daddy_bronze', async (ctx) => {
  await ctx.editMessageText('💰 *Preis*: 80€/Monat', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_bronze' }]]
    }
  );
});

bot.action('pay_daddy_bronze', async (ctx) => {
  await ctx.editMessageText('💳 *Wähle deine Zahlungsmethode:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_daddy_bronze' }]
      ]
    }
  );
});

// 🥈 Daddy Silber Menü
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

bot.action('info_daddy_silber', async (ctx) => {
  await ctx.editMessageText(
    'ℹ️ *Daddy Silber Info*\n\nFull Access + 2x Sexchat + Dirty Panty + Privat Chat.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_silber' }]]
      }
    }
  );
});

bot.action('preis_daddy_silber', async (ctx) => {
  await ctx.editMessageText('💰 *Preis*: 150€/Monat', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_silber' }]]
    }
  );
});

bot.action('pay_daddy_silber', async (ctx) => {
  await ctx.editMessageText('💳 *Wähle deine Zahlungsmethode:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_daddy_silber' }]
      ]
    }
  );
});

// 🥇 Daddy Gold Menü
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

bot.action('info_daddy_gold', async (ctx) => {
  await ctx.editMessageText(
    'ℹ️ *Daddy Gold Info*\n\nFull Access + 3x Sexchat + Dick Rating + Dirty Panty + Privat Chat + Sextoys.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_gold' }]]
      }
    }
  );
});

bot.action('preis_daddy_gold', async (ctx) => {
  await ctx.editMessageText('💰 *Preis*: 225€/Monat', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_gold' }]]
    }
  );
});

bot.action('pay_daddy_gold', async (ctx) => {
  await ctx.editMessageText('💳 *Wähle deine Zahlungsmethode:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_daddy_gold' }]
      ]
    }
  );
});

// ❤️ Girlfriend / Domina Pass
bot.action('preise_girlfriend', async (ctx) => {
  await ctx.editMessageText('❤️ *Girlfriend / Domina Pass*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ Info', callback_data: 'info_girlfriend' }],
        [{ text: '💰 Preis', callback_data: 'preis_girlfriend' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_girlfriend' }],
        [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
      ]
    }
  });
});

// Jetzt bezahlen (Girlfriend)
bot.action('pay_girlfriend', async (ctx) => {
  await ctx.editMessageText('💳 *Wähle Zahlungsmethode:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_girlfriend' }]
      ]
    }
  });
});

// 🌟 Premium & VIP
bot.action('preise_vip', async (ctx) => {
  await ctx.editMessageText('🌟 *Premium & VIP*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ Info', callback_data: 'info_vip' }],
        [{ text: '💰 Preis', callback_data: 'preis_vip' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_vip' }],
        [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
      ]
    }
  });
});

// Jetzt bezahlen (VIP)
bot.action('pay_vip', async (ctx) => {
  await ctx.editMessageText('💳 *Wähle Zahlungsmethode:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_vip' }]
      ]
    }
  });
});

// 📀 Custom Videos
bot.action('preise_custom', async (ctx) => {
  await ctx.editMessageText('📀 *Custom Videos*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ Info', callback_data: 'info_custom' }],
        [{ text: '💰 Preis', callback_data: 'preis_custom' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_custom' }],
        [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
      ]
    }
  });
});

// Jetzt bezahlen (Custom Videos)
bot.action('pay_custom', async (ctx) => {
  await ctx.editMessageText('💳 *Wähle Zahlungsmethode:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_custom' }]
      ]
    }
  });
});

// 🧦 Dirty Panties & Socks
bot.action('preise_panties', async (ctx) => {
  await ctx.editMessageText('🧦 *Dirty Panties & Socks*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ Info', callback_data: 'info_panties' }],
        [{ text: '💰 Preis', callback_data: 'preis_panties' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_panties' }],
        [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
      ]
    }
  });
});

// Jetzt bezahlen (Dirty Panties & Socks)
bot.action('pay_panties', async (ctx) => {
  await ctx.editMessageText('💳 *Wähle Zahlungsmethode:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_panties' }]
      ]
    }
  });
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
