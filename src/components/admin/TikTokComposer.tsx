import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage, getFunctionErrorMessage } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Download, Loader2, Upload } from 'lucide-react';
import TeaserCoverFrame from '@/components/admin/TeaserCoverFrame';

// TikTok's own privacy codes, in human wording.
const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends (mutual follows)',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me (private)',
};

const MUSIC_NOTICE_HREF = 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en';
const BRANDED_POLICY_HREF = 'https://www.tiktok.com/legal/page/global/bc-policy/en';

// m:ss, for reading a file's length at a glance.
function formatClock(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

interface CreatorInfo {
  creator_username: string | null;
  creator_avatar_url: string | null;
  privacy_level_options: string[];
  max_video_post_duration_sec: number | null;
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
}

interface TikTokComposerProps {
  publicationId: string | null;
  onClose: () => void;
  onPosted: () => void;
}

// The compose screen for a single TikTok teaser. Implements TikTok's required
// Direct Post UX: creator info, an explicit (no-default) privacy choice,
// interaction toggles off by default, commercial-content disclosure, an editable
// caption, a preview, and the Music Usage consent notice.
const TikTokComposer = ({ publicationId, onClose, onPosted }: TikTokComposerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  // What the teaser file actually is: platform playback is picky about both the
  // container and the shape, so the composer says so before anything is posted.
  const [asset, setAsset] = useState<{ aspect: string | null; mime: string | null } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // The very file that will be uploaded, with a Content-Disposition so the
  // browser saves it rather than opening it. This is how the owner checks the
  // audio of a teaser locally, outside our player and outside TikTok's.
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [assetId, setAssetId] = useState<string | null>(null);
  const [redrafting, setRedrafting] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState(''); // no default on purpose
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [disclosureOn, setDisclosureOn] = useState(false);
  const [brandOrganic, setBrandOrganic] = useState(false);
  const [brandContent, setBrandContent] = useState(false);
  const [posting, setPosting] = useState(false);
  // Whether the recorded file actually carries an audio track, and how long it
  // is. A silent or truncated teaser is the artifact that matters most, and
  // nothing else in the app can see it by looking at the file itself.
  const [audioState, setAudioState] = useState<'checking' | 'ok' | 'missing' | 'short'>('checking');
  const [audioSeconds, setAudioSeconds] = useState<number | null>(null);
  const [expectedSeconds, setExpectedSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!publicationId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setPreviewUrl(null);
    setDownloadUrl(null);
    setAudioState('checking');
    setAudioSeconds(null);
    setExpectedSeconds(null);
    // The dialog is reused for every teaser, so anything the owner chose for the
    // previous one has to be cleared. A carried-over "Everyone" privacy choice
    // would silently make the next post public, which is exactly what TikTok's
    // no-default rule exists to prevent.
    setCaption('');
    setAssetId(null);
    setAsset(null);
    setPrivacyLevel('');
    setAllowComment(false);
    setAllowDuet(false);
    setAllowStitch(false);
    setDisclosureOn(false);
    setBrandOrganic(false);
    setBrandContent(false);

    (async () => {
      try {
        const [{ data: creatorData, error: creatorErr }, { data: pub, error: pubErr }] =
          await Promise.all([
            supabase.functions.invoke('tiktok-creator-info', { body: {} }),
            supabase
              .from('publications')
              .select('*, content_assets(*)')
              .eq('id', publicationId)
              .maybeSingle(),
          ]);
        if (cancelled) return;
        if (creatorErr || creatorData?.error) {
          throw new Error(creatorData?.error || (await getFunctionErrorMessage(creatorErr)));
        }
        if (pubErr) throw pubErr;

        const meta = (pub?.metadata ?? {}) as Record<string, unknown>;
        setCaption(String(meta.caption || meta.title || pub?.content_assets?.title || ''));
        setAssetId(pub?.asset_id ?? null);
        setExpectedSeconds(pub?.content_assets?.duration_seconds ?? null);
        setCreator(creatorData as CreatorInfo);
        setAsset(
          pub?.content_assets
            ? {
                aspect: pub.content_assets.aspect ?? null,
                mime: pub.content_assets.mime_type ?? null,
              }
            : null
        );

        const storagePath = pub?.content_assets?.storage_path;
        if (storagePath) {
          const mime = pub?.content_assets?.mime_type ?? '';
          const ext = /quicktime/.test(mime) ? 'mov' : /webm/.test(mime) ? 'webm' : 'mp4';
          const slug =
            (pub?.content_assets?.title ?? '')
              .toString()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '') || 'teaser';
          const [{ data: signed }, { data: dl }] = await Promise.all([
            supabase.storage.from('content').createSignedUrl(storagePath, 3600),
            supabase.storage
              .from('content')
              .createSignedUrl(storagePath, 3600, { download: `${slug}-teaser.${ext}` }),
          ]);
          if (!cancelled) {
            setPreviewUrl(signed?.signedUrl ?? null);
            setDownloadUrl(dl?.signedUrl ?? null);
          }
        }
      } catch (err) {
        if (!cancelled) setLoadError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicationId]);

  // §3b: branded content cannot be private — only offer public/friends while it
  // is selected (and drop an already-chosen "Only me").
  const selectablePrivacy = useMemo(() => {
    const options = creator?.privacy_level_options ?? [];
    return brandContent ? options.filter((p) => p !== 'SELF_ONLY') : options;
  }, [creator?.privacy_level_options, brandContent]);
  useEffect(() => {
    if (privacyLevel && !selectablePrivacy.includes(privacyLevel)) setPrivacyLevel('');
  }, [selectablePrivacy, privacyLevel]);

  const disclosureIncomplete = disclosureOn && !brandOrganic && !brandContent;
  // MP4/MOV only: TikTok's player rejects the older WebM recordings, so posting
  // one is blocked rather than published and left unplayable.
  const formatPlayable = !!asset?.mime && /^video\/(mp4|quicktime)$/.test(asset.mime);
  const isVertical = asset?.aspect === '9:16';
  const canPost =
    !loading &&
    !posting &&
    !!creator &&
    formatPlayable &&
    caption.trim().length > 0 &&
    privacyLevel !== '' &&
    !disclosureIncomplete;

  // Ask the AI for a fresh caption for this teaser without leaving the dialog.
  // The drafter writes to the row, so what you see here is what gets posted.
  const redraftCaption = async () => {
    if (!assetId || !publicationId || redrafting) return;
    setRedrafting(true);
    try {
      const { error } = await supabase.functions.invoke('draft-publication-metadata', {
        body: { asset_id: assetId, platform: 'tiktok' },
      });
      if (error) throw error;
      const { data } = await supabase
        .from('publications')
        .select('metadata')
        .eq('id', publicationId)
        .maybeSingle();
      const meta = (data?.metadata ?? {}) as Record<string, unknown>;
      setCaption(String(meta.caption || meta.title || ''));
      onPosted();
      toast({ title: 'New caption written', description: 'Edit it freely — it saves with the post.' });
    } catch (err) {
      toast({
        title: "Couldn't write a new caption",
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setRedrafting(false);
    }
  };

  // The <audio> element is pointed at the same file as the preview: if Chrome can
  // play it, the file carries an audio track and this is its length. If it
  // errors, the upload would land silent.
  const onAudioMetadata = (el: HTMLAudioElement) => {
    const seconds = el.duration;
    setAudioSeconds(Number.isFinite(seconds) ? seconds : null);
    setAudioState(
      Number.isFinite(seconds) && expectedSeconds != null && seconds < expectedSeconds - 1.5
        ? 'short'
        : 'ok'
    );
  };

  const post = async () => {
    if (!publicationId || !canPost) return;
    // A silent post is worse than no post — but the audio probe is a heuristic,
    // so ask rather than block.
    if (
      audioState === 'missing' &&
      !window.confirm(
        'This file looks like it has no audio track — TikTok would post it silent.\n\nPost it anyway?'
      )
    ) {
      return;
    }
    setPosting(true);
    try {
      const { data, error } = await supabase.functions.invoke('post-tiktok-teaser', {
        body: {
          publicationId,
          caption: caption.trim(),
          privacyLevel,
          disableComment: !allowComment,
          disableDuet: !allowDuet,
          disableStitch: !allowStitch,
          brandOrganic: disclosureOn && brandOrganic,
          brandContent: disclosureOn && brandContent,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // TikTok answers SEND_TO_USER_INBOX when it will not post directly — on an
      // unaudited app the video waits in the creator's drafts. Saying "still
      // processing" there was a lie that left the owner waiting for a post that
      // would never appear.
      const inbox = data?.inbox === true || data?.status === 'SEND_TO_USER_INBOX';
      toast({
        title: inbox ? 'Saved to your TikTok drafts' : 'Sent to TikTok',
        description: inbox
          ? 'TikTok would not post it directly, so it is waiting in your drafts. Open the TikTok app to finish it — that is what an unaudited app does.'
          : data?.status === 'PUBLISH_COMPLETE'
            ? 'Published. It may take a few minutes to appear on your profile.'
            : 'Uploaded. TikTok is still processing your post — it will appear shortly.',
      });
      onPosted();
      onClose();
    } catch (err) {
      toast({ title: "Couldn't post to TikTok", description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={!!publicationId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1C0357]">Post to TikTok</DialogTitle>
          <DialogDescription>
            Review the teaser, choose how it should appear, then publish.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-10 justify-center text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your TikTok account…
          </div>
        ) : loadError ? (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5">
            {/* §1: creator info */}
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
              {creator?.creator_avatar_url ? (
                <img
                  src={creator.creator_avatar_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-[#1C0357]/10" />
              )}
              <div className="text-sm">
                <p className="text-gray-500">Posting to</p>
                <p className="font-semibold text-[#1C0357]">
                  @{creator?.creator_username ?? 'your TikTok account'}
                </p>
              </div>
            </div>

            {!formatPlayable && (
              <Alert className="border-red-200 bg-red-50 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This teaser is an older file format that TikTok can't play. Go to the release
                  board, choose <strong>Reset teaser</strong>, then <strong>Re-record teaser</strong>,
                  and post the new one.
                </AlertDescription>
              </Alert>
            )}
            {formatPlayable && !isVertical && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This teaser is landscape, so TikTok will letterbox it. Re-record it from the
                  release board for a full-screen vertical post.
                </AlertDescription>
              </Alert>
            )}

            {/* §5a: preview */}
            {previewUrl ? (
              <>
                <video src={previewUrl} controls className="w-full rounded-xl bg-black" />
                <TeaserCoverFrame src={previewUrl} />
                {/* Read the audio track straight out of the same file. */}
                <audio
                  src={previewUrl}
                  preload="metadata"
                  className="hidden"
                  onLoadedMetadata={(e) => onAudioMetadata(e.currentTarget)}
                  onError={() => setAudioState('missing')}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  <span>
                    {asset?.mime ?? 'unknown format'}
                    {asset?.aspect ? ` · ${asset.aspect}` : ''}
                    {audioState === 'ok' && audioSeconds
                      ? ` · audio ${formatClock(audioSeconds)}`
                      : ''}
                    {audioState === 'missing' ? (
                      <strong className="text-red-600"> · no audio track in this file</strong>
                    ) : null}
                    {audioState === 'short' ? (
                      <strong className="text-red-600">
                        {' '}
                        · audio stops at {formatClock(audioSeconds ?? 0)}
                        {expectedSeconds ? ` of ${formatClock(expectedSeconds)}` : ''}
                      </strong>
                    ) : null}
                    {' · the exact file that gets posted'}
                  </span>
                  {downloadUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={downloadUrl} download>
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Download
                      </a>
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-gray-100 p-6 text-center text-sm text-gray-500">
                No preview available
              </div>
            )}

            {/* §2a: editable caption */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tiktok-caption">Caption</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={redraftCaption}
                  disabled={redrafting || !assetId}
                >
                  {redrafting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Rewrite with AI
                </Button>
              </div>
              <Textarea
                id="tiktok-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                maxLength={2200}
              />
            </div>

            {/* §2b: privacy, no default */}
            <div className="space-y-1.5">
              <Label>Who can see this</Label>
              <Select value={privacyLevel} onValueChange={setPrivacyLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select privacy status" />
                </SelectTrigger>
                <SelectContent>
                  {selectablePrivacy.map((level) => (
                    <SelectItem key={level} value={level}>
                      {PRIVACY_LABELS[level] ?? level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* §2c: interactions, off by default */}
            <div className="space-y-2">
              <Label>Allow</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label
                  className={`flex items-center gap-2 text-sm ${creator?.comment_disabled ? 'opacity-50' : ''}`}
                >
                  <Checkbox
                    checked={allowComment}
                    onCheckedChange={(v) => setAllowComment(!!v)}
                    disabled={creator?.comment_disabled}
                  />
                  Comments
                </label>
                <label
                  className={`flex items-center gap-2 text-sm ${creator?.duet_disabled ? 'opacity-50' : ''}`}
                >
                  <Checkbox
                    checked={allowDuet}
                    onCheckedChange={(v) => setAllowDuet(!!v)}
                    disabled={creator?.duet_disabled}
                  />
                  Duet
                </label>
                <label
                  className={`flex items-center gap-2 text-sm ${creator?.stitch_disabled ? 'opacity-50' : ''}`}
                >
                  <Checkbox
                    checked={allowStitch}
                    onCheckedChange={(v) => setAllowStitch(!!v)}
                    disabled={creator?.stitch_disabled}
                  />
                  Stitch
                </label>
              </div>
            </div>

            {/* §3: commercial content disclosure, off by default */}
            <div className="space-y-2 rounded-xl border border-gray-200 p-3">
              <label className="flex items-center justify-between gap-3 text-sm font-medium">
                <span>Disclose commercial content</span>
                <Switch checked={disclosureOn} onCheckedChange={setDisclosureOn} />
              </label>
              {disclosureOn && (
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={brandOrganic} onCheckedChange={(v) => setBrandOrganic(!!v)} />
                    Your brand — promoting your own business
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={brandContent} onCheckedChange={(v) => setBrandContent(!!v)} />
                    Branded content — promoting a third party
                  </label>
                  {brandOrganic && !brandContent && (
                    <p className="text-xs text-amber-700">
                      Your video will be labelled as &lsquo;Promotional content&rsquo;.
                    </p>
                  )}
                  {brandContent && (
                    <p className="text-xs text-amber-700">
                      Your video will be labelled as &lsquo;Paid partnership&rsquo;. Branded content can&rsquo;t be
                      private, so &lsquo;Only me&rsquo; is unavailable.
                    </p>
                  )}
                  {disclosureIncomplete && (
                    <p className="text-xs text-red-600">
                      Choose at least one option to continue.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* §5d: expectation setting */}
            <p className="text-xs text-gray-500">
              After publishing, it can take a few minutes for the post to appear on your profile.
            </p>

            {/* §2 declaration + §4 compliance wording */}
            <p className="text-xs text-gray-500">
              By posting, you agree to TikTok&rsquo;s{' '}
              {brandContent && (
                <>
                  <a
                    href={BRANDED_POLICY_HREF}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-[#1C0357]"
                  >
                    Branded Content Policy
                  </a>{' '}
                  and{' '}
                </>
              )}
              <a
                href={MUSIC_NOTICE_HREF}
                target="_blank"
                rel="noreferrer"
                className="underline text-[#1C0357]"
              >
                Music Usage Confirmation
              </a>
              .
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={posting}>
            Cancel
          </Button>
          <Button
            onClick={post}
            disabled={!canPost}
            className="bg-[#1C0357] hover:bg-[#1C0357]/90"
          >
            {posting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" /> Post to TikTok
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TikTokComposer;
