const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {fs.mkdirSync(uploadsDir, { recursive: true });}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `post-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-а-яёіїє]+/gi, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '').replace(/-+$/, '')
    + '-' + Date.now();
}

function formatDate(ts) {
  return new Date(ts * 1000).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

// GET / - list posts
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 6;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  let posts, total;
  if (search) {
    posts = db.prepare(`
      SELECT p.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.title LIKE ? OR p.content LIKE ?
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    `).all(`%${search}%`, `%${search}%`, limit, offset);
    total = db.prepare('SELECT COUNT(*) as c FROM posts WHERE title LIKE ? OR content LIKE ?').get(`%${search}%`, `%${search}%`).c;
  } else {
    posts = db.prepare(`
      SELECT p.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
      FROM posts p JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    total = db.prepare('SELECT COUNT(*) as c FROM posts').get().c;
  }

  posts = posts.map(p => ({ ...p, formattedDate: formatDate(p.created_at) }));
  const totalPages = Math.ceil(total / limit);

  res.render('posts/index', { title: 'Блог', posts, page, totalPages, search });
});

// GET /posts/new
router.get('/new', requireAuth, (req, res) => {
  res.render('posts/new', { title: 'Новий запис', errors: [], old: {} });
});

// POST /posts
router.post('/', requireAuth, upload.single('cover_image'), [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Заголовок: 3-200 символів'),
  body('content').trim().isLength({ min: 10 }).withMessage('Зміст: мінімум 10 символів'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('posts/new', { title: 'Новий запис', errors: errors.array(), old: req.body });
  }

  const { title, content } = req.body;
  const excerpt = content.replace(/[#*[\]]/g, '').substring(0, 200) + '...';
  const slug = slugify(title);
  const cover_image = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare(
    'INSERT INTO posts (title, slug, content, excerpt, cover_image, user_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(title, slug, content, excerpt, cover_image, req.session.userId);

  req.flash('success', 'Запис успішно створено!');
  res.redirect(`/posts/${slug}`);
});

// GET /posts/:slug
router.get('/:slug', (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.username, u.avatar, u.bio
    FROM posts p JOIN users u ON p.user_id = u.id
    WHERE p.slug = ?
  `).get(req.params.slug);

  if (!post) {
    return res.status(404).render('404', { title: 'Не знайдено' });
  }

  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).all(post.id).map(c => ({ ...c, formattedDate: formatDate(c.created_at) }));

  const relatedPosts = db.prepare(`
    SELECT p.slug, p.title, p.cover_image, p.created_at, u.username
    FROM posts p JOIN users u ON p.user_id = u.id
    WHERE p.id != ? ORDER BY p.created_at DESC LIMIT 3
  `).all(post.id).map(p => ({ ...p, formattedDate: formatDate(p.created_at) }));

  res.render('posts/show', {
    title: post.title,
    post: { ...post, formattedDate: formatDate(post.created_at) },
    comments,
    relatedPosts,
    errors: [],
  });
});

// GET /posts/:slug/edit
router.get('/:slug/edit', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE slug = ?').get(req.params.slug);
  if (!post) {return res.status(404).render('404', { title: 'Не знайдено' });}
  if (post.user_id !== req.session.userId) {
    req.flash('error', 'Ви не маєте прав редагувати цей запис.');
    return res.redirect(`/posts/${req.params.slug}`);
  }
  res.render('posts/edit', { title: 'Редагувати запис', post, errors: [] });
});

// POST /posts/:slug/edit
router.post('/:slug/edit', requireAuth, upload.single('cover_image'), [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Заголовок: 3-200 символів'),
  body('content').trim().isLength({ min: 10 }).withMessage('Зміст: мінімум 10 символів'),
], (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE slug = ?').get(req.params.slug);
  if (!post) {return res.status(404).render('404', { title: 'Не знайдено' });}
  if (post.user_id !== req.session.userId) {
    req.flash('error', 'Ви не маєте прав редагувати цей запис.');
    return res.redirect(`/posts/${req.params.slug}`);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('posts/edit', { title: 'Редагувати запис', post, errors: errors.array() });
  }

  const { title, content } = req.body;
  const excerpt = content.replace(/[#*[\]]/g, '').substring(0, 200) + '...';
  const cover_image = req.file ? `/uploads/${req.file.filename}` : post.cover_image;
  const updated_at = Math.floor(Date.now() / 1000);

  db.prepare('UPDATE posts SET title = ?, content = ?, excerpt = ?, cover_image = ?, updated_at = ? WHERE id = ?')
    .run(title, content, excerpt, cover_image, updated_at, post.id);

  req.flash('success', 'Запис оновлено!');
  res.redirect(`/posts/${post.slug}`);
});

// POST /posts/:slug/delete
router.post('/:slug/delete', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE slug = ?').get(req.params.slug);
  if (!post) {return res.status(404).render('404', { title: 'Не знайдено' });}
  if (post.user_id !== req.session.userId) {
    req.flash('error', 'Ви не маєте прав видаляти цей запис.');
    return res.redirect(`/posts/${req.params.slug}`);
  }
  db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  req.flash('success', 'Запис видалено.');
  res.redirect('/');
});

// POST /posts/:slug/comments
router.post('/:slug/comments', requireAuth, [
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Коментар не може бути порожнім (макс. 2000 символів)'),
], (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE slug = ?').get(req.params.slug);
  if (!post) {return res.status(404).render('404', { title: 'Не знайдено' });}

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const comments = db.prepare(`
      SELECT c.*, u.username, u.avatar FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? ORDER BY c.created_at ASC
    `).all(post.id).map(c => ({ ...c, formattedDate: new Date(c.created_at * 1000).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }) }));
    return res.render('posts/show', {
      title: post.title,
      post: { ...post, formattedDate: new Date(post.created_at * 1000).toLocaleDateString('uk-UA') },
      comments, errors: errors.array(), relatedPosts: [],
    });
  }

  db.prepare('INSERT INTO comments (content, user_id, post_id) VALUES (?, ?, ?)').run(req.body.content, req.session.userId, post.id);
  req.flash('success', 'Коментар додано!');
  res.redirect(`/posts/${post.slug}#comments`);
});

// POST /posts/:slug/comments/:id/delete
router.post('/:slug/comments/:id/delete', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) {return res.redirect(`/posts/${req.params.slug}`);}
  if (comment.user_id !== req.session.userId) {
    req.flash('error', 'Ви не маєте прав видаляти цей коментар.');
    return res.redirect(`/posts/${req.params.slug}`);
  }
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  req.flash('success', 'Коментар видалено.');
  res.redirect(`/posts/${req.params.slug}#comments`);
});

module.exports = router;