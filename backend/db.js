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
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    );
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
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    );
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
