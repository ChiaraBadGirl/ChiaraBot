
import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';

const BOT_TOKEN = process.env.BOT_TOKEN || '8481800262:AAEt0mEAoKkj2wz2Q32-w__1aYA-CpHhlT4';
const bot = new Telegraf(BOT_TOKEN);

// User speichern
function saveUser(id) {
  let users = [];
  if (fs.existsSync('users.json')) {
    users = JSON.parse(fs.readFileSync('users.json'));
  }
  if (!users.includes(id)) {
    users.push(id);
    fs.writeFileSync('users.json', JSON.stringify(users));
  }
}

let lastMessage = {};

bot.start(async (ctx) => {
  saveUser(ctx.chat.id);
  const msg = await ctx.reply('👋 Willkommen! Wähle unten einen Bereich aus.', {
    reply_markup: {
      keyboard: [
        ['ℹ️Info', '🧾Menu'],
        ['‼️Regeln', '📲Mein Kanal', '💬Schreib mir']
      ],
      resize_keyboard: true
    }
  });
  lastMessage[ctx.chat.id] = msg.message_id;
});

// Hilfsfunktion zum Ersetzen
async function replaceMessage(ctx, text, buttons) {
  const chatId = ctx.chat.id;
  try {
    if (lastMessage[chatId]) {
      await ctx.telegram.editMessageText(chatId, lastMessage[chatId], null, text, {
        reply_markup: buttons.reply_markup
      });
    } else {
      const msg = await ctx.reply(text, buttons);
      lastMessage[chatId] = msg.message_id;
    }
  } catch {
    const msg = await ctx.reply(text, buttons);
    lastMessage[chatId] = msg.message_id;
  }
}

// Keyboard-Tabs öffnen Inline-Menüs (ohne Text)
bot.hears('ℹ️Info', (ctx) =>
  replaceMessage(ctx, 'ℹ️ Info-Menü:', Markup.inlineKeyboard([
    [Markup.button.callback('👩‍💻 Wer bin ich', 'info_bio')],
    [Markup.button.callback('🌐 Social Media', 'info_social')],
    [Markup.button.callback('🔞 18+ Links', 'info_links')]
  ]))
);

bot.hears('🧾Menu', (ctx) =>
  replaceMessage(ctx, '🧾 Angebote & Preise:', Markup.inlineKeyboard([
    [Markup.button.callback('💰 Preisliste', 'menu_price')],
    [Markup.button.callback('🎁 Angebote', 'menu_offer')],
    [Markup.button.callback('💎 VIP Werden', 'menu_vip')]
  ]))
);

bot.hears('‼️Regeln', (ctx) =>
  replaceMessage(ctx, '‼️ Regeln & Infos:', Markup.inlineKeyboard([
    [Markup.button.callback('📜 Was ist erlaubt?', 'rules_allowed')],
    [Markup.button.callback('⏱ Sessions', 'rules_sessions')],
    [Markup.button.callback('📷 Cam', 'rules_cam')]
  ]))
);

bot.hears('📲Mein Kanal', (ctx) =>
  replaceMessage(ctx, '📲 Tritt meinem Kanal bei:', Markup.inlineKeyboard([
    [Markup.button.url('🔗 Kanal öffnen', 'https://t.me/+XcpXcLb52vo0ZGNi')]
  ]))
);

bot.hears('💬Schreib mir', (ctx) =>
  replaceMessage(ctx, '💬 Schreib mir direkt auf Telegram:', Markup.inlineKeyboard([
    [Markup.button.url('📩 Zu meinem Profil', 'https://t.me/ChiaraBadGirl')]
  ]))
);

// Inline-Antworten mit Text
const inlineResponses = {
  info_bio: '👩‍💻 Ich bin Chiara – deine digitale Begleiterin.',
  info_social: '🌐 Meine Socials findest du im Kanal.',
  info_links: '🔞 18+ Inhalte nur für Mitglieder.',
  menu_price: '💰 VIP Chat: 20€ | Custom Clip: 50€',
  menu_offer: '🎁 2 Clips + Bild für 45€ nur heute!',
  menu_vip: '💎 VIP werden? Schreib mir mit "VIP"',
  rules_allowed: '📜 Nur ernst gemeinte Anfragen, Respekt ist Pflicht!',
  rules_sessions: '⏱ Nur mit VIP-Status & klaren Regeln.',
  rules_cam: '📷 Nur gegen Bezahlung nach Absprache.'
};

for (const action in inlineResponses) {
  bot.action(action, async (ctx) => {
    await ctx.editMessageText(inlineResponses[action], {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Zurück', 'back')]
      ])
    });
  });
}

// Zurück führt zum letzten Inline-Menü
bot.action('back', async (ctx) => {
  const currentText = ctx.update.callback_query.message.text;
  const map = {
    'ℹ️ Info-Menü:': 'ℹ️Info',
    '🧾 Angebote & Preise:': '🧾Menu',
    '‼️ Regeln & Infos:': '‼️Regeln',
    '📲 Tritt meinem Kanal bei:': '📲Mein Kanal',
    '💬 Schreib mir direkt auf Telegram:': '💬Schreib mir'
  };
  const tab = map[currentText];
  if (tab) ctx.telegram.sendMessage(ctx.chat.id, tab); // Triggert again
});

// Broadcast-Funktion
bot.command('broadcast', async (ctx) => {
  const fromId = ctx.from.id;
  const owners = [fromId];
  if (!owners.includes(fromId)) return;

  const msg = ctx.message.text.replace('/broadcast', '').trim();
  if (!msg) return ctx.reply('❗️Bitte Nachricht angeben.');

  const users = JSON.parse(fs.readFileSync('users.json'));
  let count = 0;
  for (const id of users) {
    try {
      await bot.telegram.sendMessage(id, msg);
      count++;
    } catch {
      //
    }
  }
  ctx.reply(`✅ Nachricht an ${count} Nutzer gesendet.`);
});

bot.launch();
