'use strict';

const { setWorldConstructor, setDefaultTimeout } = require('@cucumber/cucumber');
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { By, until } = require('selenium-webdriver');
const path = require('path');
const fs = require('fs');

setDefaultTimeout(30 * 1000);

/**
 * CucumberWorld — спільний контекст для всіх кроків.
 *
 * Кожен сценарій отримує свій власний екземпляр World,
 * що містить driver, базовий URL та допоміжні методи.
 */
class CucumberWorld {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.driver  = null;
    this.screenshotsDir = path.join(__dirname, '..', '..', 'screenshots');

    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  // ── Driver ────────────────────────────────────────────────────────────────

  async initDriver() {
    const options = new chrome.Options();
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1280,900');

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await this.driver.manage().setTimeouts({
      implicit: 0,
      pageLoad: 10000,
    });
  }

  async quitDriver() {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(urlPath) {
    await this.driver.get(`${this.baseUrl}${urlPath}`);
    await this.takeScreenshot(`navigate${urlPath.replace(/\//g, '_')}`);
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }

  async getTitle() {
    return await this.driver.getTitle();
  }

  // ── Element interaction ───────────────────────────────────────────────────

  async findElement(locator, timeout) {
    const t = timeout || 5000;
    await this.driver.wait(until.elementLocated(locator), t);
    return await this.driver.findElement(locator);
  }

  async findElements(locator) {
    return await this.driver.findElements(locator);
  }

  async click(locator, stepName) {
    const el = await this.findElement(locator);
    await this.driver.wait(until.elementIsVisible(el), 5000);
    await el.click();
    if (stepName) {
      await this.takeScreenshot(`click_${stepName}`);
    }
  }

  async type(locator, text, stepName) {
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

  async isPresent(locator) {
    try {
      const els = await this.driver.findElements(locator);
      return els.length > 0;
    } catch (e) {
      return false;
    }
  }

  async waitForUrl(urlPart, timeout) {
    const t = timeout || 5000;
    await this.driver.wait(async () => {
      const url = await this.driver.getCurrentUrl();
      return url.includes(urlPart);
    }, t, `URL did not contain "${urlPart}"`);
  }

  async scrollTo(locator) {
    const el = await this.findElement(locator);
    await this.driver.executeScript('arguments[0].scrollIntoView(true)', el);
  }

  async clearCookies() {
    await this.driver.manage().deleteAllCookies();
  }

  // ── Screenshots ───────────────────────────────────────────────────────────

  /**
   * Знімає скріншот та зберігає у screenshots/.
   * Використовується як у кроках, так і у хуках (після падіння сценарію).
   */
  async takeScreenshot(name) {
    try {
      const safeName = (name || 'screenshot').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filename  = `${safeName}_${Date.now()}.png`;
      const filepath  = path.join(this.screenshotsDir, filename);
      const image     = await this.driver.takeScreenshot();
      fs.writeFileSync(filepath, image, 'base64');
      return filepath;
    } catch (e) {
      return null;
    }
  }

  // ── Auth helpers ──────────────────────────────────────────────────────────

  async loginAs(email, password) {
    await this.navigate('/auth/login');
    await this.type(By.id('email'), email);
    await this.type(By.id('password'), password);
    await this.click(By.css("button[type='submit']"));
    await this.waitForUrl('/posts');
    await this.takeScreenshot('logged_in');
  }

  // ── Post helpers ──────────────────────────────────────────────────────────

  async createPost(title, content) {
    await this.navigate('/posts/new');
    await this.type(By.id('title'), title);
    await this.type(By.id('content'), content);
    await this.click(By.css("button[type='submit']"));
    await this.waitForUrl('/posts/');
    await this.takeScreenshot(`post_created_${title.replace(/\s/g, '_')}`);
  }
}

setWorldConstructor(CucumberWorld);
module.exports = { CucumberWorld };
