import express from "express";
import { Telegraf, Markup } from "telegraf";
import { supabase } from "./supabaseClient.js";

// Variablen aus Railway
const BOT_TOKEN = process.env.BOT_TOKEN || "DEIN_BOT_TOKEN";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "super-secret-chiara";
const RAILWAY_DOMAIN = process.env.RAILWAY_DOMAIN || "DEINE-DOMAIN.up.railway.app";

// Bot erstellen
const bot = new Telegraf(BOT_TOKEN);

// 🔹 Funktion: Pass aktivieren
async function activatePass(ctx, statusCode, durationDays, backCallback, price = 0) {
  const userId = ctx.from.id;
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + durationDays);

  // Punkte-Bonus berechnen (z.B. 10% vom Preis)
  const bonusPoints = Math.round(price * 0.1);

  const { error } = await supabase
    .from('users')
    .update({
      status: statusCode,
      status_start: startDate.toISOString().split('T')[0],
      status_end: endDate.toISOString().split('T')[0],
      punkte: supabase.raw(`COALESCE(punkte, 0) + ${bonusPoints}`)
    })
    .eq('id', userId);

  if (error) {
    console.error(`❌ Fehler beim Setzen des Status (${statusCode}):`, error);
    return ctx.reply('⚠️ Fehler beim Aktivieren deines Passes.');
  }

  await ctx.editMessageText(
    `✅ *${statusCode} Pass aktiviert!*\n\n📅 Gültig bis: ${endDate.toLocaleDateString('de-DE')}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
          [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
          [{ text: '🔙 Zurück', callback_data: backCallback }]
        ]
      }
    }
  );
}

// Express App für Webhook
const app = express();
app.use(bot.webhookCallback(`/webhook/${WEBHOOK_SECRET}`));
bot.telegram.setWebhook(`https://${RAILWAY_DOMAIN}/webhook/${WEBHOOK_SECRET}`);

// Test Endpoint
app.get("/", (req, res) => res.send("✅ ChiaraBot läuft über Webhook!"));

// Server starten
app.listen(8080, () => console.log(`🚀 Bot läuft über Webhook auf Port 8080`));

// Verbindungstest zu Supabase
(async () => {
  try {
    const { data, error } = await supabase.from('users').select('id');
    if (error) console.error("❌ Supabase Fehler:", error.message);
    else console.log(`✅ Supabase OK – ${data.length} User gespeichert.`);
  } catch (err) {
    console.error("❌ Supabase Test Fehler:", err);
  }
})();

// User speichern
async function saveUser(user) {
  const { id, username, first_name, last_name, language_code } = user;
  const { data } = await supabase.from('users').select('id').eq('id', id).single();
  if (!data) {
    await supabase.from('users').insert([{ id, username, first_name, last_name, language_code }]);
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

  await ctx.reply(
    '🔥 *Willkommen in deiner verbotenen Zone!* 🔥\n\nBereit für exklusiven Zugang, geheime Inhalte und private Erlebnisse? 😈\n\nWähle unten, wohin dein nächstes Abenteuer geht…',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ℹ️ Info', callback_data: 'go_info' }, { text: '🧾 Menu', callback_data: 'go_menu' }],
          [{ text: '‼️ Regeln', callback_data: 'go_regeln' }],
          [{ text: '📲 Mein Kanal', url: 'https://t.me/+XcpXcLb52vo0ZGNi' }, { text: '💬 Schreib mir', url: 'https://t.me/ChiaraBadGirl' }],
          [{ text: "👤 Mein Bereich", callback_data: "mein_bereich" }]
        ]
      }
    }
  );
});

