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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

async function nextOrderNumber() {
  const { rows } = await pool.query(
    `UPDATE counters SET value = value + 1 WHERE key = 'order_counter' RETURNING value`
  );
  return rows[0].value;
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
      <h2 style="color:#D85A30">Нежный Ресейл — заявка №${String(order.orderNumber).padStart(4, '0')}</h2>
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
      ${order.hasDiscount ? `
      <p style="font-size:14px;color:#666;margin-top:12px">Сумма: ${order.subtotal.toLocaleString('ru-RU')} ₽</p>
      <p style="font-size:14px;color:#3B6D11;margin-top:4px">Скидка 10% за 3+ вещи: −${order.discountAmount.toLocaleString('ru-RU')} ₽</p>
      ` : ''}
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
    `🛍 *Новая заявка №${String(order.orderNumber).padStart(4, '0')}*\n\n` +
    `👤 ${order.buyer_name}\n` +
    `📞 ${order.phone}\n` +
    (order.comment ? `💬 ${order.comment}\n` : '') +
    `\n${itemsText}\n\n` +
    (order.hasDiscount
      ? `Сумма: ${order.subtotal.toLocaleString('ru-RU')} ₽\n🎁 Скидка 10%: −${order.discountAmount.toLocaleString('ru-RU')} ₽\n`
      : ''
    ) +
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

async function sendBuyerStatusNotification(order, newStatus) {
  if (!process.env.BOT_TOKEN || !order.telegram_id) return;

  const STATUS_EMOJI = {
    'В обработке':     '🔧',
    'Готово к выдаче': '✅',
    'Завершена':       '🎉',
    'Отменена':        '❌',
  };

  const numberLabel = `№${String(order.order_number).padStart(4, '0')}`;
  const text =
    `${STATUS_EMOJI[newStatus] || 'ℹ️'} *Заявка ${numberLabel}*\n\n` +
    `Статус изменён: *${newStatus}*\n\n` +
    (newStatus === 'Готово к выдаче' ? 'Вещи ждут вас в магазине!' : '');

  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: order.telegram_id,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.error('Ошибка отправки покупателю в Telegram:', err.message);
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

    const { category, search, minPrice, maxPrice, size, includeSold } = req.query;
    const isOwner = req.headers['x-owner-password'] === process.env.OWNER_PASSWORD;

    let query = 'SELECT * FROM items WHERE 1=1';
    const params = [];
    let idx = 1;

    // Покупателю никогда не показываем проданное; владельцу — только если явно запрошено
    if (!isOwner || includeSold !== 'true') {
      query += ` AND sold = FALSE`;
    }

    if (category && category !== 'all') {
      query += ` AND category = $${idx++}`;
      params.push(category);
    }
    if (search) {
      query += ` AND (LOWER(name) LIKE $${idx++} OR LOWER(art) LIKE $${idx++})`;
      const q = `%${search.toLowerCase()}%`;
      params.push(q, q);
    }
    if (minPrice) {
      query += ` AND price >= $${idx++}`;
      params.push(parseInt(minPrice));
    }
    if (maxPrice) {
      query += ` AND price <= $${idx++}`;
      params.push(parseInt(maxPrice));
    }
    if (size) {
      query += ` AND size = $${idx++}`;
      params.push(size);
    }

    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при загрузке товаров' });
  }
});

// Засчитать просмотр товара (публично, вызывается при открытии карточки)
app.post('/api/items/:id/view', async (req, res) => {
  try {
    await pool.query('UPDATE items SET views_count = views_count + 1 WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при учёте просмотра' });
  }
});

// Получить актуальные данные по списку id товаров (публично, для обновления избранного — включает проданные)
app.post('/api/items/by-ids', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.json([]);
    const { rows } = await pool.query('SELECT * FROM items WHERE id = ANY($1)', [ids]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при загрузке товаров' });
  }
});

