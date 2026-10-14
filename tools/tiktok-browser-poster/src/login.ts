import { openContext, UPLOAD_URL, checkLoggedIn } from './browser.js';
import { config } from './config.js';
import { log } from './logger.js';

// One-time (occasional) interactive login. Run this on the SAME machine/IP the
// poster runs on, so TikTok doesn't see the session jump hosts later.
//
//   Desktop:  HEADLESS=0 pnpm login
//   Server:   run with a virtual display, e.g.  xvfb-run -a pnpm login
//             (or use a VNC/remote-desktop into the container and HEADLESS=0)
//
// Log in by hand (including any 2FA / CAPTCHA), then come back and press Enter.

async function main(): Promise<void> {
  const ctx = await openContext();
  const page = await ctx.newPage();
  await page.goto(UPLOAD_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

  log.info('A browser window is open. Log into TikTok by hand (2FA included).');
  log.info('When the upload page is showing, come back here and press Enter.');

  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once('data', () => resolve());
  });

  const ok = await checkLoggedIn(ctx);
  await page.close();
  await ctx.close(); // persists the profile to disk (config.userDataDir)

  if (ok) {
    log.info(`Session saved to ${config.userDataDir}. You can now run the poster.`);
  } else {
    log.error('Login not detected — the upload page did not load logged in. Try again.');
    process.exit(1);
  }
}

main().catch((err) => {
  log.error('login failed:', err);
  process.exit(1);
});
