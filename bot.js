require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "users.json");

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { nextId: 101, users: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Возвращает профиль пользователя, создаёт новый если его ещё нет
function getOrCreateUser(telegramId, username) {
  const db = loadDB();
  const key = String(telegramId);
  let isNew = false;

  if (!db.users[key]) {
    db.users[key] = {
      id: db.nextId,
      telegramId: telegramId,
      username: username || null,
      joinedAt: new Date().toISOString(),
    };
    db.nextId += 1;
    saveDB(db);
    isNew = true;
  }

  return { user: db.users[key], isNew };
}
const { Telegraf, Markup } = require("telegraf");

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

const WELCOME_TEXT = `👋 Добро пожаловать!

Здесь ты найдёшь всё о нашей команде: обучение, правила, выплаты и многое другое.

Выбери раздел ниже 👇`;

const SECTIONS = {
  rules: `📜 Правила\n\n 🚫 Запрещено:

▪️ Запрещено распространение запрещённых материалов, включая 18+ GIF, стикеры, видео и фото
▪️ Запрещено попрошайничество в любых формах
▪️ Запрещена реклама сторонних проектов, услуг или конкурирующих компаний
▪️ Запрещена дезинформация о проекте и его деятельности
▪️ Запрещено мошенничество и манипуляции с транзакциями в личных интересах
▪️ Запрещена передача рабочих инструментов и конфиденциальной информации третьим лицам
▪️ Запрещено игнорирование требований и инструкций тимлидеров
▪️ Запрещено нарушение финансовой дисциплины и несвоевременная отчётность`,
  education: `📚 Обучение\n\n‼️Внимательно изучите представленное руководство для работы‼️
Мануал — https://telegra.ph/
По всевозможным вопросам обращайтесь к — @XXXXXXXX`,
  teamlead: `📱 Контакты тимлидера:

✉️ Если у вас есть вопросы по процессу работы, возникли трудности или необходима дополнительная информация, обращайтесь напрямую к руководителю

👨🏻‍💻Тимлидер поможет вам разобраться с деталями, даст необходимые инструкции, и обеспечит поддержку на всех этапах сотрудничества

👤 Тимлидер @XXXXX`,
  payouts: `💰 Выплаты\n\nНа вашем аккаунте еще не было выплат, история будет отображаться ниже.`,
  teamchat: `📩Ваша персональная ссылка на чат:

https://t.me/

Учтите, ваша заявка в чат будет одобрена после получения необходимого статуса❗️
Ваш статус: НОВИЧОК
Требуемый статус: СТАЖЕР`,
  referral: `🔗 Реферальная система\n\n⚡️В нашей команде существует реферальная программа, благодаря которой вы можете зарабатывать, приводя других воркеров в нашу команду⚡️
Обратиться за персональной реферальной ссылкой - @XXX`,
};

const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback("📜 Правила", "rules")],
  [Markup.button.callback("📚 Обучение", "education")],
  [Markup.button.callback("👤 Тимлидер", "teamlead")],
  [Markup.button.callback("💰 Выплаты", "payouts")],
  [Markup.button.callback("💬 Чат команды", "teamchat")],
  [Markup.button.callback("🔗 Реферальная система", "referral")],
  [Markup.button.callback("👤 Мой профиль", "profile")],
]);

const backButton = Markup.inlineKeyboard([
  [Markup.button.callback("⬅️ Назад", "back_to_menu")],
]);

const ADMIN_ID = process.env.ADMIN_ID;

bot.start(async (ctx) => {
  const { user, isNew } = getOrCreateUser(ctx.from.id, ctx.from.username);

  if (isNew && ADMIN_ID) {
    try {
      await bot.telegram.sendMessage(
        ADMIN_ID,
        `🆕 Новый пользователь!\n\nID: ${user.id}\nUsername: @${user.username || "не указан"}\nTelegram ID: ${user.telegramId}`,
      );
    } catch (err) {
      console.error("Не удалось отправить уведомление админу:", err.message);
    }
  }

  ctx.reply(WELCOME_TEXT, mainMenu);
});

for (const key of Object.keys(SECTIONS)) {
  bot.action(key, async (ctx) => {
    try {
      await ctx.editMessageText(SECTIONS[key], backButton);
      await ctx.answerCbQuery();
    } catch (err) {
      console.error("Ошибка при обработке кнопки:", err.message);
    }
  });
}

bot.action("profile", async (ctx) => {
  try {
    const { user } = getOrCreateUser(ctx.from.id, ctx.from.username);
    const text = `👤 Мой профиль\n\nВаш ID: ${user.id}\nUsername: @${user.username || "не указан"}\nДата регистрации: ${new Date(user.joinedAt).toLocaleDateString("ru-RU")}`;
    await ctx.editMessageText(text, backButton);
    await ctx.answerCbQuery();
  } catch (err) {
    console.error("Ошибка при обработке кнопки:", err.message);
  }
});

bot.action("back_to_menu", async (ctx) => {
  try {
    await ctx.editMessageText(WELCOME_TEXT, mainMenu);
    await ctx.answerCbQuery();
  } catch (err) {
    console.error("Ошибка при обработке кнопки:", err.message);
  }
});

bot.catch((err, ctx) => {
  console.error("Общая ошибка бота:", err.message);
});

const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Bot is running')).listen(PORT);

bot.launch();
console.log("Бот запущен");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
