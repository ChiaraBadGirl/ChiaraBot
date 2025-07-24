import { Telegraf, Markup } from 'telegraf';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const bot = new Telegraf('8481800262:AAEt0mEAoKkj2wz2Q32-w__1aYA-CpHhlT4'); // <-- Token hier einsetzen

// SQLite DB vorbereiten
let db;
(async () => {
  db = await open({
    filename: './users.db',
    driver: sqlite3.Database
  });
  await db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY)');
})();

// Nutzer speichern
async function saveUser(id) {
  const exists = await db.get('SELECT id FROM users WHERE id = ?', id);
  if (!exists) {
    await db.run('INSERT INTO users (id) VALUES (?)', id);
    console.log('User gespeichert:', id);
  }
}

// /start Kommando
bot.start(async (ctx) => {
  const id = ctx.chat.id;
  await saveUser(id);
  await ctx.reply('👋 *Willkommen bei ChiaraBadGirlsBot!*\n\nNutze das Menü unten, um alles zu entdecken.', {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('ℹ️Info', 'go_info'), Markup.button.callback('🧾Menu', 'go_menu')],
      [Markup.button.callback('‼️Regeln', 'go_regeln')],
      [Markup.button.url('📲Mein Kanal', 'https://t.me/ChiaraBadGirl'), Markup.button.url('💬Schreib mir', 'https://t.me/ChiaraBadGirl')]
    ])
  });
});

// Hauptmenü zurück
bot.action('back_home', async (ctx) => {
  await ctx.editMessageText('👋 *Willkommen bei ChiaraBadGirlsBot!*\n\nNutze das Menü unten, um alles zu entdecken.', {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('ℹ️Info', 'go_info'), Markup.button.callback('🧾Menu', 'go_menu')],
      [Markup.button.callback('‼️Regeln', 'go_regeln')],
      [Markup.button.url('📲Mein Kanal', 'https://t.me/ChiaraBadGirl'), Markup.button.url('💬Schreib mir', 'https://t.me/ChiaraBadGirl')]
    ])
  });
});

// Submenüs
bot.action('go_info', async (ctx) => {
  await ctx.editMessageText('ℹ️ Info-Menü:', {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('👩‍💻 Wer bin ich', 'info_wer')],
      [Markup.button.callback('🌐 Social Media', 'info_social')],
      [Markup.button.callback('🔞 18+ Links', 'info_links')],
      [Markup.button.callback('⬅️ Zurück', 'back_home')]
    ])
  });
});

bot.action('go_menu', async (ctx) => {
  await ctx.editMessageText('🧾 Menü:', {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('💰 Preisliste', 'menu_preise')],
      [Markup.button.callback('🎁 Angebote', 'menu_angebote')],
      [Markup.button.callback('💎 VIP Werden', 'menu_vip')],
      [Markup.button.callback('⬅️ Zurück', 'back_home')]
    ])
  });
});

bot.action('go_regeln', async (ctx) => {
  await ctx.editMessageText('‼️ Regeln:', {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('✅ Was ist erlaubt', 'regeln_erlaubt')],
      [Markup.button.callback('📅 Sessions', 'regeln_sessions')],
      [Markup.button.callback('🎥 Cam', 'regeln_cam')],
      [Markup.button.callback('⬅️ Zurück', 'back_home')]
    ])
  });
});

// Broadcast nur für Admin
const ADMIN_ID = 5647887831;

bot.command('broadcast', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply('🚫 Du darfst diesen Befehl nicht nutzen.');
  }

  const message = ctx.message.text.replace('/broadcast', '').trim();
  if (!message) {
    return ctx.reply('❗ Bitte gib eine Nachricht an:\n/broadcast Dein Text');
  }

  const users = await db.all('SELECT id FROM users');
  for (const user of users) {
    try {
      await ctx.telegram.sendMessage(user.id, message);
    } catch (err) {
      console.log('Fehler beim Senden an', user.id, err.description);
    }
  }

  ctx.reply('✅ Nachricht wurde gesendet.');
});

bot.launch();
