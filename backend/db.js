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
      condition   TEXT    NOT NULL,
      photo       TEXT,
      reserved_until TIMESTAMP,
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Миграция: добавляем колонку reserved_until, если таблица уже существовала без неё
  await pool.query(`
    ALTER TABLE items ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMP;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id          SERIAL PRIMARY KEY,
      buyer_name  TEXT    NOT NULL,
      phone       TEXT    NOT NULL,
      comment     TEXT,
      arts        TEXT    NOT NULL,
      total       INTEGER NOT NULL,
      items_json  TEXT    NOT NULL,
      viewed      BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Миграция: добавляем колонку viewed, если таблица уже существовала без неё
  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS viewed BOOLEAN NOT NULL DEFAULT FALSE;
  `);

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

  console.log('✅ База данных готова');
}

module.exports = { pool, initDb };