// Похожие товары: та же категория, опционально тот же размер, без проданных и без самого товара
app.get('/api/items/:id/similar', async (req, res) => {
  try {
    const { rows: current } = await pool.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    if (!current[0]) return res.json([]);
    const item = current[0];

    const { rows } = await pool.query(
      `SELECT * FROM items
       WHERE category = $1 AND id != $2 AND sold = FALSE
       ORDER BY (size = $3) DESC, created_at DESC
       LIMIT 6`,
      [item.category, item.id, item.size]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при загрузке похожих товаров' });
  }
});

// Добавить товар (только владелец)
app.post('/api/items', requireOwner, upload.array('photos', 6), async (req, res) => {
  try {
    const { name, category, size, price, condition, old_price } = req.body;

    if (!name || !category || !price || !condition) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    let photoUrls = [];
    if (req.files && req.files.length) {
      for (const file of req.files) {
        const url = await uploadPhotoToStorage(file.buffer, `${uuidv4()}.webp`);
        photoUrls.push(url);
      }
    }

    const oldPriceValue = old_price && parseInt(old_price) > parseInt(price) ? parseInt(old_price) : null;

    const art = await nextArt();
    const { rows } = await pool.query(
      `INSERT INTO items (art, name, category, size, price, old_price, condition, photo, photos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [art, name, category, size || 'One size', parseInt(price), oldPriceValue, condition, photoUrls[0] || null, photoUrls]
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

    const photoList = item.photos && item.photos.length ? item.photos : (item.photo ? [item.photo] : []);
    for (const url of photoList) {
      const filename = url.split('/').pop();
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
app.put('/api/items/:id', requireOwner, upload.array('photos', 6), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    const existing = rows[0];
    if (!existing) return res.status(404).json({ error: 'Товар не найден' });

    const { name, category, size, price, condition, keepPhotos, old_price } = req.body;

    if (!name || !category || !price || !condition) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    const oldPriceValue = old_price && parseInt(old_price) > parseInt(price) ? parseInt(old_price) : null;

    // keepPhotos — JSON-массив URL фото, которые нужно оставить (присылает фронтенд)
    let photoUrls = existing.photos && existing.photos.length ? [...existing.photos] : (existing.photo ? [existing.photo] : []);
    if (keepPhotos !== undefined) {
      const keep = JSON.parse(keepPhotos);
      const removed = photoUrls.filter(u => !keep.includes(u));
      for (const url of removed) {
        await deletePhotoFromStorage(url.split('/').pop());
      }
      photoUrls = keep;
    }

    if (req.files && req.files.length) {
      for (const file of req.files) {
        const url = await uploadPhotoToStorage(file.buffer, `${uuidv4()}.webp`);
        photoUrls.push(url);
      }
    }

    const { rows: updated } = await pool.query(
      `UPDATE items SET name = $1, category = $2, size = $3, price = $4, old_price = $5, condition = $6, photo = $7, photos = $8
       WHERE id = $9 RETURNING *`,
      [name, category, size || 'One size', parseInt(price), oldPriceValue, condition, photoUrls[0] || null, photoUrls, req.params.id]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при редактировании товара' });
  }
});

// Отметить товар как проданный (только владелец)
app.post('/api/items/:id/sold', requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE items SET sold = TRUE, sold_at = NOW(), reserved_until = NULL WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Товар не найден' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при обновлении товара' });
  }
});

// Вернуть товар в продажу (отменить статус "продано")
app.post('/api/items/:id/unsold', requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE items SET sold = FALSE, sold_at = NULL WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Товар не найден' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при обновлении товара' });
  }
});

// ─────────────────────────────────────────────
// ROUTES — Заявки
// ─────────────────────────────────────────────

// Создать заявку (публично)
app.post('/api/orders', async (req, res) => {
  try {
    const { buyer_name, phone, comment, arts, telegram_id } = req.body;

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

    const subtotal = items.reduce((sum, i) => sum + i.price, 0);
    const BULK_DISCOUNT_MIN_ITEMS = 3;
    const BULK_DISCOUNT_PERCENT = 10;
    const hasDiscount = items.length >= BULK_DISCOUNT_MIN_ITEMS;
    const discountAmount = hasDiscount ? Math.round(subtotal * (BULK_DISCOUNT_PERCENT / 100)) : 0;
    const total = subtotal - discountAmount;
    const orderNumber = await nextOrderNumber();

    const { rows } = await pool.query(
      `INSERT INTO orders (order_number, buyer_name, phone, comment, arts, total, items_json, telegram_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        orderNumber, buyer_name, phone, comment || '',
        arts.join(', '), total,
        JSON.stringify(items.map(i => ({ art: i.art, name: i.name, price: i.price }))),
        telegram_id || null
      ]
    );

    // Бронируем товары на 1 час
    await pool.query(
      `UPDATE items SET reserved_until = NOW() + INTERVAL '1 hour' WHERE art = ANY($1)`,
      [arts]
    );

    try {
      await sendOrderEmail({ orderNumber, buyer_name, phone, comment, items, total, subtotal, discountAmount, hasDiscount });
    } catch (mailErr) {
      console.error('Ошибка отправки email:', mailErr.message);
    }

    try {
      await sendTelegramNotification({ orderNumber, buyer_name, phone, comment, items, total, subtotal, discountAmount, hasDiscount });
    } catch (tgErr) {
      console.error('Ошибка отправки в Telegram:', tgErr.message);
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при создании заявки' });
  }
});

// Получить заявки конкретного покупателя по telegram_id (публично — только свои заявки)
app.get('/api/orders/my', async (req, res) => {
  try {
    const { telegram_id } = req.query;
    if (!telegram_id) return res.json([]);
    const { rows } = await pool.query(
      'SELECT * FROM orders WHERE telegram_id = $1 ORDER BY created_at DESC',
      [telegram_id]
    );
    const parsed = rows.map(o => ({ ...o, items: JSON.parse(o.items_json) }));
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при загрузке заявок' });
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

// Изменить статус заявки (только владелец)
// Отменить заявку покупателем (публично, но только свою — проверка по telegram_id)
app.post('/api/orders/:id/cancel', async (req, res) => {
  try {
    const { telegram_id } = req.body;
    if (!telegram_id) {
      return res.status(400).json({ error: 'Не удалось определить покупателя' });
    }

    const { rows: existing } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    const order = existing[0];
    if (!order) return res.status(404).json({ error: 'Заявка не найдена' });
    if (order.telegram_id !== String(telegram_id)) {
      return res.status(403).json({ error: 'Это не ваша заявка' });
    }
    if (order.status === 'Завершена') {
      return res.status(400).json({ error: 'Завершённую заявку нельзя отменить' });
    }

    const { rows } = await pool.query(
      `UPDATE orders SET status = 'Отменена' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    // Снимаем бронь с товаров этой заявки, чтобы они снова стали доступны
    const arts = order.arts.split(', ').filter(Boolean);
    if (arts.length) {
      await pool.query(
        `UPDATE items SET reserved_until = NULL WHERE art = ANY($1)`,
        [arts]
      );
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при отмене заявки' });
  }
});

app.post('/api/orders/:id/status', requireOwner, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Новая', 'В обработке', 'Готово к выдаче', 'Завершена', 'Отменена'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Недопустимый статус' });
    }
    const { rows } = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Заявка не найдена' });

    try {
      await sendBuyerStatusNotification(rows[0], status);
    } catch (notifyErr) {
      console.error('Ошибка уведомления покупателя:', notifyErr.message);
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при обновлении статуса' });
  }
});

// ─────────────────────────────────────────────
// ROUTES — Экспорт CSV (только владелец)
// ─────────────────────────────────────────────

app.get('/api/export/catalog', requireOwner, async (req, res) => {
  try {
    const { rows: items } = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
    const CATEGORIES = {
      'w-top':'Женское: верх', 'w-bottom':'Женское: низ', 'w-dress':'Платья и юбки',
      'w-outer':'Женское: верхняя одежда', 'w-knit':'Женское: трикотаж',
      'w-shoes':'Женская обувь', 'w-bags':'Женские сумки', 'w-jewelry':'Украшения',
      'w-watch':'Женские часы', 'w-belt':'Женские ремни', 'w-hat':'Женские головные уборы',
      'w-eyewear':'Женские очки', 'w-lingerie':'Бельё', 'w-acc':'Женские аксессуары', 'w-sport':'Женский спорт',
      'm-top':'Мужское: верх', 'm-bottom':'Мужское: низ', 'm-outer':'Мужское: верхняя одежда',
      'm-knit':'Мужское: трикотаж', 'm-suit':'Костюмы', 'm-shoes':'Мужская обувь',
      'm-bags':'Мужские сумки', 'm-watch':'Мужские часы', 'm-belt':'Мужские ремни',
      'm-hat':'Мужские головные уборы', 'm-eyewear':'Мужские очки', 'm-acc':'Мужские аксессуары', 'm-sport':'Мужской спорт',
      'p-women':'Парфюмерия: женская', 'p-men':'Парфюмерия: мужская', 'p-unisex':'Парфюмерия: унисекс', 'p-niche':'Нишевая парфюмерия',
      'home':'Интерьер',
      // legacy (без префикса)
      'top':'Верх', 'bottom':'Низ', 'dress':'Платья и юбки', 'outer':'Верхняя одежда',
      'shoes':'Обувь', 'bags':'Сумки', 'acc':'Аксессуары', 'sport':'Спорт',
    };
    const csvRows = [['Артикул','Название','Категория','Размер','Цена','Старая цена','Состояние','Статус','Просмотры','Дата добавления','Дата продажи','Фото (ссылка)','Фото (формула для Google Sheets)']];
    items.forEach(i => csvRows.push([
      i.art, i.name, CATEGORIES[i.category] || i.category,
      i.size, i.price, i.old_price || '', i.condition,
      i.sold ? 'Продано' : 'В продаже',
      i.views_count || 0,
      i.created_at, i.sold_at || '',
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
    const csvRows = [['№ заявки','Дата','Имя','Телефон','Артикулы','Сумма','Комментарий']];
    orders.forEach(o => csvRows.push([
      o.order_number ? `№${String(o.order_number).padStart(4, '0')}` : '',
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
    const { rows: itemRows } = await pool.query(`SELECT COUNT(*) as c, COALESCE(SUM(price),0) as s FROM items WHERE sold = FALSE`);
    const { rows: soldRows } = await pool.query(`SELECT COUNT(*) as c, COALESCE(SUM(price),0) as s FROM items WHERE sold = TRUE`);
    const { rows: orderRows } = await pool.query('SELECT COUNT(*) as c FROM orders');
    const { rows: unviewedRows } = await pool.query('SELECT COUNT(*) as c FROM orders WHERE viewed = FALSE');
    res.json({
      totalItems: parseInt(itemRows[0].c),
      totalOrders: parseInt(orderRows[0].c),
      totalSum: parseInt(itemRows[0].s),
      unviewedOrders: parseInt(unviewedRows[0].c),
      soldCount: parseInt(soldRows[0].c),
      soldSum: parseInt(soldRows[0].s),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при загрузке статистики' });
  }
});

// Детальная статистика продаж по месяцам (только владелец)
// Топ просматриваемых товаров (только владелец)
app.get('/api/stats/top-viewed', requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, art, name, category, price, photo, views_count, sold
      FROM items
      ORDER BY sold ASC, views_count DESC, created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при загрузке статистики просмотров' });
  }
});

app.get('/api/stats/sales', requireOwner, async (req, res) => {
  try {
    const { rows: monthly } = await pool.query(`
      SELECT
        TO_CHAR(sold_at, 'YYYY-MM') as month,
        COUNT(*) as count,
        COALESCE(SUM(price), 0) as sum
      FROM items
      WHERE sold = TRUE AND sold_at IS NOT NULL
      GROUP BY TO_CHAR(sold_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `);

    const { rows: byCategory } = await pool.query(`
      SELECT category, COUNT(*) as count, COALESCE(SUM(price), 0) as sum
      FROM items
      WHERE sold = TRUE
      GROUP BY category
      ORDER BY sum DESC
    `);

    const { rows: avgRows } = await pool.query(`
      SELECT COALESCE(AVG(price), 0) as avg_price, COUNT(*) as total_sold, COALESCE(SUM(price), 0) as total_revenue
      FROM items WHERE sold = TRUE
    `);

    res.json({
      monthly: monthly.map(r => ({ month: r.month, count: parseInt(r.count), sum: parseInt(r.sum) })),
      byCategory: byCategory.map(r => ({ category: r.category, count: parseInt(r.count), sum: parseInt(r.sum) })),
      avgPrice: Math.round(parseFloat(avgRows[0].avg_price)),
      totalSold: parseInt(avgRows[0].total_sold),
      totalRevenue: parseInt(avgRows[0].total_revenue),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при загрузке статистики продаж' });
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
