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

  // NOTE: passed as a string on purpose. tsx/esbuild injects a `__name` helper
  // into transpiled closures, which doesn't exist inside the page and makes
  // Playwright's function serialization throw `__name is not defined`.
  await ctx.addInitScript(`
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // Some sites check for the missing chrome runtime object.
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  `);

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
    // A stale session bounces to a login/signup/verify page.
    await page.waitForTimeout(2_000);
    if (/\/(login|signup|verify)|captcha/i.test(page.url())) return false;
    // The uploader is a React app that mounts a little after DOMContentLoaded,
    // and its file input is visually hidden — wait until it is attached rather
    // than counting it immediately (which raced and gave false negatives).
    await page
      .locator('input[type="file"]')
      .first()
      .waitFor({ state: 'attached', timeout: 25_000 });
    return true;
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

/** TikTok shows a react-joyride onboarding tour on the upload page whose overlay
 *  swallows pointer events, so clicks on the composer silently time out. Dismiss
 *  it if present (click through the steps, else drop the portal node). */
export async function dismissTour(page: Page): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const portal = page.locator('#react-joyride-portal');
    if ((await portal.count().catch(() => 0)) === 0) return;
    const btn = portal
      .locator('button')
      .filter({ hasText: /skip|next|done|got it|ok|close|finish|start/i })
      .first();
    if ((await btn.count().catch(() => 0)) === 0) break;
    await btn.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  // Last resort: drop the portal node so it can't keep intercepting clicks.
  // (String form — see the note in openContext about esbuild's `__name`.)
  await page.evaluate("document.getElementById('react-joyride-portal')?.remove();").catch(() => {});
}

export async function screenshotOnFailure(page: Page, tag: string): Promise<void> {
  const fs = await import('node:fs/promises');
  await fs.mkdir(config.screenshotsDir, { recursive: true });
  const file = `${config.screenshotsDir}/${tag}-${Date.now()}.png`;
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  log.warn('screenshot saved:', file);
}
