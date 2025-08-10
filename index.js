// ===================
// Imports
// ===================
import express from "express";
import { Telegraf, Markup } from "telegraf";
import { createClient } from "@supabase/supabase-js";
import paypal from "@paypal/checkout-server-sdk";

// ===================
// Environment Variablen
// ===================
const BOT_TOKEN = process.env.BOT_TOKEN || "DEIN_BOT_TOKEN";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://xxxxx.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "DEIN_SUPABASE_KEY";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "DEIN_LIVE_CLIENT_ID";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "DEIN_LIVE_SECRET";
const RAILWAY_DOMAIN = process.env.RAILWAY_DOMAIN || "chiarabot-production.up.railway.app";

// ===================
// Supabase Client
// ===================
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===================
// PayPal Client Setup (Live)
// ===================
let environment = new paypal.core.LiveEnvironment(
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET
);
let paypalClient = new paypal.core.PayPalHttpClient(environment);

// ===================
// Express App & Bot
// ===================
const app = express();
app.use(express.json());
const bot = new Telegraf(BOT_TOKEN);

// ===================
// Escape Funktion für Markdown
// ===================
function mdEscape(text) {
  if (!text) return "";
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

// ===================
// /start – Benutzer speichern & Hauptmenü
// ===================
bot.start(async (ctx) => {
  const { id, username, first_name, last_name, language_code } = ctx.from;

  // User in Supabase speichern (falls neu)
  await supabase.from("users").upsert([
    {
      id,
      username,
      first_name,
      last_name,
      language_code,
    },
  ]);

  await ctx.reply(
    "👋 Willkommen bei *Chiara Bad Girl Bot* ❤️\n\nWähle eine Option:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [
          ["ℹ️ Info", "📜 Menü"],
          ["🚨 Regeln", "💬 Schreib mir"],
          ["📢 Mein Kanal"],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    }
  );
});

// ===================
// Keyboard Button Aktionen
// ===================
bot.hears("ℹ️ Info", (ctx) => {
  return ctx.reply(
    "ℹ️ *Info-Bereich*\n\nWähle eine Kategorie:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📜 Menü", callback_data: "menu_main" }],
          [{ text: "🚨 Regeln", callback_data: "menu_rules" }],
          [{ text: "💬 Schreib mir", url: "https://t.me/DEIN_USERNAME" }],
          [{ text: "📢 Mein Kanal", url: "https://t.me/DEIN_KANAL" }],
        ],
      },
    }
  );
});

bot.hears("📜 Menü", (ctx) => {
  return ctx.reply(
    "📜 *Hauptmenü* – Wähle eine Kategorie:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💎 Premium", callback_data: "menu_premium" }],
          [{ text: "🎁 Specials", callback_data: "menu_specials" }],
          [{ text: "🔙 Zurück", callback_data: "menu_start" }],
        ],
      },
    }
  );
});

bot.hears("🚨 Regeln", (ctx) => {
  return ctx.reply(
    "🚨 *Regeln* – Bitte beachte folgende Punkte:\n\n1️⃣ Kein Spam\n2️⃣ Respektvoll bleiben\n3️⃣ Keine illegalen Inhalte",
    { parse_mode: "Markdown" }
  );
});

bot.hears("💬 Schreib mir", (ctx) => {
  return ctx.reply("💬 Schreib mir direkt hier: https://t.me/DEIN_USERNAME");
});

bot.hears("📢 Mein Kanal", (ctx) => {
  return ctx.reply("📢 Mein Kanal: https://t.me/DEIN_KANAL");
});

// ===================
// Inline Menüaktionen
// ===================
bot.action("menu_main", (ctx) => {
  ctx.editMessageText("📜 *Hauptmenü* – Wähle eine Kategorie:", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💎 Premium", callback_data: "menu_premium" }],
        [{ text: "🎁 Specials", callback_data: "menu_specials" }],
        [{ text: "🔙 Zurück", callback_data: "menu_start" }],
      ],
    },
  });
});

