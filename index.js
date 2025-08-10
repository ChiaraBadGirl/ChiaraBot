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
// Produkt-Mapping mit Punkten, Status & Laufzeit
// ===================
const productMap = {
  "VIP Pass": { punkte: 100, status: "VIP", laufzeitTage: 30 },
  "Full Access": { punkte: 50, status: "Full", laufzeitTage: 30 },
  "Daddy Bronze": { punkte: 20, status: "Daddy Bronze", laufzeitTage: 30 },
  "Daddy Silber": { punkte: 40, status: "Daddy Silber", laufzeitTage: 30 },
  "Daddy Gold": { punkte: 60, status: "Daddy Gold", laufzeitTage: 30 },
  "Girlfriend Pass": { punkte: 30, status: "Girlfriend", laufzeitTage: 30 },
  "Domina Pass": { punkte: 35, status: "Domina", laufzeitTage: 30 },
  "Video Pack 5": { punkte: 5, status: null, laufzeitTage: 0 },
  "Video Pack 10": { punkte: 10, status: null, laufzeitTage: 0 },
  "Video Pack 15": { punkte: 15, status: null, laufzeitTage: 0 },
  "Panty": { punkte: 0, status: null, laufzeitTage: 0 },
  "Socks": { punkte: 0, status: null, laufzeitTage: 0 }
};

// ===================
// PayPal Order erstellen
// ===================
app.post("/create-order", express.json(), async (req, res) => {
  try {
    const { telegramId, productName, price } = req.body;

    if (!telegramId || !productName || !price) {
      return res.status(400).send({ error: "Fehlende Parameter" });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: productName,
          custom_id: String(telegramId),
          amount: {
            currency_code: "EUR",
            value: price
          }
        }
      ],
      application_context: {
        brand_name: "ChiaraBot",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: `https://${RAILWAY_DOMAIN}/success`,
        cancel_url: `https://${RAILWAY_DOMAIN}/cancel`
      }
    });

    const order = await paypalClient.execute(request);
    const approveLink = order.result.links.find((l) => l.rel === "approve").href;

    res.send({ approveLink });
  } catch (err) {
    console.error("❌ Fehler beim Erstellen der PayPal-Order:", err);
    res.status(500).send({ error: "PayPal-Fehler" });
  }
});

// ===================
// PayPal Webhook
// ===================
app.post("/webhook/paypal", express.json(), async (req, res) => {
  try {
    const event = req.body;
    console.log("📩 PayPal Webhook empfangen:", event.event_type);

    if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
      const purchase = event.resource?.purchase_units?.[0];
      const telegramId = purchase?.custom_id;
      const productName = purchase?.reference_id;

      if (!telegramId || !productName) {
        console.error("❌ Webhook-Daten unvollständig:", purchase);
        return res.status(400).send("Missing data");
      }

      // Produkt aus Mapping laden
      const produkt = productMap[productName];
      if (!produkt) {
        console.error(`❌ Unbekanntes Produkt: ${productName}`);
        return res.status(400).send("Unknown product");
      }

      // Ablaufdatum berechnen
      const passAblauf = produkt.laufzeitTage
        ? new Date(Date.now() + produkt.laufzeitTage * 24 * 60 * 60 * 1000)
        : null;

      // Punkte erhöhen & Status/Ablaufdatum setzen
      const { error: updateError } = await supabase
        .from("users")
        .update({
          punkte: supabase.rpc("increment_punkte", { punkteanzahl: produkt.punkte }),
          status: produkt.status || undefined,
          pass_ablaufdatum: passAblauf
        })
        .eq("id", telegramId);

      if (updateError) {
        console.error("❌ Fehler bei DB-Update:", updateError);
      }

      // Nachricht an User senden
      try {
        await bot.telegram.sendMessage(
          telegramId,
          `✅ Dein Kauf von *${mdEscape(productName)}* war erfolgreich!\n\n` +
          (produkt.status ? `📌 Neuer Status: *${mdEscape(produkt.status)}*\n` : "") +
          (produkt.laufzeitTage ? `⏳ Laufzeit: *${produkt.laufzeitTage} Tage*\n` : "") +
          (produkt.punkte ? `⭐ Punkte erhalten: *${produkt.punkte}*\n` : ""),
          { parse_mode: "MarkdownV2" }
        );
      } catch (err) {
        console.error(`⚠️ Nachricht an ${telegramId} konnte nicht gesendet werden:`, err);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook-Fehler:", err);
    res.status(500).send("Webhook error");
  }
});

// ===================
// Start-Kommando
// ===================
bot.start(async (ctx) => {
  const { id, username, first_name, last_name, language_code } = ctx.from;

  // User in DB speichern (falls neu)
  const { error } = await supabase
    .from("users")
    .upsert({
      id,
      username,
      first_name,
      last_name,
      language_code,
      status: "Free",
      punkte: 0
    });

  if (error) console.error("❌ Fehler beim Speichern des Users:", error);

  await sendHomeMenu(ctx);
});

// ===================
// Home-Menü Funktion
// ===================
async function sendHomeMenu(ctx) {
  await ctx.reply("🏠 *Willkommen im ChiaraBot!*\n\nWähle eine Kategorie:", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "ℹ️ Info", callback_data: "go_info" }],
        [{ text: "🧾 Menu", callback_data: "go_menu" }],
        [{ text: "📜 Regeln", callback_data: "go_regeln" }],
        [{ text: "💬 Schreib mir", url: "https://t.me/dein_username" }],
        [{ text: "📢 Mein Kanal", url: "https://t.me/dein_kanal" }],
        [{ text: "👤 Mein Bereich", callback_data: "mein_bereich" }]
      ]
    }
  });
}

