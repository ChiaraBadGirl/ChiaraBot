import express from "express";
import { Telegraf, Markup } from "telegraf";
import { supabase } from "./supabaseClient.js";
import paypal from '@paypal/checkout-server-sdk';

// Variablen aus Railway
const BOT_TOKEN = process.env.BOT_TOKEN || "DEIN_BOT_TOKEN";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "DEIN_LIVE_CLIENT_ID";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "DEIN_LIVE_SECRET";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "super-secret-chiara";
const RAILWAY_DOMAIN = process.env.RAILWAY_DOMAIN || "DEINE-DOMAIN.up.railway.app";

// 🔹 Funktion zum Escapen von MarkdownV2-Zeichen
function mdEscape(text) {
  if (!text) return '';
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// 🔹 PayPal Umgebung (Live)
let environment = new paypal.core.LiveEnvironment(
    PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET
);
let client = new paypal.core.PayPalHttpClient(environment);

// Bot erstellen
const bot = new Telegraf(BOT_TOKEN);


// 🔹 Globaler Fehlerfänger mit User & Callback Info
bot.catch((err, ctx) => {
  const user = ctx?.from?.username
    ? `@${ctx.from.username}`
    : ctx?.from?.id || "Unbekannt";
  const action = ctx?.update?.callback_query?.data || "Keine Action";

  console.error(
    `❌ Fehler bei ${ctx.updateType} | User: ${user} | Action: ${action}\n`,
    err
  );
});

// 🔹 Funktion hier platzieren:
async function activatePass(ctx, statusCode, durationDays, backCallback) {
  const userId = ctx.from.id;

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + durationDays);

  const { error } = await supabase
    .from('users')
    .update({
      status: statusCode,
      status_start: startDate.toISOString().split('T')[0],
      status_end: endDate.toISOString().split('T')[0]
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
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink' }],
          [{ text: '📱 Apple/Google Pay', url: 'https://sumup.com/deinlink' }],
          [{ text: '🔙 Zurück', callback_data: backCallback }]
        ]
      }
    }
  );
} // ✅ Funktion sauber geschlossen


// Express App für Webhook
const app = express();
app.use(bot.webhookCallback(`/webhook/${WEBHOOK_SECRET}`));

// Webhook bei Telegram registrieren
bot.telegram.setWebhook(`https://${RAILWAY_DOMAIN}/webhook/${WEBHOOK_SECRET}`);

// Test Endpoint
app.get("/", (req, res) => {
  res.send("✅ ChiaraBot läuft über Webhook!");
});

// 📌 Schritt 1: PayPal REST-API Route zum Erstellen der Bestellung
app.post("/create-order", express.json(), async (req, res) => {
  const { telegramId, productName, price } = req.body;

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: productName || "VIP Pass",
        amount: {
          currency_code: "EUR",
          value: price || "40.00"
        },
        custom_id: telegramId // Damit wir den Telegram-User wiederfinden
      }
    ],
    application_context: {
      return_url: `https://${RAILWAY_DOMAIN}/paypal/success?telegramId=${telegramId}`,
      cancel_url: `https://${RAILWAY_DOMAIN}/paypal/cancel`
    }
  });

  try {
    const order = await client.execute(request);
    res.json({ id: order.result.id, links: order.result.links });
  } catch (err) {
    console.error("❌ Fehler beim Erstellen der PayPal-Bestellung:", err);
    res.status(500).send("Fehler bei PayPal-Order");
  }
});

