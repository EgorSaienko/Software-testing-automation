'use strict';

const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

/**
 * DriverFactory — фабрика для створення WebDriver.
 *
 * Підтримує headless режим для CI/CD середовищ.
 * Налаштовує стандартні опції Chrome.
 */
class DriverFactory {
  /**
   * Створює та повертає налаштований ChromeDriver.
   * @param {boolean} headless - запускати у headless режимі (за замовчуванням: true в CI)
   */
  static async create(headless = true) {
    const options = new chrome.Options();

    if (headless) {
      options.addArguments('--headless=new');
    }

    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1280,900');
    options.addArguments('--disable-extensions');

    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await driver.manage().setTimeouts({
      implicit: 0,
      pageLoad: 10000,
      script: 5000,
    });

    return driver;
  }

  static isCI() {
    return process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  }
}

module.exports = DriverFactory;
