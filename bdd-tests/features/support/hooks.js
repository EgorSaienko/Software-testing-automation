'use strict';

const { Before, After, AfterStep, Status } = require('@cucumber/cucumber');

/**
 * Before — запускається перед кожним сценарієм.
 * Ініціалізує WebDriver.
 */
Before(async function () {
  await this.initDriver();
});

/**
 * After — запускається після кожного сценарію.
 * При падінні робить скріншот для діагностики.
 * Закриває браузер.
 */
After(async function (scenario) {
  if (scenario.result.status === Status.FAILED) {
    const scenarioName = scenario.pickle.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
    await this.takeScreenshot(`FAILED_${scenarioName}`);
  }
  await this.quitDriver();
});

/**
 * AfterStep — знімає скріншот після кожного кроку.
 * Це відповідає вимозі лабораторної щодо скріншотів.
 */
AfterStep(async function (step) {
  if (this.driver) {
    const stepText = (step.pickleStep.text || 'step').replace(/[^a-zA-Z0-9_\-а-яёіїє]/gi, '_').substring(0, 50);
    await this.takeScreenshot(`step_${stepText}`);
  }
});
