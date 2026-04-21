'use strict';

const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

/**
 * RegisterPage — Page Object для /auth/register
 */
class RegisterPage extends BasePage {
  constructor(driver) {
    super(driver);

    this.locators = {
      usernameInput:        By.id('username'),
      emailInput:           By.id('email'),
      passwordInput:        By.id('password'),
      confirmPasswordInput: By.id('confirmPassword'),
      submitButton:         By.css("button[type='submit']"),
      errorList:            By.css('.error-list'),
      loginLink:            By.linkText('Увійти'),
    };
  }

  async open() {
    await this.navigate('/auth/register');
  }

  async fillForm({ username, email, password, confirmPassword }) {
    await this.typeText(this.locators.usernameInput, username, 'username');
    await this.typeText(this.locators.emailInput, email, 'email');
    await this.typeText(this.locators.passwordInput, password, 'password');
    await this.typeText(
      this.locators.confirmPasswordInput,
      confirmPassword || password,
      'confirm_password'
    );
  }

  async submit() {
    await this.clickElement(this.locators.submitButton, 'register_submit');
  }

  async register(userData) {
    await this.open();
    await this.fillForm(userData);
    await this.submit();
    await this.takeScreenshot('after_register');
    return await this.getCurrentUrl();
  }

  async hasError() {
    return await this.isElementPresent(this.locators.errorList);
  }

  async getErrorText() {
    const el = await this.findElement(this.locators.errorList);
    return await el.getText();
  }
}

module.exports = RegisterPage;
