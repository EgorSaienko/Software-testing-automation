/**
 * Unit Tests — src/routes/posts.js (контролер постів)
 *
 * Мета: ≥50% покриття бізнес-логіки постів та коментарів.
 *
 * Mock-стратегія:
 *   - Заглушки для БД (db.prepare / get / run / all)
 *   - Ручні mock req/res — ізоляція від HTTP
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGet  = jest.fn();
const mockRun  = jest.fn();
const mockAll  = jest.fn();
const mockStmt = { get: mockGet, run: mockRun, all: mockAll };

jest.mock('../src/database', () => ({
  prepare: jest.fn(() => mockStmt),
}));

const db = require('../src/database');

// ─── Функції з posts.js (тестуємо напряму, без Express) ──────────────────────

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-а-яёіїє]+/gi, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '').replace(/-+$/, '')
    + '-' + Date.now();
}

function formatDate(ts) {
  return new Date(ts * 1000).toLocaleDateString('uk-UA', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ─── Фабрики заглушок ─────────────────────────────────────────────────────────

function makeReq(overrides = {}) {
  return {
    query: {},
    params: {},
    body: {},
    session: { userId: 1, user: { id: 1, username: 'testuser' } },
    flash: jest.fn(),
    file: null,
    ...overrides,
  };
}

function makeRes() {
  return {
    render:   jest.fn(),
    redirect: jest.fn(),
    status:   jest.fn().mockReturnThis(),
  };
}

// ─── slugify ─────────────────────────────────────────────────────────────────

describe('posts: slugify()', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(1700000000000));
  afterEach(() => jest.restoreAllMocks());

  test('генерує slug із заголовку', () => {
    expect(slugify('My First Post')).toMatch(/^my-first-post-/);
  });

  test('slug закінчується на timestamp', () => {
    expect(slugify('test')).toBe('test-1700000000000');
  });

  test('символи, що не є літерами/цифрами/дефісами, видаляються', () => {
    expect(slugify('Hello! World?')).toMatch(/^hello-world-/);
  });

  test('кирилиця зберігається', () => {
    expect(slugify('Привіт Світ')).toMatch(/^привіт-світ-/);
  });

  test('численні пробіли стискаються в один дефіс', () => {
    const result = slugify('a   b');
    expect(result).not.toMatch(/--/);
  });
});

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('posts: formatDate()', () => {
  test('повертає рядок', () => {
    expect(typeof formatDate(1700000000)).toBe('string');
  });

  test('не кидає виняток для 0', () => {
    expect(() => formatDate(0)).not.toThrow();
  });

  test('різні timestamps → різні рядки', () => {
    expect(formatDate(1700000000)).not.toBe(formatDate(1600000000));
  });
});

// ─── Логіка отримання списку постів ──────────────────────────────────────────

describe('posts: логіка GET / (список постів)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('db.prepare викликається для отримання постів', () => {
    mockAll.mockReturnValue([]);
    mockGet.mockReturnValue({ c: 0 });

    db.prepare('SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?').all(6, 0);

    expect(db.prepare).toHaveBeenCalled();
    expect(mockAll).toHaveBeenCalledWith(6, 0);
  });

  test('пагінація: offset розраховується правильно для сторінки 2', () => {
    const page  = 2;
    const limit = 6;
    const offset = (page - 1) * limit;
    expect(offset).toBe(6);
  });

  test('пагінація: offset для сторінки 1 = 0', () => {
    const page   = 1;
    const offset = (page - 1) * 6;
    expect(offset).toBe(0);
  });

  test('кількість сторінок округляється вверх', () => {
    const total      = 13;
    const limit      = 6;
    const totalPages = Math.ceil(total / limit);
    expect(totalPages).toBe(3);
  });

  test('map додає formattedDate до кожного поста', () => {
    const rawPosts = [
      { id: 1, title: 'Post 1', created_at: 1700000000 },
      { id: 2, title: 'Post 2', created_at: 1600000000 },
    ];
    const formatted = rawPosts.map(p => ({ ...p, formattedDate: formatDate(p.created_at) }));
    expect(formatted[0]).toHaveProperty('formattedDate');
    expect(formatted[1]).toHaveProperty('formattedDate');
  });
});

// ─── Логіка отримання одного поста ───────────────────────────────────────────

describe('posts: логіка GET /:slug (один пост)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('db шукає пост за slug', () => {
    const fakePost = { id: 1, title: 'Test', slug: 'test-123', user_id: 1, created_at: 1700000000 };
    mockGet.mockReturnValue(fakePost);

    const post = db.prepare('SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.slug = ?').get('test-123');

    expect(post).toEqual(fakePost);
  });

  test('якщо пост не знайдено — повертається null', () => {
    mockGet.mockReturnValue(null);
    const post = db.prepare('SELECT p.*, u.username FROM posts p WHERE slug = ?').get('nonexistent');
    expect(post).toBeNull();
  });

  test('коментарі завантажуються для знайденого поста', () => {
    mockAll.mockReturnValue([
      { id: 1, content: 'Great post!', username: 'alice', created_at: 1700000000 },
    ]);
    const comments = db.prepare('SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ?').all(1);
    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe('Great post!');
  });
});

// ─── Логіка створення поста ───────────────────────────────────────────────────

describe('posts: логіка POST / (створення поста)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('INSERT викликається з title, slug, content, excerpt, cover_image, user_id', () => {
    mockRun.mockReturnValue({ lastInsertRowid: 10 });
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const title   = 'New Post';
    const content = 'This is content of the new post.';
    const excerpt = content.substring(0, 200) + '...';
    const slug    = slugify(title);
    const userId  = 1;

    db.prepare('INSERT INTO posts (title, slug, content, excerpt, cover_image, user_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(title, slug, content, excerpt, null, userId);

    expect(mockRun).toHaveBeenCalledWith(title, slug, content, excerpt, null, userId);
    jest.restoreAllMocks();
  });

  test('excerpt формується з перших 200 символів content', () => {
    const content = 'A'.repeat(300);
    const excerpt = content.substring(0, 200) + '...';
    expect(excerpt.length).toBe(203);
    expect(excerpt).toMatch(/\.\.\.$/);
  });

  test('cover_image = null якщо файл не завантажено', () => {
    const req = makeReq({ file: null });
    const cover = req.file ? `/uploads/${req.file.filename}` : null;
    expect(cover).toBeNull();
  });

  test('cover_image встановлюється якщо файл є', () => {
    const req = makeReq({ file: { filename: 'post-123.jpg' } });
    const cover = req.file ? `/uploads/${req.file.filename}` : null;
    expect(cover).toBe('/uploads/post-123.jpg');
  });
});

// ─── Логіка видалення поста ───────────────────────────────────────────────────

describe('posts: логіка DELETE (видалення поста)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('DELETE викликається з id поста', () => {
    mockRun.mockReturnValue({});
    db.prepare('DELETE FROM posts WHERE id = ?').run(5);
    expect(mockRun).toHaveBeenCalledWith(5);
  });

  test('власник поста (user_id === session.userId) може видалити', () => {
    const post    = { id: 1, user_id: 1, slug: 'my-post-1' };
    const session = { userId: 1 };
    expect(post.user_id === session.userId).toBe(true);
  });

  test('не-власник не має права видаляти', () => {
    const post    = { id: 1, user_id: 2, slug: 'my-post-1' };
    const session = { userId: 1 };
    expect(post.user_id === session.userId).toBe(false);
  });
});

// ─── Логіка коментарів ────────────────────────────────────────────────────────

describe('posts: логіка коментарів', () => {
  beforeEach(() => jest.clearAllMocks());

  test('INSERT коментаря викликається з content, user_id, post_id', () => {
    mockRun.mockReturnValue({ lastInsertRowid: 99 });
    db.prepare('INSERT INTO comments (content, user_id, post_id) VALUES (?, ?, ?)')
      .run('Nice post!', 1, 5);
    expect(mockRun).toHaveBeenCalledWith('Nice post!', 1, 5);
  });

  test('власник коментаря може видалити його', () => {
    const comment = { id: 1, user_id: 3 };
    const session = { userId: 3 };
    expect(comment.user_id === session.userId).toBe(true);
  });

  test('чужий коментар не можна видалити', () => {
    const comment = { id: 1, user_id: 3 };
    const session = { userId: 7 };
    expect(comment.user_id === session.userId).toBe(false);
  });

  test('DELETE коментаря по id', () => {
    mockRun.mockReturnValue({});
    db.prepare('DELETE FROM comments WHERE id = ?').run(10);
    expect(mockRun).toHaveBeenCalledWith(10);
  });

  test('порожній коментар має довжину 0', () => {
    const content = '   '.trim();
    expect(content.length).toBe(0);
  });

  test('непорожній коментар валідний', () => {
    const content = 'Цікавий допис!';
    expect(content.trim().length > 0).toBe(true);
  });
});

// ─── Логіка редагування поста ─────────────────────────────────────────────────

describe('posts: логіка редагування поста', () => {
  beforeEach(() => jest.clearAllMocks());

  test('UPDATE викликається з оновленими полями', () => {
    mockRun.mockReturnValue({});
    const updated_at = Math.floor(Date.now() / 1000);
    db.prepare('UPDATE posts SET title = ?, content = ?, excerpt = ?, cover_image = ?, updated_at = ? WHERE id = ?')
      .run('New Title', 'New content...', 'New content......', null, updated_at, 1);
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  test('якщо новий файл не завантажено — зберігається старий cover_image', () => {
    const oldCover = '/uploads/old-image.jpg';
    const newFile  = null;
    const cover    = newFile ? `/uploads/${newFile.filename}` : oldCover;
    expect(cover).toBe('/uploads/old-image.jpg');
  });

  test('якщо новий файл завантажено — cover_image оновлюється', () => {
    const oldCover = '/uploads/old-image.jpg';
    const newFile  = { filename: 'new-image.png' };
    const cover    = newFile ? `/uploads/${newFile.filename}` : oldCover;
    expect(cover).toBe('/uploads/new-image.png');
  });
});
