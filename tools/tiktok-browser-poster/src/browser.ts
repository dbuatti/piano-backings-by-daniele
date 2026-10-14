import { chromium, type BrowserContext, type Page } from 'playwright';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from './config.js';
import { log } from './logger.js';

// A realistic desktop UA. TikTok fingerprints headless Chrome, so we also strip
// the `navigator.webdriver` flag and hide the most obvious automation tells.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export async function openContext(): Promise<BrowserContext> {
  // On macOS the cookie DB is encrypted with a per-machine Keychain key, so a
  // profile copied between machines loses its session. When the profile is still
  // empty, seed it from the portable storageState (plaintext cookies) instead.
  const profileCookies = join(config.userDataDir, 'Default', 'Cookies');
  const seed =
    !existsSync(profileCookies) && existsSync(config.storageState)
      ? config.storageState
      : undefined;

  const ctx = await chromium.launchPersistentContext(config.userDataDir, {
    headless: config.headless,
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    timezoneId: config.timezone,
    userAgent: UA,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // Some sites check for the missing chrome runtime object.
    // @ts-expect-error - injected in page context
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });

  if (seed) {
    try {
      const state = JSON.parse(await readFile(seed, 'utf8')) as {
        cookies?: Parameters<BrowserContext['addCookies']>[0];
      };
      if (Array.isArray(state.cookies) && state.cookies.length > 0) {
        await ctx.addCookies(state.cookies);
        log.info(`seeded ${state.cookies.length} cookies from ${seed}`);
      }
    } catch (err) {
      log.warn('could not seed session:', (err as Error).message);
    }
  }

  return ctx;
}

export const UPLOAD_URL = 'https://www.tiktok.com/upload?lang=en';

/** True when the stored profile still has a valid TikTok session. */
export async function checkLoggedIn(ctx: BrowserContext): Promise<boolean> {
  const page = await ctx.newPage();
  try {
    await page.goto(UPLOAD_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(4_000);
    const url = page.url();
    const blocked = /login|signup|verify|captcha/i.test(url);
    // The file input is visually hidden, so check for presence, not visibility.
    const uploaderCount = await page
      .locator('input[type="file"]')
      .count()
      .catch(() => 0);
    return !blocked && uploaderCount > 0;
  } catch (err) {
    log.warn('login check failed:', (err as Error).message);
    return false;
  } finally {
    await page.close();
  }
}

/** True once TikTok has issued us a real logged-in session cookie. */
export async function hasSessionCookie(ctx: BrowserContext): Promise<boolean> {
  const cookies = await ctx.cookies('https://www.tiktok.com');
  return cookies.some((c) => c.name === 'sessionid' || c.name === 'sid_tt');
}

export async function screenshotOnFailure(page: Page, tag: string): Promise<void> {
  const fs = await import('node:fs/promises');
  await fs.mkdir(config.screenshotsDir, { recursive: true });
  const file = `${config.screenshotsDir}/${tag}-${Date.now()}.png`;
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  log.warn('screenshot saved:', file);
}
