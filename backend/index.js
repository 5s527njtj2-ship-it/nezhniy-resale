require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const sgMail = require('@sendgrid/mail');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// CORS — разрешаем только наш фронтенд
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173', // для разработки
  ],
  methods: ['GET', 'POST', 'DELETE'],
}));

app.use(express.json());

// Статические файлы (загруженные фото)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer — временное хранилище до обработки sharp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Только изображения'));
  },
});

// ─────────────────────────────────────────────
// Утилиты
// ─────────────────────────────────────────────

function nextArt() {
  const update = db.prepare(`UPDATE counters SET value = value + 1 WHERE key = 'art_counter'`);
  const select = db.prepare(`SELECT value FROM counters WHERE key = 'art_counter'`);
  update.run();
  const { value } = select.get();
  return `NR-${String(value).padStart(4, '0')}`;
}

function requireOwner(req, res, next) {
  const pwd = req.headers['x-owner-password'];
  if (pwd !== process.env.OWNER_PASSWORD) {
    return res.status(403).json({ error: 'Неверный пароль' });
  }
  next();
}

async function sendOrderEmail(order) {
  const itemsHtml = order.items.map(i =>
    `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;font-family:monospace">${i.art}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${i.name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${i.price.toLocaleString('ru-RU')} ₽</td>
    </tr>`
  ).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#D85A30">Нежный Ресейл — новая заявка</h2>
      <p><b>Покупатель:</b> ${order.buyer_name}</p>
      <p><b>Телефон:</b> <a href="tel:${order.phone}">${order.phone}</a></p>
      ${order.comment ? `<p><b>Комментарий:</b> ${order.comment}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px 12px;text-align:left">Артикул</th>
            <th style="padding:8px 12px;text-align:left">Название</th>
            <th style="padding:8px 12px;text-align:left">Цена</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="font-size:18px;margin-top:16px"><b>Итого: ${order.total.toLocaleString('ru-RU')} ₽</b></p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">Заявка получена ${new Date().toLocaleString('ru-RU')}</p>
    </div>
  `;

  await sgMail.send({
    to: process.env.OWNER_EMAIL,
    from: process.env.FROM_EMAIL,
    subject: `🛍 Новая заявка от ${order.buyer_name} — ${order.total.toLocaleString('ru-RU')} ₽`,
    html,
  });
}

// ─────────────────────────────────────────────
// ROUTES — Товары
// ─────────────────────────────────────────────

// Получить все товары (публично)
app.get('/api/items', (req, res) => {
  const { category, search } = req.query;
  let query = 'SELECT * FROM items WHERE 1=1';
  const params = [];

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (LOWER(name) LIKE ? OR LOWER(art) LIKE ?)';
    const q = `%${search.toLowerCase()}%`;
    params.push(q, q);
  }

  query += ' ORDER BY created_at DESC';
  const items = db.prepare(query).all(...params);
  res.json(items);
});

// Добавить товар (только владелец)
app.post('/api/items', requireOwner, upload.single('photo'), async (req, res) => {
  try {
    const { name, category, size, price, condition } = req.body;

    if (!name || !category || !price || !condition) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    let photoFilename = null;
    if (req.file) {
      photoFilename = `${uuidv4()}.webp`;
      await sharp(req.file.buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(UPLOADS_DIR, photoFilename));
    }

    const art = nextArt();
    const stmt = db.prepare(`
      INSERT INTO items (art, name, category, size, price, condition, photo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(art, name, category, size || 'One size', parseInt(price), condition, photoFilename);
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при добавлении товара' });
  }
});

// Удалить товар (только владелец)
app.delete('/api/items/:id', requireOwner, (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Товар не найден' });

  // Удаляем фото с диска
  if (item.photo) {
    const photoPath = path.join(UPLOADS_DIR, item.photo);
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
  }

  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────
// ROUTES — Заявки
// ─────────────────────────────────────────────

// Создать заявку (публично)
app.post('/api/orders', async (req, res) => {
  try {
    const { buyer_name, phone, comment, arts } = req.body;

    if (!buyer_name || !phone || !arts || !arts.length) {
      return res.status(400).json({ error: 'Укажите имя, телефон и товары' });
    }

    // Получаем актуальные данные товаров по артикулам
    const placeholders = arts.map(() => '?').join(',');
    const items = db.prepare(`SELECT * FROM items WHERE art IN (${placeholders})`).all(...arts);

    if (!items.length) {
      return res.status(400).json({ error: 'Товары не найдены' });
    }

    const total = items.reduce((sum, i) => sum + i.price, 0);

    const stmt = db.prepare(`
      INSERT INTO orders (buyer_name, phone, comment, arts, total, items_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      buyer_name, phone, comment || '',
      arts.join(', '), total,
      JSON.stringify(items.map(i => ({ art: i.art, name: i.name, price: i.price })))
    );

    // Отправляем email владельцу
    try {
      await sendOrderEmail({ buyer_name, phone, comment, items, total });
    } catch (mailErr) {
      console.error('Ошибка отправки email:', mailErr.message);
      // Не фейлим запрос из-за ошибки почты
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при создании заявки' });
  }
});

// Получить все заявки (только владелец)
app.get('/api/orders', requireOwner, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  const parsed = orders.map(o => ({ ...o, items: JSON.parse(o.items_json) }));
  res.json(parsed);
});

// ─────────────────────────────────────────────
// ROUTES — Экспорт CSV (только владелец)
// ─────────────────────────────────────────────

app.get('/api/export/catalog', requireOwner, (req, res) => {
  const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
  const CATEGORIES = {
    top:'Верх', bottom:'Низ', dress:'Платья и юбки', outer:'Верхняя одежда',
    shoes:'Обувь', bags:'Сумки', acc:'Аксессуары', sport:'Спорт', home:'Интерьер'
  };
  const rows = [['Артикул','Название','Категория','Размер','Цена','Состояние','Дата']];
  items.forEach(i => rows.push([
    i.art, i.name, CATEGORIES[i.category] || i.category,
    i.size, i.price, i.condition, i.created_at
  ]));
  const csv = '\uFEFF' + rows.map(r =>
    r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="nezhniy_resale_catalog.csv"');
  res.send(csv);
});

app.get('/api/export/orders', requireOwner, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  const rows = [['Дата','Имя','Телефон','Артикулы','Сумма','Комментарий']];
  orders.forEach(o => rows.push([
    o.created_at, o.buyer_name, o.phone, o.arts, o.total, o.comment || ''
  ]));
  const csv = '\uFEFF' + rows.map(r =>
    r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="nezhniy_resale_orders.csv"');
  res.send(csv);
});

// ─────────────────────────────────────────────
// Проверка пароля владельца
// ─────────────────────────────────────────────
app.post('/api/auth/check', (req, res) => {
  const { password } = req.body;
  if (password === process.env.OWNER_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(403).json({ error: 'Неверный пароль' });
  }
});

// Статистика (только владелец)
app.get('/api/stats', requireOwner, (req, res) => {
  const totalItems = db.prepare('SELECT COUNT(*) as c FROM items').get().c;
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const totalSum = db.prepare('SELECT SUM(price) as s FROM items').get().s || 0;
  res.json({ totalItems, totalOrders, totalSum });
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});
