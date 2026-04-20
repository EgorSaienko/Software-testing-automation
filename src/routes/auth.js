const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { redirectIfAuth, requireAuth } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// GET /auth/register
router.get('/register', redirectIfAuth, (req, res) => {
  res.render('auth/register', { title: 'Реєстрація', errors: [] });
});

// POST /auth/register
router.post('/register', redirectIfAuth, [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Ім\'я користувача: 3-30 символів'),
  body('email').isEmail().normalizeEmail().withMessage('Введіть коректний email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль: мінімум 6 символів'),
  body('confirmPassword').custom((val, { req }) => {
    if (val !== req.body.password) {throw new Error('Паролі не співпадають');}
    return true;
  }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', { title: 'Реєстрація', errors: errors.array(), old: req.body });
  }

  const { username, email, password } = req.body;

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existingUser) {
    return res.render('auth/register', {
      title: 'Реєстрація',
      errors: [{ msg: 'Користувач з таким іменем або email вже існує' }],
      old: req.body
    });
  }

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, hash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

  req.session.userId = user.id;
  req.session.user = { id: user.id, username: user.username, email: user.email, avatar: user.avatar };
  req.flash('success', `Ласкаво просимо, ${user.username}!`);
  res.redirect('/');
});

// GET /auth/login
router.get('/login', redirectIfAuth, (req, res) => {
  res.render('auth/login', { title: 'Вхід', errors: [] });
});

// POST /auth/login
router.post('/login', redirectIfAuth, [
  body('email').isEmail().normalizeEmail().withMessage('Введіть коректний email'),
  body('password').notEmpty().withMessage('Введіть пароль'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', { title: 'Вхід', errors: errors.array(), old: req.body });
  }

  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('auth/login', {
      title: 'Вхід',
      errors: [{ msg: 'Невірний email або пароль' }],
      old: req.body
    });
  }

  req.session.userId = user.id;
  req.session.user = { id: user.id, username: user.username, email: user.email, avatar: user.avatar };
  req.flash('success', `З поверненням, ${user.username}!`);
  res.redirect('/');
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

// GET /auth/forgot-password
router.get('/forgot-password', redirectIfAuth, (req, res) => {
  res.render('auth/forgot-password', { title: 'Скидання паролю', errors: [], sent: false });
});

// POST /auth/forgot-password
router.post('/forgot-password', redirectIfAuth, [
  body('email').isEmail().normalizeEmail().withMessage('Введіть коректний email'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/forgot-password', { title: 'Скидання паролю', errors: errors.array(), sent: false });
  }

  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (user) {
    const token = uuidv4();
    const expires = Date.now() + 3600000; // 1 hour
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expires, user.id);

    // In production, send actual email. For demo, just log the link.
    const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${token}`;
    console.log(`[Password Reset] Link for ${email}: ${resetUrl}`);

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      });
      await transporter.sendMail({
        from: '"Blog App" <noreply@blog.app>',
        to: email,
        subject: 'Скидання паролю',
        html: `<p>Для скидання паролю перейдіть за посиланням: <a href="${resetUrl}">${resetUrl}</a></p><p>Посилання дійсне 1 годину.</p>`,
      });
    } catch (e) {
      console.log('Email not sent (no SMTP configured):', e.message);
    }
  }

  res.render('auth/forgot-password', { title: 'Скидання паролю', errors: [], sent: true });
});

// GET /auth/reset-password/:token
router.get('/reset-password/:token', redirectIfAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?').get(req.params.token, Date.now());
  if (!user) {
    req.flash('error', 'Посилання для скидання паролю недійсне або застаріле.');
    return res.redirect('/auth/forgot-password');
  }
  res.render('auth/reset-password', { title: 'Новий пароль', token: req.params.token, errors: [] });
});

// POST /auth/reset-password/:token
router.post('/reset-password/:token', redirectIfAuth, [
  body('password').isLength({ min: 6 }).withMessage('Пароль: мінімум 6 символів'),
  body('confirmPassword').custom((val, { req }) => {
    if (val !== req.body.password) {throw new Error('Паролі не співпадають');}
    return true;
  }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/reset-password', { title: 'Новий пароль', token: req.params.token, errors: errors.array() });
  }

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?').get(req.params.token, Date.now());
  if (!user) {
    req.flash('error', 'Посилання недійсне або застаріле.');
    return res.redirect('/auth/forgot-password');
  }

  const hash = bcrypt.hashSync(req.body.password, 12);
  db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(hash, user.id);
  req.flash('success', 'Пароль успішно змінено. Увійдіть з новим паролем.');
  res.redirect('/auth/login');
});

// GET /auth/change-password
router.get('/change-password', requireAuth, (req, res) => {
  res.render('auth/change-password', { title: 'Змінити пароль', errors: [] });
});

// POST /auth/change-password
router.post('/change-password', requireAuth, [
  body('currentPassword').notEmpty().withMessage('Введіть поточний пароль'),
  body('newPassword').isLength({ min: 6 }).withMessage('Новий пароль: мінімум 6 символів'),
  body('confirmPassword').custom((val, { req }) => {
    if (val !== req.body.newPassword) {throw new Error('Паролі не співпадають');}
    return true;
  }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/change-password', { title: 'Змінити пароль', errors: errors.array() });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!bcrypt.compareSync(req.body.currentPassword, user.password)) {
    return res.render('auth/change-password', { title: 'Змінити пароль', errors: [{ msg: 'Поточний пароль невірний' }] });
  }

  const hash = bcrypt.hashSync(req.body.newPassword, 12);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, user.id);
  req.flash('success', 'Пароль успішно змінено.');
  res.redirect('/profile');
});

module.exports = router;
