'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const { By } = require('selenium-webdriver');

// ── Locators (Page Object–style: всі селектори в одному місці) ───────────────
// При зміні UI — змінюємо лише тут, а не у кожному кроці.
const L = {
  usernameInput:     By.id('username'),
  emailInput:        By.id('email'),
  passwordInput:     By.id('password'),
  confirmPassInput:  By.id('confirmPassword'),
  submitButton:      By.css("button[type='submit']"),
  errorList:         By.css('.error-list'),
  flashSuccess:      By.css('.flash-success'),
  flashError:        By.css('.flash-error'),
  navAvatar:         By.css('.nav-avatar-link'),
  registerLink:      By.linkText('Реєстрація'),
  forgotPassLink:    By.linkText('Забули пароль?'),
  successCard:       By.css('.success-card'),
  logoutButton:      By.css('.inline-form button[type="submit"]'),
  emailRecovery:     By.id('email'),
};

// ── Given ─────────────────────────────────────────────────────────────────────

Given('відкрито браузер та сторінку блогу', async function () {
  await this.navigate('/');
  await this.takeScreenshot('browser_opened');
});

Given('користувач перебуває на сторінці реєстрації', async function () {
  await this.navigate('/auth/register');
});

Given('користувач перебуває на сторінці входу', async function () {
  await this.navigate('/auth/login');
});

Given('користувач перебуває на сторінці відновлення паролю', async function () {
  await this.navigate('/auth/forgot-password');
});

Given('користувач не авторизований', async function () {
  await this.clearCookies();
  await this.navigate('/');
});

Given('авторизований користувач з email {string} та паролем {string}', async function (email, password) {
  await this.loginAs(email, password);
});

// ── When — Реєстрація ─────────────────────────────────────────────────────────

When("він вводить ім'я користувача {string}", async function (username) {
  await this.type(L.usernameInput, username, 'username');
});

When('він вводить email {string}', async function (email) {
  await this.type(L.emailInput, email, 'email');
});

When('він вводить пароль {string}', async function (password) {
  await this.type(L.passwordInput, password, 'password');
});

When('він підтверджує пароль {string}', async function (confirmPassword) {
  await this.type(L.confirmPassInput, confirmPassword, 'confirm_pass');
});

When('він натискає кнопку реєстрації', async function () {
  await this.click(L.submitButton, 'register_btn');
});

// ── When — Вхід ───────────────────────────────────────────────────────────────

When('він натискає кнопку входу', async function () {
  await this.click(L.submitButton, 'login_btn');
});

When('він натискає посилання {string}', async function (linkText) {
  await this.click(By.linkText(linkText), `link_${linkText}`);
});

// ── When — Відновлення паролю ─────────────────────────────────────────────────

When('він вводить email для відновлення {string}', async function (email) {
  await this.type(L.emailRecovery, email, 'recovery_email');
});

When('він натискає кнопку відправки', async function () {
  await this.click(L.submitButton, 'submit_recovery');
});

// ── When — Безпека ────────────────────────────────────────────────────────────

When('він намагається відкрити сторінку створення запису', async function () {
  await this.navigate('/posts/new');
});

// ── When — Вихід ─────────────────────────────────────────────────────────────

When('він натискає кнопку виходу', async function () {
  await this.click(L.logoutButton, 'logout_btn');
});

// ── Then ──────────────────────────────────────────────────────────────────────

Then('він має бути перенаправлений на сторінку записів', async function () {
  await this.waitForUrl('/posts');
  const url = await this.getCurrentUrl();
  if (!url.includes('/posts')) {
    throw new Error(`Expected URL to contain /posts, got: ${url}`);
  }
});

Then('він має бути перенаправлений на сторінку входу', async function () {
  await this.waitForUrl('/auth/login');
  const url = await this.getCurrentUrl();
  if (!url.includes('/auth/login')) {
    throw new Error(`Expected URL to contain /auth/login, got: ${url}`);
  }
});

Then('він має бути перенаправлений на сторінку відновлення паролю', async function () {
  await this.waitForUrl('/auth/forgot-password');
  const url = await this.getCurrentUrl();
  if (!url.includes('/auth/forgot-password')) {
    throw new Error(`Expected URL to contain /auth/forgot-password, got: ${url}`);
  }
});

Then('має відображатись повідомлення про успішну реєстрацію', async function () {
  const hasSuccess = await this.isPresent(L.flashSuccess);
  if (!hasSuccess) {
    throw new Error('Flash success message not found');
  }
});

Then('має відображатись повідомлення про помилку', async function () {
  const hasError = await this.isPresent(L.errorList);
  if (!hasError) {
    throw new Error('Error message not found on the page');
  }
});

Then('він залишається на сторінці реєстрації', async function () {
  const url = await this.getCurrentUrl();
  if (!url.includes('/auth/register')) {
    throw new Error(`Expected to stay on /auth/register, got: ${url}`);
  }
});

Then('він залишається на сторінці входу', async function () {
  const url = await this.getCurrentUrl();
  if (!url.includes('/auth/login')) {
    throw new Error(`Expected to stay on /auth/login, got: ${url}`);
  }
});

Then('у навігації має відображатись аватарка користувача', async function () {
  const hasAvatar = await this.isPresent(L.navAvatar);
  if (!hasAvatar) {
    throw new Error('User avatar not found in navigation');
  }
});

Then('заголовок сторінки має містити {string}', async function (text) {
  const title = await this.getTitle();
  if (!title.includes(text)) {
    throw new Error(`Page title "${title}" does not contain "${text}"`);
  }
});

Then('має відображатись підтвердження відправки', async function () {
  const hasCard = await this.isPresent(L.successCard);
  if (!hasCard) {
    throw new Error('Success confirmation card not found');
  }
});

Then('має відображатись flash-помилка', async function () {
  const hasFlash = await this.isPresent(L.flashError);
  if (!hasFlash) {
    throw new Error('Flash error message not found');
  }
});

Then('посилання реєстрації має бути видимим', async function () {
  const hasLink = await this.isPresent(L.registerLink);
  if (!hasLink) {
    throw new Error('Register link not visible — user might still be logged in');
  }
});
