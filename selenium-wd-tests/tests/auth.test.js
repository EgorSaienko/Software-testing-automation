'use strict';

const DriverFactory = require('../utils/DriverFactory');
const RegisterPage = require('../pages/RegisterPage');
const LoginPage = require('../pages/LoginPage');
const ForgotPasswordPage = require('../pages/ForgotPasswordPage');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = {
  username: 'selenium_wd_user',
  email:    'selenium_wd@example.com',
  password: 'SeleniumPass123!',
};

describe('Автентифікація (Selenium WebDriver + Page Object)', () => {
  let driver;
  let registerPage;
  let loginPage;
  let forgotPage;

  beforeAll(async () => {
    driver = await DriverFactory.create(true);
    registerPage = new RegisterPage(driver);
    loginPage    = new LoginPage(driver);
    forgotPage   = new ForgotPasswordPage(driver);
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  // ── TC-01: Реєстрація ────────────────────────────────────────────────

  describe('Реєстрація', () => {
    test('TC-01 Успішна реєстрація нового користувача', async () => {
      const url = await registerPage.register(TEST_USER);

      // Перевіряємо редирект на /posts після успішної реєстрації
      expect(url).toContain('/posts');

      // Флеш-повідомлення про успіх
      const hasSuccess = await registerPage.isElementPresent(
        require('selenium-webdriver').By.css('.flash-success')
      );
      expect(hasSuccess).toBe(true);
    });

    test('TC-02 Реєстрація з вже існуючим email показує помилку', async () => {
      await registerPage.open();
      await registerPage.fillForm({
        username: 'another_user_wd',
        email:    TEST_USER.email,  // вже існує
        password: TEST_USER.password,
      });
      await registerPage.submit();

      const hasError = await registerPage.hasError();
      expect(hasError).toBe(true);

      const url = await registerPage.getCurrentUrl();
      expect(url).toContain('/auth/register');
    });

    test('TC-03 Реєстрація з паролями що не збігаються', async () => {
      await registerPage.open();
      await registerPage.fillForm({
        username:        'user_mismatch_wd',
        email:           'mismatch_wd@example.com',
        password:        'Pass123!',
        confirmPassword: 'DifferentPass999!',
      });
      await registerPage.submit();

      const hasError = await registerPage.hasError();
      expect(hasError).toBe(true);
    });

    test('TC-04 Реєстрація з занадто коротким іменем користувача', async () => {
      await registerPage.open();
      await registerPage.fillForm({
        username: 'ab',  // < 3 символи
        email:    'shortname@example.com',
        password: 'Pass123!',
      });
      await registerPage.submit();

      const hasError = await registerPage.hasError();
      expect(hasError).toBe(true);
    });

    test('TC-05 Авторизований користувач перенаправляється з /register', async () => {
      // Спочатку логінуємось
      await loginPage.loginAs(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForUrl('/posts');

      // Тепер намагаємось відкрити register
      await registerPage.open();
      const url = await registerPage.getCurrentUrl();
      // Має бути перенаправлений
      expect(url).not.toContain('/auth/register');
    });
  });

  // ── TC-06: Вхід ──────────────────────────────────────────────────────

  describe('Вхід до системи', () => {
    test('TC-06 Успішний вхід зареєстрованого користувача', async () => {
      const url = await loginPage.loginAs(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForUrl('/posts');

      expect(url).toContain('/posts');

      // Елемент профілю в шапці видимий
      const hasAvatar = await loginPage.isElementPresent(
        require('selenium-webdriver').By.css('.nav-avatar-link')
      );
      expect(hasAvatar).toBe(true);
    });

    test('TC-07 Вхід з невірним паролем показує помилку', async () => {
      await loginPage.open();
      await loginPage.fillEmail(TEST_USER.email);
      await loginPage.fillPassword('WrongPassword999');
      await loginPage.submit();

      const hasError = await loginPage.hasError();
      expect(hasError).toBe(true);

      const url = await loginPage.getCurrentUrl();
      expect(url).toContain('/auth/login');
    });

    test('TC-08 Вхід з неіснуючим email показує помилку', async () => {
      await loginPage.open();
      await loginPage.fillEmail('nobody@nonexistent.com');
      await loginPage.fillPassword(TEST_USER.password);
      await loginPage.submit();

      const hasError = await loginPage.hasError();
      expect(hasError).toBe(true);
    });

    test('TC-09 Захищений маршрут /posts/new без авторизації → редирект', async () => {
      // Очищаємо сесію
      await driver.manage().deleteAllCookies();
      await loginPage.navigate('/posts/new');
      await loginPage.waitForUrl('/auth/login');

      const url = await loginPage.getCurrentUrl();
      expect(url).toContain('/auth/login');

      // Flash-помилка про необхідність авторизації
      const hasFlash = await loginPage.isElementPresent(
        require('selenium-webdriver').By.css('.flash-error')
      );
      expect(hasFlash).toBe(true);
    });
  });

  // ── TC-10: Скидання паролю ───────────────────────────────────────────

  describe('Скидання паролю', () => {
    test('TC-10 Сторінка forgot-password доступна з форми входу', async () => {
      await loginPage.open();
      await loginPage.clickForgotPassword();
      await loginPage.waitForUrl('/auth/forgot-password');

      const title = await loginPage.getTitle();
      expect(title).toContain('Скидання паролю');
    });

    test('TC-11 Відправка email для скидання паролю показує підтвердження', async () => {
      await forgotPage.open();
      await forgotPage.submitEmail(TEST_USER.email);

      const hasSuccess = await forgotPage.isSuccessVisible();
      expect(hasSuccess).toBe(true);
    });

    test('TC-12 Відправка неіснуючого email теж показує підтвердження (безпека)', async () => {
      await forgotPage.open();
      await forgotPage.submitEmail('nonexistent@example.com');

      // З міркувань безпеки — однакова відповідь
      const hasSuccess = await forgotPage.isSuccessVisible();
      expect(hasSuccess).toBe(true);
    });
  });

  // ── TC-13: Вихід ─────────────────────────────────────────────────────

  describe('Вихід із системи', () => {
    test('TC-13 Успішний вихід перенаправляє на /auth/login', async () => {
      // Входимо
      await loginPage.loginAs(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForUrl('/posts');

      // Знаходимо кнопку виходу та клікаємо
      const logoutBtn = await loginPage.findElement(
        require('selenium-webdriver').By.css('.inline-form button[type="submit"]')
      );
      await logoutBtn.click();
      await loginPage.takeScreenshot('after_logout');

      await loginPage.waitForUrl('/auth/login');
      const url = await loginPage.getCurrentUrl();
      expect(url).toContain('/auth/login');

      // Кнопка реєстрації видима (користувач вийшов)
      const hasRegister = await loginPage.isRegisterLinkVisible();
      expect(hasRegister).toBe(true);
    });
  });
});
