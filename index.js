import { Telegraf, Markup } from 'telegraf';
import { saveUser, getAllUserIds } from './database.js';
import fs from 'fs';

const bot = new Telegraf('8481800262:AAEt0mEAoKkj2wz2Q32-w__1aYA-CpHhlT4');

// /start – User speichern + Menü anzeigen
bot.start(async (ctx) => {
  const id = ctx.chat.id;
  await saveUser(id);
  await ctx.reply('👋 *Willkommen bei ChiaraBadGirlsBot!*\n\nNutze das Menü unten, um alles zu entdecken.', {
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
        { text: '📲Mein Kanal', url: 'https://t.me/https://t.me/+XcpXcLb52vo0ZGNi' },
        { text: '💬Schreib mir', url: 'https://t.me/ChiaraBadGirl' }
      ]
    ]
  }
});

// Inline-Tab Beispiel (Info)
bot.action('go_info', async (ctx) => {
  await ctx.editMessageText('ℹ️ Info-Menü:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '👩‍💻 Wer bin ich', callback_data: 'info_bio' }],
        [{ text: '🌐 Social Media', callback_data: 'info_social' }],
        [{ text: '🔞 18+ Links', callback_data: 'info_links' }],
        [{ text: '🔙 Zurück', callback_data: 'back_home' }]
      ]
    }
  });
});

// Zurück zum Hauptmenü
bot.action('back_home', async (ctx) => {
  await ctx.editMessageText('👋 *Willkommen bei ChiaraBadGirlsBot!*

Nutze das Menü unten, um alles zu entdecken.', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️Info', callback_data: 'go_info' }, { text: '🧾Menu', callback_data: 'go_menu' }],
        [{ text: '‼️Regeln', callback_data: 'go_regeln' }],
        [{ text: '📲Mein Kanal', url: 'https://t.me/ChiaraBadGirl' }, { text: '💬Schreib mir', url: 'https://t.me/ChiaraBadGirl' }]
      ]
    }
  });
});

// 📢 /broadcast nur für Admin (deine ID hier eintragen)
bot.command('broadcast', async (ctx) => {
  const fromId = ctx.from.id;
  const adminId = 5647887831;
  if (fromId !== adminId) return ctx.reply('❌ Du darfst diesen Befehl nicht nutzen.');

  const message = ctx.message.text.replace('/broadcast', '').trim();
  if (!message) return ctx.reply('❗Bitte gib eine Nachricht an:
/broadcast Dein Text');

  const users = await getAllUserIds();
  for (const userId of users) {
    try {
      await bot.telegram.sendMessage(userId, message);
    } catch (e) {
      console.error(`❌ Fehler bei ${userId}: ${e.message}`);
    }
  }

  await ctx.reply('✅ Broadcast gesendet.');
});

bot.launch();
