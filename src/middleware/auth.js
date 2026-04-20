function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {return next();}
  req.flash('error', 'Будь ласка, увійдіть у систему.');
  res.redirect('/auth/login');
}

function redirectIfAuth(req, res, next) {
  if (req.session && req.session.userId) {return res.redirect('/');}
  next();
}

function setLocals(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
}

module.exports = { requireAuth, redirectIfAuth, setLocals };
