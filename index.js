import { Telegraf } from 'telegraf';
import fs from 'fs';

const bot = new Telegraf('8481800262:AAEt0mEAoKkj2wz2Q32-w__1aYA-CpHhlT4');

// Speicherpfad für User-IDs
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

// /start Befehl
bot.start((ctx) => {
  const userId = ctx.chat.id;
  saveUser(userId);
  ctx.reply('👋 Willkommen bei Chiara!\n\nWähle einen Bereich:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📄 Menü', callback_data: 'menu' }, { text: 'ℹ️ Infos', callback_data: 'infos' }],
        [{ text: '🚨 Regeln', callback_data: 'regeln' }, { text: '💬 Schreib mir', url: 'https://t.me/ChiaraBadGirl' }]
      ]
    }
  });
});

// Menü-Buttons mit editMessage
bot.action('menu', (ctx) => {
  ctx.editMessageText('📄 Menü:\n\nWähle eine Kategorie:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📜 Preise', callback_data: 'preise' }, { text: '🎁 Angebote', callback_data: 'angebote' }],
        [{ text: '⬅️ Zurück', callback_data: 'start' }]
      ]
    }
  });
});

bot.action('infos', (ctx) => {
  ctx.editMessageText('ℹ️ Infos über Chiara:\n\n- Content Creatorin\n- Ehrlich & direkt\n- Schreib mir jederzeit ❤️', {
    reply_markup: {
      inline_keyboard: [[{ text: '⬅️ Zurück', callback_data: 'start' }]]
    }
  });
});

bot.action('regeln', (ctx) => {
  ctx.editMessageText('🚨 REGELN & INFOS 🚨\n\n1. Nur ernsthafte Kaufanfragen\n2. Private Chats ab Silber\n3. Respekt = Pflicht\n4. Keine DickPics ohne Member\n5. Preise nur im Chat/Kanal\n6. Keine Treffen\n7. Keine Gratisbilder\n8. Keine Buchung für Sex\n\nBitte halte dich daran 😘', {
    reply_markup: {
      inline_keyboard: [[{ text: '⬅️ Zurück', callback_data: 'start' }]]
    }
  });
});

bot.action('preise', (ctx) => {
  ctx.editMessageText('📜 Preise:\n\n💎 Silber: 20€\n💎 Gold: 40€\n💎 VIP: 70€', {
    reply_markup: {
      inline_keyboard: [[{ text: '⬅️ Zurück', callback_data: 'menu' }]]
    }
  });
});

bot.action('angebote', (ctx) => {
  ctx.editMessageText('🎁 Angebote:\n\n3x Custom für 50€\n1 Woche Chat Flat: 35€\nVIP Paket mit Überraschung 🎀', {
    reply_markup: {
      inline_keyboard: [[{ text: '⬅️ Zurück', callback_data: 'menu' }]]
    }
  });
});

bot.action('start', (ctx) => {
  ctx.editMessageText('👋 Willkommen zurück!\n\nWähle einen Bereich:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📄 Menü', callback_data: 'menu' }, { text: 'ℹ️ Infos', callback_data: 'infos' }],
        [{ text: '🚨 Regeln', callback_data: 'regeln' }, { text: '💬 Schreib mir', url: 'https://t.me/ChiaraBadGirl' }]
      ]
    }
  });
});

// Broadcast-Befehl
bot.command('broadcast', async (ctx) => {
  const message = ctx.message.text.split(' ').slice(1).join(' ');
  if (!message) return ctx.reply('❌ Bitte gib einen Text ein: /broadcast Dein Text');

  if (ctx.chat.id.toString() !== '8481800262') {
    return ctx.reply('❌ Nur der Admin darf Broadcasts senden.');
  }

  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
  }

  for (const id of users) {
    try {
      await ctx.telegram.sendMessage(id, message);
    } catch (e) {
      console.log('Fehler bei:', id);
    }
  }

  ctx.reply('✅ Nachricht wurde gesendet.');
});

bot.launch();