bot.action("menu_premium", (ctx) => {
  ctx.editMessageText("💎 *Premium-Angebote* – Wähle dein Paket:", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏆 Full Access – 49,99€", callback_data: "buy_full_access" }],
        [{ text: "💎 VIP Pass – 59,99€", callback_data: "buy_vip_pass" }],
        [{ text: "🥉 Daddy Bronze – 39,99€", callback_data: "buy_daddy_bronze" }],
        [{ text: "🥈 Daddy Silber – 69,99€", callback_data: "buy_daddy_silber" }],
        [{ text: "🥇 Daddy Gold – 99,99€", callback_data: "buy_daddy_gold" }],
        [{ text: "🔙 Zurück", callback_data: "menu_main" }],
      ],
    },
  });
});

bot.action("menu_specials", (ctx) => {
  ctx.editMessageText("🎁 *Special-Angebote* – Wähle:", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "❤️ Girlfriend Pass – 7 Tage", callback_data: "buy_gf_pass" }],
        [{ text: "🖤 Domina Pass – 7 Tage", callback_data: "buy_domina_pass" }],
        [{ text: "🎥 Video Pack 5", callback_data: "buy_video_pack_5" }],
        [{ text: "🎥 Video Pack 10", callback_data: "buy_video_pack_10" }],
        [{ text: "🎥 Video Pack 15", callback_data: "buy_video_pack_15" }],
        [{ text: "🔙 Zurück", callback_data: "menu_main" }],
      ],
    },
  });
});

// ===================
// Admin-Bereich
// ===================
const ADMIN_ID = 5647887831;

// /admin Befehl
bot.command("admin", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply("⛔ Keine Berechtigung.");
  return ctx.reply("⚙️ *Admin-Menü* – Wähle eine Funktion:", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 Statistik", callback_data: "admin_stats" }],
        [{ text: "📢 Broadcast starten", callback_data: "admin_broadcast_info" }],
        [{ text: "👥 User-Verwaltung", callback_data: "admin_user_list" }],
      ],
    },
  });
});

// 📊 Statistik anzeigen
bot.action("admin_stats", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const { count } = await supabase.from("users").select("*", { count: "exact" });
  ctx.editMessageText(`📊 *Statistik:*\n\n👥 Nutzer gesamt: ${count}`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "🔙 Zurück", callback_data: "admin_menu" }]],
    },
  });
});

// Zurück ins Admin-Menü
bot.action("admin_menu", (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.editMessageText("⚙️ *Admin-Menü* – Wähle eine Funktion:", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 Statistik", callback_data: "admin_stats" }],
        [{ text: "📢 Broadcast starten", callback_data: "admin_broadcast_info" }],
        [{ text: "👥 User-Verwaltung", callback_data: "admin_user_list" }],
      ],
    },
  });
});

// 📢 Broadcast-Info
bot.action("admin_broadcast_info", (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.editMessageText("📢 *Broadcast starten:*\n\nBitte sende den Text, der an alle Nutzer gesendet werden soll.", {
    parse_mode: "Markdown",
  });
  broadcastMode[ctx.from.id] = true;
});

// Broadcast Speicher
let broadcastMode = {};

// Broadcast Nachricht empfangen
bot.on("message", async (ctx, next) => {
  if (broadcastMode[ctx.from.id]) {
    if (ctx.from.id !== ADMIN_ID) return;

    const text = ctx.message.text;
    delete broadcastMode[ctx.from.id];

    const { data: users } = await supabase.from("users").select("id");

    let successCount = 0;
    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.id, text);
        successCount++;
      } catch (err) {
        console.error(`Fehler beim Senden an ${user.id}:`, err.message);
      }
    }

    return ctx.reply(`📢 Broadcast gesendet an ${successCount} Nutzer ✅`);
  }
  return next();
});

// ===================
// Laufzeit-Mapping für Produkte
// ===================
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

// ===================
// PayPal Create Order Route
// ===================
app.post("/paypal/create-order", async (req, res) => {
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
          amount: { currency_code: "EUR", value: price.toString() },
          description: "Online Service"
        }
      ],
      application_context: {
        brand_name: "Online Service",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `https://${RAILWAY_DOMAIN}/paypal/capture-order?telegramId=${telegramId}&productName=${encodeURIComponent(productName)}&price=${price}`,
        cancel_url: `https://${RAILWAY_DOMAIN}/paypal/cancel`
      }
    });

    const order = await paypalClient.execute(request);
    res.json({ id: order.result.id });

  } catch (err) {
    console.error("❌ Fehler bei create-order:", err);
    res.status(500).json({ error: "Fehler beim Erstellen der Bestellung" });
  }
});