// Erfolg mit Pass-Aktivierung (universell für alle Produkte mit individueller Laufzeit)
app.get("/success", async (req, res) => {
  try {
    const telegramId = req.query.telegramId;
    const productName = req.query.productName || "UNBEKANNT";
    const price = parseFloat(req.query.price) || 0;

    if (!telegramId) {
      return res.status(400).send("❌ Fehler: Telegram-ID fehlt.");
    }

    // 🔹 Laufzeit-Mapping (Tage pro Produkt)
    const laufzeitMapping = {
      VIP_PASS: 30,
      FULL_ACCESS: 30,
      DADDY_BRONZE: 30,
      DADDY_SILBER: 30,
      DADDY_GOLD: 30,
      GF_PASS: 7,
      DOMINA_PASS: 7,
      VIDEO_PACK_5: 9999,   // Lifetime (9999 Tage als Platzhalter)
      VIDEO_PACK_10: 9999,  // Lifetime
      VIDEO_PACK_15: 9999,  // Lifetime
      CUSTOM3_PASS: 9999,
      CUSTOM5_PASS: 9999,
      PANTY_PASS: 0,        // Kein Ablaufdatum
      SOCKS_PASS: 0         // Kein Ablaufdatum
    };

    // 🔹 Status-Code bestimmen
    let statusCode = productName.toUpperCase();
    if (statusCode.includes("FULL")) statusCode = "FULL";
    if (statusCode.includes("VIP")) statusCode = "VIP";
    if (statusCode.includes("DADDY_BRONZE")) statusCode = "DADDY_BRONZE";
    if (statusCode.includes("DADDY_SILBER")) statusCode = "DADDY_SILBER";
    if (statusCode.includes("DADDY_GOLD")) statusCode = "DADDY_GOLD";
    if (statusCode.includes("GF_PASS")) statusCode = "GF";
    if (statusCode.includes("DOMINA_PASS")) statusCode = "SLAVE";

    // 🔹 Laufzeit aus Mapping holen (Fallback: 30 Tage)
    const durationDays = laufzeitMapping[productName.toUpperCase()] || 30;

    // 🔹 Start & Enddatum berechnen
    const startDate = new Date();
    const endDate = new Date();
    if (durationDays > 0 && durationDays < 9999) {
      endDate.setDate(startDate.getDate() + durationDays);
    } else if (durationDays >= 9999) {
      endDate.setFullYear(startDate.getFullYear() + 50); // Lifetime
    } else {
      endDate.setDate(startDate.getDate()); // Kein Ablaufdatum (z.B. Panty)
    }

    // 🔹 Punkte berechnen (15 % vom Preis)
    const punkte = Math.floor(price * 0.15);

    // 🔹 Status & Laufzeit in DB speichern
    const { error: updateError } = await supabase
      .from("users")
      .update({
        status: statusCode,
        status_start: startDate.toISOString().split("T")[0],
        status_end: endDate.toISOString().split("T")[0]
      })
      .eq("id", telegramId);

    if (updateError) {
      console.error("❌ Fehler bei Status-Update:", updateError);
      return res.send("Zahlung erfolgreich, aber Status-Update fehlgeschlagen.");
    }

    // 🔹 Punkte & Produkt speichern
    const { error: rpcError } = await supabase.rpc("increment_punkte_und_produkt", {
      userid: telegramId,
      punkteanzahl: punkte,
      produktname: productName
    });

    if (rpcError) {
      console.error("❌ Fehler bei Punkte-Update:", rpcError);
      return res.send("Zahlung erfolgreich, aber Punkte-Update fehlgeschlagen.");
    }

    console.log(`✅ ${statusCode} aktiviert (${durationDays} Tage) + ${punkte} Punkte an User ${telegramId}`);

    // 🔹 Telegram Nachricht an User
    try {
      const ablaufText = durationDays > 0 && durationDays < 9999
        ? `📅 Gültig bis: ${endDate.toLocaleDateString("de-DE")}`
        : (durationDays >= 9999 ? `♾️ Lifetime Access` : `⏳ Kein Ablaufdatum`);
      
      await bot.telegram.sendMessage(
        telegramId,
        `🏆 *${statusCode} aktiviert!*\n\n${ablaufText}\n💵 Zahlung: ${price}€\n⭐ Punkte: +${punkte}`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      console.error(`⚠️ Konnte Telegram-Nachricht an ${telegramId} nicht senden`, err);
    }

    // 🔹 Antwort im Browser
    res.send(`
      <h1>✅ Zahlung erfolgreich!</h1>
      <p>${statusCode} wurde freigeschaltet (${durationDays > 0 && durationDays < 9999 ? durationDays + " Tage" : "Lifetime/ohne Ablauf"}).</p>
      <p>Du kannst jetzt zurück zu Telegram gehen.</p>
    `);

  } catch (err) {
    console.error("❌ Fehler in /success:", err);
    res.status(500).send("Interner Fehler");
  }
});

// ❌ Abbruch-Handler
app.get("/cancel", async (req, res) => {
  try {
    const telegramId = req.query.telegramId;

    console.log(`⚠️ Zahlung abgebrochen von User ${telegramId || "Unbekannt"}`);

    // 🔹 Telegram Nachricht an den User
    if (telegramId) {
      try {
        await bot.telegram.sendMessage(
          telegramId,
          `⚠️ *Zahlung abgebrochen!*\n\nKeine Sorge, du kannst jederzeit erneut bezahlen, wenn du deinen VIP Pass aktivieren möchtest.`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error(`⚠️ Konnte Abbruch-Nachricht an ${telegramId} nicht senden`, err);
      }
    }

    // 🔹 HTML Antwort im Browser
    res.send(`
      <h1>⚠️ Zahlung abgebrochen</h1>
      <p>Dein VIP Pass wurde nicht freigeschaltet. Du kannst den Kauf jederzeit erneut starten.</p>
    `);

  } catch (err) {
    console.error("❌ Fehler in /cancel:", err);
    res.status(500).send("Interner Fehler");
  }
});

// ✅ Webhook-Endpoint für PayPal Live
app.post("/webhook/paypal", express.json(), async (req, res) => {
  try {
    const webhookEvent = req.body;
    console.log("🔔 Live Webhook Event:", webhookEvent.event_type);

    if (webhookEvent.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const capture = webhookEvent.resource;

      // 📌 Daten extrahieren
      const telegramId = capture.custom_id;
      const payerEmail = capture.payer.email_address;
      const amount = parseFloat(capture.amount.value);
      const currency = capture.amount.currency_code;
      const productName = capture?.invoice_id || capture?.note_to_payer || "Unbekanntes Produkt";

      console.log(`✅ Zahlung erfolgreich: ${payerEmail} - ${amount} ${currency} für Produkt ${productName}`);

      // 🔹 Laufzeit-Mapping
      const laufzeitMapping = {
        VIP_PASS: 30,
        FULL_ACCESS: 30,
        DADDY_BRONZE: 30,
        DADDY_SILBER: 30,
        DADDY_GOLD: 30,
        GF_PASS: 7,
        DOMINA_PASS: 7,
        VIDEO_PACK_5: 9999,
        VIDEO_PACK_10: 9999,
        VIDEO_PACK_15: 9999,
        CUSTOM3_PASS: 9999,
        CUSTOM5_PASS: 9999,
        PANTY_PASS: 0,
        SOCKS_PASS: 0
      };

      // 🔹 Status-Code bestimmen
      let statusCode = productName.toUpperCase();
      if (statusCode.includes("FULL")) statusCode = "FULL";
      if (statusCode.includes("VIP")) statusCode = "VIP";
      if (statusCode.includes("DADDY_BRONZE")) statusCode = "DADDY_BRONZE";
      if (statusCode.includes("DADDY_SILBER")) statusCode = "DADDY_SILBER";
      if (statusCode.includes("DADDY_GOLD")) statusCode = "DADDY_GOLD";
      if (statusCode.includes("GF_PASS")) statusCode = "GF";
      if (statusCode.includes("DOMINA_PASS")) statusCode = "SLAVE";

      // 🔹 Dauer ermitteln
      const durationDays = laufzeitMapping[statusCode] || 30;

      // 🔹 Start & Enddatum berechnen
      const startDate = new Date();
      const endDate = new Date();
      if (durationDays > 0 && durationDays < 9999) {
        endDate.setDate(startDate.getDate() + durationDays);
      } else if (durationDays >= 9999) {
        endDate.setFullYear(startDate.getFullYear() + 50); // Lifetime
      } else {
        endDate.setDate(startDate.getDate()); // Kein Ablaufdatum
      }

      // 🔹 Punkteberechnung (15 % vom Betrag)
      const punkte = Math.floor(amount * 0.15);

      // 🔹 Status & Laufzeit in Supabase speichern
      const { error: updateError } = await supabase
        .from("users")
        .update({
          status: statusCode,
          status_start: startDate.toISOString().split("T")[0],
          status_end: endDate.toISOString().split("T")[0]
        })
        .eq("id", telegramId);

      if (updateError) console.error("❌ Fehler bei Status-Update:", updateError);

      // 🔹 Punkte & Produkt speichern
      const { error: rpcError } = await supabase.rpc("increment_punkte_und_produkt", {
        userid: telegramId,
        punkteanzahl: punkte,
        produktname: productName
      });

      if (rpcError) console.error("❌ Fehler bei Punkte-Update:", rpcError);

      // 🔹 Telegram Nachricht an User
      try {
        const ablaufText = durationDays > 0 && durationDays < 9999
          ? `📅 Gültig bis: ${endDate.toLocaleDateString("de-DE")}`
          : (durationDays >= 9999 ? `♾️ Lifetime Access` : `⏳ Kein Ablaufdatum`);
        
        await bot.telegram.sendMessage(
          telegramId,
          `🏆 *${statusCode} aktiviert!*\n\n${ablaufText}\n💵 Zahlung: ${amount}€\n⭐ Punkte: +${punkte}`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error(`⚠️ Konnte Telegram-Nachricht an ${telegramId} nicht senden`, err);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Fehler im PayPal Webhook:", err);
    res.status(500).send("ERROR");
  }
});

// 📌 Debug-Webhook zum Testen von eingehenden Anfragen
app.post("/paypal/webhook-test", express.json({ type: "*/*" }), (req, res) => {
  console.log("🔍 Webhook-Test erhalten!");
  console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body, null, 2));
  res.status(200).send("Webhook-Test OK");
});

// 📌 PayPal Webhook Route
app.post("/paypal/webhook", express.json({ type: "*/*" }), async (req, res) => {
  try {
    console.log("✅ PayPal Webhook empfangen:", req.body);

    const event = req.body;

    // Wir reagieren nur auf erfolgreiche Zahlungen
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const capture = event.resource;

      // 💰 Betrag & Währung
      const amount = parseFloat(capture.amount.value);
      const currency = capture.amount.currency_code;

      // 📌 Kunden-ID (aus Custom-Feld)
      let telegramId = capture.custom_id;

      // ❌ Falls keine Zahl: Testweise Admin-ID nutzen
      if (isNaN(telegramId)) {
        telegramId = 5647887831; // Deine ID für Test
      }

      // 📌 Produktname aus Beschreibung (falls vorhanden)
      const produktName = capture?.invoice_id || capture?.note_to_payer || "Unbekanntes Produkt";

      console.log(`💵 Zahlung erfolgreich: ${amount} ${currency} von User ${telegramId} für Produkt: ${produktName}`);

      // 🔢 Punkteberechnung (15 % vom Betrag)
      const punkte = Math.floor(amount * 0.15);

      // 🔄 Punkte & Produkt in Supabase updaten
      const { error } = await supabase
        .rpc('increment_punkte_und_produkt', {
          userid: telegramId,
          punkteanzahl: punkte,
          produktname: produktName
        });

      if (error) {
        console.error("❌ Fehler beim Update:", error);
      } else {
        console.log(`✅ ${punkte} Punkte gutgeschrieben + Produkt '${produktName}' an User ${telegramId}`);
      }

      // ✅ Erfolg an PayPal zurückmelden
      res.status(200).send("OK");
    } else {
      res.status(200).send("IGNORED");
    }

  } catch (err) {
    console.error("❌ Fehler im PayPal Webhook:", err);
    res.status(500).send("ERROR");
  }
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
  
// 🔹 Gemeinsame Funktion für Start/Home-Menü
async function sendHomeMenu(ctx) {
  const homeText = 
    '🔥 *Willkommen in deiner verbotenen Zone!* 🔥\n\n' +
    'Bereit für exklusiven Zugang, geheime Inhalte und private Erlebnisse? 😈\n\n' +
    'Wähle unten, wohin dein nächstes Abenteuer geht…';

  const keyboard = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'go_info' }, { text: '🧾 Menu', callback_data: 'go_menu' }],
        [{ text: '‼️ Regeln', callback_data: 'go_regeln' }],
        [{ text: '📲 Mein Kanal', url: 'https://t.me/+XcpXcLb52vo0ZGNi' }, { text: '💬 Schreib mir', url: 'https://t.me/ChiaraBadGirl' }],
        [{ text: '👤 Mein Bereich', callback_data: 'mein_bereich' }]
      ]
    }
  };

  // Prüfen, ob der Aufruf aus einem Inline-Button kommt oder normal (/start)
  if (ctx.updateType === 'callback_query') {
    return ctx.editMessageText(homeText, keyboard).catch(() => {
      return ctx.reply(homeText, keyboard); // Fallback, falls Edit nicht geht
    });
  } else {
    return ctx.reply(homeText, keyboard);
  }
}

