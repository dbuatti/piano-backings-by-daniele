import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Film, RefreshCw, Video, Youtube } from "lucide-react";
import "@fontsource/press-start-2p";
import "@fontsource/silkscreen/400.css";
import "@fontsource/silkscreen/700.css";
import "@fontsource/vt323";
import "./videoTitleCardFonts.css";

// ---------- Fonts ----------
// Real faces first (activated by dropping files into public/fonts — see
// videoTitleCardFonts.css); free @fontsource stand-ins fill in until then.
const FONT_SCRIPT = '"Baskerville Display PT", "Baskervville", Georgia, serif';
const FONT_SERIF = '"Baskervville", Georgia, serif';
const FONT_SANS = '"Inter", -apple-system, "Segoe UI", sans-serif';

// Video-game pixel options for the top banner (stand-ins until Arcade Gamer
// is dropped into public/fonts).
const PIXEL_FONTS = [
  { family: "Press Start 2P", label: "Press Start 2P" },
  { family: "Silkscreen", label: "Silkscreen" },
  { family: "VT323", label: "VT323" },
];

const LOGO_SRC = "/pasted-image-2025-09-19T05-15-20-729Z.png";

function setTracking(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
  }
}

// ---------- Palette ----------
const PINK = "#F538BC";
const KEY_YELLOW = "#EDE04A";
const BRAND_YELLOW = "#FFE94D";
const WHITE = "#FFFFFF";
const GREY = "#C7C4CF";
const NAVY = "#1B0057";

// ---------- Sizes ----------
type Aspect = "16:9" | "9:16" | "1:1";

const ASPECTS: Record<Aspect, { label: string; w: number; h: number }> = {
  "16:9": { label: "YouTube · Widescreen", w: 1920, h: 1080 },
  "9:16": { label: "Shorts / Reels · Vertical", w: 1080, h: 1920 },
  "1:1": { label: "Square · Feed", w: 1080, h: 1080 },
};

type CardState = {
  banner: string;
  title: string;
  show: string;
  dedication: string;
  key: string;
  aspect: Aspect;
  pixelFont: string;
  showTagline: boolean;
};

const DEFAULT_STATE: CardState = {
  banner: "Audition Cut",
  title: "Gotta Get Out",
  show: "from Ordinary Days",
  dedication: "prepared for Sophia",
  key: "C Major",
  aspect: "16:9",
  pixelFont: "Press Start 2P",
  showTagline: false,
};