// ===================
// Menü-Hauptübersicht (go_menu Action)
// ===================
bot.action("go_menu", async (ctx) => {
  await ctx.editMessageText("🧾 *Menüübersicht*\n\nWähle eine Kategorie:", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💎 VIP Pass", callback_data: "preise_vip" }],
        [{ text: "🔥 Full Access", callback_data: "preise_fullaccess" }],
        [{ text: "🥉 Daddy Bronze", callback_data: "preise_daddy_bronze" }],
        [{ text: "🥈 Daddy Silber", callback_data: "preise_daddy_silber" }],
        [{ text: "🥇 Daddy Gold", callback_data: "preise_daddy_gold" }],
        [{ text: "💖 Girlfriend Pass", callback_data: "preise_girlfriend" }],
        [{ text: "⛓️ Domina Pass", callback_data: "preise_domina" }],
        [{ text: "🎥 Video Packs", callback_data: "go_videopacks" }],
        [{ text: "👙 Panty & Socks", callback_data: "go_pantysocks" }],
        [{ text: "🔙 Zurück", callback_data: "back_home" }]
      ]
    }
  });
});

// ===================
// Info-Menü
// ===================
bot.action("go_info", async (ctx) => {
  await ctx.editMessageText(
    "ℹ️ *Informationen*\n\n" +
    "Willkommen im offiziellen ChiaraBot! 💖\n\n" +
    "Hier findest du alle Infos zu meinen Angeboten, Preisen und Specials.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Zurück", callback_data: "back_home" }]]
      }
    }
  );
});

// ===================
// Regeln-Menü
// ===================
bot.action("go_regeln", async (ctx) => {
  await ctx.editMessageText(
    "📜 *Regeln*\n\n" +
    "1️⃣ Kein Spam oder Beleidigungen.\n" +
    "2️⃣ Respektiere andere Mitglieder.\n" +
    "3️⃣ Kein unerlaubtes Teilen von Inhalten.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Zurück", callback_data: "back_home" }]]
      }
    }
  );
});

// ===================
// Video Packs Untermenü
// ===================
bot.action("go_videopacks", async (ctx) => {
  await ctx.editMessageText("🎥 *Video Packs*\n\nWähle dein Paket:", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎬 5 Videos", callback_data: "videos_5" }],
        [{ text: "🎬 10 Videos", callback_data: "videos_10" }],
        [{ text: "🎬 15 Videos", callback_data: "videos_15" }],
        [{ text: "🔙 Zurück", callback_data: "go_menu" }]
      ]
    }
  });
});

// ===================
// Panty & Socks Untermenü
// ===================
bot.action("go_pantysocks", async (ctx) => {
  await ctx.editMessageText("👙 *Panty & Socks*\n\nWähle dein Produkt:", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🩲 Panty", callback_data: "panty_item" }],
        [{ text: "🧦 Socks", callback_data: "socks_item" }],
        [{ text: "🔙 Zurück", callback_data: "go_menu" }]
      ]
    }
  });
});

// ===================
// Produkt-Handler – Beispiel VIP Pass
// ===================
bot.action("preise_vip", async (ctx) => {
  await ctx.editMessageText("💎 *VIP Pass*\n\nZugang zu allen exklusiven Inhalten für 30 Tage.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Jetzt kaufen (50€)", url: `https://${RAILWAY_DOMAIN}/buy/VIP%20Pass/${ctx.from.id}/50` }],
        [{ text: "🔙 Zurück", callback_data: "go_menu" }]
      ]
    }
  });
});

