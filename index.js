
import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';

const BOT_TOKEN = process.env.BOT_TOKEN || '8481800262:AAEt0mEAoKkj2wz2Q32-w__1aYA-CpHhlT4';
const bot = new Telegraf(BOT_TOKEN);

// Nutzer speichern
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

// Start: Nutzer speichern + Keyboard zeigen
bot.start(async (ctx) => {
  saveUser(ctx.chat.id);
  await ctx.reply('👋 Willkommen! Bitte wähle einen Bereich:', {
    reply_markup: {
      keyboard: [
        ['ℹ️Info', '🧾Menu'],
        ['‼️Regeln', '📲Mein Kanal', '💬Schreib mir']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });
});

// Hauptmenü
bot.hears('ℹ️Info', async (ctx) => {
  const msg = await ctx.reply('ℹ️ INFO', {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('👩‍💻 Wer bin ich', 'info_bio')],
      [Markup.button.callback('🌐 Social Media', 'info_social')],
      [Markup.button.callback('🔞 18+ Links', 'info_links')]
    ])
  });
  deletePrevious(ctx, msg.message_id);
});

bot.hears('🧾Menu', async (ctx) => {
  const msg = await ctx.reply('🧾 MENU', {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('💰 Preisliste', 'menu_price')],
      [Markup.button.callback('🎁 Angebote', 'menu_offer')],
      [Markup.button.callback('💎 VIP Werden', 'menu_vip')]
    ])
  });
  deletePrevious(ctx, msg.message_id);
});

bot.hears('‼️Regeln', async (ctx) => {
  const msg = await ctx.reply('‼️ REGELN', {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('📜 Was ist erlaubt?', 'rules_allowed')],
      [Markup.button.callback('⏱ Sessions', 'rules_sessions')],
      [Markup.button.callback('📷 Cam', 'rules_cam')]
    ])
  });
  deletePrevious(ctx, msg.message_id);
});

bot.hears('📲Mein Kanal', (ctx) =>
  ctx.reply('📲 Tritt meinem Kanal bei:', {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.url('🔗 Kanal öffnen', 'https://t.me/+XcpXcLb52vo0ZGNi')]
    ])
  })
);

bot.hears('💬Schreib mir', (ctx) =>
  ctx.reply('💬 Schreib mir direkt auf Telegram:', {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.url('📩 Zu meinem Profil', 'https://t.me/ChiaraBadGirl')]
    ])
  })
);

// Inline Button-Aktionen
bot.action(/info_/, async (ctx) => {
  const map = {
    info_bio: '👩‍💻 Ich bin Chiara – deine private Begleitung digital.',
    info_social: '🌐 Folge mir auf Instagram & Co. (Links im Kanal).',
    info_links: '🔞 Zugriff auf 18+ Content nur für Mitglieder!'
  };
  await ctx.editMessageText(map[ctx.match[0]], {
    reply_markup: backButton()
  });
});

bot.action(/menu_/, async (ctx) => {
  const map = {
    menu_price: '💰 Preisliste: VIP Chat – 20€, Custom Clip – 50€, ...',
    menu_offer: '🎁 Heute: 2 Clips + Bild für 45€',
    menu_vip: '💎 VIP werden? Schreib mir mit dem Betreff "VIP" 💬'
  };
  await ctx.editMessageText(map[ctx.match[0]], {
    reply_markup: backButton()
  });
});

bot.action(/rules_/, async (ctx) => {
  const map = {
    rules_allowed: '📜 Was erlaubt ist: Respekt, klare Anfragen, ...',
    rules_sessions: '⏱ Sessions nur nach Absprache & VIP-Status.',
    rules_cam: '📷 Cam-Sessions? Nur auf Anfrage & bezahlt.'
  };
  await ctx.editMessageText(map[ctx.match[0]], {
    reply_markup: backButton()
  });
});

// Zurück-Buttons
function backButton() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Zurück zum Menü', 'back')]
  ]);
}

bot.action('back', async (ctx) => {
  await ctx.editMessageText('🔙 Zurück zum Startmenü – wähle unten neu.', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'ℹ️Info', callback_data: 'go_info' }],
        [{ text: '🧾Menu', callback_data: 'go_menu' }],
        [{ text: '‼️Regeln', callback_data: 'go_rules' }]
      ]
    }
  });
});

bot.action('go_info', (ctx) => {
  ctx.reply('ℹ️ INFO', {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('👩‍💻 Wer bin ich', 'info_bio')],
      [Markup.button.callback('🌐 Social Media', 'info_social')],
      [Markup.button.callback('🔞 18+ Links', 'info_links')]
    ])
  });
});
bot.action('go_menu', (ctx) => {
  ctx.reply('🧾 MENU', {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('💰 Preisliste', 'menu_price')],
      [Markup.button.callback('🎁 Angebote', 'menu_offer')],
      [Markup.button.callback('💎 VIP Werden', 'menu_vip')]
    ])
  });
});
bot.action('go_rules', (ctx) => {
  ctx.reply('‼️ REGELN', {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('📜 Was ist erlaubt?', 'rules_allowed')],
      [Markup.button.callback('⏱ Sessions', 'rules_sessions')],
      [Markup.button.callback('📷 Cam', 'rules_cam')]
    ])
  });
});

// Nachrichten löschen
async function deletePrevious(ctx, newMessageId) {
  try {
    const old = ctx.message?.message_id;
    if (old && old !== newMessageId) {
      await ctx.deleteMessage(old);
    }
  } catch (e) {
    console.log('❌ Fehler beim Löschen:', e.message);
  }
}

// /broadcast Befehl
bot.command('broadcast', async (ctx) => {
  const fromId = ctx.from.id;
  const owners = [fromId];
  if (!owners.includes(fromId)) return;

  const message = ctx.message.text.replace('/broadcast', '').trim();
  if (!message) return ctx.reply('❗️Bitte Nachricht angeben');

  const users = JSON.parse(fs.readFileSync('users.json'));
  let count = 0;

  for (const id of users) {
    try {
      await bot.telegram.sendMessage(id, message);
      count++;
    } catch (e) {
      console.log('Fehler bei Broadcast an', id);
    }
  }

  ctx.reply(`✅ Nachricht an ${count} Nutzer gesendet.`);
});

bot.launch();
