# Нежный Ресейл — Telegram Mini App

Магазин секонд-хенда с каталогом, корзиной, заявками и панелью владельца.

## Стек

| Часть | Технологии |
|-------|-----------|
| Фронтенд | React 18 + Vite, Telegram Web App SDK |
| Бэкенд | Node.js + Express + SQLite (better-sqlite3) |
| Бот | Telegraf.js |
| Email | SendGrid |
| Процессы | PM2 |
| Веб-сервер | Nginx + Let's Encrypt |

---

## Шаг 1 — Создать Telegram-бота

1. Напишите [@BotFather](https://t.me/BotFather) в Telegram
2. `/newbot` → задайте имя и username
3. Скопируйте токен (вида `1234567890:AAxxx...`)
4. `/setmenubutton` → выберите бота → «Web App» → введите URL вашего сайта
5. `/setdomain` → добавьте ваш домен (нужно для Mini App)

---

## Шаг 2 — Зарегистрироваться в SendGrid

1. Зайдите на [sendgrid.com](https://sendgrid.com) → создайте аккаунт
2. Settings → API Keys → Create API Key (Full Access)
3. Скопируйте ключ (показывается один раз)
4. Верифицируйте отправителя: Settings → Sender Authentication

---

## Шаг 3 — Настроить сервер (Ubuntu 22.04)

### Установить Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Установить Nginx
```bash
sudo apt install nginx -y
```

### Установить PM2
```bash
sudo npm install -g pm2
```

### Установить certbot (SSL)
```bash
sudo apt install certbot python3-certbot-nginx -y
```

---

## Шаг 4 — Загрузить код на сервер

```bash
# Создать папку
sudo mkdir -p /var/www/nezhniy-resale
sudo chown $USER:$USER /var/www/nezhniy-resale

# Скопировать файлы (с вашего компьютера)
scp -r ./nezhniy-resale/* user@ваш-сервер:/var/www/nezhniy-resale/
```

---

## Шаг 5 — Настроить переменные окружения

```bash
cd /var/www/nezhniy-resale/backend
cp .env.example .env
nano .env
```

Заполните все поля в `.env`:
```env
PORT=3001
FRONTEND_URL=https://ваш-домен.ru
OWNER_PASSWORD=придумайте_пароль
SENDGRID_API_KEY=SG.xxxxx
OWNER_EMAIL=ваш@email.ru
FROM_EMAIL=noreply@ваш-домен.ru
BOT_TOKEN=1234567890:AAxxxxx
```

```bash
cd /var/www/nezhniy-resale/frontend
cp .env.example .env
nano .env
```
```env
VITE_API_URL=https://ваш-домен.ru/api
```

---

## Шаг 6 — Установить зависимости и собрать фронтенд

```bash
cd /var/www/nezhniy-resale/backend
npm install

cd /var/www/nezhniy-resale/bot
npm install

cd /var/www/nezhniy-resale/frontend
npm install
npm run build
```

---

## Шаг 7 — Настроить Nginx

```bash
sudo cp /var/www/nezhniy-resale/nginx.conf.example /etc/nginx/sites-available/nezhniy-resale
# Отредактируйте файл — замените ваш-домен.ru на реальный домен
sudo nano /etc/nginx/sites-available/nezhniy-resale
sudo ln -s /etc/nginx/sites-available/nezhniy-resale /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Получить SSL-сертификат
```bash
sudo certbot --nginx -d ваш-домен.ru
```

---

## Шаг 8 — Запустить приложение

```bash
cd /var/www/nezhniy-resale
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # следуйте инструкции в выводе
```

### Проверить статус
```bash
pm2 status
pm2 logs resale-backend
pm2 logs resale-bot
```

---

## Обновление кода

```bash
cd /var/www/nezhniy-resale/frontend
npm run build

cd /var/www/nezhniy-resale/backend
# обновите файлы...

pm2 restart resale-backend
pm2 restart resale-bot
```

---

## Структура проекта

```
nezhniy-resale/
├── backend/
│   ├── index.js          # Express сервер, все API-маршруты
│   ├── db.js             # SQLite, инициализация таблиц
│   ├── db/
│   │   └── resale.db     # База данных (создаётся автоматически)
│   ├── uploads/          # Фото товаров (создаётся автоматически)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Главный компонент
│   │   ├── api.js                # HTTP-запросы к бэкенду
│   │   ├── constants.js          # Категории, размеры, состояния
│   │   ├── pages/
│   │   │   ├── BuyerView.jsx     # Каталог + поиск + фильтры
│   │   │   └── OwnerView.jsx     # Панель владельца
│   │   └── components/
│   │       ├── ItemCard.jsx      # Карточка товара
│   │       ├── CartPanel.jsx     # Корзина
│   │       └── BookingModal.jsx  # Форма заявки
│   ├── .env.example
│   └── package.json
├── bot/
│   ├── bot.js            # Telegram-бот
│   └── package.json
├── ecosystem.config.js   # PM2 конфиг
└── nginx.conf.example    # Nginx конфиг
```

---

## API эндпоинты

| Метод | URL | Доступ | Описание |
|-------|-----|--------|----------|
| GET | /api/items | Публичный | Каталог (фильтры: category, search) |
| POST | /api/items | Владелец | Добавить товар (multipart/form-data) |
| DELETE | /api/items/:id | Владелец | Удалить товар |
| POST | /api/orders | Публичный | Создать заявку |
| GET | /api/orders | Владелец | Список заявок |
| POST | /api/auth/check | Публичный | Проверить пароль |
| GET | /api/stats | Владелец | Статистика |
| GET | /api/export/catalog | Владелец | Скачать каталог CSV |
| GET | /api/export/orders | Владелец | Скачать заявки CSV |

Владелец аутентифицируется через заголовок `x-owner-password`.