// Back to Home
bot.action('back_home', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Willkommen in deiner verbotenen Zone!* 🔥\n\nBereit für exklusiven Zugang, geheime Inhalte und private Erlebnisse? 😈\n\nWähle unten, wohin dein nächstes Abenteuer geht…',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ℹ️ Info', callback_data: 'go_info' }, { text: '🧾 Menu', callback_data: 'go_menu' }],
          [{ text: '‼️ Regeln', callback_data: 'go_regeln' }],
          [{ text: '📲 Mein Kanal', url: 'https://t.me/+XcpXcLb52vo0ZGNi' }, { text: '💬 Schreib mir', url: 'https://t.me/ChiaraBadGirl' }],
          [{ text: "👤 Mein Bereich", callback_data: "mein_bereich" }]
        ]
      }
    }
  );
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

// Wer bin ich
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
      reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'go_info' }]] }
    }
  );
});

// Social Media Menü
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

// Instagram Menü
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
        [{ text: '❤️ Girlfriend / Domina Pass', callback_data: 'preise_gf_domina' }],
        [{ text: '🧦 Dirty Panties & Socks', callback_data: 'preise_panties' }],
        [{ text: '🔙 Zurück', callback_data: 'go_menu' }]
      ]
    }
  });
});

bot.action('preise_fullaccess', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Full Access & Pässe* 🔥\n\n💎 Dein Schlüssel zu exklusiven Inhalten & 40GB Galerie!',
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

// 🎟 Full Access & Pässe
bot.action('info_fullaccess_1m', async (ctx) =>
  ctx.editMessageText('ℹ️ Zugang zu *ALLEN* Premiuminhalten für einen Monat.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'fullaccess_1m' }]] }
  })
);

bot.action('preis_fullaccess_1m', async (ctx) =>
  ctx.editMessageText('💰 *Preis:* 50€', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'fullaccess_1m' }]] }
  })
);

bot.action('pay_fullaccess_1m', async (ctx) =>
  activatePass(ctx, 'FullAccess', 30, 'fullaccess_1m')
);

// 📦 Video Packs
bot.action('preise_videos', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Video Packs* 🔥\n\n🎥 Lifetime Access zu heißen Clips – wähle dein perfektes Paket!',
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

// 🔹 5 Videos
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
bot.action('info_videos_5', async (ctx) =>
  ctx.editMessageText('ℹ️ 5 exklusive Videos – einmalig zahlen, für immer behalten.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'videos_5' }]] }
  })
);
bot.action('preis_videos_5', async (ctx) =>
  ctx.editMessageText('💰 Preis: 50€', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'videos_5' }]] }
  })
);
bot.action('pay_videos_5', async (ctx) =>
  ctx.editMessageText('💳 Zahlungsmethode:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'videos_5' }]
      ]
    }
  })
);

// 🔹 10 Videos
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
bot.action('info_videos_10', async (ctx) =>
  ctx.editMessageText('ℹ️ 10 exklusive Videos – einmalig zahlen, für immer behalten.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'videos_10' }]] }
  })
);
bot.action('preis_videos_10', async (ctx) =>
  ctx.editMessageText('💰 Preis: 90€', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'videos_10' }]] }
  })
);
bot.action('pay_videos_10', async (ctx) =>
  ctx.editMessageText('💳 Zahlungsmethode:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'videos_10' }]
      ]
    }
  })
);

// 🔹 15 Videos
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
bot.action('info_videos_15', async (ctx) =>
  ctx.editMessageText('ℹ️ 15 exklusive Videos – einmalig zahlen, für immer behalten.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'videos_15' }]] }
  })
);
bot.action('preis_videos_15', async (ctx) =>
  ctx.editMessageText('💰 Preis: 120€', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'videos_15' }]] }
  })
);
bot.action('pay_videos_15', async (ctx) =>
  ctx.editMessageText('💳 Zahlungsmethode:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'videos_15' }]
      ]
    }
  })
);

