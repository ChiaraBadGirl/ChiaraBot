import { Telegraf, Markup } from 'telegraf';
import { supabase } from './supabaseClient.js';

// Node 20 aktiviert

const bot = new Telegraf('8481800262:AAEt0mEAoKkj2wz2Q32-w__1aYA-CpHhlT4');

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

bot.command('admin', async (ctx) => {
  if (ctx.from.id !== 5647887831) {
    return ctx.reply('❌ Nur der Admin darf diesen Befehl verwenden.');
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
});

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
      ]
    }
  );
});

bot.action('admin_menu', async (ctx) => {
  if (ctx.from.id !== 5647887831) return;

  await ctx.editMessageText('🛠️ *Admin-Menü*', {
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
