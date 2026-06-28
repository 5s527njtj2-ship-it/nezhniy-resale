require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const sgMail = require('@sendgrid/mail');
const { createClient } = require('@supabase/supabase-js');
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Supabase Storage (для фото товаров)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const BUCKET = 'item-photos';

// CORS — разрешаем только наш фронтенд
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173', // для разработки
  ],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-owner-password'],
}));

app.use(express.json());

// Multer — храним файл в памяти, дальше отправляем в Supabase Storage
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

async function nextArt() {
  const { rows } = await pool.query(
    `UPDATE counters SET value = value + 1 WHERE key = 'art_counter' RETURNING value`
  );
  const value = rows[0].value;
  return `NR-${String(value).padStart(4, '0')}`;
}

function requireOwner(req, res, next) {
  const pwd = req.headers['x-owner-password'];
  if (pwd !== process.env.OWNER_PASSWORD) {
    return res.status(403).json({ error: 'Неверный пароль' });
  }
  next();
}

async function uploadPhotoToStorage(buffer, filename) {
  const webpBuffer = await sharp(buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, webpBuffer, { contentType: 'image/webp' });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

async function deletePhotoFromStorage(filename) {
  if (!filename) return;
  await supabase.storage.from(BUCKET).remove([filename]);
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

async function sendTelegramNotification(order) {
  if (!process.env.BOT_TOKEN || !process.env.OWNER_CHAT_ID) return;

  const itemsText = order.items
    .map(i => `• ${i.art} — ${i.name} — ${i.price.toLocaleString('ru-RU')} ₽`)
    .join('\n');

  const text =
    `🛍 *Новая заявка*\n\n` +
    `👤 ${order.buyer_name}\n` +
    `📞 ${order.phone}\n` +
    (order.comment ? `💬 ${order.comment}\n` : '') +
    `\n${itemsText}\n\n` +
    `💰 Итого: *${order.total.toLocaleString('ru-RU')} ₽*\n` +
    `⏱ Бронь действует 1 час`;

  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.OWNER_CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.error('Ошибка отправки в Telegram:', err.message);
  }
}

// ─────────────────────────────────────────────
// ROUTES — Товары
// ─────────────────────────────────────────────

// Получить все товары (публично)
app.get('/api/items', async (req, res) => {
  try {
    // Снимаем истёкшие брони (старше 1 часа)
    await pool.query(`UPDATE items SET reserved_until = NULL WHERE reserved_until < NOW()`);

    const { category, search } = req.query;
    let query = 'SELECT * FROM items WHERE 1=1';
    const params = [];
    let idx = 1;

    if (category && category !== 'all') {
      query += ` AND category = $${idx++}`;
      params.push(category);
    }
    if (search) {
      query += ` AND (LOWER(name) LIKE $${idx++} OR LOWER(art) LIKE $${idx++})`;
      const q = `%${search.toLowerCase()}%`;
      params.push(q, q);
    }

    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при загрузке товаров' });
  }
});

// Добавить товар (только владелец)
app.post('/api/items', requireOwner, upload.single('photo'), async (req, res) => {
  try {
    const { name, category, size, price, condition } = req.body;

    if (!name || !category || !price || !condition) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    let photoUrl = null;
    if (req.file) {
      const filename = `${uuidv4()}.webp`;
      photoUrl = await uploadPhotoToStorage(req.file.buffer, filename);
    }

    const art = await nextArt();
    const { rows } = await pool.query(
      `INSERT INTO items (art, name, category, size, price, condition, photo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [art, name, category, size || 'One size', parseInt(price), condition, photoUrl]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при добавлении товара' });
  }
});

// Удалить товар (только владелец)
app.delete('/api/items/:id', requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'Товар не найден' });

    if (item.photo) {
      // photo хранит полный URL — извлекаем имя файла
      const filename = item.photo.split('/').pop();
      await deletePhotoFromStorage(filename);
    }

    await pool.query('DELETE FROM items WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при удалении товара' });
  }
});

// Редактировать товар (только владелец)
app.put('/api/items/:id', requireOwner, upload.single('photo'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    const existing = rows[0];
    if (!existing) return res.status(404).json({ error: 'Товар не найден' });

    const { name, category, size, price, condition } = req.body;

    if (!name || !category || !price || !condition) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    let photoUrl = existing.photo;
    if (req.file) {
      // удаляем старое фото, если было, и загружаем новое
      if (existing.photo) {
        const oldFilename = existing.photo.split('/').pop();
        await deletePhotoFromStorage(oldFilename);
      }
      const filename = `${uuidv4()}.webp`;
      photoUrl = await uploadPhotoToStorage(req.file.buffer, filename);
    }

    const { rows: updated } = await pool.query(
      `UPDATE items SET name = $1, category = $2, size = $3, price = $4, condition = $5, photo = $6
       WHERE id = $7 RETURNING *`,
      [name, category, size || 'One size', parseInt(price), condition, photoUrl, req.params.id]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при редактировании товара' });
  }
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

    const { rows: items } = await pool.query(
      `SELECT * FROM items WHERE art = ANY($1)`,
      [arts]
    );

    if (!items.length) {
      return res.status(400).json({ error: 'Товары не найдены' });
    }

    const total = items.reduce((sum, i) => sum + i.price, 0);

    const { rows } = await pool.query(
      `INSERT INTO orders (buyer_name, phone, comment, arts, total, items_json)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        buyer_name, phone, comment || '',
        arts.join(', '), total,
        JSON.stringify(items.map(i => ({ art: i.art, name: i.name, price: i.price })))
      ]
    );

    // Бронируем товары на 1 час
    await pool.query(
      `UPDATE items SET reserved_until = NOW() + INTERVAL '1 hour' WHERE art = ANY($1)`,
      [arts]
    );

    try {
      await sendOrderEmail({ buyer_name, phone, comment, items, total });
    } catch (mailErr) {
      console.error('Ошибка отправки email:', mailErr.message);
    }

    try {
      await sendTelegramNotification({ buyer_name, phone, comment, items, total });
    } catch (tgErr) {
      console.error('Ошибка отправки в Telegram:', tgErr.message);
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при создании заявки' });
  }
});

// Получить все заявки (только владелец)
app.get('/api/orders', requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const parsed = rows.map(o => ({ ...o, items: JSON.parse(o.items_json) }));
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при загрузке заявок' });
  }
});

