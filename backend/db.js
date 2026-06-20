const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'resale.db');
const db = new Database(DB_PATH);

// Включаем WAL для лучшей производительности
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Таблица товаров
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    art         TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    size        TEXT    NOT NULL DEFAULT 'One size',
    price       INTEGER NOT NULL,
    condition   TEXT    NOT NULL,
    photo       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

// Таблица заявок
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_name  TEXT    NOT NULL,
    phone       TEXT    NOT NULL,
    comment     TEXT,
    arts        TEXT    NOT NULL,
    total       INTEGER NOT NULL,
    items_json  TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

// Счётчик артикулов
db.exec(`
  CREATE TABLE IF NOT EXISTS counters (
    key   TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
  );
  INSERT OR IGNORE INTO counters (key, value) VALUES ('art_counter', 0);
`);

module.exports = db;
