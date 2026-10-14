import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Film, ListChecks, Loader2, RefreshCw, Search, Smartphone, Video, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getActiveRecordingProgress,
  isRecordingActive,
  recordCanvasClip,
  subscribeRecording,
  videoFileInfo,
  type RecordingAudio,
} from "@/utils/canvasRecorder";
import { KEY_OPTIONS, keyForDisplay } from "@/utils/musicalKeys";
import "@fontsource/press-start-2p";
import "@fontsource/silkscreen/400.css";
import "@fontsource/silkscreen/700.css";
import "@fontsource/vt323";
import "./videoTitleCardFonts.css";
import {
  type Aspect,
  type CardState,
  drawCard,
  drawTeaserFooter,
  firstNameOf,
  LOGO_SRC,
} from "@/utils/titleCard";

// Video-game pixel options for the top banner (stand-ins until Arcade Gamer
// is dropped into public/fonts).
const PIXEL_FONTS = [
  { family: "Press Start 2P", label: "Press Start 2P" },
  { family: "Silkscreen", label: "Silkscreen" },
  { family: "VT323", label: "VT323" },
];

const ASPECTS: Record<Aspect, { label: string; w: number; h: number }> = {
  "16:9": { label: "YouTube · Widescreen", w: 1920, h: 1080 },
  "9:16": { label: "Shorts / Reels · Vertical", w: 1080, h: 1920 },
  "1:1": { label: "Square · Feed", w: 1080, h: 1080 },
};

const DEFAULT_STATE: CardState = {
  banner: "Audition Cut",
  title: "Gotta Get Out",
  show: "from Ordinary Days",
  dedication: "prepared for Sophia",
  key: "C Major (0)",
  aspect: "16:9",
  pixelFont: "Press Start 2P",
  showTagline: false,
};

// Delivered backing tracks live in the public `tracks` storage bucket, stored
// under `tracks/<request-id>/<file>` (or at the bucket root for older uploads).
type RequestMeta = {
  song: string;
  artist: string;
  client: string;
  key: string | null;
  keyColumn: "song_key" | "key_for_track";
  created_at: string;
};

type BackingTrack = {
  id: string;
  label: string;
  url: string;
  folder: string | null;
  filename: string;
  requestId: string | null;
  request: RequestMeta | null;
};

type PublishStep = "authorising" | "recording" | "uploading" | "saving";

const PUBLISH_STEP_LABELS: Record<PublishStep, string> = {
  authorising: "Authorising with Google",
  recording: "Recording clip",
  uploading: "Uploading to YouTube",
  saving: "Saving link on the request",
};

const normalizeForMatch = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .trim();

// Dice-style token overlap — the strongest match wins.
const matchScore = (a: string, b: string) => {
  const tokens = (s: string) =>
    new Set(normalizeForMatch(s).split(/\s+/).filter((w) => w.length > 1));
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  A.forEach((w) => {
    if (B.has(w)) shared += 1;
  });
  return shared / Math.max(1, Math.min(A.size, B.size));
};

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|opus|flac|webm)$/i;

const isAudioFile = (name: string, metadata: unknown) => {
  const mime = (metadata as { mimetype?: string } | null)?.mimetype;
  if (mime && mime.startsWith("audio/")) return true;
  return AUDIO_EXT.test(name);
};

// ---------- YouTube upload (client-side OAuth via Google Identity Services) ----------
const YT_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";
// Bias Google's account picker to the channel we always publish to.
const YT_ACCOUNT_HINT = "pianobackingsbydaniele@gmail.com";

type GisTokenResponse = { access_token?: string; error?: string; expires_in?: number };
type GisError = { message?: string };
type GisTokenClient = { requestAccessToken: (opts?: { prompt?: string }) => void };
type GisOAuth2 = {
  initTokenClient: (cfg: {
    client_id: string;
    scope: string;
    hint?: string;
    callback: (r: GisTokenResponse) => void;
    error_callback?: (e: GisError) => void;
  }) => GisTokenClient;
};
type GoogleGlobal = { accounts?: { oauth2?: GisOAuth2 } };

let gisPromise: Promise<void> | null = null;

// Access tokens last ~1 hour; keep the current one in memory so back-to-back
// publishes don't re-open the consent popup.
let cachedToken: { token: string; expiresAt: number } | null = null;

function loadGis(): Promise<void> {
  const g = (window as unknown as { google?: GoogleGlobal }).google;
  if (g?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return gisPromise;
}

async function getAccessToken(clientId: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  // Preferred: mint a token server-side from the refresh token we already store
  // for the channel account. Silent (no popup) and always the right channel.
  try {
    const { data, error } = await supabase.functions.invoke("get-youtube-token");
    if (error) throw error;
    if (data?.access_token) {
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      };
      if (data.channel) console.info(`YouTube: uploading as “${data.channel}”.`);
      return data.access_token;
    }
    throw new Error(data?.error || "No access token returned");
  } catch (err) {
    console.warn(
      "Silent YouTube auth unavailable, falling back to Google popup:",
      err instanceof Error ? err.message : err
    );
  }

  // Fallback: client-side Google Identity Services popup.
  await loadGis();
  const g = (window as unknown as { google?: GoogleGlobal }).google;
  const oauth2 = g?.accounts?.oauth2;
  if (!oauth2) throw new Error("Google Identity Services unavailable");
  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: YT_UPLOAD_SCOPE,
      hint: YT_ACCOUNT_HINT,
      callback: (resp) => {
        if (resp.access_token) {
          cachedToken = {
            token: resp.access_token,
            expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000,
          };
          resolve(resp.access_token);
        } else {
          reject(new Error(resp.error || "Google did not return a token"));
        }
      },
      error_callback: (err) =>
        reject(new Error(err?.message || "Google authorization failed")),
    });
    // Empty prompt = only ask when Google actually needs to (first run, or after
    // the token is revoked) instead of forcing the consent screen every time.
    client.requestAccessToken({ prompt: "" });
  });
}