// 🔹 /start Befehl
bot.start(async (ctx) => {
  const user = {
    id: ctx.from.id,
    username: ctx.from.username || null,
    first_name: ctx.from.first_name || null,
    last_name: ctx.from.last_name || null,
    language_code: ctx.from.language_code || null
  };
  await saveUser(user);
  await sendHomeMenu(ctx);
});

// 🔹 back_home Action
bot.action('back_home', async (ctx) => {
  await sendHomeMenu(ctx);
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
  const telegramId = ctx.from.id;

  // PayPal Link
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Full+Access+Pass` +
    `&amount=50.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=FULL_ACCESS&price=50` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;

  // SumUp Links
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;

  await ctx.editMessageText(
    '💳 *Wähle deine Zahlungsmethode für Full Access Pass:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'fullaccess_1m' }]
        ]
      }
    }
  );
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

// 🎥 5 Videos
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
bot.action('pay_videos_5', async (ctx) => {
  const telegramId = ctx.from.id;
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Video+Pack+5` +
    `&amount=50.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=VIDEO_PACK_5&price=50` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;
  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für 5 Videos:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'videos_5' }]
        ]
      }
    }
  );
});

// 🎥 10 Videos
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
bot.action('pay_videos_10', async (ctx) => {
  const telegramId = ctx.from.id;
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Video+Pack+10` +
    `&amount=90.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=VIDEO_PACK_10&price=90` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;
  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für 10 Videos:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'videos_10' }]
        ]
      }
    }
  );
});

// 🎥 15 Videos
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
bot.action('pay_videos_15', async (ctx) => {
  const telegramId = ctx.from.id;
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Video+Pack+15` +
    `&amount=120.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=VIDEO_PACK_15&price=120` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;
  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für 15 Videos:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'videos_15' }]
        ]
      }
    }
  );
});

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
bot.action('pay_daddy_bronze', async (ctx) => {
  const telegramId = ctx.from.id;
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Daddy+Bronze` +
    `&amount=80.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=DADDY_BRONZE&price=80` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;
  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Daddy Bronze:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'preise_daddy_bronze' }]
        ]
      }
    }
  );
});

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
bot.action('pay_daddy_silber', async (ctx) => {
  const telegramId = ctx.from.id;
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Daddy+Silber` +
    `&amount=150.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=DADDY_SILBER&price=150` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;
  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Daddy Silber:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'preise_daddy_silber' }]
        ]
      }
    }
  );
});

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
bot.action('pay_daddy_gold', async (ctx) => {
  const telegramId = ctx.from.id;
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Daddy+Gold` +
    `&amount=225.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=DADDY_GOLD&price=225` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;
  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Daddy Gold:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'preise_daddy_gold' }]
        ]
      }
    }
  );
});

// ❤️ Girlfriend / Domina Menü
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
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_girlfriend' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_gf_domina' }]
      ]
    }
  });
});

bot.action('info_girlfriend', async (ctx) => {
  await ctx.editMessageText('ℹ️ *Girlfriend Pass Info*\n\n💖 Deine tägliche Dosis Chiara – Chats, Aufgaben & exklusive Betreuung.', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_girlfriend' }]]
    }
  });
});

bot.action('preis_girlfriend', async (ctx) => {
  await ctx.editMessageText('💰 *Preis:* 150€/Woche', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_girlfriend' }]]
    }
  });
});

bot.action('pay_girlfriend', async (ctx) => {
  const telegramId = ctx.from.id;
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Girlfriend+Pass` +
    `&amount=150.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=GF_PASS&price=150` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;
  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Girlfriend Pass:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'preise_girlfriend' }]
        ]
      }
    }
  );
});

