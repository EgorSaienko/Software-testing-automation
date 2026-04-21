'use strict';

const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

/**
 * ProfilePage — Page Object для /profile та /profile/edit
 */
class ProfilePage extends BasePage {
  constructor(driver) {
    super(driver);

    this.locators = {
      // Перегляд профілю
      username:        By.css('.profile-username'),
      bio:             By.css('.profile-bio'),
      profileActions:  By.css('.profile-actions'),
      editProfileBtn:  By.linkText('Редагувати профіль'),
      changePassBtn:   By.linkText('Змінити пароль'),

      // Форма редагування
      usernameInput:   By.id('username'),
      bioInput:        By.id('bio'),
      submitButton:    By.css("button[type='submit']"),
      errorList:       By.css('.error-list'),

      // Флеш-повідомлення
      flashSuccess:    By.css('.flash-success'),

      // Зміна паролю
      currentPassword: By.id('currentPassword'),
      newPassword:     By.id('newPassword'),
      confirmPassword: By.id('confirmPassword'),
    };
  }

  async openProfile() {
    await this.navigate('/profile');
    await this.takeScreenshot('profile_page');
  }

  async openEditProfile() {
    await this.navigate('/profile/edit');
    await this.takeScreenshot('profile_edit_page');
  }

  async openChangePassword() {
    await this.navigate('/auth/change-password');
  }

  async getUsername() {
    return await this.getText(this.locators.username);
  }

  async getBio() {
    if (await this.isElementPresent(this.locators.bio)) {
      return await this.getText(this.locators.bio);
    }
    return '';
  }

  async hasEditActions() {
    return await this.isElementPresent(this.locators.profileActions);
  }

  async updateBio(newBio) {
    await this.openEditProfile();
    const bioEl = await this.findElement(this.locators.bioInput);
    await bioEl.clear();
    await this.typeText(this.locators.bioInput, newBio, 'bio_update');
    await this.clickElement(this.locators.submitButton, 'save_profile');
    await this.takeScreenshot('after_save_profile');
  }

  async hasFlashSuccess() {
    return await this.isElementPresent(this.locators.flashSuccess);
  }

  async hasError() {
    return await this.isElementPresent(this.locators.errorList);
  }

  async changePassword(currentPass, newPass) {
    await this.openChangePassword();
    await this.typeText(this.locators.currentPassword, currentPass, 'current_pass');
    await this.typeText(this.locators.newPassword, newPass, 'new_pass');
    await this.typeText(this.locators.confirmPassword, newPass, 'confirm_new_pass');
    await this.clickElement(this.locators.submitButton, 'change_password_submit');
    await this.takeScreenshot('after_change_password');
  }
}

module.exports = ProfilePage;
