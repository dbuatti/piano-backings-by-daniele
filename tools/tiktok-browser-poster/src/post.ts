import { openContext, UPLOAD_URL, screenshotOnFailure } from './browser.js';
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
    await captionBox.click();
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
    const postButton = page
      .getByRole('button', { name: /^post$/i })
      .or(page.locator('button:has-text("Post")'))
      .last();
    await postButton.waitFor({ state: 'visible', timeout: 60_000 });
    await postButton.click();
    log.info('clicked Post, waiting for confirmation…');

    // 5) Confirm — success shows a manage/posts link or leaves /upload.
    await page.waitForURL((u) => !/\/upload/.test(u.pathname), { timeout: 120_000 }).catch(() => {});
    await page.waitForTimeout(5_000);
    const url = page.url();
    const ok = !/\/upload/.test(new URL(url).pathname);
    if (!ok) {
      await screenshotOnFailure(page, 'post-unconfirmed');
      return { ok: false, note: `still on upload page (${url})` };
    }
    log.info('post confirmed at', url);
    return { ok: true };
  } catch (err) {
    await screenshotOnFailure(page, 'post-error').catch(() => {});
    return { ok: false, note: (err as Error).message };
  } finally {
    await ctx.close();
  }
}
