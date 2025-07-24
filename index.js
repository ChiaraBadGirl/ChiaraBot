
import { Telegraf } from 'telegraf';
import fs from 'fs';

const bot = new Telegraf('YOUR_BOT_TOKEN');

// Speicherort für User-IDs
const USERS_FILE = './users.json';

// User speichern
function saveUser(id) {
    let users = [];
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE));
    }
    if (!users.includes(id)) {
        users.push(id);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    }
}

// Startbefehl
bot.start(async (ctx) => {
    const id = ctx.chat.id;
    saveUser(id);
    await ctx.reply('👋 *Willkommen bei ChiaraBadGirlsBot!*\n\nNutze das Menü unten, um alles zu entdecken.', {
        parse_mode: 'Markdown',
    });
});

// Keyboard-Befehle (keine Nachricht, direkt Inline-Buttons)
bot.command('info', (ctx) =>
    ctx.reply('ℹ️ *Info-Menü:*', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '👩‍💻 Wer bin ich', callback_data: 'info_wer' }],
                [{ text: '🌐 Social Media', callback_data: 'info_social' }],
                [{ text: '🔞 18+ Links', callback_data: 'info_18' }],
            ],
        },
    })
);

bot.command('menu', (ctx) =>
    ctx.reply('📋 *Menu-Menü:*', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '💰 Preisliste', callback_data: 'menu_preise' }],
                [{ text: '🎁 Angebote', callback_data: 'menu_angebote' }],
                [{ text: '💎 VIP Werden', callback_data: 'menu_vip' }],
            ],
        },
    })
);

bot.command('regeln', (ctx) =>
    ctx.reply('📕 *Regel-Menü:*', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📌 Was ist erlaubt', callback_data: 'regeln_erlaubt' }],
                [{ text: '🎮 Sessions', callback_data: 'regeln_sessions' }],
                [{ text: '📷 Cam', callback_data: 'regeln_cam' }],
            ],
        },
    })
);

// Direktlink-Buttons
bot.command('kanal', (ctx) =>
    ctx.reply('📲 Folge meinem Kanal:', {
        reply_markup: {
            inline_keyboard: [[{ text: '➡️ Öffnen', url: 'https://t.me/DEINKANAL' }]],
        },
    })
);

bot.command('schreibmir', (ctx) =>
    ctx.reply('💬 Schreib mir:', {
        reply_markup: {
            inline_keyboard: [[{ text: '➡️ Öffnen', url: 'https://t.me/DEINPROFIL' }]],
        },
    })
);

// Callback-Antworten ersetzen vorherige Nachricht
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const message_id = ctx.callbackQuery.message.message_id;
    const chat_id = ctx.chat.id;

    let text = '*Inhalt nicht gefunden.*';
    if (data === 'info_wer') text = '👩‍💻 *Ich bin Chiara...*';
    else if (data === 'info_social') text = '🌐 *Meine Social Media Kanäle findest du hier...*';
    else if (data === 'info_18') text = '🔞 *18+ Links: Nur für Erwachsene...*';
    else if (data === 'menu_preise') text = '💰 *Hier ist die Preisliste...*';
    else if (data === 'menu_angebote') text = '🎁 *Diese Angebote gibt es...*';
    else if (data === 'menu_vip') text = '💎 *Werde jetzt VIP...*';
    else if (data === 'regeln_erlaubt') text = '📌 *Erlaubt ist...*';
    else if (data === 'regeln_sessions') text = '🎮 *So laufen Sessions ab...*';
    else if (data === 'regeln_cam') text = '📷 *Cam-Infos...*';

    try {
        await ctx.telegram.editMessageText(chat_id, message_id, null, text, {
            parse_mode: 'Markdown',
        });
    } catch (e) {
        console.error('Fehler beim Ersetzen:', e);
    }

    await ctx.answerCbQuery(); // Entfernt Ladeanimation
});

bot.launch();