// 🖤 Domina Pass
bot.action('preise_domina', async (ctx) => {
  await ctx.editMessageText('🖤 *Domina / Slave Pass*\n\n🔥 1 Woche Domina-Experience inkl. Sessions & exklusiver Betreuung.', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ Info', callback_data: 'info_domina' }],
        [{ text: '💰 Preis', callback_data: 'preis_domina' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_domina' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_gf_domina' }]
      ]
    }
  });
});

bot.action('info_domina', async (ctx) => {
  await ctx.editMessageText('ℹ *Domina / Slave Pass Info*\n\n🖤 1 Woche Domina-Power – inklusive Sessions & Kontrolle.', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_domina' }]]
    }
  });
});

bot.action('preis_domina', async (ctx) => {
  await ctx.editMessageText('💰 *Preis*: 150€/Woche', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_domina' }]]
    }
  });
});

bot.action('pay_domina', async (ctx) => {
  const telegramId = ctx.from.id;
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Domina+Pass` +
    `&amount=150.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=DOMINA_PASS&price=150` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;
  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Domina Pass:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'preise_domina' }]
        ]
      }
    }
  );
});

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

bot.action('pay_vip', async (ctx) => {
  const telegramId = ctx.from.id;

  // PayPal Link (Sandbox oder Live später anpassen)
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=VIP+Pass` +
    `&amount=40.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=VIP_PASS&price=40` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;

  // SumUp Links (Platzhalter)
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;

  await ctx.editMessageText(
    '💳 *Wähle deine Zahlungsmethode für VIP Pass:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'preise_vip' }]
        ]
      }
    }
  );
});

