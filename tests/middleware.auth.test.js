/**
 * Unit Tests — src/middleware/auth.js
 *
 * Ціль: 100% покриття трьох middleware-функцій:
 *   - requireAuth
 *   - redirectIfAuth
 *   - setLocals
 *
 * Усі залежності ізольовані через Jest mocks (req, res, next — ручні заглушки).
 */

const { requireAuth, redirectIfAuth, setLocals } = require('../src/middleware/auth');

// ─── Фабрики заглушок ───────────────────────────────────────────────────────

/**
 * Створює mock-об'єкт req з налаштованими session та flash.
 */
function makeReq({ userId = null, user = null, flashData = {} } = {}) {
  return {
    session: { userId, user },
    flash: jest.fn((key) => flashData[key] || []),
  };
}

/**
 * Створює mock-об'єкт res із методами redirect, locals.
 */
function makeRes() {
  return {
    redirect: jest.fn(),
    locals: {},
  };
}

// ─── requireAuth ────────────────────────────────────────────────────────────

describe('requireAuth middleware', () => {
  test('викликає next() коли userId присутній у сесії', () => {
    const req  = makeReq({ userId: 42 });
    const res  = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test('перенаправляє на /auth/login коли userId відсутній', () => {
    const req  = makeReq({ userId: null });
    const res  = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/auth/login');
    expect(next).not.toHaveBeenCalled();
  });

  test('встановлює flash-помилку перед redirect', () => {
    const req  = makeReq({ userId: null });
    const res  = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(req.flash).toHaveBeenCalledWith('error', 'Будь ласка, увійдіть у систему.');
  });

  test('перенаправляє коли session існує але userId = undefined', () => {
    const req  = { session: {}, flash: jest.fn() };
    const res  = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/auth/login');
    expect(next).not.toHaveBeenCalled();
  });

  test('перенаправляє коли session = null', () => {
    const req  = { session: null, flash: jest.fn() };
    const res  = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/auth/login');
  });

  test('не викликає next() двічі — тільки один раз при валідній сесії', () => {
    const req  = makeReq({ userId: 1 });
    const res  = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);
    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
  });
});

// ─── redirectIfAuth ──────────────────────────────────────────────────────────

describe('redirectIfAuth middleware', () => {
  test('перенаправляє на / коли користувач вже авторизований', () => {
    const req  = makeReq({ userId: 7 });
    const res  = makeRes();
    const next = jest.fn();

    redirectIfAuth(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/');
    expect(next).not.toHaveBeenCalled();
  });

  test('викликає next() коли userId відсутній', () => {
    const req  = makeReq({ userId: null });
    const res  = makeRes();
    const next = jest.fn();

    redirectIfAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test('викликає next() коли session взагалі відсутня', () => {
    const req  = { session: null };
    const res  = makeRes();
    const next = jest.fn();

    redirectIfAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test('викликає next() коли session є але userId = 0 (falsy)', () => {
    const req  = makeReq({ userId: 0 });
    const res  = makeRes();
    const next = jest.fn();

    redirectIfAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

// ─── setLocals ───────────────────────────────────────────────────────────────

describe('setLocals middleware', () => {
  test('встановлює currentUser з session.user', () => {
    const user = { id: 1, username: 'testuser' };
    const req  = makeReq({ user, flashData: { success: [], error: [] } });
    const res  = makeRes();
    const next = jest.fn();

    setLocals(req, res, next);

    expect(res.locals.currentUser).toEqual(user);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('встановлює currentUser = null коли session.user відсутній', () => {
    const req  = makeReq({ user: null, flashData: { success: [], error: [] } });
    const res  = makeRes();
    const next = jest.fn();

    setLocals(req, res, next);

    expect(res.locals.currentUser).toBeNull();
  });

  test('встановлює res.locals.success з flash("success")', () => {
    const flashData = { success: ['Операція успішна!'], error: [] };
    const req  = makeReq({ flashData });
    const res  = makeRes();
    const next = jest.fn();

    setLocals(req, res, next);

    expect(res.locals.success).toEqual(['Операція успішна!']);
  });

  test('встановлює res.locals.error з flash("error")', () => {
    const flashData = { success: [], error: ['Щось пішло не так'] };
    const req  = makeReq({ flashData });
    const res  = makeRes();
    const next = jest.fn();

    setLocals(req, res, next);

    expect(res.locals.error).toEqual(['Щось пішло не так']);
  });

  test('завжди викликає next()', () => {
    const req  = makeReq({ flashData: { success: [], error: [] } });
    const res  = makeRes();
    const next = jest.fn();

    setLocals(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('порожні flash-масиви якщо повідомлень немає', () => {
    const req  = makeReq({ flashData: {} });
    const res  = makeRes();
    const next = jest.fn();

    setLocals(req, res, next);

    expect(res.locals.success).toEqual([]);
    expect(res.locals.error).toEqual([]);
  });

  test('встановлює всі три locals за один виклик', () => {
    const user = { id: 5, username: 'admin' };
    const flashData = { success: ['ok'], error: ['fail'] };
    const req  = makeReq({ user, flashData });
    const res  = makeRes();
    const next = jest.fn();

    setLocals(req, res, next);

    expect(res.locals.currentUser).toEqual(user);
    expect(res.locals.success).toEqual(['ok']);
    expect(res.locals.error).toEqual(['fail']);
  });
});
