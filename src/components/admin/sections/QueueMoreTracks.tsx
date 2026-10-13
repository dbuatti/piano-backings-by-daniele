import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { PublicationWithAsset } from '@/types/publishing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  captureCardSnapshot,
  defaultCardState,
  drawCard,
  loadCardLogo,
} from '@/utils/titleCard';
import { recordCanvasClip } from '@/utils/canvasRecorder';
import { PlusCircle } from 'lucide-react';

// Delivered backing tracks live in the public `tracks` storage bucket, stored
// under `tracks/<request-id>/<file>` (or at the bucket root for older uploads).
type RequestMeta = {
  song: string;
  artist: string;
  client: string;
  key: string | null;
  created_at: string;
};

type Candidate = {
  key: string;
  url: string;
  requestId: string | null;
  request: RequestMeta;
};

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|opus|flac|webm)$/i;
const isAudioFile = (name: string, metadata: unknown) => {
  const mime = (metadata as { mimetype?: string } | null)?.mimetype;
  if (mime && mime.startsWith('audio/')) return true;
  return AUDIO_EXT.test(name);
};

type Progress = { step: 'recording' | 'uploading' | 'drafting' | 'done'; pct: number };

const STATUS_LABEL = {
  recording: (pct: number) => `Recording title card… ${Math.round(pct * 100)}%`,
  uploading: () => 'Uploading video…',
  drafting: () => 'Drafting AI metadata…',
  done: () => 'Queued — ready for approval',
} as const;

// Defaults that mirror the Title Card Generator's "Audition Cut" card.
const W = 1920;
const H = 1080;
const FADE = 1.1;