bot.action('info_vip', async (ctx) => ctx.editMessageText(
  'ℹ️ Snapchat VIP & Telegram Premium Zugang.', 
  { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_vip' }]] } }
));

bot.action('preis_vip', async (ctx) => ctx.editMessageText(
  '💰 Preis: Snapchat 35€, Telegram 40€', 
  { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'preise_vip' }]] } }
));

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

// 3 Min Video
bot.action('custom_3', async (ctx) => {
  await ctx.editMessageText('🎥 *3 Min Custom Video*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'custom3_info' }],
        [{ text: '💰 Preis', callback_data: 'custom3_price' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_custom3' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_custom' }]
      ]
    }
  });
});
bot.action('custom3_info', async (ctx) => ctx.editMessageText('ℹ️ Individuelles Video (3 Min).', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'custom_3' }]] } }));
bot.action('custom3_price', async (ctx) => ctx.editMessageText('💰 Preis: 100€', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'custom_3' }]] } }));
bot.action('pay_custom3', async (ctx) => {
  const telegramId = ctx.from.id;
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Custom+Video+3Min` +
    `&amount=100.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=CUSTOM3_PASS&price=100` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;
  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für 3 Min Custom Video:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'custom_3' }]
        ]
      }
    }
  );
});

// 5 Min Video
bot.action('custom_5', async (ctx) => {
  await ctx.editMessageText('🎥 *5 Min Custom Video*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'custom5_info' }],
        [{ text: '💰 Preis', callback_data: 'custom5_price' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_custom5' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_custom' }]
      ]
    }
  });
});
bot.action('custom5_info', async (ctx) => ctx.editMessageText('ℹ️ Individuelles Video (5 Min).', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'custom_5' }]] } }));
bot.action('custom5_price', async (ctx) => ctx.editMessageText('💰 Preis: 140€', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'custom_5' }]] } }));
bot.action('pay_custom5', async (ctx) => {
  const telegramId = ctx.from.id;
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Custom+Video+5Min` +
    `&amount=140.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=CUSTOM5_PASS&price=140` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;
  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für 5 Min Custom Video:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'custom_5' }]
        ]
      }
    }
  );
});

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

