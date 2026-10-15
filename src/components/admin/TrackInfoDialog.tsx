import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Music2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DeliveredTrack } from '@/hooks/useDeliveredTracks';
import { KEY_OPTIONS, keyForDisplay } from '@/utils/musicalKeys';
import { saveRequestKey } from '@/utils/releaseTrack';
import SheetMusicDrop from '@/components/admin/SheetMusicDrop';

// Everything the request says about a song. The sheet music sits on the left as
// a drop box with a small preview, so a PDF is one drag away; the key is set on
// the right, so the key can be read off the preview and saved without leaving.

type RequestInfo = {
  id: string;
  song_title: string | null;
  musical_or_artist: string | null;
  name: string | null;
  email: string | null;
  song_key: string | null;
  different_key: string | null;
  key_for_track: string | null;
  backing_type: string[] | null;
  track_purpose: string | null;
  special_requests: string | null;
  internal_notes: string | null;
  voice_memo_urls: { url?: string; caption?: string | boolean | null }[] | null;
  created_at: string | null;
};

interface TrackInfoDialogProps {
  track: DeliveredTrack | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeySaved?: () => void;
}

const captionOr = (caption: string | boolean | null | undefined, fallback: string) =>
  typeof caption === 'string' && caption.trim() ? caption : fallback;

const voiceMemoFiles = (info: RequestInfo | null | undefined) =>
  (info?.voice_memo_urls ?? [])
    .filter((f) => f?.url)
    .map((f, i) => ({ url: f.url!, label: captionOr(f.caption, `Voice memo ${i + 1}`) }));

export default function TrackInfoDialog({ track, open, onOpenChange, onKeySaved }: TrackInfoDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const requestId = track?.requestId ?? null;

  const { data: info, isLoading, error } = useQuery<RequestInfo | null, Error>({
    queryKey: ['request_detail', requestId],
    enabled: open && !!requestId,
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('backing_requests')
        .select(
          'id, song_title, musical_or_artist, name, email, song_key, different_key, key_for_track, backing_type, track_purpose, special_requests, internal_notes, voice_memo_urls, created_at'
        )
        .eq('id', requestId!)
        .maybeSingle();
      if (err) throw err;
      return (data as RequestInfo) ?? null;
    },
  });

  const memos = useMemo(() => voiceMemoFiles(info), [info]);

  // The key the track is recorded in comes from whichever column the request
  // reads, so a different-key request shows the transposition it asked for.
  const currentKey = track?.key ?? null;
  const keyMissing = !!track && !currentKey;

  const saveKey = async (value: string) => {
    if (!track || !value || saving) return;
    setSaving(true);
    try {
      await saveRequestKey(track, value);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['delivered_tracks'] }),
        queryClient.invalidateQueries({ queryKey: ['request_detail', track.requestId] }),
      ]);
      toast({ title: 'Key saved', description: `“${track.song}” can be pushed now.` });
      onKeySaved?.();
    } catch (e) {
      toast({ title: "Couldn't save the key", description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openFullRequest = () => {
    if (!requestId) return;
    onOpenChange(false);
    navigate(`/admin/request/${requestId}`);
  };

  const sameKeyAsked = info?.different_key === 'Yes';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle className="text-[#1C0357]">{track?.song ?? 'Song'}</DialogTitle>
          <DialogDescription>
            {[track?.show, track?.client && `for ${track.client}`].filter(Boolean).join(' · ') || '\u00a0'}
          </DialogDescription>
        </DialogHeader>

        {!track ? null : isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the request…
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">Couldn't load this request: {getErrorMessage(error)}</p>
        ) : (
          <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[300px_1fr] md:overflow-hidden">
            <div className="space-y-2 bg-gray-50 p-5 md:overflow-y-auto">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sheet music</h3>
              <SheetMusicDrop requestId={track.requestId} />
            </div>

            {/* Key, audio and the facts that matter for the card and the copy. */}
            <div className="space-y-5 bg-white p-5 md:overflow-y-auto">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Key</h3>
                {keyMissing ? (
                  <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs text-amber-800">
                      No key is recorded on this request. Read it off the sheet, then set it here.
                    </p>
                    <KeyPicker value="" disabled={saving} onChange={saveKey} />
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700" />}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-[#1C0357]">{keyForDisplay(currentKey ?? '') || '—'}</p>
                    <KeyPicker value={currentKey ?? ''} disabled={saving} onChange={saveKey} />
                  </div>
                )}
                {sameKeyAsked && (
                  <p className="text-xs text-gray-500">
                    The client asked for a transposed key
                    {info?.song_key ? ` (their song key: ${keyForDisplay(info.song_key)})` : ''}.
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recording</h3>
                <audio controls preload="none" src={track.url} className="w-full" />
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Details</h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <dt className="text-gray-500">Client</dt>
                  <dd className="text-gray-800">{info?.name || track.client || '—'}</dd>
                  <dt className="text-gray-500">Show / artist</dt>
                  <dd className="text-gray-800">{info?.musical_or_artist || track.show || '—'}</dd>
                  <dt className="text-gray-500">Backing type</dt>
                  <dd className="text-gray-800">{info?.backing_type?.join(', ') || '—'}</dd>
                  <dt className="text-gray-500">Purpose</dt>
                  <dd className="text-gray-800">{info?.track_purpose || '—'}</dd>
                  <dt className="text-gray-500">Requested</dt>
                  <dd className="text-gray-800">
                    {info?.created_at ? new Date(info.created_at).toLocaleDateString('en-AU') : '—'}
                  </dd>
                </dl>
                {info?.special_requests && (
                  <p className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-700">
                    <span className="font-semibold">Client's note: </span>
                    {info.special_requests}
                  </p>
                )}
                {info?.internal_notes && (
                  <p className="rounded-lg bg-yellow-50 p-2.5 text-xs text-gray-700">
                    <span className="font-semibold">Internal: </span>
                    {info.internal_notes}
                  </p>
                )}
              </section>

              {memos.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Voice memos</h3>
                  <ul className="space-y-1.5">
                    {memos.map((m) => (
                      <li key={m.url} className="flex items-center gap-2 text-sm">
                        <Music2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <a href={m.url} target="_blank" rel="noreferrer" className="truncate text-[#1C0357] hover:underline">
                          {m.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <Button variant="outline" size="sm" className="w-full" onClick={openFullRequest}>
                Open the full request
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// The same key list the wizard and board use. Keeps a value outside the standard
// list visible so it isn't silently rewritten.
function KeyPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Choose a key" />
      </SelectTrigger>
      <SelectContent>
        {value && !KEY_OPTIONS.some((o) => o.value === value) && (
          <SelectItem value={value}>{value}</SelectItem>
        )}
        {KEY_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