export default function QueueMoreTracks({
  queue,
  onQueued,
}: {
  queue: PublicationWithAsset[];
  onQueued: () => void;
}) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, Progress | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // Song → already in the pipeline? Drives which tracks are offered and dedupes.
  const songState = useMemo(() => {
    const map = new Map<string, 'queued' | 'published'>();
    for (const p of queue) {
      const song = p.content_assets?.song_title?.trim().toLowerCase();
      if (!song) continue;
      const isPublished = p.platform === 'youtube' && p.status === 'published';
      if (!map.has(song) || isPublished) map.set(song, isPublished ? 'published' : 'queued');
    }
    return map;
  }, [queue]);

  const songTaken = (song: string) =>
    songState.get((song || '').trim().toLowerCase());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: reqData, error: reqError } = await supabase
          .from('backing_requests')
          .select('id, song_title, musical_or_artist, name, song_key, different_key, key_for_track, created_at')
          .order('created_at', { ascending: false })
          .limit(400);
        if (reqError) throw reqError;

        const requests = new Map<string, RequestMeta>(
          (reqData || []).map((row) => {
            const r = row as Record<string, unknown>;
            const different = String(r.different_key ?? '') === 'Yes';
            return [
              String(r.id ?? ''),
              {
                song: String(r.song_title ?? '').trim(),
                artist: String(r.musical_or_artist ?? '').trim(),
                client: String(r.name ?? '').trim(),
                key: (different
                  ? String(r.key_for_track ?? '').trim() || String(r.song_key ?? '').trim()
                  : String(r.song_key ?? '').trim()) || null,
                created_at: String(r.created_at ?? ''),
              },
            ] as const;
          })
        );

        const files: { path: string; folder: string | null }[] = [];
        const MAX_FILES = 400;
        const visit = async (prefix: string, folder: string | null) => {
          if (!alive || files.length >= MAX_FILES) return;
          const { data, error } = await supabase.storage
            .from('tracks')
            .list(prefix, { limit: 400 });
          if (error) throw error;
          for (const item of data || []) {
            if (!alive || files.length >= MAX_FILES) return;
            if (item.id === null) {
              await visit(`${prefix}${item.name}/`, folder ?? item.name);
              continue;
            }
            if (!isAudioFile(item.name, item.metadata)) continue;
            files.push({ path: `${prefix}${item.name}`, folder });
          }
        };
        await visit('tracks/', null);

        const next: Candidate[] = [];
        files.forEach((f, i) => {
          const meta = f.folder ? requests.get(f.folder) : undefined;
          if (!meta || !meta.song) return;
          if (songTaken(meta.song)) return;
          const { data } = supabase.storage.from('tracks').getPublicUrl(f.path);
          if (!data?.publicUrl) return;
          next.push({
            key: `${f.folder}-${i}`,
            url: data.publicUrl,
            requestId: f.folder,
            request: meta,
          });
        });
        next.sort((a, b) => b.request.created_at.localeCompare(a.request.created_at));
        if (alive) setCandidates(next);
      } catch {
        if (alive) setCandidates([]);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same paint loop the Title Card Generator uses, so the recorded clip is
  // pixel-for-pixel the editor's card (1920×1080, full track audio, fade-in).
  const queueTrack = async (t: Candidate) => {
    if (busy) return;
    if (songTaken(t.request.song)) {
      setErrors((e) => ({ ...e, [t.key]: 'Already has a video in the queue.' }));
      return;
    }
    setBusy(t.key);
    setErrors((e) => ({ ...e, [t.key]: undefined }));
    try {
      setProgress((p) => ({ ...p, [t.key]: { step: 'recording', pct: 0 } }));

      const card = defaultCardState(t.request);
      const logoImg = await loadCardLogo();

      await Promise.allSettled([
        document.fonts.ready,
        ...[
          '400 32px "Arcade Gamer"',
          '400 32px "Press Start 2P"',
          '400 32px "VT323"',
          'italic 400 32px "Baskervville"',
          '400 32px "Inter"',
        ].map((f) => document.fonts.load(f)),
      ]);

      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const cvCtx = cv.getContext('2d');

      const context = new AudioContext();
      if (context.state === 'suspended') await context.resume();
      const response = await fetch(t.url);
      if (!response.ok) {
        await context.close();
        throw new Error(`Couldn't load the backing track (${response.status}).`);
      }
      const decoded = await context.decodeAudioData(await response.arrayBuffer());
      const duration = decoded.duration || 6;
      const source = context.createBufferSource();
      source.buffer = decoded;
      source.connect(context.destination);

      const blob = await recordCanvasClip({
        canvas: cv,
        duration,
        audio: { context, source },
        fps: 30,
        drawFrame: (elapsed) => {
          if (!cvCtx) return;
          drawCard(cvCtx, W, H, card, logoImg);
          const p = Math.min(elapsed / FADE, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          cvCtx.fillStyle = `rgba(245,56,188,${(1 - ease).toFixed(3)})`;
          cvCtx.fillRect(0, 0, W, H);
        },
        onProgress: (p) =>
          setProgress((cur) => ({
            ...cur,
            [t.key]: { step: 'recording', pct: p.loaded / Math.max(1, p.total) },
          })),
      });
      if (!blob) throw new Error('Recording failed in this browser.');

      setProgress((p) => ({ ...p, [t.key]: { step: 'uploading', pct: 0 } }));
      const { data: user } = await supabase.auth.getUser();
      const id = crypto.randomUUID();
      const path = `content/${id}.webm`;
      const previewPath = `content/${id}.preview.png`;

      const { error: uploadErr } = await supabase.storage
        .from('content')
        .upload(path, blob, { contentType: 'video/webm', upsert: false });
      if (uploadErr) throw uploadErr;

      const previewBlob = await captureCardSnapshot(cv);
      if (previewBlob) {
        const { error: previewErr } = await supabase.storage
          .from('content')
          .upload(previewPath, previewBlob, { contentType: 'image/png', upsert: false });
        if (previewErr) throw previewErr;
      }

      const song = t.request.song.trim();
      const artist = t.request.artist.trim();
      const title = `${song} — Audition Cut${artist ? ` (from ${artist})` : ''}`;

      const { data: asset, error: assetErr } = await supabase
        .from('content_assets')
        .insert({
          storage_path: path,
          preview_path: previewBlob ? previewPath : null,
          mime_type: 'video/webm',
          title,
          song_title: song,
          show: artist || null,
          key: t.request.key || null,
          dedication: t.request.client
            ? `prepared for ${t.request.client.trim().split(/\s+/)[0]}`
            : null,
          request_id: t.requestId,
          duration_seconds: null,
          aspect: '16:9',
          created_by: user.user?.id ?? null,
        })
        .select('id')
        .single();
      if (assetErr || !asset) throw new Error(assetErr?.message || "Couldn't create the asset.");

      const { data: pub, error: pubErr } = await supabase
        .from('publications')
        .insert({ asset_id: asset.id, platform: 'youtube', status: 'draft' })
        .select('id')
        .single();
      if (pubErr || !pub) throw new Error(pubErr?.message || "Couldn't create the publication.");

      setProgress((p) => ({ ...p, [t.key]: { step: 'drafting', pct: 0 } }));
      const { error: draftErr } = await supabase.functions.invoke('draft-publication-metadata', {
        body: { asset_id: asset.id, platform: 'youtube' },
      });
      if (draftErr) throw draftErr;

      setProgress((p) => ({ ...p, [t.key]: { step: 'done', pct: 1 } }));
      onQueued();
    } catch (e) {
      setErrors((er) => ({
        ...er,
        [t.key]: e instanceof Error ? e.message : 'Failed to queue this track.',
      }));
      setProgress((p) => ({ ...p, [t.key]: undefined }));
    } finally {
      setBusy(null);
    }
  };

  const available = candidates?.filter((c) => !songTaken(c.request.song)) ?? [];

  return (
    <Card className="bg-white border-none shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-[#1C0357] flex items-center justify-between">
          <span>Queue more tracks</span>
          <span className="text-xs font-normal text-gray-400">
            {candidates === null
              ? 'Loading delivered tracks…'
              : available.length
                ? `${available.length} finished track${available.length === 1 ? '' : 's'} without a video in the queue`
                : 'Every delivered track is already queued or published'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-0.5', available.length === 0 && 'pt-2')}>
        {candidates === null ? (
          <p className="px-4 py-6 text-sm text-gray-400">Loading tracks…</p>
        ) : available.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">
            Nothing new to add. Finished backing tracks (delivered audio in the{' '}
            <span className="font-mono text-xs">tracks</span> bucket) appear here, and 'Queue video'
            records their title card and adds an approval draft.
          </p>
        ) : (
          available.map((t) => {
            const state = progress[t.key];
            const err = errors[t.key];
            const isBusy = busy === t.key;
            return (
              <div
                key={t.key}
                className="flex items-center gap-3 rounded-xl border border-gray-100 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1C0357]">
                    {t.request.song}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {t.request.artist ? `from ${t.request.artist}` : 'Backing track'}
                    {t.request.key ? ` · ${t.request.key.replace(/ \([^)]*\)$/, '')}` : ''}
                  </p>
                  {(state || err) && (
                    <p
                      className={cn(
                        'mt-0.5 text-xs',
                        err ? 'text-red-600' : state?.step === 'done' ? 'text-green-600' : 'text-[#F538BC]'
                      )}
                    >
                      {err || STATUS_LABEL[state!.step]((state!.pct || 0))}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90 shrink-0"
                  onClick={() => queueTrack(t)}
                  disabled={busy !== null}
                >
                  {isBusy ? <span className="h-3.5 w-3.5 animate-pulse">•</span> : <PlusCircle className="h-3.5 w-3.5" />}
                  {isBusy ? 'Working…' : 'Queue video'}
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}