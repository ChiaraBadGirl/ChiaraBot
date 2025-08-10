// ===================
// Imports & Setup
// ===================
import express from "express";
import fetch from "node-fetch"; // Für API-Aufrufe aus den Bot-Buttons
import { Telegraf, Markup } from "telegraf";
import { supabase } from "./supabaseClient.js";
import paypal from "@paypal/checkout-server-sdk";

// ===================
// Environment Variablen aus Railway
// ===================
const BOT_TOKEN = process.env.BOT_TOKEN || "DEIN_BOT_TOKEN";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "DEIN_LIVE_CLIENT_ID";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "DEIN_LIVE_SECRET";
const PAYPAL_ENVIRONMENT = process.env.PAYPAL_ENVIRONMENT || "live";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "super-secret-chiara";
const RAILWAY_DOMAIN = process.env.RAILWAY_DOMAIN || "chiarabot-production.up.railway.app";

// ===================
// Markdown Escape
// ===================
function mdEscape(text) {
  if (!text) return "";
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

// ===================
// PayPal Umgebung einrichten (Live/Sandbox)
// ===================
let environment;
if (PAYPAL_ENVIRONMENT === "live") {
  environment = new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);
} else {
  environment = new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);
}
let paypalClient = new paypal.core.PayPalHttpClient(environment);

// ===================
// Bot erstellen
// ===================
const bot = new Telegraf(BOT_TOKEN);

// Fehler-Logging
bot.catch((err, ctx) => {
  const user = ctx?.from?.username
    ? `@${ctx.from.username}`
    : ctx?.from?.id || "Unbekannt";
  const action = ctx?.update?.callback_query?.data || "Keine Action";
  console.error(`❌ Fehler bei ${ctx.updateType} | User: ${user} | Action: ${action}\n`, err);
});

// ===================
// Express Setup
// ===================
const app = express();
app.use(bot.webhookCallback(`/webhook/${WEBHOOK_SECRET}`));
bot.telegram.setWebhook(`https://${RAILWAY_DOMAIN}/webhook/${WEBHOOK_SECRET}`);

// Test Endpoint
app.get("/", (req, res) => {
  res.send("✅ ChiaraBot läuft über Webhook!");
});

// ===================
// Create-Order Route (Neuer PayPal Checkout)
// ===================
app.post("/create-order", express.json(), async (req, res) => {
  try {
    const { telegramId, productName, price } = req.body;
    if (!telegramId || !productName || !price) {
      return res.status(400).json({ error: "Fehlende Parameter" });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: productName,
          amount: {
            currency_code: "EUR",
            value: price
          },
          custom_id: telegramId
        }
      ],
      application_context: {
        brand_name: "ChiaraBot",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `https://${RAILWAY_DOMAIN}/paypal/success?telegramId=${telegramId}&productName=${productName}&price=${price}`,
        cancel_url: `https://${RAILWAY_DOMAIN}/paypal/cancel?telegramId=${telegramId}`
      }
    });

    const order = await paypalClient.execute(request);
    const approveLink = order.result.links.find(l => l.rel === "approve")?.href;

    if (!approveLink) {
      return res.status(500).json({ error: "Kein Approve-Link erhalten" });
    }

    res.json({ approveLink });
  } catch (err) {
    console.error("❌ Fehler bei /create-order:", err);
    res.status(500).json({ error: "PayPal Order Fehler" });
  }
});

