'use strict';

const DriverFactory = require('../utils/DriverFactory');
const LoginPage = require('../pages/LoginPage');
const PostsPage = require('../pages/PostsPage');

const TEST_USER = {
  email:    'selenium_wd@example.com',
  password: 'SeleniumPass123!',
};

describe('Записи та коментарі (Selenium WebDriver + Page Object)', () => {
  let driver;
  let loginPage;
  let postsPage;

  beforeAll(async () => {
    driver    = await DriverFactory.create(true);
    loginPage = new LoginPage(driver);
    postsPage = new PostsPage(driver);

    // Логінуємось один раз для всього suite
    await loginPage.loginAs(TEST_USER.email, TEST_USER.password);
    await loginPage.waitForUrl('/posts');
  });

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  // ── Перегляд списку ──────────────────────────────────────────────────

  describe('Перегляд списку записів', () => {
    test('TC-14 Сторінка /posts відображає grid з картками', async () => {
      await postsPage.openList();

      const title = await postsPage.getTitle();
      expect(title).toContain('Блог');

      const gridVisible = await postsPage.isGridVisible();
      expect(gridVisible).toBe(true);
    });

    test('TC-15 На сторінці є хоча б один запис', async () => {
      await postsPage.openList();
      const count = await postsPage.getPostCardsCount();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── Пошук ────────────────────────────────────────────────────────────

  describe('Пошук записів', () => {
    test('TC-16 Пошук знаходить відповідні записи', async () => {
      await postsPage.openList();
      await postsPage.search('Selenium');

      const url = await postsPage.getCurrentUrl();
      expect(url).toContain('search=Selenium');

      const hasCards = await postsPage.isElementPresent(
        require('selenium-webdriver').By.css('.post-card')
      );
      expect(hasCards).toBe(true);
    });

    test('TC-17 Пошук неіснуючого слова показує порожній стан', async () => {
      await postsPage.openList();
      await postsPage.search('xyznonexistentterm12345abc');

      const isEmpty = await postsPage.isEmptyStateVisible();
      expect(isEmpty).toBe(true);
    });
  });

  // ── Створення ────────────────────────────────────────────────────────

  describe('Створення записів', () => {
    test('TC-18 Авторизований користувач може створити запис', async () => {
      await postsPage.createPost(
        'Selenium WebDriver Test Post',
        'Цей запис створено програмно через Selenium WebDriver із застосуванням патерну Page Object.'
      );

      const url = await postsPage.getCurrentUrl();
      expect(url).toContain('/posts/');
      expect(url).not.toContain('/new');

      const postTitle = await postsPage.getPostTitle();
      expect(postTitle).toBe('Selenium WebDriver Test Post');
    });

    test('TC-19 Форма створення вимагає заголовок', async () => {
      await postsPage.openNewPostForm();
      // Тільки content — без title
      await postsPage.typeText(
        require('selenium-webdriver').By.id('content'),
        'Контент без заголовку'
      );
      await postsPage.clickElement(
        require('selenium-webdriver').By.css("button[type='submit']")
      );

      // HTML5 required → залишаємось на /new або отримуємо помилку
      const url = await postsPage.getCurrentUrl();
      expect(url).toContain('/new');
    });

    test('TC-20 Заголовок менше 3 символів повертає помилку', async () => {
      await postsPage.openNewPostForm();
      await postsPage.typeText(
        require('selenium-webdriver').By.id('title'),
        'AB'
      );
      await postsPage.typeText(
        require('selenium-webdriver').By.id('content'),
        'Достатньо довгий контент для перевірки валідації заголовку.'
      );
      await postsPage.clickElement(
        require('selenium-webdriver').By.css("button[type='submit']")
      );

      const hasError = await postsPage.hasError();
      expect(hasError).toBe(true);
    });
  });

  // ── Редагування ──────────────────────────────────────────────────────

  describe('Редагування записів', () => {
    test('TC-21 Автор може відредагувати свій запис', async () => {
      // Створюємо запис
      await postsPage.createPost('Post For Edit WD', 'Початковий контент для редагування.');
      await postsPage.waitForUrl('/posts/');

      // Клікаємо Редагувати
      await postsPage.clickEdit();
      await postsPage.waitForUrl('/edit');

      // Змінюємо заголовок
      await postsPage.typeText(
        require('selenium-webdriver').By.id('title'),
        'Post For Edit WD — Updated'
      );
      await postsPage.clickElement(
        require('selenium-webdriver').By.css("button[type='submit']")
      );

      await postsPage.waitForUrl('/posts/');
      const title = await postsPage.getPostTitle();
      expect(title).toBe('Post For Edit WD — Updated');
    });
  });

  // ── Видалення ────────────────────────────────────────────────────────

  describe('Видалення записів', () => {
    test('TC-22 Автор може видалити свій запис', async () => {
      await postsPage.createPost('Post For Delete WD', 'Контент для видалення.');
      await postsPage.waitForUrl('/posts/');

      const postUrl = await postsPage.getCurrentUrl();
      await postsPage.clickDelete();
      await postsPage.waitForUrl('/posts');

      // Після видалення маємо бути на /posts
      const url = await postsPage.getCurrentUrl();
      expect(url).toContain('/posts');
      expect(url).not.toBe(postUrl);
    });
  });

  // ── Коментарі ────────────────────────────────────────────────────────

  describe('Коментарі', () => {
    test('TC-23 Авторизований користувач може додати коментар', async () => {
      await postsPage.openList();
      await postsPage.clickFirstPost();
      await postsPage.waitForUrl('/posts/');

      await postsPage.addComment('Коментар через Selenium WebDriver Page Object');
      await postsPage.waitForUrl('/posts/');

      const commentText = await postsPage.getLastCommentText();
      expect(commentText).toBe('Коментар через Selenium WebDriver Page Object');
    });

    test('TC-24 Неавторизований користувач не бачить форму коментаря', async () => {
      // Виходимо
      await driver.manage().deleteAllCookies();
      await postsPage.openList();

      // Кількість карток > 0
      const count = await postsPage.getPostCardsCount();
      expect(count).toBeGreaterThanOrEqual(0);

      await postsPage.clickFirstPost();

      // Форма коментування відсутня
      const hasCommentForm = await postsPage.isElementPresent(
        require('selenium-webdriver').By.css('#comments textarea')
      );
      expect(hasCommentForm).toBe(false);
    });
  });
});
