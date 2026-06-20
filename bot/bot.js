require('dotenv').config({ path: '../backend/.env' })
const { Telegraf, Markup } = require('telegraf')

const BOT_TOKEN = process.env.BOT_TOKEN
const FRONTEND_URL = process.env.FRONTEND_URL

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не задан в .env')
  process.exit(1)
}

const bot = new Telegraf(BOT_TOKEN)

// /start — главное приветствие
bot.start(async (ctx) => {
  const name = ctx.from.first_name || 'Привет'
  await ctx.reply(
    `👗 Привет, ${name}!\n\nДобро пожаловать в *Нежный Ресейл* — магазин стильного секонд-хенда.\n\nЗдесь ты найдёшь одежду, обувь, аксессуары и предметы интерьера по приятным ценам 🌿`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🛍 Открыть каталог', FRONTEND_URL)],
      ])
    }
  )
})

// /catalog — быстрая кнопка к каталогу
bot.command('catalog', async (ctx) => {
  await ctx.reply(
    '🛍 Открывай каталог и добавляй понравившиеся вещи в корзину!',
    Markup.inlineKeyboard([
      [Markup.button.webApp('Открыть каталог', FRONTEND_URL)]
    ])
  )
})

// /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    `*Нежный Ресейл* — как это работает:\n\n` +
    `1️⃣ Открой каталог кнопкой ниже\n` +
    `2️⃣ Найди вещь — листай или используй поиск\n` +
    `3️⃣ Нажми «+» на карточке, чтобы добавить в корзину\n` +
    `4️⃣ Перейди в корзину и оставь заявку — мы свяжемся с тобой\n\n` +
    `📍 Адрес: Петровско-Разумовский пр., 15\n` +
    `🕐 Пн–Сб: 10:00–20:00`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🛍 Открыть каталог', FRONTEND_URL)]
      ])
    }
  )
})

// Обработка ошибок
bot.catch((err, ctx) => {
  console.error(`Ошибка для ${ctx.updateType}:`, err)
})

bot.launch().then(() => {
  console.log('✅ Бот запущен')
}).catch(err => {
  console.error('❌ Ошибка запуска бота:', err)
})

// Корректное завершение
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
