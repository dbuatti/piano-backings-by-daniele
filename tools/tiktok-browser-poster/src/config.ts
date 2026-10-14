import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  supabaseUrl: required('SUPABASE_URL'),
  serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  pollSeconds: Number(process.env.POLL_SECONDS ?? 300),
  userDataDir: process.env.USER_DATA_DIR ?? './.auth/profile',
  headless: process.env.HEADLESS !== '0',
  dryRun: process.env.DRY_RUN === '1',
  maxPerRun: Number(process.env.MAX_PER_RUN ?? 2),
  timezone: process.env.TZ ?? 'Europe/Rome',
  screenshotsDir: process.env.SCREENSHOTS_DIR ?? './.screenshots',
};

export const once = process.argv.includes('--once');