// Panty
bot.action('panty_item', async (ctx) => {
  await ctx.editMessageText('👙 *Panty*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'panty_info' }],
        [{ text: '💰 Preis', callback_data: 'panty_price' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_panty' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_panties' }]
      ]
    }
  });
});
bot.action('panty_info', async (ctx) => ctx.editMessageText('ℹ️ Getragene Panty + Foto-Beweis.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'panty_item' }]] } }));
bot.action('panty_price', async (ctx) => ctx.editMessageText('💰 Preis: 40€ (+20€/Tag extra)', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'panty_item' }]] } }));
bot.action('pay_panty', async (ctx) => {
  const telegramId = ctx.from.id;
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Panty` +
    `&amount=40.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=PANTY_PASS&price=40` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;
  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Panty:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'panty_item' }]
        ]
      }
    }
  );
});

// Socks
bot.action('socks_item', async (ctx) => {
  await ctx.editMessageText('🧦 *Socks*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️ Info', callback_data: 'socks_info' }],
        [{ text: '💰 Preis', callback_data: 'socks_price' }],
        [{ text: '💳 Jetzt bezahlen', callback_data: 'pay_socks' }],
        [{ text: '🔙 Zurück', callback_data: 'preise_panties' }]
      ]
    }
  });
});
bot.action('socks_info', async (ctx) => ctx.editMessageText('ℹ️ Getragene Socken + Foto-Beweis.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'socks_item' }]] } }));
bot.action('socks_price', async (ctx) => ctx.editMessageText('💰 Preis: 30€ (+20€/Tag extra)', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'socks_item' }]] } }));
bot.action('pay_socks', async (ctx) => {
  const telegramId = ctx.from.id;
  const paypalLink = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=sb-1sii637606070@business.example.com` +
    `&item_name=Socks` +
    `&amount=30.00` +
    `&currency_code=EUR` +
    `&custom=${telegramId}` +
    `&return=https://${RAILWAY_DOMAIN}/success?telegramId=${telegramId}&productName=SOCKS_PASS&price=30` +
    `&cancel_return=https://${RAILWAY_DOMAIN}/cancel?telegramId=${telegramId}`;
  const sumupKredit = `https://sumup.com/deinlink-kredit`;
  const sumupAppleGoogle = `https://sumup.com/deinlink-apple-google`;
  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Socks:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: paypalLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: sumupKredit }],
          [{ text: '📱 Apple Pay / Google Pay', url: sumupAppleGoogle }],
          [{ text: '🔙 Zurück', callback_data: 'socks_item' }]
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

