'use strict';

const { When, Then } = require('@cucumber/cucumber');
const { By } = require('selenium-webdriver');

// ── Локатори ──────────────────────────────────────────────────────────────────
const L = {
  profileUsername:  By.css('.profile-username'),
  profileActions:   By.css('.profile-actions'),
  bioInput:         By.id('bio'),
  usernameInput:    By.id('username'),
  submitButton:     By.css("button[type='submit']"),
  flashSuccess:     By.css('.flash-success'),
  errorList:        By.css('.error-list'),
  currentPassword:  By.id('currentPassword'),
  newPassword:      By.id('newPassword'),
  confirmPassword:  By.id('confirmPassword'),
};

// ── When ───────────────────────────────────────────────────────────────────────

When('він відкриває сторінку свого профілю', async function () {
  await this.navigate('/profile');
});

When('він відкриває публічний профіль користувача {string}', async function (username) {
  await this.navigate(`/profile/users/${username}`);
});

When('він відкриває форму редагування профілю', async function () {
  await this.navigate('/profile/edit');
});

When('він оновлює біо {string}', async function (bio) {
  const el = await this.findElement(L.bioInput);
  await el.clear();
  await this.type(L.bioInput, bio, 'bio_update');
});

When('він вводить біо довжиною більше 500 символів', async function () {
  const longBio = 'A'.repeat(501);
  const el = await this.findElement(L.bioInput);
  await el.clear();
  await this.type(L.bioInput, longBio, 'long_bio');
});

When('він зберігає зміни профілю', async function () {
  await this.click(L.submitButton, 'save_profile');
});

When('він відкриває сторінку зміни паролю', async function () {
  await this.navigate('/auth/change-password');
});

When('він вводить поточний пароль {string}', async function (password) {
  await this.type(L.currentPassword, password, 'current_password');
});

When('він вводить новий пароль {string}', async function (password) {
  await this.type(L.newPassword, password, 'new_password');
});

When('він підтверджує новий пароль {string}', async function (password) {
  await this.type(L.confirmPassword, password, 'confirm_password');
});

When('він зберігає новий пароль', async function () {
  await this.click(L.submitButton, 'save_password');
});

// ── Then ───────────────────────────────────────────────────────────────────────

Then("має відображатись ім'я користувача {string}", async function (expectedUsername) {
  const actualUsername = await this.getText(L.profileUsername);
  if (actualUsername !== expectedUsername) {
    throw new Error(`Expected username "${expectedUsername}", got "${actualUsername}"`);
  }
});

Then('на сторінці є кнопки редагування профілю', async function () {
  const hasActions = await this.isPresent(L.profileActions);
  if (!hasActions) {
    throw new Error('Profile action buttons not found — user might not be the owner');
  }
});

Then('на сторінці немає кнопок редагування профілю', async function () {
  const hasActions = await this.isPresent(L.profileActions);
  if (hasActions) {
    throw new Error('Profile action buttons found — they should not be visible for public profile');
  }
});

Then('він має бути перенаправлений на сторінку профілю', async function () {
  await this.waitForUrl('/profile');
  const url = await this.getCurrentUrl();
  if (!url.includes('/profile')) {
    throw new Error(`Expected URL to contain /profile, got: ${url}`);
  }
});

Then('має відображатись повідомлення про успішне оновлення', async function () {
  const hasSuccess = await this.isPresent(L.flashSuccess);
  if (!hasSuccess) {
    throw new Error('Flash success message not found after update');
  }
});