// ---------- Drawing ----------
function fitSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  base: number,
  maxW: number
) {
  const width = ctx.measureText(text).width;
  if (width <= maxW) return base;
  return Math.max(Math.round(base * (maxW / width)), 8);
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  s: CardState,
  logoImg: HTMLImageElement | null
) {
  const bannerH = Math.round(H * 0.14);
  const M = Math.round(Math.min(W, H) * 0.045);

  // ---- background: flat hot pink ----
  ctx.fillStyle = PINK;
  ctx.fillRect(0, 0, W, H);

  // ---- top banner (navy) + gold accent rule ----
  const square = Math.abs(W / H - 1) < 0.05;
  const U = Math.max(W, H) * (square ? 1.4 : 1);
  const ruleH = Math.max(3, Math.round(H * 0.006));
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, bannerH);
  ctx.fillStyle = KEY_YELLOW;
  ctx.fillRect(0, bannerH, W, ruleH);

  // ---- key tag (yellow pill, straddling the gold rule) ----
  const portrait = H > W;
  let tagW: number;
  let tagH: number;
  let tagX: number;
  let tagR: number;
  let keySize: number;
  if (portrait) {
    keySize = Math.round(Math.min(W, H) * 0.044);
    ctx.font = `700 ${keySize}px ${FONT_SANS}`;
    tagH = Math.round(keySize * 1.95);
    tagW = Math.round(ctx.measureText(s.key).width + keySize * 1.6);
    tagX = Math.round((W - tagW) / 2);
    tagR = Math.round(tagH / 2);
  } else {
    tagW = Math.round(U * 0.19);
    tagH = Math.round(U * 0.05);
    tagX = W - M - tagW;
    tagR = Math.round(tagH * 0.28);
    const keyBase = Math.round(tagH * 0.44);
    ctx.font = `700 ${keyBase}px ${FONT_SANS}`;
    keySize = fitSize(ctx, s.key, keyBase, tagW * 0.76);
  }
  const tagY = Math.round(bannerH + ruleH / 2 - tagH / 2);
  ctx.fillStyle = KEY_YELLOW;
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, tagR);
  ctx.fill();
  ctx.font = `700 ${keySize}px ${FONT_SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = NAVY;
  ctx.fillText(s.key, tagX + tagW / 2, tagY + tagH / 2 + Math.round(tagH * 0.02));

  // ---- banner text (video-game pixel, white, centered) ----
  const bannerText = s.banner.toUpperCase();
  const bannerMaxW = portrait ? W - M * 2 : tagX - M * 1.4;
  const baseBanner = Math.round(U * 0.024);
  const bannerFont = (size: number) =>
    `400 ${size}px "Arcade Gamer", "${s.pixelFont}", "Courier New", monospace`;
  ctx.font = bannerFont(baseBanner);
  const bannerSize = fitSize(ctx, bannerText, baseBanner, bannerMaxW);
  ctx.font = bannerFont(bannerSize);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = WHITE;
  let bx = W / 2;
  const bw = ctx.measureText(bannerText).width;
  if (!portrait) {
    if (bx - bw / 2 < M * 1.1) bx = M * 1.1 + bw / 2;
    if (bx + bw / 2 > tagX - 14) bx = tagX - 14 - bw / 2;
  }
  const bm = ctx.measureText(bannerText);
  const bAsc = bm.fontBoundingBoxAscent || 0;
  const bDesc = bm.fontBoundingBoxDescent || 0;
  const by = bannerH / 2 + (bAsc - bDesc) / 2;
  ctx.fillText(bannerText, bx, by);

  // ---- logo geometry (referenced by both centering and drawing) ----
  const bySize = Math.round(U * 0.02);
  const brandBottom = H * 0.94;
  const hasLogo = logoImg && logoImg.naturalWidth > 0 && logoImg.naturalHeight > 0;
  const logoH = hasLogo ? Math.round(U * 0.062) : Math.round(U * 0.05);
  const logoW = hasLogo
    ? Math.round(logoH * (logoImg.naturalWidth / logoImg.naturalHeight))
    : 0;
  const logoTop = brandBottom - logoH;

  // ---- song block (Baskerville italic, white, centered) ----
  const zoneTop = bannerH + H * 0.014;
  const zoneBottom = logoTop - H * 0.03;
  const avail = Math.max(zoneBottom - zoneTop, 1);

  let lineSize = Math.round(U * 0.072);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  setTracking(ctx, Math.max(1, Math.round(U * 0.0009)));

  const textMaxW = W - M * 2;
  const lines = [s.title, s.show, s.dedication];
  for (const t of lines) {
    ctx.font = `italic 400 ${lineSize}px ${FONT_SCRIPT}`;
    const w = ctx.measureText(t).width;
    if (w > textMaxW) {
      lineSize = Math.max(Math.round(lineSize * (textMaxW / w)), 8);
    }
  }

  const lead = Math.round(lineSize * 1.32);
  const needed = lineSize * 3.72;
  if (needed > avail) {
    lineSize = Math.max(Math.round(lineSize * (avail / needed)), 8);
  }

  const areaCenter = (zoneTop + zoneBottom) / 2;

  ctx.fillStyle = WHITE;
  const fit = (text: string) => {
    ctx.font = `italic 400 ${lineSize}px ${FONT_SCRIPT}`;
    return fitSize(ctx, text, lineSize, textMaxW);
  };
  const tSize = fit(s.title);
  const sSize = fit(s.show);
  const dSize = fit(s.dedication);

  const blockH = lineSize * 0.78 + lead * 2 + lineSize * 0.16;
  const tY = areaCenter - blockH / 2 + lineSize * 0.78;
  const sY = tY + lead;
  const dY = sY + lead;

  ctx.font = `italic 400 ${tSize}px ${FONT_SCRIPT}`;
  ctx.fillText(s.title, W / 2, tY);
  ctx.font = `italic 400 ${sSize}px ${FONT_SCRIPT}`;
  ctx.fillText(s.show, W / 2, sY);
  ctx.font = `italic 400 ${dSize}px ${FONT_SCRIPT}`;
  ctx.fillText(s.dedication, W / 2, dY);

  setTracking(ctx, 0);

  // ---- brand block (bottom): logo wordmark ----
  if (hasLogo) {
    ctx.drawImage(logoImg, (W - logoW) / 2, logoTop, logoW, logoH);
  } else {
    const brandSize = Math.round(W * 0.046);
    ctx.font = `600 ${brandSize}px ${FONT_SERIF}`;
    ctx.fillStyle = BRAND_YELLOW;
    ctx.fillText("Piano Backings", W / 2, brandBottom);
  }

  if (s.showTagline) {
    const byY = Math.min(H - M - bySize, brandBottom + bySize * 1.5);
    ctx.font = `400 ${bySize}px ${FONT_SANS}`;
    ctx.fillStyle = GREY;
    ctx.fillText("by Daniele", W / 2, byY);
  }
}

// ---------- YouTube upload (client-side OAuth via Google Identity Services) ----------
const YT_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

type GisTokenResponse = { access_token?: string; error?: string };
type GisError = { message?: string };
type GisTokenClient = { requestAccessToken: (opts?: { prompt?: string }) => void };
type GisOAuth2 = {
  initTokenClient: (cfg: {
    client_id: string;
    scope: string;
    callback: (r: GisTokenResponse) => void;
    error_callback?: (e: GisError) => void;
  }) => GisTokenClient;
};
type GoogleGlobal = { accounts?: { oauth2?: GisOAuth2 } };

let gisPromise: Promise<void> | null = null;

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
  await loadGis();
  const g = (window as unknown as { google?: GoogleGlobal }).google;
  const oauth2 = g?.accounts?.oauth2;
  if (!oauth2) throw new Error("Google Identity Services unavailable");
  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: YT_UPLOAD_SCOPE,
      callback: (resp) => {
        if (resp.access_token) resolve(resp.access_token);
        else reject(new Error(resp.error || "Google did not return a token"));
      },
      error_callback: (err) =>
        reject(new Error(err?.message || "Google authorization failed")),
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}

async function uploadToYouTube(
  token: string,
  blob: Blob,
  meta: { title: string; description: string; privacy: "private" | "unlisted" | "public" }
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
        "X-Upload-Content-Type": "video/webm",
        "X-Upload-Content-Length": String(blob.size),
      },
      body: JSON.stringify(body),
    }
  );
  if (!init.ok) throw new Error(`Upload init failed (${init.status})`);
  const session = init.headers.get("Location");
  if (!session) throw new Error("YouTube did not return an upload session");
  const put = await fetch(session, {
    method: "PUT",
    headers: { "Content-Type": "video/webm" },
    body: blob,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  const data = (await put.json()) as { id?: string };
  if (!data.id) throw new Error("Upload succeeded but no video id returned");
  return data.id;
}

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
  const [ytStatus, setYtStatus] = useState<string | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);
  const [ytUrl, setYtUrl] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<"private" | "unlisted" | "public">(
    "unlisted"
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dims = ASPECTS[state.aspect];

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

  const recordClip = useCallback(async (): Promise<Blob | null> => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx || typeof MediaRecorder === "undefined") return null;

    const stream = cv.captureStream(30);
    const mimeType = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(
      stream,
      mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined
    );
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise<void>((res) => {
      rec.onstop = () => res();
    });

    const duration = 6;
    const fade = 1.1;
    const t0 = performance.now();
    rec.start();

    await new Promise<void>((res) => {
      const loop = () => {
        const el = (performance.now() - t0) / 1000;
        const p = Math.min(el / fade, 1);
        drawCard(ctx, dims.w, dims.h, state, logoImg);
        const ease = 1 - Math.pow(1 - p, 3);
        ctx.fillStyle = `rgba(245,56,188,${(1 - ease).toFixed(3)})`;
        ctx.fillRect(0, 0, dims.w, dims.h);
        if (el < duration) requestAnimationFrame(loop);
        else res();
      };
      requestAnimationFrame(loop);
    });

    rec.stop();
    stream.getTracks().forEach((tr) => tr.stop());
    await stopped;
    paint();
    return new Blob(chunks, { type: "video/webm" });
  }, [dims.w, dims.h, state, logoImg, paint]);

  const exportVideo = useCallback(async () => {
    if (recording) return;
    setRecording(true);
    try {
      const blob = await recordClip();
      if (blob) download(blob, "webm");
    } finally {
      setRecording(false);
    }
  }, [recording, recordClip, download]);

  const publishVideo = useCallback(async () => {
    if (recording || publishing) return;
    setYtUrl(null);
    setYtError(null);
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
    try {
      setYtStatus("Recording clip…");
      const blob = await recordClip();
      if (!blob) throw new Error("Recording failed in this browser.");
      setYtStatus("Authorising with Google…");
      const token = await getAccessToken(clientId);
      setYtStatus("Uploading to YouTube…");
      const title = `${state.title}${state.show ? ` — ${state.show}` : ""} (title card)`;
      const description = [state.dedication, state.key ? `Key: ${state.key}` : ""]
        .filter(Boolean)
        .join("\n");
      const id = await uploadToYouTube(token, blob, {
        title,
        description,
        privacy,
      });
      setYtUrl(`https://youtu.be/${id}`);
      setYtStatus(null);
    } catch (e) {
      setYtStatus(null);
      setYtError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setRecording(false);
      setPublishing(false);
    }
  }, [recording, publishing, recordClip, state, privacy]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
      <div className="space-y-4">
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
        <Field
          label="Key"
          value={state.key}
          onChange={(v) => set({ key: v })}
          placeholder="C Major"
        />

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
          {ytStatus && <p className="mt-2 text-xs text-gray-500">{ytStatus}</p>}
          {ytError && <p className="mt-2 text-xs text-red-500">{ytError}</p>}
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