/**
 * seed-database.js — наповнення бази даних перед стрес-тестом
 *
 * Мета: не допустити, щоб кількість даних впливала на результати.
 * Скрипт створює:
 *   - 10 тестових користувачів
 *   - 1000 постів (по ~100 на користувача)
 *   - ~3000 коментарів (~3 на пост)
 *
 * Запуск: node stress-tests/seed-database.js
 *
 * ПІДХІД:
 * Ми вставляємо дані напряму у SQLite через better-sqlite3,
 * минаючи HTTP-шар, щоб сід виконувався швидко.
 * Після сідингу стрес-тест завантажує вже "прогріту" базу.
 */

'use strict';

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'blog.db');
const USERS_COUNT    = 10;
const POSTS_COUNT    = 1000;
const COMMENTS_COUNT = 3000;

console.log('=== Blog Database Seeder ===');
console.log(`DB: ${DB_PATH}`);
console.log(`Users: ${USERS_COUNT}, Posts: ${POSTS_COUNT}, Comments: ${COMMENTS_COUNT}`);
console.log('');

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ініціалізуємо схему якщо не існує
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

// Прогрес-бар
function progress(current, total, label) {
  const pct = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
  process.stdout.write(`\r  ${label}: [${bar}] ${pct}% (${current}/${total})`);
}

const start = Date.now();

// ── Крок 1: Seed users ──────────────────────────────────────────────────────
console.log('Step 1: Creating seed users...');
const passwordHash = bcrypt.hashSync('SeedPass123!', 10); // Один хеш для всіх — швидше
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, email, password, bio)
  VALUES (?, ?, ?, ?)
`);

const seedUserIds = [];
const seedUsers = [];

for (let i = 1; i <= USERS_COUNT; i++) {
  const username = `seed_user_${i}`;
  const email    = `seed_user_${i}@example.com`;
  insertUser.run(username, email, passwordHash, `Seed user #${i} for stress testing`);
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (user) {
    seedUserIds.push(user.id);
    seedUsers.push({ id: user.id, email, username });
  }
  progress(i, USERS_COUNT, 'Users');
}

// Також створюємо головного стрес-тест юзера
const stressEmail = 'stress_test@example.com';
insertUser.run('stress_test_user', stressEmail, passwordHash, 'Main stress test user');
const stressUser = db.prepare('SELECT id FROM users WHERE username = ?').get('stress_test_user');
if (stressUser && !seedUserIds.includes(stressUser.id)) {
  seedUserIds.push(stressUser.id);
}
console.log('\n  Done.\n');

// ── Крок 2: Seed posts ──────────────────────────────────────────────────────
console.log('Step 2: Creating 1000 seed posts...');

const insertPost = db.prepare(`
  INSERT OR IGNORE INTO posts (title, slug, content, excerpt, user_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const LOREM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.`;

const seedPostIds = [];

// Використовуємо транзакцію для швидкості (~10x швидше ніж окремі INSERT)
const seedPostsTransaction = db.transaction(() => {
  for (let i = 1; i <= POSTS_COUNT; i++) {
    const userId  = seedUserIds[(i - 1) % seedUserIds.length];
    const ts      = Math.floor(Date.now() / 1000) - (POSTS_COUNT - i) * 60;
    const title   = `Seed Post #${i}: ${['Technology', 'Science', 'Culture', 'Travel', 'Food'][i % 5]} Article`;
    const slug    = `seed-post-${i}-${ts}`;
    const content = `${LOREM}\n\n${LOREM}\n\nThis is seed post #${i} created for stress testing purposes.`;
    const excerpt = content.substring(0, 200) + '...';

    const result = insertPost.run(title, slug, content, excerpt, userId, ts);
    if (result.lastInsertRowid) {
      seedPostIds.push(result.lastInsertRowid);
    }

    if (i % 50 === 0) progress(i, POSTS_COUNT, 'Posts');
  }
});

seedPostsTransaction();
progress(POSTS_COUNT, POSTS_COUNT, 'Posts');
console.log('\n  Done.\n');

// ── Крок 3: Seed comments ────────────────────────────────────────────────────
console.log('Step 3: Creating 3000 seed comments...');

const insertComment = db.prepare(`
  INSERT INTO comments (content, user_id, post_id, created_at)
  VALUES (?, ?, ?, ?)
`);

const COMMENT_TEMPLATES = [
  'Чудова стаття! Дуже корисна інформація.',
  'Дякую за детальний розбір теми.',
  'Цікавий погляд на проблему.',
  'Повністю погоджуюсь з автором.',
  'Є питання щодо третього пункту.',
  'Продовжуйте у тому ж дусі!',
  'Дуже актуально сьогодні.',
  'Варто додати більше прикладів.',
];

const seedCommentTransaction = db.transaction(() => {
  for (let i = 0; i < COMMENTS_COUNT; i++) {
    const postId  = seedPostIds[i % seedPostIds.length] || seedPostIds[0];
    const userId  = seedUserIds[i % seedUserIds.length];
    const content = COMMENT_TEMPLATES[i % COMMENT_TEMPLATES.length] + ` (#${i + 1})`;
    const ts      = Math.floor(Date.now() / 1000) - (COMMENTS_COUNT - i) * 30;

    insertComment.run(content, userId, postId, ts);

    if (i % 100 === 0) progress(i + 1, COMMENTS_COUNT, 'Comments');
  }
});

seedCommentTransaction();
progress(COMMENTS_COUNT, COMMENTS_COUNT, 'Comments');
console.log('\n  Done.\n');

// ── Підсумок ─────────────────────────────────────────────────────────────────
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
const stats = {
  users:    db.prepare('SELECT COUNT(*) as c FROM users').get().c,
  posts:    db.prepare('SELECT COUNT(*) as c FROM posts').get().c,
  comments: db.prepare('SELECT COUNT(*) as c FROM comments').get().c,
};

console.log('=== Seeding Complete ===');
console.log(`Time: ${elapsed}s`);
console.log(`Total users:    ${stats.users}`);
console.log(`Total posts:    ${stats.posts}`);
console.log(`Total comments: ${stats.comments}`);
console.log('');
console.log('Stress test user credentials:');
console.log(`  Email:    ${stressEmail}`);
console.log(`  Password: SeedPass123!`);
console.log('');
console.log('Run stress test:');
console.log('  k6 run stress-tests/blog-stress-test-v2.js');

db.close();