// 💬 Sexchat Sessions
bot.action('preise_sexchat', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Sexchat Sessions* 🔥\n\n💬 Heiße, private Chats nur für dich – intensiv, direkt & diskret.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ℹ️ Info', callback_data: 'info_sexchat' }],
          [{ text: '💰 Preis', callback_data: 'preis_sexchat' }],
          [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_sexchat' }],
          [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
        ]
      }
    }
  );
});
bot.action('info_sexchat', async (ctx) =>
  ctx.editMessageText('ℹ️ 30 Min intensiver Sexchat – heiß & privat.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_sexchat' }]] }
  })
);
bot.action('preis_sexchat', async (ctx) =>
  ctx.editMessageText('💰 Preis: 40€ / Session', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_sexchat' }]] }
  })
);
bot.action('pay_sexchat', async (ctx) =>
  ctx.editMessageText('💳 Zahlungsmethode:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_sexchat' }]
      ]
    }
  })
);

// 👑 Daddy Packs
bot.action('preise_daddy', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Daddy / Domina & More* 🔥\n\n👑 Exklusive Pässe für deine VIP-Behandlung – wähle dein Level!',
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

// 🥉 Bronze
bot.action('preise_daddy_bronze', async (ctx) => {
  await ctx.editMessageText(
    '🥉 *Daddy Bronze*\nFull Access + 1x Sexchat – 80€/Monat',
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
bot.action('info_daddy_bronze', async (ctx) =>
  ctx.editMessageText('ℹ️ Bronze = Full Access + 1 Sexchat.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_bronze' }]] }
  })
);
bot.action('preis_daddy_bronze', async (ctx) =>
  ctx.editMessageText('💰 Preis: 80€/Monat', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_bronze' }]] }
  })
);
bot.action('pay_daddy_bronze', async (ctx) =>
  activatePass(ctx, 'Bronze', 30, 'preise_daddy_bronze')
);

// 🥈 Silber
bot.action('preise_daddy_silber', async (ctx) => {
  await ctx.editMessageText(
    '🥈 *Daddy Silber*\nFull Access + 2 Sexchats + Dirty Panty + Privat Chat – 150€/Monat',
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
bot.action('info_daddy_silber', async (ctx) =>
  ctx.editMessageText('ℹ️ Silber = Full Access + 2 Sexchats + Panty + Privat Chat.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_silber' }]] }
  })
);
bot.action('preis_daddy_silber', async (ctx) =>
  ctx.editMessageText('💰 Preis: 150€/Monat', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_silber' }]] }
  })
);
bot.action('pay_daddy_silber', async (ctx) =>
  activatePass(ctx, 'Silber', 30, 'preise_daddy_silber')
);

// 🥇 Gold
bot.action('preise_daddy_gold', async (ctx) => {
  await ctx.editMessageText(
    '🥇 *Daddy Gold*\nFull Access + 3 Sexchats + Dick Rating + Panty + Sextoys – 225€/Monat',
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
bot.action('info_daddy_gold', async (ctx) =>
  ctx.editMessageText('ℹ️ Gold = Full Access + 3 Sexchats + Dick Rating + Panty + Sextoys.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_gold' }]] }
  })
);
bot.action('preis_daddy_gold', async (ctx) =>
  ctx.editMessageText('💰 Preis: 225€/Monat', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_daddy_gold' }]] }
  })
);
bot.action('pay_daddy_gold', async (ctx) =>
  activatePass(ctx, 'Gold', 30, 'preise_daddy_gold')
);

// 🧦 Dirty Panties & Socks
bot.action('preise_panties', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Dirty Panties & Socks* 🔥\n\n🧦 Getragene Panties & Socks – heiß, persönlich & mit Beweis.',
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

// Panty
bot.action('panty_item', async (ctx) => {
  await ctx.editMessageText('👙 Panty – Getragen & verpackt mit Foto-Beweis', {
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
bot.action('panty_info', async (ctx) =>
  ctx.editMessageText('ℹ️ Panty wird getragen, verpackt & mit Foto geliefert.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'panty_item' }]] }
  })
);
bot.action('panty_price', async (ctx) =>
  ctx.editMessageText('💰 Preis: 40€ (+20€/Tag extra)', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'panty_item' }]] }
  })
);
bot.action('panty_pay', async (ctx) =>
  ctx.editMessageText('💳 Zahlungsmethode:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'panty_item' }]
      ]
    }
  })
);

