import { openContext } from './browser.js';
import { config } from './config.js';
import { log } from './logger.js';

// Write the current profile's cookies (decrypted) to the portable state file.
// Use this to move an existing session to another machine without hitting
// macOS's per-machine cookie encryption.
async function main(): Promise<void> {
  const ctx = await openContext();
  await ctx.storageState({ path: config.storageState });
  await ctx.close();
  log.info('wrote', config.storageState);
}

main().catch((err) => {
  log.error('export failed:', err);
  process.exit(1);
});
