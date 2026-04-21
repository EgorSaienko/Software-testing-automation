'use strict';

const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

/**
 * LoginPage — Page Object для сторінки /auth/login
 *
 * Інкапсулює всі локатори та дії на сторінці входу.
 * Завдяки цьому при зміні HTML достатньо оновити лише
 * цей клас, а не всі тести, що використовують логін.
 */
class LoginPage extends BasePage {
  constructor(driver) {
    super(driver);

    // ── Локатори (Page Object pattern: всі selectors в одному місці) ──
    this.locators = {
      emailInput:      By.id('email'),
      passwordInput:   By.id('password'),
      submitButton:    By.css("button[type='submit']"),
      errorList:       By.css('.error-list'),
      forgotPassword:  By.linkText('Забули пароль?'),
      registerLink:    By.linkText('Зареєструватись'),
    };
  }

  async open() {
    await this.navigate('/auth/login');
  }

  async fillEmail(email) {
    await this.typeText(this.locators.emailInput, email, 'email_input');
  }

  async fillPassword(password) {
    await this.typeText(this.locators.passwordInput, password, 'password_input');
  }

  async submit() {
    await this.clickElement(this.locators.submitButton, 'login_submit');
  }

  /**
   * Виконує повний сценарій входу за один виклик.
   * Повертає поточний URL після відправки форми.
   */
  async loginAs(email, password) {
    await this.open();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
    await this.takeScreenshot('after_login');
    return await this.getCurrentUrl();
  }

  async hasError() {
    return await this.isElementPresent(this.locators.errorList);
  }

  async getErrorText() {
    const el = await this.findElement(this.locators.errorList);
    return await el.getText();
  }

  async clickForgotPassword() {
    await this.clickElement(this.locators.forgotPassword, 'forgot_password_click');
  }

  async isRegisterLinkVisible() {
    return await this.isElementPresent(this.locators.registerLink);
  }
}

module.exports = LoginPage;