// Socks
bot.action('socks_item', async (ctx) => {
  await ctx.editMessageText('🧦 Socken – Getragen & verpackt mit Foto-Beweis', {
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
bot.action('socks_info', async (ctx) =>
  ctx.editMessageText('ℹ️ Socken werden getragen, verpackt & mit Foto geliefert.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'socks_item' }]] }
  })
);
bot.action('socks_price', async (ctx) =>
  ctx.editMessageText('💰 Preis: 30€ (+20€/Tag extra)', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'socks_item' }]] }
  })
);
bot.action('socks_pay', async (ctx) =>
  ctx.editMessageText('💳 Zahlungsmethode:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
        [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
        [{ text: '🔙 Zurück', callback_data: 'socks_item' }]
      ]
    }
  })
);

// ❤️ Girlfriend / Domina Pass
bot.action('preise_gf_domina', async (ctx) => {
  await ctx.editMessageText('❤️ *Girlfriend & Domina Pässe*\n\n💖 Wähle deinen Pass:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💖 Girlfriend Pass', callback_data: 'preise_girlfriend' }],
        [{ text: '🖤 Domina / Slave Pass', callback_data: 'preise_domina' }],
        [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
      ]
    }
  });
});

// 💖 Girlfriend Pass
bot.action('preise_girlfriend', async (ctx) => {
  await ctx.editMessageText('💖 *Girlfriend Pass*\n\n💌 1 Woche Daily Chats (30 Min) + Full Access + intime Momente nur für dich.', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'info_girlfriend' }],
        [{ text: '💰 Preis', callback_data: 'preis_girlfriend' }],
        [{ text: '🛒 Jetzt bezahlen', callback_data: 'pay_girlfriend' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_gf_domina' }]
      ]
    }
  });
});
bot.action('info_girlfriend', async (ctx) =>
  ctx.editMessageText('ℹ️ Girlfriend Pass Info\n💖 Deine tägliche Dosis Chiara – Chats, Aufgaben & exklusive Betreuung.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_girlfriend' }]] }
  })
);
bot.action('preis_girlfriend', async (ctx) =>
  ctx.editMessageText('💰 Preis: 150€/Woche', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_girlfriend' }]] }
  })
);
bot.action('pay_girlfriend', async (ctx) =>
  activatePass(ctx, 'GF', 7, 'preise_girlfriend')
);

// 🖤 Domina Pass
bot.action('preise_domina', async (ctx) => {
  await ctx.editMessageText('🖤 *Domina / Slave Pass*\n\n🔥 1 Woche Domina-Experience inkl. Sessions & exklusiver Betreuung.', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'info_domina' }],
        [{ text: '💰 Preis', callback_data: 'preis_domina' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_domina' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_gf_domina' }]
      ]
    }
  });
});
bot.action('info_domina', async (ctx) =>
  ctx.editMessageText('ℹ️ Domina Pass Info\n🖤 1 Woche Domina-Power – inklusive Sessions & Kontrolle.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_domina' }]] }
  })
);
bot.action('preis_domina', async (ctx) =>
  ctx.editMessageText('💰 Preis: 150€/Woche', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_domina' }]] }
  })
);
bot.action('pay_domina', async (ctx) =>
  activatePass(ctx, 'Domina', 7, 'preise_domina')
);