// ===================
// PayPal Webhook für neuen Checkout
// ===================
app.post("/webhook/paypal", express.json(), async (req, res) => {
  try {
    const event = req.body;
    console.log("🔔 PayPal Webhook Event:", event.event_type);

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const capture = event.resource;

      // 📌 Daten extrahieren
      const telegramId = capture.custom_id;
      const payerEmail = capture?.payer?.email_address || "Unbekannt";
      const amount = parseFloat(capture.amount.value);
      const currency = capture.amount.currency_code;
      const productName = capture?.invoice_id || capture?.note_to_payer || capture?.supplementary_data?.related_ids?.order_id || "Unbekannt";

      console.log(`✅ Zahlung erfolgreich: ${payerEmail} - ${amount} ${currency} für ${productName}`);

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

      if (updateError) {
        console.error("❌ Fehler bei Status-Update:", updateError);
      }

      // 🔹 Punkte & Produkt speichern
      const { error: rpcError } = await supabase.rpc("increment_punkte_und_produkt", {
        userid: telegramId,
        punkteanzahl: punkte,
        produktname: productName
      });

      if (rpcError) {
        console.error("❌ Fehler bei Punkte-Update:", rpcError);
      }

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

// ===================
// Gemeinsame Funktion: PayPal-Link über /create-order holen
// ===================
async function getPayPalApproveLink(telegramId, productName, price) {
  try {
    const response = await fetch(`https://${RAILWAY_DOMAIN}/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramId,
        productName,
        price
      })
    });

    const data = await response.json();
    if (data?.approveLink) {
      return data.approveLink;
    } else {
      console.error("❌ Kein Approve-Link erhalten:", data);
      return null;
    }
  } catch (err) {
    console.error("❌ Fehler bei getPayPalApproveLink:", err);
    return null;
  }
}

// ===================
// Home-Menü
// ===================
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

  if (ctx.updateType === 'callback_query') {
    return ctx.editMessageText(homeText, keyboard).catch(() => {
      return ctx.reply(homeText, keyboard);
    });
  } else {
    return ctx.reply(homeText, keyboard);
  }
}

// ===================
// Start-Befehl
// ===================
bot.start(async (ctx) => {
  const user = {
    id: ctx.from.id,
    username: ctx.from.username || null,
    first_name: ctx.from.first_name || null,
    last_name: ctx.from.last_name || null,
    language_code: ctx.from.language_code || null
  };

  const { data } = await supabase.from('users').select('id').eq('id', user.id).single();
  if (!data) {
    await supabase.from('users').insert([user]);
    console.log('✅ User gespeichert:', user.id);
  }

  await sendHomeMenu(ctx);
});

// ===================
// Beispiel: Full Access Pass (1 Monat) – jetzt mit neuer PayPal API
// ===================
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

bot.action('pay_fullaccess_1m', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "FULL_ACCESS", "50.00");

  if (!approveLink) {
    return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");
  }

  await ctx.editMessageText(
    '💳 *Wähle deine Zahlungsmethode für Full Access Pass (1 Monat):*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'fullaccess_1m' }]
        ]
      }
    }
  );
});

// ===================
// Video Pack 5 – neuer Checkout
// ===================
bot.action('pay_videos_5', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "VIDEO_PACK_5", "50.00");

  if (!approveLink) {
    return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");
  }

  await ctx.editMessageText(
    '💳 *Wähle deine Zahlungsmethode für Video Pack 5:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'videos_5' }]
        ]
      }
    }
  );
});

// ===================
// Video Pack 10
// ===================
bot.action('pay_videos_10', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "VIDEO_PACK_10", "90.00");

  if (!approveLink) {
    return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");
  }

  await ctx.editMessageText(
    '💳 *Wähle deine Zahlungsmethode für Video Pack 10:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'videos_10' }]
        ]
      }
    }
  );
});

// ===================
// Daddy Bronze
// ===================
bot.action('pay_daddy_bronze', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "DADDY_BRONZE", "80.00");

  if (!approveLink) {
    return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");
  }

  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Daddy Bronze:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'preise_daddy_bronze' }]
        ]
      }
    }
  );
});

// ===================
// Daddy Silber
// ===================
bot.action('pay_daddy_silber', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "DADDY_SILBER", "150.00");

  if (!approveLink) {
    return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");
  }

  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Daddy Silber:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'preise_daddy_silber' }]
        ]
      }
    }
  );
});

// ===================
// Daddy Gold
// ===================
bot.action('pay_daddy_gold', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "DADDY_GOLD", "225.00");

  if (!approveLink) return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");

  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Daddy Gold:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'preise_daddy_gold' }]
        ]
      }
    }
  );
});

// ===================
// Girlfriend Pass
// ===================
bot.action('pay_girlfriend', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "GF_PASS", "150.00");

  if (!approveLink) return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");

  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Girlfriend Pass:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'preise_girlfriend' }]
        ]
      }
    }
  );
});

// ===================
// Domina Pass
// ===================
bot.action('pay_domina', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "DOMINA_PASS", "150.00");

  if (!approveLink) return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");

  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Domina Pass:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'preise_domina' }]
        ]
      }
    }
  );
});

// ===================
// VIP Pass
// ===================
bot.action('pay_vip', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "VIP_PASS", "40.00");

  if (!approveLink) return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");

  await ctx.editMessageText(
    '💳 *Wähle deine Zahlungsmethode für VIP Pass:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'preise_vip' }]
        ]
      }
    }
  );
});

// ===================
// Custom Video 3 Min
// ===================
bot.action('pay_custom3', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "CUSTOM3_PASS", "100.00");

  if (!approveLink) return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");

  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für 3 Min Custom Video:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'custom_3' }]
        ]
      }
    }
  );
});

// ===================
// Custom Video 5 Min
// ===================
bot.action('pay_custom5', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "CUSTOM5_PASS", "140.00");

  if (!approveLink) return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");

  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für 5 Min Custom Video:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'custom_5' }]
        ]
      }
    }
  );
});

// ===================
// Panty
// ===================
bot.action('pay_panty', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "PANTY_PASS", "40.00");

  if (!approveLink) return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");

  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Panty:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'panty_item' }]
        ]
      }
    }
  );
});

// ===================
// Socks
// ===================
bot.action('pay_socks', async (ctx) => {
  const telegramId = ctx.from.id;
  const approveLink = await getPayPalApproveLink(telegramId, "SOCKS_PASS", "30.00");

  if (!approveLink) return ctx.reply("⚠️ Fehler beim Erstellen der PayPal-Zahlung. Bitte versuche es später erneut.");

  await ctx.editMessageText(
    '💳 *Wähle Zahlungsmethode für Socks:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 PayPal', url: approveLink }],
          [{ text: '💳 Kredit-/Debitkarte', url: 'https://sumup.com/deinlink-kredit' }],
          [{ text: '📱 Apple Pay / Google Pay', url: 'https://sumup.com/deinlink-apple-google' }],
          [{ text: '🔙 Zurück', callback_data: 'socks_item' }]
        ]
      }
    }
  );
});

// ===================
// Info-Menü
// ===================
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

// ===================
// Social Media Menü
// ===================
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

// ===================
// 18+ Links Menü
// ===================
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

// ===================
// Regeln
// ===================
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

// ===================
// Regeln Details
// ===================
bot.action('regeln_erlaubt', async (ctx) => {
  await ctx.editMessageText(
    '📜 *Was ist erlaubt*\n\n' +
    '✅ Respektvoller Umgang\n' +
    '✅ Nur legale Inhalte teilen\n' +
    '✅ Keine unerwünschte Werbung',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'go_regeln' }]] }
    }
  );
});

bot.action('regeln_sessions', async (ctx) => {
  await ctx.editMessageText(
    '⏱️ *Sessions*\n\n' +
    'Jede Session ist im Voraus zu bezahlen.\n' +
    'Dauer & Preis nach Absprache.',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'go_regeln' }]] }
    }
  );
});

bot.action('regeln_cam', async (ctx) => {
  await ctx.editMessageText(
    '📷 *Cam*\n\n' +
    'Cam-Sessions sind exklusiv und privat.\n' +
    'Keine Aufnahme oder Weitergabe erlaubt.',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔙 Zurück', callback_data: 'go_regeln' }]] }
    }
  );
});

// ===================
// Mein Bereich
// ===================
bot.action('mein_bereich', async (ctx) => {
  const userId = ctx.from.id;

  const { data: user, error } = await supabase
    .from('users')
    .select('status, status_start, status_end, punkte')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return ctx.reply("⚠️ Fehler beim Laden deiner Daten.");
  }

  const statusText = user.status || "Free";
  const startText = user.status_start || "-";
  const endText = user.status_end || "-";
  const punkteText = user.punkte || 0;

  await ctx.editMessageText(
    `👤 *Mein Bereich*\n\n` +
    `📌 Status: *${statusText}*\n` +
    `📅 Start: ${startText}\n` +
    `📅 Ende: ${endText}\n` +
    `⭐ Punkte: ${punkteText}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Zurück', callback_data: 'back_home' }]
        ]
      }
    }
  );
});

// ===================
// Back Home Action
// ===================
bot.action('back_home', async (ctx) => {
  await sendHomeMenu(ctx);
});

// ===================
// Serverstart & Supabase-Check
// ===================
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

// ===================
// Fallback: Unbekannte Befehle
// ===================
bot.on('message', async (ctx) => {
  if (ctx.message.text && ctx.message.text.startsWith('/')) {
    return ctx.reply("⚠️ Unbekannter Befehl. Bitte nutze das Menü.");
  }
});