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
    cb(null, `avatar-${req.session.userId}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

function formatDate(ts) {
  return new Date(ts * 1000).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

// GET /profile - own profile
router.get('/', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const posts = db.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
    FROM posts p WHERE p.user_id = ? ORDER BY p.created_at DESC
  `).all(user.id).map(p => ({ ...p, formattedDate: formatDate(p.created_at) }));

  res.render('profile/show', { title: `Профіль — ${user.username}`, user, posts, isOwn: true });
});

// GET /profile/edit
router.get('/edit', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  res.render('profile/edit', { title: 'Редагувати профіль', user, errors: [] });
});

// POST /profile/edit
router.post('/edit', requireAuth, upload.single('avatar'), [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Ім\'я: 3-30 символів'),
  body('bio').trim().isLength({ max: 500 }).withMessage('Біо: до 500 символів'),
], (req, res) => {
  const errors = validationResult(req);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

  if (!errors.isEmpty()) {
    return res.render('profile/edit', { title: 'Редагувати профіль', user, errors: errors.array() });
  }

  const { username, bio } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, user.id);
  if (existing) {
    return res.render('profile/edit', { title: 'Редагувати профіль', user, errors: [{ msg: 'Це ім\'я вже зайнято' }] });
  }

  const avatar = req.file ? `/uploads/${req.file.filename}` : user.avatar;
  db.prepare('UPDATE users SET username = ?, bio = ?, avatar = ? WHERE id = ?').run(username, bio, avatar, user.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  req.session.user = { id: updated.id, username: updated.username, email: updated.email, avatar: updated.avatar };
  req.flash('success', 'Профіль оновлено!');
  res.redirect('/profile');
});

// GET /profile/users/:username - public profile
router.get('/users/:username', (req, res) => {
  const user = db.prepare('SELECT id, username, bio, avatar, created_at FROM users WHERE username = ?').get(req.params.username);
  if (!user) {return res.status(404).render('404', { title: 'Не знайдено' });}

  const posts = db.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
    FROM posts p WHERE p.user_id = ? ORDER BY p.created_at DESC
  `).all(user.id).map(p => ({ ...p, formattedDate: formatDate(p.created_at) }));

  const isOwn = req.session.userId === user.id;
  res.render('profile/show', { title: `${user.username} — профіль`, user, posts, isOwn });
});

module.exports = router;
