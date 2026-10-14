import { openContext, UPLOAD_URL, screenshotOnFailure, dismissTour } from './browser.js';
import { config } from './config.js';
import { log } from './logger.js';

export interface PostResult {
  ok: boolean;
  note?: string;
}

// TikTok's composer is a Draft.js editor. These are best-effort selectors with
// fallbacks; they are the part most likely to need a tune-up when TikTok ships a
// UI change. `DRY_RUN=1` stops before the final click so you can inspect.
export async function postTeaser(videoPath: string, caption: string): Promise<PostResult> {
  const ctx = await openContext();
  const page = await ctx.newPage();
  try {
    log.info('opening upload page…');
    await page.goto(UPLOAD_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(4_000);

    if (/login|signup/i.test(page.url())) {
      throw new Error('Not logged in — run `pnpm login` to refresh the session.');
    }

    // First-visit product tour (react-joyride) covers the composer with an
    // overlay that eats clicks — clear it before touching anything.
    await dismissTour(page);

    // 1) Attach the video.
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 60_000 });
    await fileInput.setInputFiles(videoPath);
    log.info('file attached, waiting for processing…');

    // 2) Wait for the editor/upload to settle.
    const captionBox = page
      .locator('.public-DraftEditor-content, div[contenteditable="true"]')
      .first();
    await captionBox.waitFor({ state: 'visible', timeout: 120_000 });
    await page.waitForTimeout(5_000); // let the video finish ingesting

    // 3) Caption — type it like a human.
    await dismissTour(page);
    try {
      await captionBox.click({ timeout: 10_000 });
    } catch {
      // The tour may have (re)appeared between the wait and the click.
      await dismissTour(page);
      await captionBox.click({ timeout: 15_000 });
    }
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(caption, { delay: 12 });
    log.info('caption set:', JSON.stringify(caption));
    await page.waitForTimeout(2_000);

    if (config.dryRun) {
      await screenshotOnFailure(page, 'dry-run');
      log.warn('DRY_RUN: stopped before posting. Screenshot saved.');
      return { ok: false, note: 'dry-run' };
    }

    // 4) Post.
    await dismissTour(page);
    const postButton = page
      .getByRole('button', { name: /^post$/i })
      .or(page.locator('button:has-text("Post")'))
      .last();
    await postButton.waitFor({ state: 'visible', timeout: 60_000 });
    try {
      await postButton.click({ timeout: 15_000 });
    } catch {
      await dismissTour(page);
      await postButton.click({ timeout: 20_000 });
    }
    log.info('clicked Post, waiting for confirmation…');

    // TikTok runs a pre-post safety check and, while it is still running,
    // interposes a "Continue to post?" dialog behind a "Post now" button.
    // Without clicking it the post silently never goes out.
    await page.waitForTimeout(2_000);
    const postNow = page.getByRole('button', { name: /^post now$/i }).first();
    if (await postNow.isVisible().catch(() => false)) {
      log.info('safety-check dialog shown — clicking "Post now"');
      await postNow.click({ timeout: 15_000 }).catch(() => {});
    }

    // 5) Confirm — success normally leaves /upload, but the composer can also
    // just close in place, so accept that too.
    await page.waitForURL((u) => !/\/upload/.test(u.pathname), { timeout: 120_000 }).catch(() => {});
    await page.waitForTimeout(5_000);
    const url = page.url();
    if (!/\/upload/.test(new URL(url).pathname)) {
      log.info('post confirmed at', url);
      return { ok: true };
    }
    const editors = await page.locator('.public-DraftEditor-content').count().catch(() => 1);
    if (editors === 0) {
      log.info('post confirmed (composer closed in place)');
      return { ok: true };
    }
    await screenshotOnFailure(page, 'post-unconfirmed');
    return { ok: false, note: `still on upload page (${url})` };
  } catch (err) {
    await screenshotOnFailure(page, 'post-error').catch(() => {});
    return { ok: false, note: (err as Error).message };
  } finally {
    await ctx.close();
  }
}