// 🌟 VIP
bot.action('preise_vip', async (ctx) => {
  await ctx.editMessageText(
    '🔥 *Premium & VIP* 🔥\n\n🌟 Werde Teil des exklusiven VIP-Kreises – mehr Nähe, mehr Content, mehr Chiara.',
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
bot.action('info_vip', async (ctx) =>
  ctx.editMessageText('ℹ️ VIP Zugang = Snapchat VIP & Telegram Premium Zugang.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_vip' }]] }
  })
);
bot.action('preis_vip', async (ctx) =>
  ctx.editMessageText('💰 Preis: Snapchat 35€, Telegram 40€', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_vip' }]] }
  })
);
bot.action('pay_vip', async (ctx) =>
  activatePass(ctx, 'VIP', 30, 'preise_vip')
);

// 📂 Mein Bereich
bot.action('mein_bereich', async (ctx) => {
  const userId = ctx.from.id;
  const { data: user, error } = await supabase
    .from('users')
    .select('status, status_start, status_end, punkte, produkte')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return ctx.reply('⚠️ Fehler beim Laden deines Bereichs.');
  }

  let statusEmoji = '📄';
  switch (user.status) {
    case 'GF': statusEmoji = '💖'; break;
    case 'Domina': statusEmoji = '🖤'; break;
    case 'FullAccess': statusEmoji = '💎'; break;
    case 'Bronze': statusEmoji = '🥉'; break;
    case 'Silber': statusEmoji = '🥈'; break;
    case 'Gold': statusEmoji = '🔥'; break;
    case 'VIP': statusEmoji = '🏆'; break;
  }

  const today = new Date();
  const endDate = new Date(user.status_end);
  const diffDays = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));

  const gekaufteProdukte = user.produkte?.length ? user.produkte.join(', ') : 'Keine';

  await ctx.editMessageText(
    `📂 *Dein Bereich*\n\n` +
    `${statusEmoji} *Status:* ${user.status || 'Kein'}\n` +
    `⏳ *Verbleibend:* ${diffDays} Tage\n` +
    `🗓 Start: ${user.status_start || '-'}\n` +
    `🛑 Ende: ${user.status_end || '-'}\n\n` +
    `⭐ Punkte: ${user.punkte || 0}\n` +
    `🛍 Gekaufte Produkte: ${gekaufteProdukte}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 Punkte einlösen', callback_data: 'punkte_einloesen' }],
          [{ text: '🔙 Zurück', callback_data: 'back_home' }]
        ]
      }
    }
  );
});

// 🛠 Admin Menü
bot.command('admin', async (ctx) => {
  if (ctx.from.id !== 5647887831) {
    return ctx.reply('❌ Nur Admin darf diesen Befehl verwenden.');
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
bot.action('admin_stats', async (ctx) => {
  const { data, error } = await supabase.from('users').select('id');
  if (error) return ctx.reply('Fehler bei Statistik.');
  await ctx.editMessageText(`📊 *Gespeicherte User: ${data.length}*`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'admin_menu' }]] }
  });
});
bot.action('admin_broadcast_info', async (ctx) => {
  await ctx.editMessageText(
    '📢 *Broadcast starten:*\n\nNutze `/broadcast Dein Text` um allen Usern eine Nachricht zu senden.',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'admin_menu' }]] }
    }
  );
});
bot.command('broadcast', async (ctx) => {
  if (ctx.from.id !== 5647887831) return;
  const message = ctx.message.text.split(' ').slice(1).join(' ');
  const { data } = await supabase.from('users').select('id');
  for (const u of data) {
    try { await ctx.telegram.sendMessage(u.id, message); } catch {}
  }
  ctx.reply(`✅ Broadcast an ${data.length} User gesendet.`);
});

// 📜 Regeln
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

bot.action('regeln_erlaubt', async (ctx) =>
  ctx.editMessageText('✅ Erlaubt: Respekt, pünktliche Zahlungen, klare Kommunikation.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'go_regeln' }]] }
  })
);
bot.action('regeln_sessions', async (ctx) =>
  ctx.editMessageText('⏱️ Sessions müssen vorher gebucht werden – keine spontane Verfügbarkeit.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'go_regeln' }]] }
  })
);
bot.action('regeln_cam', async (ctx) =>
  ctx.editMessageText('📷 Cam-Sessions werden aufgezeichnet und nicht weitergegeben – Respekt & Diskretion sind Pflicht.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'go_regeln' }]] }
  })
);

// 📹 Livecam Sessions
bot.action('preise_livecam', async (ctx) => {
  await ctx.editMessageText('📹 *Livecam Sessions*\n\n🔥 Interaktive Shows – live nur für dich!', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'info_livecam' }],
        [{ text: '💰 Preis', callback_data: 'preis_livecam' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_livecam' }],
        [{ text: '🔙 Zurück', callback_data: 'menu_preise' }]
      ]
    }
  });
});
bot.action('info_livecam', async (ctx) =>
  ctx.editMessageText('ℹ️ Live Cam Session Info\n🔥 Individuelle Cam Shows – Dauer & Inhalt nach Wunsch.', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_livecam' }]] }
  })
);
bot.action('preis_livecam', async (ctx) =>
  ctx.editMessageText('💰 Preis: 10€/10 Min', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_livecam' }]] }
  })
);
bot.action('pay_livecam', async (ctx) =>
  ctx.editMessageText('💳 Zahlungsmethode auswählen:', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [
      [{ text: '💵 PayPal', url: 'https://paypal.com/deinlink' }],
      [{ text: '💳 SumUp', url: 'https://sumup.com/deinlink' }],
      [{ text: '🔙 Zurück', callback_data: 'preise_livecam' }]
    ]}
  })
);

// 🎯 Punkte einlösen
bot.action('punkte_einloesen', async (ctx) => {
  const userId = ctx.from.id;
  const { data: user, error } = await supabase.from('users').select('punkte').eq('id', userId).single();
  if (error || !user) {
    return ctx.reply('⚠️ Fehler beim Laden deiner Punkte.');
  }

  if (user.punkte < 50) {
    return ctx.editMessageText('❌ Du hast zu wenige Punkte zum Einlösen.\n\n🔥 Tipp: Sammle Punkte durch Käufe!', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'mein_bereich' }]] }
    });
  }

  await ctx.editMessageText(`🎯 *Punkte einlösen*\n\n⭐ Du hast ${user.punkte} Punkte.\n✅ Möchtest du 50 Punkte für 5€ Rabatt einlösen?`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [
      [{ text: '✅ Ja, einlösen', callback_data: 'punkte_bestatigen' }],
      [{ text: '🔙 Zurück', callback_data: 'mein_bereich' }]
    ]}
  });
});

bot.action('punkte_bestatigen', async (ctx) => {
  const userId = ctx.from.id;

  // Aktuelle Punkte abrufen
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('punkte')
    .eq('id', userId)
    .single();

  if (fetchError || !user) {
    return ctx.reply('⚠️ Fehler beim Abrufen deiner Punkte.');
  }

  if (user.punkte < 50) {
    return ctx.editMessageText('❌ Du hast nicht genug Punkte.', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'mein_bereich' }]] }
    });
  }

  // Punkte reduzieren
  const neuePunkte = user.punkte - 50;
  const { error: updateError } = await supabase
    .from('users')
    .update({ punkte: neuePunkte })
    .eq('id', userId);

  if (updateError) {
    return ctx.reply('⚠️ Fehler beim Einlösen der Punkte.');
  }

  await ctx.editMessageText(
    `✅ *50 Punkte eingelöst!*\n💰 Du hast jetzt ${neuePunkte} Punkte.\n🔥 5€ Rabatt auf deinen nächsten Kauf ist aktiviert.`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'mein_bereich' }]] }
    }
  );
});

// 🚀 Bot Start (Webhook läuft automatisch)
console.log("🚀 ChiaraBot gestartet & läuft im Webhook-Modus");