import { chromium } from 'playwright';

const APP_URL = process.env.APP_URL || 'http://127.0.0.1:3000/';

const clickButtonContaining = async (page, text) => {
  await page.evaluate((targetText) => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.includes(targetText));
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`Button not found: ${targetText}`);
    }
    button.click();
  }, text);
};

const setRangeValue = async (page, label, value) => {
  await page.evaluate(({ targetLabel, targetValue }) => {
    const rows = Array.from(document.querySelectorAll('div'));
    const targetRow = rows.find((row) => row.textContent?.includes(targetLabel));
    const slider = targetRow?.querySelector('input[type="range"]');
    if (!(slider instanceof HTMLInputElement)) {
      throw new Error(`Slider not found for label: ${targetLabel}`);
    }

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(slider, String(targetValue));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  }, { targetLabel: label, targetValue: value });
};

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('button')).some((node) => node.textContent?.includes('FX')),
      { timeout: 30000 }
    );

    await clickButtonContaining(page, 'FX');
    await clickButtonContaining(page, 'Standalone Synth');
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('button')).some((node) => node.textContent?.includes('Open Standalone Synth')),
      { timeout: 30000 }
    );

    const popupPromise = page.waitForEvent('popup', { timeout: 30000 });
    await clickButtonContaining(page, 'Open Standalone Synth');
    const popup = await popupPromise;

    await popup.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await popup.waitForFunction(
      () => document.body.textContent?.includes('Standalone Synth'),
      { timeout: 30000 }
    );

    await popup.waitForTimeout(1000);
    const initialLevels = await page.evaluate(() => (
      (window).__KALO_AUDIO_DEBUG__?.getLevels?.() ?? { bass: 0, treble: 0 }
    ));

    if (initialLevels.bass < 0.01 && initialLevels.treble < 0.01) {
      await clickButtonContaining(popup, 'Start Audio');
    }

    await page.waitForFunction(() => {
      const debug = (window).__KALO_AUDIO_DEBUG__;
      if (!debug?.getLevels) return false;
      const levels = debug.getLevels();
      return levels.bass > 0.01 || levels.treble > 0.01;
    }, { timeout: 30000 });

    await setRangeValue(page, 'Synth Base Hz', 300);
    await popup.waitForFunction(
      () => document.body.textContent?.includes('300 Hz'),
      { timeout: 30000 }
    );

    await clickButtonContaining(page, 'Standalone Synth Active');
    await popup.waitForFunction(
      () => document.body.textContent?.includes('Idle'),
      { timeout: 30000 }
    );

    const finalLevels = await page.evaluate(() => (
      (window).__KALO_AUDIO_DEBUG__?.getLevels?.() ?? { bass: 0, treble: 0 }
    ));

    const passed = (initialLevels.bass >= 0 || initialLevels.treble >= 0)
      && finalLevels.bass < 0.01
      && finalLevels.treble < 0.01;

    console.log(JSON.stringify({
      appUrl: APP_URL,
      mode: 'standalone-synth',
      initialLevels,
      finalLevels,
      mirroredBaseHz: 300,
      passed,
    }, null, 2));

    if (!passed) process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
