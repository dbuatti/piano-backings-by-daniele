import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { log } from './logger.js';

export const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
  auth: { persistSession: false },
});

// Same budget the edge worker uses before it gives up on a teaser.
const MAX_ATTEMPTS = 3;
// A row left in `publishing` longer than this means the process died mid-post.
const STALE_MINUTES = 20;

export interface DueTeaser {
  id: string;
  caption: string;
  storagePath: string;
  mimeType: string;
  scheduledFor: string;
  attempts: number;
}

// Mirrors run-social-queue's caption rule: a drafted caption already carries its
// hashtags; otherwise rebuild it from the title + hashtags so the post isn't bare.
function captionFor(row: Record<string, unknown>): string {
  const meta = (row.metadata || {}) as Record<string, unknown>;
  const asset = (row.content_assets || {}) as Record<string, unknown>;
  const drafted = String(meta.caption || '').trim();
  if (drafted) return drafted;
  const base = String(meta.title || asset.title || asset.song_title || '').trim();
  if (!base) return '';
  const tags = Array.isArray(meta.hashtags)
    ? (meta.hashtags as unknown[])
        .map((t) => `#${String(t).replace(/^#/, '')}`)
        .filter((t) => t.length > 1)
    : [];
  return [base, tags.join(' ')].filter(Boolean).join('\n\n');
}

/** Recover rows this service claimed but never finished (crash / restart). */
export async function reclaimStale(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
  const { data, error } = await supabase
    .from('publications')
    .update({ status: 'scheduled', error: 'Browser poster restarted mid-post.', updated_at: new Date().toISOString() })
    .eq('platform', 'tiktok')
    .eq('status', 'publishing')
    .is('platform_post_id', null)
    .lt('updated_at', cutoff)
    .select('id');
  if (error) {
    log.warn('stale reclaim failed:', error.message);
    return 0;
  }
  const n = data?.length ?? 0;
  if (n) log.warn(`reclaimed ${n} stale tiktok row(s)`);
  return n;
}

// Claiming flips `scheduled` -> `publishing`, the same lock the edge worker uses,
// so the two can never post the same row twice.
export async function claimNextDue(): Promise<DueTeaser | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('publications')
    .select('id, metadata, scheduled_for, attempts, content_assets!inner(storage_path, mime_type, title, song_title)')
    .eq('platform', 'tiktok')
    .eq('status', 'scheduled')
    .lte('scheduled_for', nowIso)
    .is('platform_post_id', null)
    .order('scheduled_for', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const asset = (row.content_assets || {}) as Record<string, unknown>;
  const caption = captionFor(row);
  const attempts = Number(row.attempts ?? 0) + 1;

  if (!asset.storage_path) {
    await recordFailure(data.id, MAX_ATTEMPTS, 'Teaser has no source media.');
    return null;
  }
  if (!caption) {
    await recordFailure(data.id, MAX_ATTEMPTS, 'Teaser has no caption.');
    return null;
  }

  const { data: claimed } = await supabase
    .from('publications')
    .update({ status: 'publishing', attempts, updated_at: nowIso })
    .eq('id', data.id)
    .eq('status', 'scheduled')
    .is('platform_post_id', null)
    .select('id')
    .maybeSingle();
  if (!claimed) return null;

  return {
    id: data.id,
    caption,
    storagePath: String(asset.storage_path),
    mimeType: String(asset.mime_type ?? 'video/mp4'),
    scheduledFor: String(row.scheduled_for ?? ''),
    attempts,
  };
}

export async function markPublished(id: string, url: string | null): Promise<void> {
  await supabase
    .from('publications')
    .update({
      status: 'published',
      platform_post_id: `browser-${Date.now()}`,
      url: url ?? undefined,
      published_at: new Date().toISOString(),
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

/** Retry on the first few failures (usually a flaky browser), then give up. */
export async function recordFailure(id: string, attempts: number, message: string): Promise<void> {
  const terminal = attempts >= MAX_ATTEMPTS;
  await supabase
    .from('publications')
    .update({
      status: terminal ? 'failed' : 'scheduled',
      error: terminal ? message : `${message} (retrying, attempt ${attempts}/${MAX_ATTEMPTS})`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

/** Put a row back without burning an attempt (used by DRY_RUN). */
export async function requeue(id: string, message: string): Promise<void> {
  await supabase
    .from('publications')
    .update({ status: 'scheduled', error: message, updated_at: new Date().toISOString() })
    .eq('id', id);
}

/** Download a teaser from Supabase Storage to a temp file. */
export async function downloadTeaser(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('content').createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) throw new Error(`sign failed: ${error?.message ?? 'no url'}`);
  const res = await fetch(data.signedUrl);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const os = await import('node:os');
  const path = await import('node:path');
  const fs = await import('node:fs/promises');
  const file = path.join(os.tmpdir(), `teaser-${Date.now()}.mp4`);
  await fs.writeFile(file, buf);
  return file;
}
