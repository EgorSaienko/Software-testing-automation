const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {fs.mkdirSync(dbDir, { recursive: true });}

const db = new Database(path.join(dbDir, 'blog.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar TEXT DEFAULT NULL,
    reset_token TEXT DEFAULT NULL,
    reset_token_expires INTEGER DEFAULT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT DEFAULT '',
    cover_image TEXT DEFAULT NULL,
    user_id INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );
`);

module.exports = db;