// Удалить заявку (только владелец)
app.delete('/api/orders/:id', requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Заявка не найдена' });

    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при удалении заявки' });
  }
});

// Отметить все заявки как просмотренные (только владелец)
app.post('/api/orders/mark-viewed', requireOwner, async (req, res) => {
  try {
    await pool.query('UPDATE orders SET viewed = TRUE WHERE viewed = FALSE');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при обновлении заявок' });
  }
});

// ─────────────────────────────────────────────
// ROUTES — Экспорт CSV (только владелец)
// ─────────────────────────────────────────────

app.get('/api/export/catalog', requireOwner, async (req, res) => {
  try {
    const { rows: items } = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
    const CATEGORIES = {
      top:'Верх', bottom:'Низ', dress:'Платья и юбки', outer:'Верхняя одежда',
      shoes:'Обувь', bags:'Сумки', acc:'Аксессуары', sport:'Спорт', home:'Интерьер'
    };
    const csvRows = [['Артикул','Название','Категория','Размер','Цена','Состояние','Дата','Фото (ссылка)','Фото (формула для Google Sheets)']];
    items.forEach(i => csvRows.push([
      i.art, i.name, CATEGORIES[i.category] || i.category,
      i.size, i.price, i.condition, i.created_at,
      i.photo || '',
      i.photo ? `=IMAGE("${i.photo}")` : ''
    ]));
    const csv = '\uFEFF' + csvRows.map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nezhniy_resale_catalog.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при экспорте' });
  }
});

app.get('/api/export/orders', requireOwner, async (req, res) => {
  try {
    const { rows: orders } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const csvRows = [['Дата','Имя','Телефон','Артикулы','Сумма','Комментарий']];
    orders.forEach(o => csvRows.push([
      o.created_at, o.buyer_name, o.phone, o.arts, o.total, o.comment || ''
    ]));
    const csv = '\uFEFF' + csvRows.map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nezhniy_resale_orders.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при экспорте' });
  }
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
app.get('/api/stats', requireOwner, async (req, res) => {
  try {
    const { rows: itemRows } = await pool.query('SELECT COUNT(*) as c, COALESCE(SUM(price),0) as s FROM items');
    const { rows: orderRows } = await pool.query('SELECT COUNT(*) as c FROM orders');
    const { rows: unviewedRows } = await pool.query('SELECT COUNT(*) as c FROM orders WHERE viewed = FALSE');
    res.json({
      totalItems: parseInt(itemRows[0].c),
      totalOrders: parseInt(orderRows[0].c),
      totalSum: parseInt(itemRows[0].s),
      unviewedOrders: parseInt(unviewedRows[0].c),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при загрузке статистики' });
  }
});

// ─────────────────────────────────────────────
// Запуск сервера
// ─────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Сервер запущен на порту ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Ошибка инициализации базы данных:', err);
    process.exit(1);
  });
