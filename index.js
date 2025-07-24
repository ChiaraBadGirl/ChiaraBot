import { Telegraf, Markup } from 'telegraf';
import { supabase } from './supabaseClient.js';

// Node 20 aktiviert

const bot = new Telegraf('8481800262:AAEt0mEAoKkj2wz2Q32-w__1aYA-CpHhlT4');

// User speichern
async function saveUser(id) {
    const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', id)
        .single();

    if (!data) {
        await supabase.from('users').insert([{ id }]);
        console.log('✅ User gespeichert:', id);
    }
}

// Start
bot.start(async (ctx) => {
    const id = ctx.chat.id;
    await saveUser(id);
    await ctx.reply('👋 *Willkommen bei ChiaraBadGirlsBot!*\n\nNutze das Menü unten, um alles zu entdecken.', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [ { text: 'ℹ️Info', callback_data: 'go_info' }, { text: '🧾Menu', callback_data: 'go_menu' } ],
                [ { text: '‼️Regeln', callback_data: 'go_regeln' } ],
                [ { text: '📲Mein Kanal', url: 'https://t.me/+XcpXcLb52vo0ZGNi' }, { text: '💬Schreib mir', url: 'https://t.me/ChiaraBadGirl' } ]
            ]
        }
    });
});

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

bot.action('back_home', async (ctx) => {
    await ctx.editMessageText('👋 *Willkommen bei ChiaraBadGirlsBot!*\n\nNutze das Menü unten, um alles zu entdecken.', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [ { text: 'ℹ️Info', callback_data: 'go_info' }, { text: '🧾Menu', callback_data: 'go_menu' } ],
                [ { text: '‼️Regeln', callback_data: 'go_regeln' } ],
                [ { text: '📲Mein Kanal', url: 'https://t.me/+XcpXcLb52vo0ZGNi' }, { text: '💬Schreib mir', url: 'https://t.me/ChiaraBadGirl' } ]
            ]
        }
    });
});

bot.command('broadcast', async (ctx) => {
    const userId = ctx.from.id;
    const message = ctx.message.text.split(' ').slice(1).join(' ');

    if (userId !== 5647887831) {
        return ctx.reply('❌ Du darfst diesen Befehl nicht verwenden.');
    }

    if (!message) {
        return ctx.reply('❗ Bitte gib einen Nachrichtentext an: `/broadcast Dein Text`', { parse_mode: 'Markdown' });
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
