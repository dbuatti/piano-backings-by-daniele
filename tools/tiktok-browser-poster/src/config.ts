import 'dotenv/config';

// Supabase is only needed to post (index.ts → queue.ts). Reading it lazily keeps
// `npm run login` working on a machine that has no .env at all.
function num(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

export const config = {
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  pollSeconds: num('POLL_SECONDS', 300),
  userDataDir: process.env.USER_DATA_DIR ?? './.auth/profile',
  headless: process.env.HEADLESS !== '0',
  dryRun: process.env.DRY_RUN === '1',
  maxPerRun: num('MAX_PER_RUN', 2),
  timezone: process.env.TZ ?? 'Europe/Rome',
  screenshotsDir: process.env.SCREENSHOTS_DIR ?? './.screenshots',
};

export function requireSupabase(): void {
  if (!config.supabaseUrl || !config.serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set — copy .env.example to .env and fill them in.'
    );
  }
}

export const once = process.argv.includes('--once');