// ===================
// PayPal Capture Order Route
// ===================
app.get("/paypal/capture-order", async (req, res) => {
  try {
    const { telegramId, productName, price, token } = req.query;

    if (!telegramId || !productName || !price || !token) {
      return res.status(400).send("❌ Fehler: Parameter fehlen.");
    }

    const request = new paypal.orders.OrdersCaptureRequest(token);
    request.requestBody({});
    const capture = await paypalClient.execute(request);

    // Status ermitteln
    let statusCode = productName.toUpperCase();
    if (statusCode.includes("FULL")) statusCode = "FULL";
    if (statusCode.includes("VIP")) statusCode = "VIP";
    if (statusCode.includes("DADDY_BRONZE")) statusCode = "DADDY_BRONZE";
    if (statusCode.includes("DADDY_SILBER")) statusCode = "DADDY_SILBER";
    if (statusCode.includes("DADDY_GOLD")) statusCode = "DADDY_GOLD";
    if (statusCode.includes("GF_PASS")) statusCode = "GF";
    if (statusCode.includes("DOMINA_PASS")) statusCode = "SLAVE";

    const durationDays = laufzeitMapping[productName.toUpperCase()] || 30;
    const startDate = new Date();
    const endDate = new Date();
    if (durationDays > 0 && durationDays < 9999) {
      endDate.setDate(startDate.getDate() + durationDays);
    } else if (durationDays >= 9999) {
      endDate.setFullYear(startDate.getFullYear() + 50);
    }

    const punkte = Math.floor(parseFloat(price) * 0.15);

    // Status in DB setzen
    await supabase
      .from("users")
      .update({
        status: statusCode,
        status_start: startDate.toISOString().split("T")[0],
        status_end: endDate.toISOString().split("T")[0]
      })
      .eq("id", telegramId);

    // Punkte & Produkt speichern
    await supabase.rpc("increment_punkte_und_produkt", {
      userid: telegramId,
      punkteanzahl: punkte,
      produktname: productName
    });

    // Nachricht an Käufer
    const ablaufText =
      durationDays > 0 && durationDays < 9999
        ? `📅 Gültig bis: ${endDate.toLocaleDateString("de-DE")}`
        : (durationDays >= 9999 ? `♾️ Lifetime Access` : `⏳ Kein Ablaufdatum`);

    await bot.telegram.sendMessage(
      telegramId,
      `🏆 *${statusCode} aktiviert!*\n\n${ablaufText}\n💵 Zahlung: ${price}€\n⭐ Punkte: +${punkte}`,
      { parse_mode: "Markdown" }
    );

    // Automatische Weiterleitung zum Bot
    res.redirect(`https://t.me/ChiaraBadGirlBot`);

  } catch (err) {
    console.error("❌ Fehler bei capture-order:", err);
    res.status(500).send("Interner Fehler");
  }
});

// ===================
// Kauf-Buttons
// ===================
function createBuyAction(action, productName, price, backCallback) {
  bot.action(action, async (ctx) => {
    const telegramId = ctx.from.id;
    await ctx.reply("💳 Wähle deine Zahlungsmethode:", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "💳 PayPal",
              url: `https://${RAILWAY_DOMAIN}/paypal/create-order?telegramId=${telegramId}&productName=${productName}&price=${price}`
            }
          ],
          [{ text: "💳 SumUp", url: "SUMUP_LINK_HIER" }],
          [{ text: "🔙 Zurück", callback_data: backCallback }]
        ]
      }
    });
  });
}

// Kaufaktionen registrieren
createBuyAction("buy_full_access", "FULL_ACCESS", 49.99, "menu_premium");
createBuyAction("buy_vip_pass", "VIP_PASS", 59.99, "menu_premium");
createBuyAction("buy_daddy_bronze", "DADDY_BRONZE", 39.99, "menu_premium");
createBuyAction("buy_daddy_silber", "DADDY_SILBER", 69.99, "menu_premium");
createBuyAction("buy_daddy_gold", "DADDY_GOLD", 99.99, "menu_premium");