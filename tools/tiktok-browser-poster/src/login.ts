import { openContext, hasSessionCookie, UPLOAD_URL } from './browser.js';
import { config } from './config.js';
import { log } from './logger.js';

// One-time (occasional) interactive login. Run this on the SAME machine/IP the
// poster runs on, so TikTok doesn't see the session jump hosts later.
//
//   Desktop:  HEADLESS=0 npm run login
//   Server:   connect over Screen Sharing / VNC and double-click login.command
//
// Log in by hand (including any 2FA / CAPTCHA). You don't need to press anything:
// this finishes on its own the moment the login is detected.
const TIMEOUT_MIN = Number(process.env.LOGIN_TIMEOUT_MINUTES ?? 20);

async function main(): Promise<void> {
  const ctx = await openContext();
  const page = await ctx.newPage();
  await page.goto(UPLOAD_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

  log.info('A browser window is open. Log into TikTok by hand (2FA / CAPTCHA included).');
  log.info(`Waiting up to ${TIMEOUT_MIN} minutes. It finishes on its own once you are logged in.`);

  const deadline = Date.now() + TIMEOUT_MIN * 60_000;
  let ok = false;
  while (Date.now() < deadline) {
    if (await hasSessionCookie(ctx).catch(() => false)) {
      ok = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }

  if (ok) {
    // Portable copy of the session, so it can be moved to another machine.
    await ctx.storageState({ path: config.storageState }).catch(() => {});
  }
  await page.close().catch(() => {});
  await ctx.close(); // persists the profile to disk (config.userDataDir)

  if (ok) {
    log.info(`Session saved to ${config.userDataDir} (portable copy: ${config.storageState}).`);
  } else {
    log.error('Timed out before a login was detected. Try again.');
    process.exit(1);
  }
}

main().catch((err) => {
  log.error('login failed:', err);
  process.exit(1);
});
