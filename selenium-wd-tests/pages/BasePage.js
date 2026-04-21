'use strict';

const { By, until } = require('selenium-webdriver');
const fs = require('fs');
const path = require('path');

/**
 * BasePage — базовий клас для всіх Page Object.
 *
 * Реалізує:
 *  - Загальні методи навігації, очікування, взаємодії з елементами
 *  - Скріншоти після кожного кроку (takeScreenshot)
 *  - Єдине місце для BASE_URL та TIMEOUT
 */
class BasePage {
  constructor(driver) {
    this.driver = driver;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.timeout = 5000;
    this.screenshotsDir = path.join(__dirname, '..', 'screenshots');

    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  // ── Навігація ──────────────────────────────────────────────────────────

  async navigate(path = '/') {
    await this.driver.get(`${this.baseUrl}${path}`);
    await this.takeScreenshot(`navigate_${path.replace(/\//g, '_')}`);
  }

  async getTitle() {
    return await this.driver.getTitle();
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }

  // ── Взаємодія з елементами ────────────────────────────────────────────

  async findElement(locator) {
    await this.driver.wait(until.elementLocated(locator), this.timeout);
    return await this.driver.findElement(locator);
  }

  async findElements(locator) {
    await this.driver.wait(until.elementsLocated(locator), this.timeout);
    return await this.driver.findElements(locator);
  }

  async clickElement(locator, stepName = '') {
    const el = await this.findElement(locator);
    await this.driver.wait(until.elementIsVisible(el), this.timeout);
    await el.click();
    if (stepName) {
      await this.takeScreenshot(`click_${stepName}`);
    }
  }

  async typeText(locator, text, stepName = '') {
    const el = await this.findElement(locator);
    await el.clear();
    await el.sendKeys(text);
    if (stepName) {
      await this.takeScreenshot(`type_${stepName}`);
    }
  }

  async getText(locator) {
    const el = await this.findElement(locator);
    return await el.getText();
  }

  async isElementPresent(locator) {
    try {
      const elements = await this.driver.findElements(locator);
      return elements.length > 0;
    } catch {
      return false;
    }
  }

  async waitForUrl(urlPart) {
    await this.driver.wait(
      async () => {
        const url = await this.driver.getCurrentUrl();
        return url.includes(urlPart);
      },
      this.timeout,
      `URL did not contain "${urlPart}" within ${this.timeout}ms`
    );
  }

  async waitForElement(locator) {
    await this.driver.wait(until.elementLocated(locator), this.timeout);
    const el = await this.driver.findElement(locator);
    await this.driver.wait(until.elementIsVisible(el), this.timeout);
    return el;
  }

  // ── Скріншоти ──────────────────────────────────────────────────────────

  /**
   * Робить скріншот та зберігає у папку screenshots/.
   * Назва файлу: <testName>_<stepName>_<timestamp>.png
   *
   * @param {string} stepName - Опис кроку для назви файлу
   */
  async takeScreenshot(stepName = 'step') {
    try {
      const timestamp = Date.now();
      // Sanitize stepName for filesystem
      const safeName = stepName.replace(/[^a-zA-Z0-9_\-а-яёіїє]/gi, '_');
      const filename = `${safeName}_${timestamp}.png`;
      const filepath = path.join(this.screenshotsDir, filename);

      const image = await this.driver.takeScreenshot();
      fs.writeFileSync(filepath, image, 'base64');

      return filepath;
    } catch (err) {
      // Не падаємо якщо скріншот не вдався
      console.warn(`Screenshot failed: ${err.message}`);
      return null;
    }
  }
}

module.exports = BasePage;
