import { Telegraf, Markup } from 'telegraf';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Bot-Token
const bot = new Telegraf('8481800262:AAEt0mEAoKkj2wz2Q32-w__1aYA-CpHhlT4');

// SQLite-Datenbank öffnen
const dbPromise = open({
    filename: './users.db',
    driver: sqlite3.Database
});

// Nutzer in DB speichern
async function saveUser(id) {
    const db = await dbPromise;
    await db.run('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY)');
    await db.run('INSERT OR IGNORE INTO users (id) VALUES (?)', [id]);
}

// Start-Handler
bot.start(async (ctx) => {
    const id = String(ctx.chat.id);
    await saveUser(id);
    await ctx.reply('👋 *Willkommen bei ChiaraBadGirlsBot!*

Nutze das Menü unten, um alles zu entdecken.', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'ℹ️Info', callback_data: 'go_info' },
                    { text: '🧾Menu', callback_data: 'go_menu' }
                ],
                [
                    { text: '‼️Regeln', callback_data: 'go_regeln' }
                ],
                [
                    { text: '📲Mein Kanal', url: 'https://t.me/ChiaraBadGirl' },
                    { text: '💬Schreib mir', url: 'https://t.me/ChiaraBadGirl' }
                ]
            ]
        }
    });
});

// Broadcast nur für Admin
bot.command('broadcast', async (ctx) => {
    const fromId = String(ctx.from.id);
    const adminId = '5647887831';
    if (fromId !== adminId) return ctx.reply('❌ Du darfst diesen Befehl nicht nutzen.');

    const message = ctx.message.text.replace('/broadcast', '').trim();
    if (!message) return ctx.reply('❗ Bitte gib eine Nachricht an:
/broadcast Dein Text');

    const db = await dbPromise;
    const users = await db.all('SELECT id FROM users');
    for (const user of users) {
        try {
            await ctx.telegram.sendMessage(user.id, message);
        } catch (e) {
            console.error('Fehler beim Senden an', user.id);
        }
    }
    ctx.reply('✅ Nachricht gesendet.');
});

// Placeholder: Inline Actions (z.B. Info, Menu, Regeln)
bot.action(/go_.+/, async (ctx) => {
    await ctx.editMessageText('📌 Untermenü (kommt später)', {
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Zurück', 'back_home')]
        ])
    });
});

// Zurück zum Hauptmenü
bot.action('back_home', async (ctx) => {
    await ctx.editMessageText('👋 *Willkommen bei ChiaraBadGirlsBot!*

Nutze das Menü unten, um alles zu entdecken.', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'ℹ️Info', callback_data: 'go_info' },
                    { text: '🧾Menu', callback_data: 'go_menu' }
                ],
                [
                    { text: '‼️Regeln', callback_data: 'go_regeln' }
                ],
                [
                    { text: '📲Mein Kanal', url: 'https://t.me/ChiaraBadGirl' },
                    { text: '💬Schreib mir', url: 'https://t.me/ChiaraBadGirl' }
                ]
            ]
        }
    });
});

bot.launch();