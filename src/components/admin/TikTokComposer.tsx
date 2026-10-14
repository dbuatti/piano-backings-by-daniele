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
import { AlertTriangle, Loader2, Upload } from 'lucide-react';
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
  const [caption, setCaption] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState(''); // no default on purpose
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [disclosureOn, setDisclosureOn] = useState(false);
  const [brandOrganic, setBrandOrganic] = useState(false);
  const [brandContent, setBrandContent] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!publicationId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

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
          const { data: signed } = await supabase.storage
            .from('content')
            .createSignedUrl(storagePath, 3600);
          if (!cancelled) setPreviewUrl(signed?.signedUrl ?? null);
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

  const post = async () => {
    if (!publicationId || !canPost) return;
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
      toast({
        title: 'Sent to TikTok',
        description:
          data?.status === 'PUBLISH_COMPLETE'
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
              </>
            ) : (
              <div className="rounded-xl bg-gray-100 p-6 text-center text-sm text-gray-500">
                No preview available
              </div>
            )}

            {/* §2a: editable caption */}
            <div className="space-y-1.5">
              <Label htmlFor="tiktok-caption">Caption</Label>
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
