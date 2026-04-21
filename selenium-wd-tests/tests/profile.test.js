'use strict';

const DriverFactory = require('../utils/DriverFactory');
const LoginPage = require('../pages/LoginPage');
const ProfilePage = require('../pages/ProfilePage');

const TEST_USER = {
  username: 'selenium_wd_user',
  email:    'selenium_wd@example.com',
  password: 'SeleniumPass123!',
};

describe('Профіль користувача (Selenium WebDriver + Page Object)', () => {
  let driver;
  let loginPage;
  let profilePage;

  beforeAll(async () => {
    driver      = await DriverFactory.create(true);
    loginPage   = new LoginPage(driver);
    profilePage = new ProfilePage(driver);

    await loginPage.loginAs(TEST_USER.email, TEST_USER.password);
    await loginPage.waitForUrl('/posts');
  });

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  // ── Перегляд профілю ─────────────────────────────────────────────────

  describe('Перегляд профілю', () => {
    test('TC-25 Власний профіль відображає правильне ім\'я', async () => {
      await profilePage.openProfile();

      const username = await profilePage.getUsername();
      expect(username).toBe(TEST_USER.username);
    });

    test('TC-26 Власний профіль показує кнопки редагування', async () => {
      await profilePage.openProfile();

      const hasActions = await profilePage.hasEditActions();
      expect(hasActions).toBe(true);
    });

    test('TC-27 Публічний профіль /profile/users/:username доступний', async () => {
      await profilePage.navigate(`/profile/users/${TEST_USER.username}`);
      await profilePage.takeScreenshot('public_profile');

      const username = await profilePage.getUsername();
      expect(username).toBe(TEST_USER.username);

      // На публічній сторінці НЕМАЄ кнопок редагування
      const hasActions = await profilePage.hasEditActions();
      expect(hasActions).toBe(false);
    });
  });

  // ── Редагування профілю ──────────────────────────────────────────────

  describe('Редагування профілю', () => {
    test('TC-28 Користувач може оновити біо', async () => {
      const newBio = 'Selenium WebDriver Page Object тест. Оновлений біо.';
      await profilePage.updateBio(newBio);

      await profilePage.waitForUrl('/profile');
      const hasSuccess = await profilePage.hasFlashSuccess();
      expect(hasSuccess).toBe(true);

      // Переходимо на профіль і перевіряємо
      await profilePage.openProfile();
      const bio = await profilePage.getBio();
      expect(bio).toContain('Selenium WebDriver Page Object тест');
    });

    test('TC-29 Занадто довге біо (>500 символів) показує помилку', async () => {
      await profilePage.openEditProfile();

      const longBio = 'A'.repeat(501);
      const bioEl = await profilePage.findElement(
        require('selenium-webdriver').By.id('bio')
      );
      await bioEl.clear();
      await bioEl.sendKeys(longBio);
      await profilePage.clickElement(
        require('selenium-webdriver').By.css("button[type='submit']")
      );
      await profilePage.takeScreenshot('too_long_bio_error');

      const hasError = await profilePage.hasError();
      expect(hasError).toBe(true);
    });
  });

  // ── Зміна паролю ─────────────────────────────────────────────────────

  describe('Зміна паролю', () => {
    const newPassword = 'NewSeleniumPass456!';

    test('TC-30 Користувач може змінити пароль', async () => {
      await profilePage.changePassword(TEST_USER.password, newPassword);
      await profilePage.waitForUrl('/profile');

      const hasSuccess = await profilePage.hasFlashSuccess();
      expect(hasSuccess).toBe(true);
    });

    test('TC-31 Після зміни паролю старий пароль не підходить', async () => {
      // Виходимо
      const logoutBtn = await loginPage.findElement(
        require('selenium-webdriver').By.css('.inline-form button[type="submit"]')
      );
      await logoutBtn.click();
      await loginPage.waitForUrl('/auth/login');

      // Пробуємо старий пароль
      await loginPage.fillEmail(TEST_USER.email);
      await loginPage.fillPassword(TEST_USER.password);
      await loginPage.submit();
      await loginPage.takeScreenshot('old_password_fail');

      const hasError = await loginPage.hasError();
      expect(hasError).toBe(true);
    });

    // Teardown: повертаємо старий пароль
    afterAll(async () => {
      try {
        await loginPage.loginAs(TEST_USER.email, newPassword);
        await profilePage.changePassword(newPassword, TEST_USER.password);
      } catch (e) {
        console.warn('Could not restore password:', e.message);
      }
    });
  });
});
