import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const browser = await chromium.launch({ headless: true });
const url = pathToFileURL(resolve('docs/index.html')).href;
try {
  for (const width of [320, 375, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(url);
    const total = await page.locator('.metric-card').count();
    if (total !== 54) throw new Error(`Expected 54 catalog entries, got ${total}`);
    if (await page.locator('#vernier-outputs tbody tr').count() !== 4) {
      throw new Error('Expected four Vernier output definitions');
    }
    await page.locator('#search').fill('flowborne');
    const filtered = await page.locator('.metric-card').count();
    if (filtered !== 2) throw new Error(`Expected two Flowborne metrics, got ${filtered}`);
    await page.locator('#search').fill('');
    await page.locator('#category').selectOption('HRV & relaxation');
    if (await page.locator('.metric-card').count() !== 5) throw new Error('HRV filter failed');
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) {
      throw new Error(`Horizontal overflow at ${width}px`);
    }
    await page.close();
  }
  console.log('Metric catalog, filters, and mobile/desktop widths verified.');
} finally {
  await browser.close();
}