async function uploadToYouTube(
  token: string,
  blob: Blob,
  meta: { title: string; description: string; privacy: "private" | "unlisted" | "public" },
  onProgress?: (loaded: number, total: number) => void
): Promise<string> {
  const body = {
    snippet: {
      title: meta.title,
      description: meta.description,
      categoryId: "10",
      tags: ["piano", "piano backing", "audition cut"],
    },
    status: { privacyStatus: meta.privacy, selfDeclaredMadeForKids: false },
  };
  const init = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": videoFileInfo(blob.type).mime,
        "X-Upload-Content-Length": String(blob.size),
      },
      body: JSON.stringify(body),
    }
  );
  if (!init.ok) throw new Error(`Upload init failed (${init.status})`);
  const session = init.headers.get("Location");
  if (!session) throw new Error("YouTube did not return an upload session");
  // XMLHttpRequest (not fetch) so we can report byte-level upload progress.
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", session);
    xhr.setRequestHeader("Content-Type", videoFileInfo(blob.type).mime);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { id?: string };
          if (data.id) resolve(data.id);
          else reject(new Error("Upload succeeded but no video id returned"));
        } catch {
          reject(new Error("Could not read YouTube's response"));
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(blob);
  });
}

const formatClock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

// Teasers for TikTok / Instagram: the same card for ~30s with a "Full version
// on YouTube" footer band pointing viewers to the full-length channel upload.
const TEASER_SECONDS = 30;

// ---------- Page ----------
function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1C0357]/70">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1C0357] focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
      />
    </label>
  );
}