bot.action("preise_fullaccess", async (ctx) => {
  await ctx.editMessageText("🔥 *Full Access*\n\nAlle Inhalte ohne Limit für 30 Tage.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Jetzt kaufen (40€)", url: `https://${RAILWAY_DOMAIN}/buy/Full%20Access/${ctx.from.id}/40` }],
        [{ text: "🔙 Zurück", callback_data: "go_menu" }]
      ]
    }
  });
});

bot.action("preise_daddy_bronze", async (ctx) => {
  await ctx.editMessageText("🥉 *Daddy Bronze*\n\n30 Tage Bronze-Status.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Jetzt kaufen (20€)", url: `https://${RAILWAY_DOMAIN}/buy/Daddy%20Bronze/${ctx.from.id}/20` }],
        [{ text: "🔙 Zurück", callback_data: "go_menu" }]
      ]
    }
  });
});

bot.action("preise_daddy_silber", async (ctx) => {
  await ctx.editMessageText("🥈 *Daddy Silber*\n\n30 Tage Silber-Status.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Jetzt kaufen (30€)", url: `https://${RAILWAY_DOMAIN}/buy/Daddy%20Silber/${ctx.from.id}/30` }],
        [{ text: "🔙 Zurück", callback_data: "go_menu" }]
      ]
    }
  });
});

bot.action("preise_daddy_gold", async (ctx) => {
  await ctx.editMessageText("🥇 *Daddy Gold*\n\n30 Tage Gold-Status.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Jetzt kaufen (60€)", url: `https://${RAILWAY_DOMAIN}/buy/Daddy%20Gold/${ctx.from.id}/60` }],
        [{ text: "🔙 Zurück", callback_data: "go_menu" }]
      ]
    }
  });
});

bot.action("preise_girlfriend", async (ctx) => {
  await ctx.editMessageText("💖 *Girlfriend Pass*\n\n30 Tage Girlfriend-Status.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Jetzt kaufen (35€)", url: `https://${RAILWAY_DOMAIN}/buy/Girlfriend%20Pass/${ctx.from.id}/35` }],
        [{ text: "🔙 Zurück", callback_data: "go_menu" }]
      ]
    }
  });
});

bot.action("preise_domina", async (ctx) => {
  await ctx.editMessageText("⛓️ *Domina Pass*\n\n30 Tage Domina-Status.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Jetzt kaufen (40€)", url: `https://${RAILWAY_DOMAIN}/buy/Domina%20Pass/${ctx.from.id}/40` }],
        [{ text: "🔙 Zurück", callback_data: "go_menu" }]
      ]
    }
  });
});

// ===================
// Video Packs
// ===================
bot.action("videos_5", async (ctx) => {
  await ctx.editMessageText("🎬 *Video Pack 5*\n\n5 exklusive Videos.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Jetzt kaufen (15€)", url: `https://${RAILWAY_DOMAIN}/buy/Video%20Pack%205/${ctx.from.id}/15` }],
        [{ text: "🔙 Zurück", callback_data: "go_videopacks" }]
      ]
    }
  });
});

bot.action("videos_10", async (ctx) => {
  await ctx.editMessageText("🎬 *Video Pack 10*\n\n10 exklusive Videos.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Jetzt kaufen (25€)", url: `https://${RAILWAY_DOMAIN}/buy/Video%20Pack%2010/${ctx.from.id}/25` }],
        [{ text: "🔙 Zurück", callback_data: "go_videopacks" }]
      ]
    }
  });
});

bot.action("videos_15", async (ctx) => {
  await ctx.editMessageText("🎬 *Video Pack 15*\n\n15 exklusive Videos.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Jetzt kaufen (35€)", url: `https://${RAILWAY_DOMAIN}/buy/Video%20Pack%2015/${ctx.from.id}/35` }],
        [{ text: "🔙 Zurück", callback_data: "go_videopacks" }]
      ]
    }
  });
});

// ===================
// Panty & Socks
// ===================
bot.action("panty_item", async (ctx) => {
  await ctx.editMessageText("🩲 *Panty*\n\nGetragene Panties.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Jetzt kaufen (50€)", url: `https://${RAILWAY_DOMAIN}/buy/Panty/${ctx.from.id}/50` }],
        [{ text: "🔙 Zurück", callback_data: "go_pantysocks" }]
      ]
    }
  });
});

