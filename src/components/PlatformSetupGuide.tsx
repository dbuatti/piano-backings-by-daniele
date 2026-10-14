import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, Copy, ExternalLink, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// The single page every provider returns to. It must be registered verbatim in
// the provider's own app settings, so the guide shows it with a copy button.
const REDIRECT_PATH = '/social-oauth-callback';

const FALLBACK_ORIGIN = 'https://pianobackings.danielebuatti.com';

interface PlatformFacts {
  connected: boolean;
  account?: string | null;
  externalId?: string | null;
  expiresAt?: string | null;
  scope?: string | null;
  /** Which Edge Function secrets are set. Values are never returned. */
  configured?: Record<string, boolean>;
}

interface SocialStatusPayload {
  tiktok?: PlatformFacts;
  instagram?: PlatformFacts;
}

// --- small presentational pieces -------------------------------------------

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard can be blocked; the value is still visible to select.
        }
      }}
      title={`Copy ${value}`}
      className="shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#1C0357]"
    >
      {copied ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/** A line of monospace value with a copy button. */
function Field({ value, label }: { value: string; label?: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-gray-50 px-1.5 py-0.5 align-middle">
      <code className="truncate text-[11px] text-[#1C0357]">{value}</code>
      <CopyButton value={value} />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

function CheckLine({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300" />
      )}
      <span className={cn('text-[11px]', ok ? 'text-gray-600' : 'text-gray-400')}>{children}</span>
    </li>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1C0357] text-[10px] font-bold text-white">
        {n}
      </span>
      <span className="min-w-0 flex-1 space-y-1 text-xs leading-relaxed text-gray-600">{children}</span>
    </li>
  );
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 font-medium text-[#F538BC] hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function PlatformBlock({
  title,
  tone,
  defaultOpen,
  children,
}: {
  title: string;
  tone: 'instagram' | 'tiktok';
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50"
      >
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            tone === 'instagram'
              ? 'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF]'
              : 'bg-black'
          )}
        />
        <span className="flex-1 text-sm font-bold text-[#1C0357]">{title}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? <div className="space-y-4 border-t border-gray-100 px-3 py-3">{children}</div> : null}
    </div>
  );
}

// --- the guide --------------------------------------------------------------

/**
 * Step-by-step setup for the teaser-posting accounts, written to be usable cold.
 * Instagram is shown expanded because it is the one that needs credentials; TikTok
 * is collapsed and focuses on what "automatic" does and does not mean there.
 */
