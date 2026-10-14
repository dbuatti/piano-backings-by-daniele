import { rm } from 'node:fs/promises';
import { openContext, checkLoggedIn } from './browser.js';
import { config, once } from './config.js';
import { log } from './logger.js';
import { postTeaser } from './post.js';
import { claimNextDue, downloadTeaser, markPublished, reclaimStale, recordFailure, requeue } from './queue.js';

async function runOnce(): Promise<number> {
  await reclaimStale();
  const ctx = await openContext();
  let loggedIn = false;
  try {
    loggedIn = await checkLoggedIn(ctx);
  } finally {
    await ctx.close();
  }
  if (!loggedIn) {
    log.error('No valid TikTok session. Run `pnpm login` to (re)authenticate.');
    return 0;
  }

  let posted = 0;
  for (let i = 0; i < config.maxPerRun; i++) {
    const teaser = await claimNextDue();
    if (!teaser) break;

    log.info(`posting ${teaser.id} (scheduled ${teaser.scheduledFor})`);
    let file: string | null = null;
    try {
      file = await downloadTeaser(teaser.storagePath);
      const result = await postTeaser(file, teaser.caption);
      if (result.ok) {
        await markPublished(teaser.id, null);
        posted++;
        log.info(`posted ${teaser.id}`);
      } else if (result.note === 'dry-run') {
        await requeue(teaser.id, 'Dry run — not posted.');
      } else {
        await recordFailure(teaser.id, teaser.attempts, result.note ?? 'Unknown failure');
      }
    } catch (err) {
      const msg = (err as Error).message;
      log.error(`failed ${teaser.id}:`, msg);
      await recordFailure(teaser.id, teaser.attempts, msg);
    } finally {
      if (file) await rm(file, { force: true }).catch(() => {});
    }
  }
  return posted;
}

async function main(): Promise<void> {
  log.info(
    `tiktok-browser-poster starting | headless=${config.headless} dryRun=${config.dryRun} once=${once}`
  );
  if (once) {
    const n = await runOnce();
    log.info(`done (${n} posted)`);
    return;
  }
  // long-lived loop
  for (;;) {
    try {
      await runOnce();
    } catch (err) {
      log.error('run failed:', (err as Error).message);
    }
    await new Promise((r) => setTimeout(r, config.pollSeconds * 1000));
  }
}

main().catch((err) => {
  log.error('fatal:', err);
  process.exit(1);
});
