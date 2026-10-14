// Shared title-card painting for the backing-track videos. Used by both the
// Title Card Generator (interactive editor) and Admin → Publishing's
// "Queue more tracks" panel so every recorded video is pixel-identical.
import { keyForDisplay } from "@/utils/musicalKeys";

// The card's faces ship with this module rather than with one page: whichever
// screen records a card (the Title Card Generator, or Admin → Publishing's
// re-record flow) gets the same fonts, instead of falling back to Georgia and
// Courier on the admin route.
import "@fontsource/press-start-2p";
import "@fontsource/silkscreen/400.css";
import "@fontsource/silkscreen/700.css";
import "@fontsource/vt323";
import "../pages/videoTitleCardFonts.css";

// Font stacks the canvas asks for. A recording must await document.fonts.load
// for these before drawing, or the canvas paints the fallback face instead.
export const CARD_FONT_PROBES = [
  '400 32px "Arcade Gamer"',
  '400 32px "Press Start 2P"',
  '700 32px "Silkscreen"',
  '400 32px "VT323"',
  'italic 400 32px "Baskervville"',
  '400 32px "Inter"',
] as const;

/** Resolves once every face the card needs is ready to paint. */
export function loadCardFonts(): Promise<unknown> {
  return Promise.allSettled([
    document.fonts.ready,
    ...CARD_FONT_PROBES.map((f) => document.fonts.load(f)),
  ]);
}

// ---------- Palette ----------
const PINK = "#F538BC";
export const KEY_YELLOW = "#EDE04A";
const BRAND_YELLOW = "#FFE94D";
const GREY = "#C7C4CF";
export const WHITE = "#FFFFFF";
export const NAVY = "#1B0057";

// ---------- Fonts ----------
// Real faces first (activated by dropping files into public/fonts — see
// videoTitleCardFonts.css); free @fontsource stand-ins fill in until then.
const FONT_SCRIPT = '"Baskerville Display PT", "Baskervville", Georgia, serif';
const FONT_SERIF = '"Baskervville", Georgia, serif';
export const FONT_SANS = '"Inter", -apple-system, "Segoe UI", sans-serif';

export const LOGO_SRC = "/pasted-image-2025-09-19T05-15-20-729Z.png";

function setTracking(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) {
    try {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
        `${px}px`;
    } catch {
      // Unsupported on this browser; tracking simply won't apply.
    }
  }
}

// ---------- Sizes ----------
export type Aspect = "16:9" | "9:16" | "1:1";

// Preview/record dimensions per aspect (kept modest so thumbnail work is light).
export const CARD_DIMS: Record<Aspect, { w: number; h: number }> = {
  "16:9": { w: 640, h: 360 },
  "9:16": { w: 405, h: 720 },
  "1:1": { w: 640, h: 640 },
};

export type CardState = {
  banner: string;
  title: string;
  show: string;
  dedication: string;
  key: string;
  aspect: Aspect;
  pixelFont: string;
  showTagline: boolean;
};

// Client names are private — the card and descriptions only ever surface a
// client's first name. Auto-filled dedications carry the full client name, so
// reduce anything written with the "prepared for" prefix to the first name;
// hand-typed dedications that don't use that prefix are left as written.
export const firstNameOf = (name: string) => (name || "").trim().split(/\s+/)[0] || "";
export const cardDedication = (raw: string) => {
  const m = raw.match(/^\s*prepared\s+for\s+(.+?)\s*$/i);
  return m ? `prepared for ${firstNameOf(m[1])}` : raw;
};

// Default card for a delivered request: widescreen YouTube thumbnail with the
// song, source, first-name-only dedication and the request's key.
export function defaultCardState(meta: {
  song?: string | null;
  artist?: string | null;
  client?: string | null;
  key?: string | null;
}): CardState {
  const artist = (meta.artist || "").replace(/^\s*from\s+/i, "").trim();
  return {
    banner: "Audition Cut",
    title: (meta.song || "").trim() || "Backing track",
    show: artist ? `from ${artist}` : "",
    dedication: meta.client ? `prepared for ${firstNameOf(meta.client)}` : "",
    key: meta.key || "C Major (0)",
    aspect: "16:9",
    pixelFont: "Press Start 2P",
    showTagline: false,
  };
}

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