const PlatformSetupGuide = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : FALLBACK_ORIGIN;
  const redirectUri = `${origin}${REDIRECT_PATH}`;

  // Shares the ['social-status'] cache with SocialConnectionStatus, so the two
  // never disagree about what is connected.
  const { data } = useQuery<SocialStatusPayload>({
    queryKey: ['social-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('social-status', { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as SocialStatusPayload;
    },
    retry: false,
  });

  const ig = data?.instagram;
  const tt = data?.tiktok;
  const igSecret = ig?.configured?.clientSecret ?? false;
  const igClientId = ig?.configured?.clientId ?? false;
  const ttKey = tt?.configured?.clientKey ?? false;
  const ttSecret = tt?.configured?.clientSecret ?? false;
  // Baked into the browser bundle at build time — the server cannot see it.
  const igFrontend = !!import.meta.env.VITE_INSTAGRAM_CLIENT_ID;
  const ttFrontend = !!import.meta.env.VITE_TIKTOK_CLIENT_KEY;

  return (
    <Card className="bg-white border-none shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-[#1C0357]">Set up social posting</CardTitle>
        <p className="mt-1 text-sm text-gray-500">
          Everything a connection needs, in order. The checklists tick themselves off from what
          the server and browser can actually see, so a missing secret is visible before it
          fails.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Redirect URI is shared by both providers and is the #1 cause of a
            failed connect, so it is shown once, large, with a copy button. */}
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
          <p className="text-xs font-semibold text-[#1C0357]">Redirect URI (both providers)</p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Register this exact string in the TikTok app and the Meta app. A single character off
            is the usual reason a connect bounces back with an error.
          </p>
          <div className="mt-2">
            <Field value={redirectUri} />
          </div>
        </div>

        {/* ---------------- Instagram ---------------- */}
        <PlatformBlock title="Instagram" tone="instagram" defaultOpen>
          <p className="text-xs text-gray-600">
            Instagram is the one that needs credentials. No Facebook Page and no App Review are
            required to post to your own account — only a Meta app and a{' '}
            <strong className="text-gray-700">professional</strong> Instagram account.
          </p>

          <ol className="space-y-2.5">
            <Step n={1}>
              <p>
                In the Instagram app, switch the account to{' '}
                <strong className="text-gray-700">Business or Creator</strong> (Settings and
                privacy → Account type and tools → Switch to professional account). A personal
                account can connect but Instagram refuses to publish from it.
              </p>
            </Step>
            <Step n={2}>
              <p>
                Create a Meta app at{' '}
                <ExtLink href="https://developers.facebook.com/apps/">developers.facebook.com</ExtLink>{' '}
                and add the <strong className="text-gray-700">Instagram</strong> product using{' '}
                <strong className="text-gray-700">API setup with Instagram login</strong>. In that
                product's settings, add the Redirect URI above.
              </p>
            </Step>
            <Step n={3}>
              <p>
                Request these two permissions:{' '}
                <Field value="instagram_business_basic" />{' '}
                <Field value="instagram_business_content_publish" />
              </p>
            </Step>
            <Step n={4}>
              <p>
                Copy the app's <strong className="text-gray-700">Instagram app ID</strong> and{' '}
                <strong className="text-gray-700">app secret</strong> into two places:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-gray-600">
                <li>
                  Supabase → Edge Functions → Secrets:{' '}
                  <Field value="INSTAGRAM_CLIENT_ID" /> <Field value="INSTAGRAM_CLIENT_SECRET" />
                </li>
                <li>
                  Frontend environment (build-time):{' '}
                  <Field value="VITE_INSTAGRAM_CLIENT_ID" /> (same value as the app ID)
                </li>
              </ul>
            </Step>
            <Step n={5}>
              <p>
                Redeploy the frontend — a <code className="text-[11px]">VITE_</code> value is
                baked in at build time, so editing the env alone changes nothing until the next
                build. The Edge secrets are picked up on the next call.
              </p>
            </Step>
            <Step n={6}>
              <p>
                Press <strong className="text-gray-700">Connect Instagram</strong> above, approve,
                then press <strong className="text-gray-700">Test</strong> on the status row.
              </p>
            </Step>
          </ol>

          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Live checklist
            </p>
            <ul className="mt-1.5 space-y-1">
              <CheckLine ok={igClientId}>Supabase secret INSTAGRAM_CLIENT_ID is set</CheckLine>
              <CheckLine ok={igSecret}>Supabase secret INSTAGRAM_CLIENT_SECRET is set</CheckLine>
              <CheckLine ok={igFrontend}>
                Frontend knows the app id (VITE_INSTAGRAM_CLIENT_ID)
              </CheckLine>
              <CheckLine ok={!!ig?.connected}>
                Account connected{ig?.account ? ` as @${ig.account}` : ''}
              </CheckLine>
            </ul>
          </div>
        </PlatformBlock>

        {/* ---------------- TikTok ---------------- */}
        <PlatformBlock title="TikTok" tone="tiktok">
          <p className="text-xs text-gray-600">
            TikTok can connect and upload automatically today. What it <em>cannot</em> do yet is
            go public on its own — that is the audit below, not a missing setting.
          </p>

          <ol className="space-y-2.5">
            <Step n={1}>
              <p>
                Create an app at{' '}
                <ExtLink href="https://developers.tiktok.com/apps/">developers.tiktok.com</ExtLink>{' '}
                and add the <strong className="text-gray-700">Login Kit</strong> and{' '}
                <strong className="text-gray-700">Content Posting API</strong> products. Add the
                Redirect URI above to its settings.
              </p>
            </Step>
            <Step n={2}>
              <p>
                Request the scopes <Field value="user.info.basic" /> and{' '}
                <Field value="video.publish" />.
              </p>
            </Step>
            <Step n={3}>
              <p>
                Copy the app's <strong className="text-gray-700">Client key</strong> and{' '}
                <strong className="text-gray-700">Client secret</strong> into two places:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-gray-600">
                <li>
                  Supabase → Edge Functions → Secrets: <Field value="TIKTOK_CLIENT_KEY" />{' '}
                  <Field value="TIKTOK_CLIENT_SECRET" />
                </li>
                <li>
                  Frontend environment (build-time): <Field value="VITE_TIKTOK_CLIENT_KEY" />
                </li>
              </ul>
            </Step>
            <Step n={4}>
              <p>
                Redeploy the frontend, connect, and keep the account{' '}
                <strong className="text-gray-700">private</strong> while the app is unaudited.
              </p>
            </Step>
          </ol>

          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Where "fully automatic" stands
            </p>
            <div className="mt-1.5 overflow-x-auto">
              <table className="w-full text-left text-[11px] text-gray-600">
                <thead>
                  <tr className="text-gray-400">
                    <th className="pr-3 font-semibold">Route</th>
                    <th className="pr-3 font-semibold">Public?</th>
                    <th className="pr-3 font-semibold">Taps</th>
                    <th className="font-semibold">Compliant?</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  <tr>
                    <td className="pr-3 font-medium text-[#1C0357]">A · Direct post (today)</td>
                    <td className="pr-3">No — “Only me”</td>
                    <td className="pr-3">0</td>
                    <td>Yes, while private</td>
                  </tr>
                  <tr>
                    <td className="pr-3 font-medium text-[#1C0357]">B · Direct post, audited</td>
                    <td className="pr-3">Yes</td>
                    <td className="pr-3">0</td>
                    <td>Unlikely — audit expects a user-initiated, wide-audience app</td>
                  </tr>
                  <tr>
                    <td className="pr-3 font-medium text-[#1C0357]">
                      C · Send to drafts, you tap publish
                    </td>
                    <td className="pr-3">Yes</td>
                    <td className="pr-3">1</td>
                    <td>Yes — the route TikTok intends for unaudited apps</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              Today the tool runs <strong className="text-gray-600">Route A</strong>: the upload is
              automatic, but every post lands as “Only me” until the app passes TikTok's audit.
              Route B is a long shot. To get <em>public</em> TikTok, the build is{' '}
              <strong className="text-gray-600">Route C</strong> — at the slot the API drops the
              finished clip into your TikTok drafts and you tap publish. That is one tap, and it is
              the most automation TikTok allows for a tool like this.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Live checklist
            </p>
            <ul className="mt-1.5 space-y-1">
              <CheckLine ok={ttKey}>Supabase secret TIKTOK_CLIENT_KEY is set</CheckLine>
              <CheckLine ok={ttSecret}>Supabase secret TIKTOK_CLIENT_SECRET is set</CheckLine>
              <CheckLine ok={ttFrontend}>
                Frontend knows the client key (VITE_TIKTOK_CLIENT_KEY)
              </CheckLine>
              <CheckLine ok={!!tt?.connected}>
                Account connected{tt?.account ? ` as @${tt.account}` : ''}
              </CheckLine>
            </ul>
          </div>
        </PlatformBlock>
      </CardContent>
    </Card>
  );
};

export default PlatformSetupGuide;
