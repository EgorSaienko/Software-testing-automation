require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const methodOverride = require('method-override');
const fs = require('fs');

const app = express();

// Ensure data dir exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {fs.mkdirSync(dataDir, { recursive: true });}

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override (for PUT/DELETE via forms)
app.use(methodOverride('_method'));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'blog-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
}));

// Flash messages
app.use(flash());

// Local variables
const { setLocals } = require('./middleware/auth');
app.use(setLocals);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/posts', require('./routes/posts'));
app.use('/profile', require('./routes/profile'));
app.get('/', (req, res) => res.redirect('/posts'));

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Сторінку не знайдено' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { title: 'Помилка сервера' });
});

//const PORT = process.env.PORT || 3000;
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Blog app running at http://localhost:${PORT}`);
});

module.exports = app;