export function drawCard(
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
  const keyText = keyForDisplay(s.key);
  let tagW: number;
  let tagH: number;
  let tagX: number;
  let tagR: number;
  let keySize: number;
  if (portrait) {
    keySize = Math.round(Math.min(W, H) * 0.044);
    ctx.font = `700 ${keySize}px ${FONT_SANS}`;
    tagH = Math.round(keySize * 1.95);
    tagW = Math.round(ctx.measureText(keyText).width + keySize * 1.6);
    tagX = Math.round((W - tagW) / 2);
    tagR = Math.round(tagH / 2);
  } else {
    tagW = Math.round(U * 0.19);
    tagH = Math.round(U * 0.05);
    tagX = W - M - tagW;
    tagR = Math.round(tagH * 0.28);
    const keyBase = Math.round(tagH * 0.44);
    ctx.font = `700 ${keyBase}px ${FONT_SANS}`;
    keySize = fitSize(ctx, keyText, keyBase, tagW * 0.76);
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
  ctx.fillText(keyText, tagX + tagW / 2, tagY + tagH / 2 + Math.round(tagH * 0.02));

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
  const dedicationDisplay = cardDedication(s.dedication);
  const lines = [s.title, s.show, dedicationDisplay];
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
  const dSize = fit(dedicationDisplay);

  const blockH = lineSize * 0.78 + lead * 2 + lineSize * 0.16;
  const tY = areaCenter - blockH / 2 + lineSize * 0.78;
  const sY = tY + lead;
  const dY = sY + lead;

  ctx.font = `italic 400 ${tSize}px ${FONT_SCRIPT}`;
  ctx.fillText(s.title, W / 2, tY);
  ctx.font = `italic 400 ${sSize}px ${FONT_SCRIPT}`;
  ctx.fillText(s.show, W / 2, sY);
  ctx.font = `italic 400 ${dSize}px ${FONT_SCRIPT}`;
  ctx.fillText(dedicationDisplay, W / 2, dY);

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

// Preloads the card logo once and shares it across every recording.
let logoPromise: Promise<HTMLImageElement | null> | null = null;
export function loadCardLogo(): Promise<HTMLImageElement | null> {
  if (!logoPromise) {
    logoPromise = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = LOGO_SRC;
    }).catch(() => null);
  }
  return logoPromise;
}

// 16:9 snapshot of a recorded card for the queue's preview/PDF. Scaled to keep
// thumbnail work light.
export function captureCardSnapshot(
  canvas: HTMLCanvasElement
): Promise<Blob | null> {
  const MAX_W = 1200;
  const sw = Math.round(Math.min(MAX_W, canvas.width));
  const sh = Math.round((canvas.height / canvas.width) * sw);
  const tmp = document.createElement("canvas");
  tmp.width = sw;
  tmp.height = sh;
  const tctx = tmp.getContext("2d");
  if (!tctx) return Promise.resolve(null);
  tctx.drawImage(canvas, 0, 0, sw, sh);
  return new Promise((res) => tmp.toBlob((b) => res(b), "image/png"));
}

// Render a fresh card straight to a PNG blob — used to give a shop draft a real
// product image without any recording or canvas-ref juggling.
export async function renderCardToBlob(
  meta: { song?: string | null; artist?: string | null; client?: string | null; key?: string | null },
  aspect: Aspect = "1:1"
): Promise<Blob | null> {
  // Paint only once the faces are loaded, or the PNG bakes in the fallbacks.
  await loadCardFonts();
  const dims = CARD_DIMS[aspect];
  const canvas = document.createElement("canvas");
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const logo = await loadCardLogo();
  drawCard(ctx, canvas.width, canvas.height, { ...defaultCardState(meta), aspect }, logo);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}