export default function TitleCardGenerator() {
  const [state, setState] = useState<CardState>(DEFAULT_STATE);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [recording, setRecording] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [ytUrl, setYtUrl] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<"private" | "unlisted" | "public">(
    "unlisted"
  );
  const [tracks, setTracks] = useState<BackingTrack[]>([]);
  const [requestMeta, setRequestMeta] = useState<Map<string, RequestMeta>>(
    () => new Map()
  );
  const [requestSearch, setRequestSearch] = useState("");
  const [projectReqId, setProjectReqId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [tracksLoaded, setTracksLoaded] = useState(false);
  const [matchedTrack, setMatchedTrack] = useState<string | null>(null);
  const [savedToRequest, setSavedToRequest] = useState<string | null>(null);
  const [publishStep, setPublishStep] = useState<PublishStep | null>(null);
  const [publishProgress, setPublishProgress] = useState<{
    loaded: number;
    total: number;
  } | null>(null);
  const [queuing, setQueuing] = useState(false);
  const [queueStep, setQueueStep] = useState("");
  const [queueResult, setQueueResult] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const manualAudioRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dims = ASPECTS[state.aspect];
  const selectedTrack = tracks.find((t) => t.url === audioUrl) ?? null;
  const linkedRequest = selectedTrack?.request ?? null;

  const publishSteps = useMemo(() => {
    const steps: PublishStep[] = ["authorising", "recording", "uploading"];
    if (selectedTrack?.requestId) steps.push("saving");
    return steps;
  }, [selectedTrack]);

  const set = useCallback((patch: Partial<CardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const paint = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    drawCard(ctx, dims.w, dims.h, state, logoImg);
  }, [dims.w, dims.h, state, logoImg]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoImg(img);
    img.src = LOGO_SRC;
    return () => {
      img.onload = null;
    };
  }, []);

  // When a recording was cued in the background (then this page was left and
  // re-entered), mirror the module-level recorder's state so the UI shows live
  // progress, disables the buttons, and clears up when it finally completes.
  useEffect(() => {
    if (isRecordingActive()) {
      setRecording(true);
      const progress = getActiveRecordingProgress();
      if (progress) setPublishProgress(progress);
    }
    const unsubscribe = subscribeRecording((progress) => {
      if (progress) {
        setPublishProgress(progress);
      } else {
        setPublishProgress(null);
        setRecording(false);
      }
    });
    return () => {
      unsubscribe();
      setRecording(false);
      setPublishProgress(null);
    };
  }, []);

  // Preload Google Identity Services so the auth popup can open synchronously
  // inside the Publish click (otherwise browsers treat it as a blocked popup).
  useEffect(() => {
    loadGis().catch(() => {
      // Retried on demand by getAccessToken.
    });
  }, []);

  useEffect(() => {
    let alive = true;
    const paintIfAlive = () => {
      if (alive) paint();
    };
    paintIfAlive();
    (async () => {
      try {
        await Promise.allSettled([
          document.fonts.ready,
          ...[
            '400 32px "Arcade Gamer"',
            '400 32px "Press Start 2P"',
            '700 32px "Silkscreen"',
            '400 32px "VT323"',
            'italic 400 32px "Baskervville"',
            '400 32px "Inter"',
          ].map((f) => document.fonts.load(f)),
        ]);
      } catch {
        // Fallback fonts still draw fine.
      }
      paintIfAlive();
    })();
    return () => {
      alive = false;
    };
  }, [paint]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Rich labels come from the requests table; the audio itself lives in
        // the `tracks` bucket (the `track_urls` column is often unpopulated).
        const { data: reqData, error: reqError } = await supabase
          .from("backing_requests")
          .select(
            "id, song_title, musical_or_artist, name, song_key, different_key, key_for_track, status, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(400);
        if (reqError) throw reqError;

        const requests = new Map<string, RequestMeta>(
          (reqData || []).map((row) => {
            const r = row as Record<string, unknown>;
            const different = String(r.different_key ?? "") === "Yes";
            return [
              String(r.id ?? ""),
              {
                song: String(r.song_title ?? "").trim(),
                artist: String(r.musical_or_artist ?? "").trim(),
                client: String(r.name ?? "").trim(),
                key: different
                  ? (String(r.key_for_track ?? "").trim() ||
                      String(r.song_key ?? "").trim()) || null
                  : String(r.song_key ?? "").trim() || null,
                keyColumn: different ? "key_for_track" : "song_key",
                created_at: String(r.created_at ?? ""),
              },
            ] as const;
          })
        );

        const files: {
          path: string;
          folder: string | null;
          name: string;
        }[] = [];
        const MAX_FILES = 400;
        const visit = async (prefix: string, folder: string | null) => {
          if (!alive || files.length >= MAX_FILES) return;
          const { data, error } = await supabase.storage
            .from("tracks")
            .list(prefix, { limit: 400 });
          if (error) throw error;
          for (const item of data || []) {
            if (!alive || files.length >= MAX_FILES) return;
            const isFolder = item.id === null;
            if (isFolder) {
              await visit(`${prefix}${item.name}/`, folder ?? item.name);
              continue;
            }
            if (!isAudioFile(item.name, item.metadata)) continue;
            files.push({ path: `${prefix}${item.name}`, folder, name: item.name });
          }
        };
        await visit("tracks/", null);

        const next: BackingTrack[] = [];
        files.forEach((f, i) => {
          const meta = f.folder ? requests.get(f.folder) : undefined;
          const { data: { publicUrl } } = supabase.storage
            .from("tracks")
            .getPublicUrl(f.path);
          if (meta && meta.song) {
            const multi =
              files.filter((x) => x.folder === f.folder).length > 1;
            next.push({
              id: `${f.folder}-${i}`,
              label: [
                meta.song,
                meta.artist && `— ${meta.artist}`,
                meta.client && `(${meta.client})`,
                multi && f.name,
              ]
                .filter(Boolean)
                .join(" "),
              url: publicUrl,
              folder: f.folder,
              filename: f.name,
              requestId: f.folder,
              request: meta,
            });
          } else {
            next.push({
              id: `root-${i}`,
              label: f.name.replace(/\.[^.]+$/, ""),
              url: publicUrl,
              folder: f.folder,
              filename: f.name,
              requestId: null,
              request: null,
            });
          }
        });
        next.sort((a, b) => a.label.localeCompare(b.label));
        if (alive) {
          setTracks(next);
          setRequestMeta(requests);
          setTracksLoaded(true);
        }
      } catch {
        // Non-fatal: the tool still exports the silent 6-second clip.
        if (alive) setTracksLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Auto-find the best-matching delivered track for the card's song/show, so
  // there's nothing to hunt for — override it manually any time by picking a
  // different option (the select then stays put until the card changes a lot).
  useEffect(() => {
    if (!tracksLoaded || manualAudioRef.current) return;
    const target = `${state.title} ${state.show}`.trim();
    if (!target) return;

    let best: BackingTrack | null = null;
    let bestScore = 0;
    for (const t of tracks) {
      const s = matchScore(target, `${t.label} ${t.filename}`.trim());
      if (s > bestScore) {
        bestScore = s;
        best = t;
      }
    }
    if (best && bestScore >= 0.4) {
      if (audioUrl !== best.url) {
        setAudioUrl(best.url);
        setMatchedTrack(best.label);
      }
      // Fill the card's metadata from the matched request, but only where the
      // field is still untouched (blank or the demo default) so nothing the user
      // typed is overwritten.
      const m = best.request;
      if (m) {
        const untouched = (v: string, def: string) => !v || v === def;
        setState((prev) => {
          const patch: Partial<CardState> = {};
          if (m.key && untouched(prev.key, DEFAULT_STATE.key)) patch.key = m.key;
          if (m.artist && untouched(prev.show, DEFAULT_STATE.show))
            patch.show = `from ${m.artist}`;
          if (m.client && untouched(prev.dedication, DEFAULT_STATE.dedication))
            patch.dedication = `prepared for ${firstNameOf(m.client)}`;
          return Object.keys(patch).length ? { ...prev, ...patch } : prev;
        });
      }
    } else if (audioUrl && !manualAudioRef.current) {
      setAudioUrl("");
      setMatchedTrack(null);
    }
  }, [tracks, tracksLoaded, state.title, state.show, audioUrl]);

  // Requests that already have a delivered backing file in the bucket — these are
  // the ones worth linking a finished video to.
  const projectOptions = useMemo(() => {
    const known = new Map<string, RequestMeta>();
    for (const t of tracks) {
      if (t.requestId) known.set(t.requestId, t.request as RequestMeta);
    }
    return [...known.entries()]
      .map(([id, meta]) => ({ id, meta }))
      .sort((a, b) => b.meta.created_at.localeCompare(a.meta.created_at));
  }, [tracks]);

  const visibleRequests = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    if (!q) return projectOptions;
    return projectOptions.filter(({ meta }) =>
      `${meta.song} ${meta.artist} ${meta.client}`.toLowerCase().includes(q)
    );
  }, [projectOptions, requestSearch]);

  const pickRequest = (id: string) => {
    const meta = requestMeta.get(id);
    if (!meta) return;
    manualAudioRef.current = true;
    setProjectReqId(id);
    set({
      title: meta.song,
      show: meta.artist ? `from ${meta.artist}` : state.show,
      dedication: meta.client ? `prepared for ${firstNameOf(meta.client)}` : state.dedication,
      key: meta.key || state.key,
    });
    const t = tracks.find((x) => x.requestId === id);
    setAudioUrl(t ? t.url : "");
    setMatchedTrack(null);
    setSavedToRequest(null);
  };

  const clearProject = () => {
    setProjectReqId(null);
    setMatchedTrack(null);
  };

  const slug = useCallback(
    () =>
      state.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "title-card",
    [state.title]
  );

  const download = useCallback(
    (blob: Blob, ext: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug()}-title-card.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [slug]
  );

  const exportPng = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.toBlob((blob) => {
      if (blob) download(blob, "png");
    }, "image/png");
  };

  const recordClip = useCallback(
    async (
      onProgress?: (loaded: number, total: number) => void
    ): Promise<Blob | null> => {
    const cv = canvasRef.current;
    if (!cv || typeof MediaRecorder === "undefined") return null;

    // Without a selected track this stays a silent 6-second title card. With one,
    // the clip runs the full length of the track and mixes its audio in.
    let duration = 6;
    let audio: RecordingAudio | null = null;
    if (audioUrl) {
      const context = new AudioContext();
      if (context.state === "suspended") await context.resume();
      const response = await fetch(audioUrl);
      if (!response.ok) {
        await context.close();
        throw new Error(`Couldn't load the backing track (${response.status}).`);
      }
      const decoded = await context.decodeAudioData(await response.arrayBuffer());
      duration = decoded.duration;
      const source = context.createBufferSource();
      source.buffer = decoded;
      source.connect(context.destination);
      audio = { context, source };
    }

    const cvCtx = cv.getContext("2d");
    const W = dims.w;
    const H = dims.h;
    const fade = 1.1;

    // Runs in the module-level recorder so it survives navigating away: the
    // blob still resolves and the caller (queue/publish) finishes server-side.
    const blob = await recordCanvasClip({
      canvas: cv,
      duration,
      audio: audio ?? undefined,
      fps: 30,
      drawFrame: (elapsed) => {
        if (!cvCtx) return;
        drawCard(cvCtx, W, H, state, logoImg);
        const p = Math.min(elapsed / fade, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        cvCtx.fillStyle = `rgba(245,56,188,${(1 - ease).toFixed(3)})`;
        cvCtx.fillRect(0, 0, W, H);
      },
      onProgress: (p) => onProgress?.(p.loaded, p.total),
    });

    paint();
    return blob;
    },
    [dims.w, dims.h, state, logoImg, paint, audioUrl]
  );

  const exportVideo = useCallback(async () => {
    if (recording) return;
    setRecording(true);
    try {
      const blob = await recordClip();
      if (blob) download(blob, videoFileInfo(blob.type).ext);
    } finally {
      setRecording(false);
    }
  }, [recording, recordClip, download]);

  const publishVideo = useCallback(async () => {
    if (recording || publishing) return;
    setYtUrl(null);
    setYtError(null);
    setSavedToRequest(null);
    const clientId = (import.meta.env.VITE_YOUTUBE_CLIENT_ID ||
      import.meta.env.VITE_GMAIL_CLIENT_ID) as string | undefined;
    if (!clientId) {
      setYtError(
        "Missing VITE_YOUTUBE_CLIENT_ID (or VITE_GMAIL_CLIENT_ID) in the environment."
      );
      return;
    }
    setRecording(true);
    setPublishing(true);
    setPublishProgress(null);
    try {
      // Authorise FIRST, while we're still inside the click's user gesture. The
      // popup would be blocked if we recorded the (real-time) clip beforehand.
      setPublishStep("authorising");
      const token = await getAccessToken(clientId);
      setPublishStep("recording");
      setPublishProgress(null);
      const blob = await recordClip((loaded, total) =>
        setPublishProgress({ loaded, total })
      );
      if (!blob) throw new Error("Recording failed in this browser.");
      setPublishStep("uploading");
      setPublishProgress({ loaded: 0, total: blob.size });
      // Title is built from the live card fields so edits are respected:
      // "Song — Banner (from Show)".
      const showText = state.show.replace(/^\s*from\s+/i, "").trim();
      const titleCore =
        [state.title.trim(), state.banner.trim()].filter(Boolean).join(" — ") ||
        "Backing track";
      const title = `${titleCore}${showText ? ` (from ${showText})` : ""}`;

      // Marketing description: song + who it was for + key, then how to order.
      // Only the first name is used (the dedication is often a full name).
      const dedication = (state.dedication.trim() || linkedRequest?.client || "")
        .replace(/^\s*prepared\s+for\s+/i, "")
        .trim();
      const firstName = dedication.split(/\s+/)[0] || "";
      const description = [
        [
          title,
          firstName ? `Prepared for ${firstName}.` : "",
          state.key ? `Key: ${keyForDisplay(state.key)}.` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        [
          "Custom piano backing tracks — arranged and recorded in your key.",
          "Need a backing track for your audition, performance or practice? I create custom piano backings in your key and tempo, delivered fast.",
          "Order yours: https://pianobackings.danielebuatti.com/form-page",
          "Browse ready-made cuts: https://pianobackings.danielebuatti.com/shop",
        ].join("\n"),
        "Follow: https://www.youtube.com/@pianobackingsbydaniele and https://www.instagram.com/pianobackingsbydaniele/",
        "#pianobackingtrack #backingtrack #auditioncut #musicaltheatre",
      ]
        .filter(Boolean)
        .join("\n\n");
      const id = await uploadToYouTube(
        token,
        blob,
        { title, description, privacy },
        (loaded, total) => setPublishProgress({ loaded, total })
      );
      const url = `https://youtu.be/${id}`;
      setYtUrl(url);
      if (selectedTrack?.requestId) {
        setPublishStep("saving");
        setPublishProgress(null);
        const { data: existing } = await supabase
          .from("backing_requests")
          .select("uploaded_platforms")
          .eq("id", selectedTrack.requestId)
          .maybeSingle();
        const prev =
          existing && typeof existing.uploaded_platforms === "object" && existing.uploaded_platforms
            ? (existing.uploaded_platforms as Record<string, unknown>)
            : {};
        const patch: Record<string, unknown> = {
          youtube_link: url,
          uploaded_platforms: {
            tiktok: false,
            facebook: false,
            instagram: false,
            gumroad: false,
            ...(prev as Record<string, boolean>),
            youtube: true,
          },
        };
        // Persist the key shown on the card, but only when it differs from what
        // the request already has (and never blank out an existing key).
        if (linkedRequest && state.key && state.key !== linkedRequest.key) {
          patch[linkedRequest.keyColumn] = state.key;
        }
        const { error: updateError } = await supabase
          .from("backing_requests")
          .update(patch)
          .eq("id", selectedTrack.requestId);
        if (updateError) throw updateError;
        setSavedToRequest(selectedTrack.label);
      }
    } catch (e) {
      setYtError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setPublishStep(null);
      setPublishProgress(null);
      setRecording(false);
      setPublishing(false);
    }
  }, [recording, publishing, recordClip, state, privacy, selectedTrack, linkedRequest]);

  // Small PNG snapshot of the painted card for the publishing queue's preview /
  // printable PDF. Scaled down so a thumbnail session stays light.
  const captureCardPreview = useCallback(async (): Promise<Blob | null> => {
    const cv = canvasRef.current;
    if (!cv) return null;
    const MAX_W = 1200;
    const sw = Math.round(Math.min(MAX_W, dims.w));
    const sh = Math.round((dims.h / dims.w) * sw);
    const tmp = document.createElement("canvas");
    tmp.width = sw;
    tmp.height = sh;
    const tctx = tmp.getContext("2d");
    if (!tctx) return null;
    tctx.drawImage(cv, 0, 0, sw, sh);
    return new Promise((res) => tmp.toBlob((b) => res(b), "image/png"));
  }, [dims.w, dims.h]);

  // Save the video into the publishing catalogue without posting it: records the
  // full-length card, uploads to the private `content` bucket, creates the asset
  // + YouTube draft, then has the AI draft metadata and flags it for approval.
  const addToQueue = useCallback(async () => {
    if (recording || publishing || queuing) return;
    setQueuing(true);
    setQueueError(null);
    try {
      // Duplicate guard: same song already queued for YouTube? Don't create a second.
      const song = state.title.trim();
      if (song) {
        const { data: alreadyQueued } = await supabase
          .from('publications')
          .select('id')
          .eq('platform', 'youtube')
          .in('status', ['draft', 'pending_approval', 'approved', 'scheduled', 'publishing'])
          .eq('content_assets.song_title', song)
          .limit(1)
          .maybeSingle();
        if (alreadyQueued) {
          throw new Error('This song already has a video in the YouTube publishing queue — check Admin → Publishing first.');
        }
      }
      setQueueStep("recording");
      setQueueResult(null);
      const blob = await recordClip((loaded, total) =>
        setPublishProgress({ loaded, total })
      );
      if (!blob) throw new Error("Recording failed in this browser.");
      setQueueStep("uploading");
      setPublishProgress({ loaded: 0, total: blob.size });

      const { data: user } = await supabase.auth.getUser();
      const id = crypto.randomUUID();
      const queueMime = videoFileInfo(blob.type);
      const path = `content/${id}.${queueMime.ext}`;
      const previewPath = `content/${id}.preview.png`;
      const { error: uploadErr } = await supabase.storage
        .from("content")
        .upload(path, blob, { contentType: queueMime.mime, upsert: false });
      if (uploadErr) throw uploadErr;

      const previewBlob = await captureCardPreview();
      if (previewBlob) {
        const { error: previewErr } = await supabase.storage
          .from("content")
          .upload(previewPath, previewBlob, { contentType: "image/png", upsert: false });
        if (previewErr) throw previewErr;
      }

      const showText = state.show.replace(/^\s*from\s+/i, "").trim();
      const titleCore =
        [state.title.trim(), state.banner.trim()].filter(Boolean).join(" — ") || "Backing track";

      const { data: asset, error: assetErr } = await supabase
        .from("content_assets")
        .insert({
          storage_path: path,
          preview_path: previewBlob ? previewPath : null,
          mime_type: queueMime.mime,
          title: `${titleCore}${showText ? ` (from ${showText})` : ""}`,
          song_title: state.title.trim() || null,
          show: showText || null,
          key: state.key || null,
          dedication:
            state.dedication.trim() || (linkedRequest?.client ?? null) || null,
          request_id: selectedTrack?.requestId ?? null,
          duration_seconds: null,
          aspect: state.aspect,
          created_by: user.user?.id ?? null,
        })
        .select("id")
        .single();
      if (assetErr || !asset) throw new Error(assetErr?.message || "Couldn't create the asset.");

      const { data: pub, error: pubErr } = await supabase
        .from("publications")
        .insert({ asset_id: asset.id, platform: "youtube", status: "draft" })
        .select("id")
        .single();
      if (pubErr || !pub) throw new Error(pubErr?.message || "Couldn't create the publication.");

      setQueueStep("drafting");
      const { error: draftErr } = await supabase.functions.invoke(
        "draft-publication-metadata",
        { body: { asset_id: asset.id, platform: "youtube" } }
      );
      const draftFailed = Boolean(draftErr);

      setQueueResult(
        draftFailed
          ? "Video saved to the publishing queue, but the AI metadata draft failed. Re-draft or edit it in Admin → Publishing."
          : "Saved to the publishing queue with AI-drafted metadata. Review and approve it in Admin → Publishing."
      );
    } catch (e) {
      setQueueError(e instanceof Error ? e.message : "Failed to save to the queue.");
    } finally {
      setQueuing(false);
      setPublishProgress(null);
    }
  }, [recording, publishing, queuing, recordClip, captureCardPreview, state, selectedTrack, linkedRequest]);

  // 30s teaser aimed at TikTok / Instagram: same background, a "Full version on
  // YouTube" footer band, and at most ~30s of the track. Same background-safe
  // recorder, so it too completes even if the user navigates away.
  const recordTeaser = useCallback(
    async (
      onProgress?: (loaded: number, total: number) => void
    ): Promise<Blob | null> => {
      const cv = canvasRef.current;
      if (!cv || typeof MediaRecorder === "undefined") return null;

      let duration = TEASER_SECONDS;
      let audio: RecordingAudio | null = null;
      if (audioUrl) {
        const context = new AudioContext();
        if (context.state === "suspended") await context.resume();
        const response = await fetch(audioUrl);
        if (!response.ok) {
          await context.close();
          throw new Error(`Couldn't load the backing track (${response.status}).`);
        }
        const decoded = await context.decodeAudioData(await response.arrayBuffer());
        duration = Math.min(decoded.duration, TEASER_SECONDS);
        const source = context.createBufferSource();
        source.buffer = decoded;
        source.connect(context.destination);
        audio = { context, source };
      }

      const cvCtx = cv.getContext("2d");
      const W = dims.w;
      const H = dims.h;
      const fade = 1.1;

      const blob = await recordCanvasClip({
        canvas: cv,
        duration,
        audio: audio ?? undefined,
        fps: 30,
        drawFrame: (elapsed) => {
          if (!cvCtx) return;
          drawCard(cvCtx, W, H, state, logoImg);
          const p = Math.min(elapsed / fade, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          cvCtx.fillStyle = `rgba(245,56,188,${(1 - ease).toFixed(3)})`;
          cvCtx.fillRect(0, 0, W, H);
          drawTeaserFooter(cvCtx, W, H);
        },
        onProgress: (p) => onProgress?.(p.loaded, p.total),
      });

      paint();
      return blob;
    },
    [dims.w, dims.h, state, logoImg, paint, audioUrl]
  );

  // Save a 30s teaser (TikTok + Instagram) into the publishing catalogue without
  // posting: uploads the clip, creates one asset + a tiktok + an instagram draft,
  // then AI-drafts each platform's caption and flags them for approval.
  const addTeaserToQueue = useCallback(async () => {
    if (queuing || recording || publishing) return;
    setQueuing(true);
    setQueueStep("recording");
    setQueueResult(null);
    setQueueError(null);
    try {
      const blob = await recordTeaser((loaded, total) =>
        setPublishProgress({ loaded, total })
      );
      if (!blob) throw new Error("Recording failed in this browser.");
      setQueueStep("uploading");
      setPublishProgress({ loaded: 0, total: blob.size });

      const { data: user } = await supabase.auth.getUser();
      const id = crypto.randomUUID();
      const teaserMime = videoFileInfo(blob.type);
      const path = `content/${id}-teaser.${teaserMime.ext}`;
      const previewPath = `content/${id}-teaser.preview.png`;
      const { error: uploadErr } = await supabase.storage
        .from("content")
        .upload(path, blob, { contentType: teaserMime.mime, upsert: false });
      if (uploadErr) throw uploadErr;

      const previewBlob = await captureCardPreview();
      if (previewBlob) {
        const { error: previewErr } = await supabase.storage
          .from("content")
          .upload(previewPath, previewBlob, { contentType: "image/png", upsert: false });
        if (previewErr) throw previewErr;
      }

      const showText = state.show.replace(/^\s*from\s+/i, "").trim();
      const titleCore =
        [state.title.trim(), state.banner.trim()].filter(Boolean).join(" — ") || "Backing track";

      const { data: asset, error: assetErr } = await supabase
        .from("content_assets")
        .insert({
          storage_path: path,
          preview_path: previewBlob ? previewPath : null,
          mime_type: teaserMime.mime,
          title: `${titleCore}${showText ? ` (from ${showText})` : ""} (Teaser)`,
          song_title: state.title.trim() || null,
          show: showText || null,
          key: state.key || null,
          dedication:
            state.dedication.trim() || (linkedRequest?.client ?? null) || null,
          request_id: selectedTrack?.requestId ?? null,
          duration_seconds: TEASER_SECONDS,
          aspect: state.aspect,
          created_by: user.user?.id ?? null,
        })
        .select("id")
        .single();
      if (assetErr || !asset) throw new Error(assetErr?.message || "Couldn't create the asset.");

      const platforms = ["tiktok", "instagram"] as const;
      for (const platform of platforms) {
        const { error: pubErr } = await supabase
          .from("publications")
          .insert({ asset_id: asset.id, platform, status: "draft" });
        if (pubErr) throw pubErr;
      }

      setQueueStep("drafting");
      let draftsFailed = 0;
      for (const platform of platforms) {
        const { error: draftErr } = await supabase.functions.invoke(
          "draft-publication-metadata",
          { body: { asset_id: asset.id, platform } }
        );
        if (draftErr) draftsFailed += 1;
      }

      setQueueResult(
        draftsFailed
          ? "Teaser saved for TikTok & Instagram, but the AI caption draft failed. Re-draft or edit it in Admin → Publishing."
          : "30s teaser saved for TikTok & Instagram with AI-drafted captions. Review them in Admin → Publishing."
      );
    } catch (e) {
      setQueueError(e instanceof Error ? e.message : "Failed to save the teaser.");
    } finally {
      setQueuing(false);
      setPublishProgress(null);
    }
  }, [queuing, recording, publishing, recordTeaser, captureCardPreview, state, selectedTrack, linkedRequest]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 p-3">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#1C0357]/70">
            Project / request
          </span>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={requestSearch}
              onChange={(e) => setRequestSearch(e.target.value)}
              placeholder="Search song, artist, client…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm font-bold text-[#1C0357] placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
            />
          </div>
          {projectOptions.length === 0 ? (
            <p className="mt-2 text-xs text-amber-600">
              No delivered requests yet — upload a backing to a request first.
            </p>
          ) : visibleRequests.length === 0 ? (
            <p className="mt-2 text-xs text-gray-400">No requests match that search.</p>
          ) : (
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1">
              {visibleRequests.map(({ id, meta }) => (
                  <button
                    key={id}
                    onClick={() => pickRequest(id)}
                    title={id}
                    className={`block w-full truncate rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${
                      projectReqId === id
                        ? "border-[#1C0357] bg-[#1C0357] text-white"
                        : "border-gray-200 bg-white text-[#1C0357] hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-bold">{meta.song}</span>
                    <span className={projectReqId === id ? "text-white/70" : "text-gray-500"}>
                      {" "}
                      — {meta.artist || "no show"}
                      {meta.client ? ` (${meta.client})` : ""}
                    </span>
                  </button>
                )
              )}
            </div>
          )}
          {projectReqId && (
            <p className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-[#1C0357]/70">
              <span className="truncate">
                Prefilled:{" "}
                {projectOptions.find((o) => o.id === projectReqId)?.meta.song ??
                  "request"}
              </span>
              <button
                onClick={clearProject}
                className="shrink-0 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#1C0357] hover:bg-gray-50"
              >
                Clear
              </button>
            </p>
          )}
        </div>

        <Field
          label="Banner"
          value={state.banner}
          onChange={(v) => set({ banner: v })}
          placeholder="AUDITION CUT"
        />
        <Field
          label="Song title"
          value={state.title}
          onChange={(v) => set({ title: v })}
          placeholder="Gotta Get Out"
        />
        <Field
          label="From / show"
          value={state.show}
          onChange={(v) => set({ show: v })}
          placeholder="from Ordinary Days"
        />
        <Field
          label="Dedication"
          value={state.dedication}
          onChange={(v) => set({ dedication: v })}
          placeholder="prepared for Sophia"
        />
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1C0357]/70">
            Key
          </span>
          <select
            value={state.key}
            onChange={(e) => set({ key: e.target.value })}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-[#1C0357] focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
          >
            {KEY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1C0357]/70">
            Banner pixel font
          </span>
          <div className="grid grid-cols-3 gap-2">
            {PIXEL_FONTS.map((f) => (
              <button
                key={f.family}
                onClick={() => set({ pixelFont: f.family })}
                className={`rounded-xl border px-2 py-2 text-xs font-bold transition-colors ${
                  state.pixelFont === f.family
                    ? "border-[#1C0357] bg-[#1C0357] text-white"
                    : "border-gray-200 bg-white text-[#1C0357] hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-bold text-[#1C0357]">
          <input
            type="checkbox"
            checked={state.showTagline}
            onChange={(e) => set({ showTagline: e.target.checked })}
            className="h-4 w-4 accent-[#F538BC]"
          />
          Show "by Daniele" under logo
        </label>

        <div>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1C0357]/70">
            Format
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ASPECTS) as Aspect[]).map((a) => (
              <button
                key={a}
                onClick={() => set({ aspect: a })}
                className={`rounded-xl border px-2 py-2 text-xs font-bold transition-colors ${
                  state.aspect === a
                    ? "border-[#1C0357] bg-[#1C0357] text-white"
                    : "border-gray-200 bg-white text-[#1C0357] hover:bg-gray-50"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-400">{dims.label} · {dims.w}×{dims.h}</p>
        </div>

        <div>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1C0357]/70">
            Backing track
          </span>
          <select
            value={audioUrl}
            onChange={(e) => {
              manualAudioRef.current = true;
              setAudioUrl(e.target.value);
              setMatchedTrack(null);
              setSavedToRequest(null);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-[#1C0357] focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
          >
            <option value="">Silent 6-second title card</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.url}>
                {t.label}
              </option>
            ))}
          </select>
          {tracksLoaded && tracks.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No backing tracks found in the bucket yet.
            </p>
          )}
          {linkedRequest && (
            <p className="mt-1 text-xs text-[#1C0357]/60">
              Linked to request — publishing saves the video link and card key on it.
            </p>
          )}
          {matchedTrack ? (
            <p className="mt-1 text-xs text-green-600">
              <span className="font-bold">Auto-matched</span> — {matchedTrack}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">
              {audioUrl
                ? "Runs the full track — the card fades in and stays for the whole song."
                : tracksLoaded
                  ? "Matching is automatic — it picks the delivered track for the song above."
                  : "Finding your delivered tracks…"}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={exportPng}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#F538BC] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Export PNG
          </button>
          <button
            onClick={exportVideo}
            disabled={recording}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1C0357] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Video className="h-4 w-4" /> {recording ? "Recording…" : "Export video"}
          </button>
        </div>
        <button
          onClick={() => setState(DEFAULT_STATE)}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-[#1C0357] transition-colors hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> Reset
        </button>

        <div className="rounded-xl border border-gray-200 p-3">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#1C0357]/70">
            Publish to YouTube
          </span>
          <div className="flex gap-2">
            <select
              value={privacy}
              onChange={(e) =>
                setPrivacy(e.target.value as "private" | "unlisted" | "public")
              }
              className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm font-bold text-[#1C0357] focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
            >
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
            <button
              onClick={publishVideo}
              disabled={publishing || recording}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#FF0000] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Youtube className="h-4 w-4" />{" "}
              {publishing ? "Publishing…" : "Publish"}
            </button>
          </div>
          {publishing && (
            <ol className="mt-3 space-y-2.5">
              {publishSteps.map((step, i) => {
                const currentIndex = publishStep
                  ? publishSteps.indexOf(publishStep)
                  : -1;
                const isActive = step === publishStep;
                const isDone = currentIndex > -1 && i < currentIndex;
                const loaded = publishProgress?.loaded ?? 0;
                const total = publishProgress?.total ?? 0;
                const pct =
                  total > 0
                    ? Math.min(100, Math.round((loaded / total) * 100))
                    : 0;
  return (
                  <li key={step} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {isDone ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : isActive ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#F538BC]" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-xs ${
                          isActive
                            ? "font-bold text-[#1C0357]"
                            : isDone
                              ? "text-green-700"
                              : "text-gray-400"
                        }`}
                      >
                        {PUBLISH_STEP_LABELS[step]}
                        {isDone ? " — done" : ""}
                      </span>
                      {isActive && step === "authorising" && (
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          A Google window opens — allow upload access to
                          continue.
                        </p>
                      )}
                      {isActive &&
                        (step === "recording" || step === "uploading") && (
                          <div className="mt-1.5">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-[#F538BC] transition-[width] duration-150"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="mt-0.5 text-[11px] text-gray-500">
                              {step === "recording"
                                ? total > 0
                                  ? `${formatClock(loaded)} / ${formatClock(total)}`
                                  : "Preparing the track…"
                                : `${(loaded / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB · ${pct}%`}
                            </p>
                          </div>
                        )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {ytError && <p className="mt-2 text-xs text-red-500">{ytError}</p>}
          {savedToRequest && (
            <p className="mt-2 text-xs font-bold text-green-600">
              Saved on the request — {savedToRequest}
            </p>
          )}
          {ytUrl && (
            <p className="mt-2 text-xs text-green-600">
              Uploaded —{" "}
              <a
                className="underline"
                href={ytUrl}
                target="_blank"
                rel="noreferrer"
              >
                {ytUrl}
              </a>
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 p-3">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#1C0357]/70">
            Publishing queue
          </span>
          <p className="mb-2 text-xs text-gray-500">
            Save this video without posting it — AI drafts the title and blurb,
            then you approve the weekly slot in Admin → Publishing.
          </p>
          <button
            onClick={addToQueue}
            disabled={queuing || recording || publishing}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#1C0357] bg-white px-4 py-2.5 text-sm font-bold text-[#1C0357] transition-colors hover:bg-[#1C0357] hover:text-white disabled:opacity-50"
          >
            <ListChecks className="h-4 w-4" />
            {queuing
              ? queueStep === "recording"
                ? "Recording…"
                : queueStep === "uploading"
                  ? "Uploading…"
                  : "Drafting metadata…"
              : "Save to publishing queue"}
          </button>
          <button
            onClick={addTeaserToQueue}
            disabled={queuing || recording || publishing}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#F538BC]/40 bg-[#F538BC]/5 px-4 py-2.5 text-sm font-bold text-[#F538BC] transition-colors hover:bg-[#F538BC] hover:text-white disabled:opacity-50"
          >
            <Smartphone className="h-4 w-4" />
            Save teaser (TikTok & IG)
          </button>
          <p className="mt-2 text-[11px] text-gray-400">
            30-second teaser that points to the full version on YouTube — approved
            captions appear under TikTok & Instagram in Admin → Publishing.
          </p>
          {queuing && queueStep === "recording" && publishProgress && (
            <p className="mt-2 text-[11px] text-gray-500">
              {publishProgress.total > 0
                ? `${formatClock(publishProgress.loaded)} / ${formatClock(publishProgress.total)}`
                : "Preparing the track…"}
            </p>
          )}
          {queuing && queueStep === "uploading" && publishProgress && (
            <p className="mt-2 text-[11px] text-gray-500">
              {(publishProgress.loaded / 1048576).toFixed(1)} /{" "}
              {(publishProgress.total / 1048576).toFixed(1)} MB
            </p>
          )}
          {queueError && <p className="mt-2 text-xs text-red-500">{queueError}</p>}
          {queueResult && (
            <p className="mt-2 text-xs font-bold text-green-600">{queueResult}</p>
          )}
        </div>

        <p className="text-xs leading-relaxed text-gray-400">
          Banner uses the real arcade font. Song block is the self-hosted
          Baskervville stand-in; drop{" "}
          <code className="rounded bg-gray-100 px-1">BaskervilleDisplayPT-Italic.otf</code>{" "}
          into <code className="rounded bg-gray-100 px-1">public/fonts/</code> to
          switch to the exact face — no code change needed.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-[#FAF3E8]/40 p-4">
        <div className="flex items-center gap-2 border-b border-gray-200/70 pb-3">
          <Film className="h-4 w-4 text-[#F538BC]" />
          <span className="text-sm font-bold text-[#1C0357]">Live preview</span>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl shadow-lg">
          <canvas
            ref={canvasRef}
            width={dims.w}
            height={dims.h}
            className="block h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}