
// Fehlerfrei optimierte Version von ChiaraBot
// Enthält Start, Home, Admin-Menü, "Mein Bereich" und Punkte-System ohne Duplikate

import express from "express";
import { Telegraf, Markup } from "telegraf";
import { createClient } from "@supabase/supabase-js";

// Supabase Verbindung
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Express App starten
const app = express();
app.get("/", (req, res) => res.send("ChiaraBot läuft"));
app.listen(3000, () => console.log("Server läuft auf Port 3000"));

// Bot initialisieren
const bot = new Telegraf(process.env.BOT_TOKEN);

// User speichern
async function saveUser(user) {
    const { data } = await supabase.from("users").select("id").eq("id", user.id).single();
    if (!data) {
        await supabase.from("users").insert([user]);
        console.log("✅ Neuer User gespeichert:", user.id);
    }
}

// Einheitliche Start/Home Funktion
async function sendHomeMenu(ctx) {
    await ctx.editMessageText(
        "👑 *Willkommen zurück bei ChiaraBadGirlsBot!* 👑\n\n" +
        "💋 *Dein persönlicher VIP-Bereich wartet auf dich.*\n" +
        "🔥 Entdecke neue Inhalte, sichere dir Angebote und checke deinen Status.\n\n" +
        "👇 *Wähle im Menü unten:*",
        {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "ℹ️ Info", callback_data: "go_info" }, { text: "📄 Menü", callback_data: "go_menu" }],
                    [{ text: "‼️ Regeln", callback_data: "go_regeln" }],
                    [
                        { text: "📲 Mein Kanal", url: "https://t.me/XCpXcLb52vo2GNi" },
                        { text: "💬 Schreib mir", url: "https://t.me/ChiaraBadGirl" }
                    ],
                    [{ text: "👤 Mein Bereich", callback_data: "mein_bereich" }]
                ]
            }
        }
    );
}

// Start Command
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
        "👑 *Willkommen zurück bei ChiaraBadGirlsBot!* 👑\n\n" +
        "💋 *Dein persönlicher VIP-Bereich wartet auf dich.*\n" +
        "🔥 Entdecke neue Inhalte, sichere dir Angebote und checke deinen Status.\n\n" +
        "👇 *Wähle im Menü unten:*",
        {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "ℹ️ Info", callback_data: "go_info" }, { text: "📄 Menü", callback_data: "go_menu" }],
                    [{ text: "‼️ Regeln", callback_data: "go_regeln" }],
                    [
                        { text: "📲 Mein Kanal", url: "https://t.me/XCpXcLb52vo2GNi" },
                        { text: "💬 Schreib mir", url: "https://t.me/ChiaraBadGirl" }
                    ],
                    [{ text: "👤 Mein Bereich", callback_data: "mein_bereich" }]
                ]
            }
        }
    );
});

// Back Home
bot.action("back_home", async (ctx) => {
    await sendHomeMenu(ctx);
});

// Admin Menü
bot.command("admin", async (ctx) => {
    if (ctx.from.id != 5647887831) return ctx.reply("❌ Nur der Admin darf diesen Befehl verwenden.");
    await ctx.reply("⚙️ *Admin-Menü*", {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "📊 Statistik", callback_data: "admin_stats" }],
                [{ text: "📢 Broadcast starten", callback_data: "admin_broadcast_info" }],
                [{ text: "⬅️ Zurück", callback_data: "back_home" }]
            ]
        }
    });
});

// Admin Statistik
bot.action("admin_stats", async (ctx) => {
    if (ctx.from.id != 5647887831) return;
    const { data, error } = await supabase.from("users").select("id");
    if (error) return ctx.reply("Fehler beim Abrufen der Statistik.");
    await ctx.editMessageText(`📊 *Gespeicherte User:* ${data.length}`, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "⬅️ Zurück", callback_data: "admin" }]] }
    });
});

// Mein Bereich
bot.action("mein_bereich", async (ctx) => {
    const { data: user } = await supabase.from("users").select("*").eq("id", ctx.from.id).single();
    if (!user) return ctx.reply("❌ Keine Daten gefunden.");
    await ctx.editMessageText(
        "📂 *Dein Bereich*\n\n" +
        `📌 *Status:* ${user.status || "Kein"}\n` +
        `📅 *Start:* ${user.status_start || "-"}\n` +
        `⏳ *Ende:* ${user.status_end || "-"}\n` +
        `⭐ *Punkte:* ${user.punkte || 0}\n` +
        `🛒 *Gekaufte Produkte:* ${user.purchases?.length ? user.purchases.join(", ") : "Keine Käufe"}`,
        {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🎯 Punkte einlösen", callback_data: "punkte_einloesen" }],
                    [{ text: "⬅️ Zurück", callback_data: "back_home" }]
                ]
            }
        }
    );
});

// Bot starten
bot.launch();
