import { Telegraf, Markup } from 'telegraf';
import Database from 'better-sqlite3';

const bot = new Telegraf('8481800262:AAEt0mEAoKkj2wz2Q32-w__1aYA-CpHhlT4');

const db = new Database('users.db');
db.prepare(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY
)`).run();

function saveUser(id) {
    const exists = db.prepare('SELECT 1 FROM users WHERE id = ?').get(id);
    if (!exists) {
        db.prepare('INSERT INTO users (id) VALUES (?)').run(id);
        console.log('✅ User gespeichert:', id);
    }
}

// Start
bot.start(async (ctx) => {
    const id = ctx.chat.id;
    saveUser(id);
    await ctx.reply('👋 *Willkommen bei ChiaraBadGirlsBot!*\n\nNutze das Menü unten, um alles zu entdecken.', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [ { text: 'ℹ️Info', callback_data: 'go_info' }, { text: '🧾Menu', callback_data: 'go_menu' } ],
                [ { text: '‼️Regeln', callback_data: 'go_regeln' } ],
                [ { text: '📲Mein Kanal', url: 'https://t.me/ChiaraBadGirl' }, { text: '💬Schreib mir', url: 'https://t.me/ChiaraBadGirl' } ]
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
                [ { text: '👩‍💻 Wer bin ich', callback_data: 'info_wer' } ],
                [ { text: '🌐 Social Media', callback_data: 'info_social' } ],
                [ { text: '🔞 18+ Links', callback_data: 'info_links' } ],
                [ { text: '🔙 Zurück', callback_data: 'back_home' } ]
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
                [ { text: '💰 Preisliste', callback_data: 'menu_preise' } ],
                [ { text: '🎁 Angebote', callback_data: 'menu_angebote' } ],
                [ { text: '💎 VIP Werden', callback_data: 'menu_vip' } ],
                [ { text: '🔙 Zurück', callback_data: 'back_home' } ]
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
                [ { text: '📜 Was ist erlaubt', callback_data: 'regeln_erlaubt' } ],
                [ { text: '⏱️ Sessions', callback_data: 'regeln_sessions' } ],
                [ { text: '📷 Cam', callback_data: 'regeln_cam' } ],
                [ { text: '🔙 Zurück', callback_data: 'back_home' } ]
            ]
        }
    });
});

// Zurück zum Hauptmenü
bot.action('back_home', async (ctx) => {
    await ctx.editMessageText('👋 *Willkommen bei ChiaraBadGirlsBot!*\n\nNutze das Menü unten, um alles zu entdecken.', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [ { text: 'ℹ️Info', callback_data: 'go_info' }, { text: '🧾Menu', callback_data: 'go_menu' } ],
                [ { text: '‼️Regeln', callback_data: 'go_regeln' } ],
                [ { text: '📲Mein Kanal', url: 'https://t.me/ChiaraBadGirl' }, { text: '💬Schreib mir', url: 'https://t.me/ChiaraBadGirl' } ]
            ]
        }
    });
});

// Broadcast
const ADMIN_ID = 5647887831;

bot.command('broadcast', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.reply('❌ Du darfst diesen Befehl nicht nutzen.');
    }

    const message = ctx.message.text.replace('/broadcast', '').trim();
    if (!message) {
        return ctx.reply('⚠️ Bitte gib eine Nachricht ein:\n\n/broadcast Dein Text');
    }

    const rows = db.prepare('SELECT id FROM users').all();
    for (const row of rows) {
        try {
            await ctx.telegram.sendMessage(row.id, `📢 *Broadcast:*\n${message}`, { parse_mode: 'Markdown' });
        } catch (err) {
            console.error(`Fehler beim Senden an ${row.id}:`, err.message);
        }
    }

    ctx.reply(`✅ Nachricht an ${rows.length} User gesendet.`);
});

bot.launch();
