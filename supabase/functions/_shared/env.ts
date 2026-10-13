// @ts-nocheck
// Fail fast and loudly when a function's required environment/secrets are
// missing. Without this, a function created a Supabase client from empty
// strings and surfaced a cryptic downstream error (or silently no-op'd) instead
// of telling us exactly which secret to set.
export function requireEnv(names: string[], context: string): Record<string, string> {
  const missing = names.filter((name) => !Deno.env.get(name));
  if (missing.length) {
    const message = `[${context}] Missing required environment variable(s): ${missing.join(', ')}`;
    console.error(message);
    throw new Error(message);
  }
  const values: Record<string, string> = {};
  for (const name of names) values[name] = Deno.env.get(name) as string;
  return values;
}

export function requireSupabaseEnv(context: string): { url: string; serviceKey: string } {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireEnv(
    ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    context
  );
  return { url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_ROLE_KEY };
}

export function requireGoogleCreds(context: string): { clientId: string; clientSecret: string } {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = requireEnv(
    ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET'],
    context
  );
  return { clientId: GMAIL_CLIENT_ID, clientSecret: GMAIL_CLIENT_SECRET };
}
