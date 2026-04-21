'use strict';

const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

/**
 * ForgotPasswordPage — Page Object для /auth/forgot-password та /auth/reset-password
 */
class ForgotPasswordPage extends BasePage {
  constructor(driver) {
    super(driver);

    this.locators = {
      emailInput:    By.id('email'),
      submitButton:  By.css("button[type='submit']"),
      successCard:   By.css('.success-card'),
      errorList:     By.css('.error-list'),
    };
  }

  async open() {
    await this.navigate('/auth/forgot-password');
  }

  async submitEmail(email) {
    await this.typeText(this.locators.emailInput, email, 'forgot_email');
    await this.clickElement(this.locators.submitButton, 'forgot_submit');
    await this.takeScreenshot('after_forgot_submit');
  }

  async isSuccessVisible() {
    return await this.isElementPresent(this.locators.successCard);
  }
}

module.exports = ForgotPasswordPage;