bot.action("socks_item", async (ctx) => {
  await ctx.editMessageText("🧦 *Socks*\n\nGetragene Socken.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Jetzt kaufen (40€)", url: `https://${RAILWAY_DOMAIN}/buy/Socks/${ctx.from.id}/40` }],
        [{ text: "🔙 Zurück", callback_data: "go_pantysocks" }]
      ]
    }
  });
});

// ===================
// Zurück zum Hauptmenü
// ===================
bot.action("back_home", async (ctx) => {
  await sendHomeMenu(ctx);
});

// ===================
// Mein Bereich – Status, Punkte & Laufzeit
// ===================
bot.action("mein_bereich", async (ctx) => {
  const { data: user, error } = await supabase
    .from("users")
    .select("status, punkte, pass_ablaufdatum")
    .eq("id", ctx.from.id)
    .single();

  if (error || !user) {
    console.error("❌ Fehler beim Abrufen von Mein Bereich:", error);
    return ctx.answerCbQuery("Fehler beim Laden deiner Daten.");
  }

  // Restlaufzeit berechnen
  let restlaufText = "—";
  if (user.pass_ablaufdatum) {
    const ablauf = new Date(user.pass_ablaufdatum);
    const diffTage = Math.ceil((ablauf - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffTage > 0) {
      restlaufText = `${diffTage} Tage`;
    } else {
      restlaufText = "abgelaufen";
    }
  }

  await ctx.editMessageText(
    `👤 *Mein Bereich*\n\n` +
    `📌 Status: *${mdEscape(user.status || "Free")}*\n` +
    `⭐ Punkte: *${user.punkte || 0}*\n` +
    `⏳ Laufzeit: *${mdEscape(restlaufText)}*`,
    {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Zurück", callback_data: "back_home" }]]
      }
    }
  );
});

// ===================
// Fallback bei unbekannten Actions
// ===================
bot.on("callback_query", async (ctx) => {
  await ctx.answerCbQuery("❌ Unbekannte Aktion.");
});

// ===================
// Admin-ID
// ===================
const ADMIN_ID = 5647887831;

// ===================
// /admin Befehl
// ===================
bot.command("admin", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  await ctx.reply("🛠 *Admin-Menü*", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 Statistik", callback_data: "admin_stats" }],
        [{ text: "📢 Broadcast starten", callback_data: "admin_broadcast_info" }],
        [{ text: "🔙 Zurück", callback_data: "back_home" }]
      ]
    }
  });
});

// ===================
// Admin: Statistik
// ===================
bot.action("admin_stats", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("❌ Fehler bei Statistik:", error);
    return ctx.answerCbQuery("Fehler bei Statistik.");
  }

  await ctx.editMessageText(`📊 *Statistik*\n\n👥 Nutzer insgesamt: *${count}*`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "🔙 Zurück", callback_data: "admin_menu" }]]
    }
  });
});

// ===================
// Admin: Broadcast Info
// ===================
bot.action("admin_broadcast_info", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  await ctx.editMessageText(
    "📢 *Broadcast starten*\n\n" +
    "Antworte auf diese Nachricht mit deinem Broadcast-Text.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Zurück", callback_data: "admin_menu" }]]
      }
    }
  );
  ctx.session = { waitingForBroadcast: true };
});

// ===================
// Broadcast senden
// ===================
bot.on("text", async (ctx, next) => {
  if (ctx.from.id !== ADMIN_ID || !ctx.session?.waitingForBroadcast) return next();

  const { data: users } = await supabase.from("users").select("id");
  let success = 0;
  let failed = 0;

  for (const u of users) {
    try {
      await bot.telegram.sendMessage(u.id, ctx.message.text, { parse_mode: "Markdown" });
      success++;
    } catch {
      failed++;
    }
  }

  await ctx.reply(`✅ Gesendet an ${success} Nutzer\n❌ Fehlgeschlagen: ${failed}`);
  ctx.session.waitingForBroadcast = false;
});

// ===================
// Admin-Menü Zurück
// ===================
bot.action("admin_menu", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  await ctx.editMessageText("🛠 *Admin-Menü*", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 Statistik", callback_data: "admin_stats" }],
        [{ text: "📢 Broadcast starten", callback_data: "admin_broadcast_info" }],
        [{ text: "🔙 Zurück", callback_data: "back_home" }]
      ]
    }
  });
});

// ===================
// Server starten
// ===================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
});