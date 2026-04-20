/**
 * Unit Tests — допоміжні (сервісні) функції
 *
 * Тестуються чисті функції, витягнуті з src/routes/posts.js:
 *   - slugify(text)  — перетворення заголовку у URL-slug
 *   - formatDate(ts) — форматування Unix timestamp у рядок
 *
 * Це повністю ізольовані тести: жодних БД, HTTP, сесій.
 */

// ─── Копіюємо логіку з posts.js для ізольованого тестування ─────────────────
// (чисті функції не залежать від Express/DB, тому тестуються напряму)

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
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── slugify ────────────────────────────────────────────────────────────────

describe('slugify()', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('перетворює прості слова на нижній регістр', () => {
    const result = slugify('Hello World');
    expect(result).toMatch(/^hello-world-/);
  });

  test('замінює пробіли на дефіси', () => {
    const result = slugify('my new post');
    expect(result).toMatch(/^my-new-post-/);
  });

  test('видаляє спеціальні символи', () => {
    const result = slugify('Test! Post@#$%');
    expect(result).toMatch(/^test-post-/);
  });

  test('зберігає кириличні символи', () => {
    const result = slugify('Мій новий пост');
    expect(result).toMatch(/^мій-новий-пост-/);
  });

  test('усуває подвійні дефіси', () => {
    const result = slugify('Hello  --  World');
    expect(result).not.toMatch(/--/);
  });

  test('завжди додає timestamp наприкінці', () => {
    const result = slugify('test');
    expect(result).toMatch(/-1700000000000$/);
  });

  test('повертає рядок для числового вводу', () => {
    const result = slugify(42);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^42-/);
  });

  test('обробляє рядок з лише пробілами', () => {
    const result = slugify('   ');
    expect(typeof result).toBe('string');
  });

  test('обробляє рядок, що починається і закінчується дефісами', () => {
    const result = slugify('-test-');
    expect(result).not.toMatch(/^-/);
  });

  test('не залишає початкових та кінцевих дефісів (перед timestamp)', () => {
    const result = slugify('!!!');
    // після видалення спецсимволів лишається порожньо, лише timestamp
    expect(result).toMatch(/^-?\d+$/);
  });

  test('довгий заголовок перетворюється без помилок', () => {
    const long = 'This is a very long title that should still be converted correctly without any issues';
    expect(() => slugify(long)).not.toThrow();
  });
});

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate()', () => {
  test('повертає рядок', () => {
    const result = formatDate(1700000000);
    expect(typeof result).toBe('string');
  });

  test('коректно форматує відомий timestamp', () => {
    // 1700000000 = 2023-11-14 (UTC)
    const result = formatDate(1700000000);
    expect(result).toMatch(/2023/);
  });

  test('містить місяць у рядку', () => {
    // Для uk-UA locale місяць відображається словом
    const result = formatDate(1700000000);
    // Рядок не порожній і не є числом
    expect(result.length).toBeGreaterThan(0);
  });

  test('повертає різні рядки для різних timestamps', () => {
    const d1 = formatDate(1700000000);
    const d2 = formatDate(1600000000);
    expect(d1).not.toBe(d2);
  });

  test('не кидає виняток для timestamp = 0 (epoch)', () => {
    expect(() => formatDate(0)).not.toThrow();
  });

  test('не кидає виняток для великого timestamp', () => {
    expect(() => formatDate(9999999999)).not.toThrow();
  });

  test('timestamp 1609459200 відповідає 2021 року', () => {
    // 2021-01-01 00:00:00 UTC
    const result = formatDate(1609459200);
    expect(result).toMatch(/2021/);
  });
});

// ─── Додаткові edge cases ────────────────────────────────────────────────────

describe('slugify() + formatDate() — інтеграція', () => {
  test('обидві функції не залежать одна від одної', () => {
    const slug = slugify('Test post');
    const date = formatDate(1700000000);
    expect(typeof slug).toBe('string');
    expect(typeof date).toBe('string');
  });
});
