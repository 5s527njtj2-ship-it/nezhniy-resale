const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Инициализация таблиц при старте
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id          SERIAL PRIMARY KEY,
      art         TEXT    NOT NULL UNIQUE,
      name        TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      size        TEXT    NOT NULL DEFAULT 'One size',
      price       INTEGER NOT NULL,
      old_price   INTEGER,
      condition   TEXT    NOT NULL,
      photo       TEXT,
      photos      TEXT[]  NOT NULL DEFAULT '{}',
      reserved_until TIMESTAMP,
      sold        BOOLEAN NOT NULL DEFAULT FALSE,
      sold_at     TIMESTAMP,
      views_count INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Миграции для уже существующих таблиц (если столбцов ещё нет)
  await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMP;`);
  await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}';`);
  await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS sold BOOLEAN NOT NULL DEFAULT FALSE;`);
  await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP;`);
  await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS old_price INTEGER;`);
  await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;`);

  // Для уже добавленных товаров с одним фото — переносим его в массив photos, если массив пуст
  await pool.query(`
    UPDATE items SET photos = ARRAY[photo]
    WHERE photo IS NOT NULL AND (photos IS NULL OR array_length(photos, 1) IS NULL);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id           SERIAL PRIMARY KEY,
      order_number INTEGER,
      buyer_name   TEXT    NOT NULL,
      phone        TEXT    NOT NULL,
      comment      TEXT,
      arts         TEXT    NOT NULL,
      total        INTEGER NOT NULL,
      items_json   TEXT    NOT NULL,
      viewed       BOOLEAN NOT NULL DEFAULT FALSE,
      telegram_id  TEXT,
      status       TEXT    NOT NULL DEFAULT 'Новая',
      created_at   TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Миграция: добавляем колонку viewed, если таблица уже существовала без неё
  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS viewed BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  // Миграция: добавляем колонку order_number, если таблица уже существовала без неё
  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER;
  `);

  // Миграции: telegram_id для привязки заявки к покупателю, status для отображения хода заявки
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_id TEXT;`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Новая';`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS counters (
      key   TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    );
  `);

  await pool.query(`
    INSERT INTO counters (key, value) VALUES ('art_counter', 0)
    ON CONFLICT (key) DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO counters (key, value) VALUES ('order_counter', 0)
    ON CONFLICT (key) DO NOTHING;
  `);

  // Для уже существующих заявок без номера — проставляем номера по порядку создания
  await pool.query(`
    UPDATE orders SET order_number = sub.rownum
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rownum
      FROM orders WHERE order_number IS NULL
    ) sub
    WHERE orders.id = sub.id;
  `);

  // Синхронизируем счётчик заявок с максимальным уже использованным номером
  await pool.query(`
    UPDATE counters SET value = (SELECT COALESCE(MAX(order_number), 0) FROM orders)
    WHERE key = 'order_counter' AND value < (SELECT COALESCE(MAX(order_number), 0) FROM orders);
  `);

  console.log('✅ База данных готова');
}

module.exports = { pool, initDb };