// Hilfsfunktion: MarkdownV2 Escape für alle kritischen Zeichen
function escapeMarkdownV2(text) {
  return text.replace(/([_\*\[\]\(\)~`>#+\-=|{}\.!,:\\])/g, '\\$1');
}

// 📂 Mein Bereich (MarkdownV2 safe)
bot.action('mein_bereich', async (ctx) => {
  const userId = ctx.from.id;

  // Daten aus Supabase abrufen
  const { data: user, error } = await supabase
    .from('users')
    .select('status, status_start, status_end, punkte, produkte')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.error(error);
    return ctx.reply('⚠️ Fehler beim Laden deines Bereichs.');
  }

  // Status-Emoji
  let statusEmoji = '📄';
  switch (user.status) {
    case 'GF': statusEmoji = '💖'; break;
    case 'SLAVE': statusEmoji = '🖤'; break;
    case 'FULL': statusEmoji = '💎'; break;
    case 'DADDY_BRONZE': statusEmoji = '🥉'; break;
    case 'DADDY_SILBER': statusEmoji = '🥈'; break;
    case 'DADDY_GOLD': statusEmoji = '🔥'; break;
    case 'VIP': statusEmoji = '🏆'; break;
  }

  // Ablauf-Text berechnen
  const today = new Date();
  const endDate = new Date(user.status_end);
  let verbleibendText = '';
  let diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

  if (!user.status_end || isNaN(endDate)) {
    verbleibendText = '⏳ Kein Ablaufdatum';
  } else if (diffDays >= 3650) { // 10 Jahre als Lifetime-Anzeige
    verbleibendText = '♾️ Lifetime Access';
  } else if (diffDays > 0) {
    verbleibendText = `⏳ Verbleibend: ${diffDays} Tage\n📅 Ende: ${user.status_end}`;
  } else {
    verbleibendText = '⚠️ Abgelaufen';
  }

  // Produkte sicher escapen
  let gekaufteProdukte = (user.produkte && user.produkte.length > 0)
    ? user.produkte.map(p => escapeMarkdownV2(p)).join(', ')
    : 'Keine';

  // Nachricht mit MarkdownV2
  await ctx.editMessageText(
    escapeMarkdownV2(`📂 Dein Bereich`) + `\n\n` +
    `${statusEmoji} *Status:* ${escapeMarkdownV2(user.status || 'Kein')}\n` +
    `${escapeMarkdownV2(verbleibendText)}\n\n` +
    `⭐ *Punkte:* ${escapeMarkdownV2(String(user.punkte || 0))}\n` +
    `🛍 *Gekaufte Produkte:* ${gekaufteProdukte}\n\n` +
    escapeMarkdownV2(`🔥 Tipp: Löse deine Punkte ein für Rabatte & Boni!`),
    {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 Punkte einlösen', callback_data: 'punkte_einloesen' }],
          [{ text: '🔙 Zurück', callback_data: 'back_home' }]
        ]
      }
    }
  );
}); // ✅ jetzt geschlossen

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

// 🔹 Gemeinsame Funktion für Admin-Menü
async function sendAdminMenu(ctx) {
  const adminText = '🛠️ *Admin-Menü*';

  const keyboard = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Statistik', callback_data: 'admin_stats' }],
        [{ text: '📢 Broadcast starten', callback_data: 'admin_broadcast_info' }],
        [{ text: '🔙 Zurück', callback_data: 'back_home' }]
      ]
    }
  };

  if (ctx.updateType === 'callback_query') {
    return ctx.editMessageText(adminText, keyboard).catch(() => {
      return ctx.reply(adminText, keyboard);
    });
  } else {
    return ctx.reply(adminText, keyboard);
  }
}

// 🔹 Admin Command
bot.command('admin', async (ctx) => {
  if (ctx.from.id !== 5647887831) {
    return ctx.reply('❌ Nur der Admin darf diesen Befehl verwenden.');
  }
  await sendAdminMenu(ctx);
});

// 🔹 Admin-Menü Callback
bot.action('admin_menu', async (ctx) => {
  if (ctx.from.id !== 5647887831) return;
  await sendAdminMenu(ctx);
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

// 🚀 Bot Start – Webhook only
console.log("🚀 ChiaraBot gestartet & läuft im Webhook-Modus");