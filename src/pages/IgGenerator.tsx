import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ---------- Brand tokens (from src/globals.css --accent) ----------
const PINK = "#F538BC";
const PINK_DEEP = "#C81A8E";
const CREAM = "#FAF3E8";
const CREAM_DIM = "rgba(250, 243, 232, 0.82)";
const CREAM_FAINT = "rgba(250, 243, 232, 0.28)";
const DARK = "#1C0357";

const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const W = 1080;
const H = 1350;
const MARGIN = Math.round(W * 0.10);

export type TemplateId = "classic" | "cover" | "quote" | "list" | "cta";

export type SlideState = {
  template: TemplateId;
  eyebrow: string;
  headline: string;
  sub: string;
  list: string[];
  showKeyline: boolean;
  logoId: string; // "" = none
  showVignette: boolean;
};

export type Logo = { id: string; name: string; src: string; builtin?: boolean };

export type Carousel = {
  id: string;
  name: string;
  slides: SlideState[];
  logos: Logo[];
  caption: string;
  updatedAt: number;
};

const STORAGE_CAROUSELS = "pb_ig_carousels_v1";
const STORAGE_LOGOS = "pb_ig_logos_v1";

// Built-in logos pulled from the repo's public/ folder
const BUILTIN_LOGOS: Logo[] = [
  { id: "builtin-profile", name: "Daniele (profile)", src: "/daniele-profile.png", builtin: true },
  { id: "builtin-wordmark", name: "Wordmark (wide)", src: "/pasted-image-2025-09-19T05-15-20-729Z.png", builtin: true },
];

// ---------- Starter templates ----------
function starterSlides(): SlideState[] {
  const base = (t: TemplateId, partial: Partial<SlideState>): SlideState => ({
    template: t,
    eyebrow: "Piano Backings by Daniele",
    headline: "",
    sub: "DM to order · Spotify-quality audio",
    list: [],
    showKeyline: true,
    logoId: "builtin-profile",
    showVignette: true,
    ...partial,
  });
  return [
    base("classic", {
      eyebrow: "New this week",
      headline: "Backing tracks\nthat make you\nsound like home.",
      sub: "Custom accompaniments for auditions & practice.\nDM to order · spotify-quality audio",
    }),
    base("cover", {
      eyebrow: "Carousel · 1 of N",
      headline: "How I build\na custom backing",
      sub: "Swipe →",
      showKeyline: false,
    }),
    base("quote", {
      eyebrow: "From a client",
      headline: "“It finally felt\nlike the piano\nwas breathing\nwith me.”",
      sub: "— Sara M., audition prep",
      showKeyline: false,
    }),
    base("list", {
      eyebrow: "What you get",
      headline: "Every track\nships with",
      list: [
        "High-fidelity WAV + MP3",
        "Your key, your tempo",
        "Lyric-marked lead sheet",
        "Unlimited play-throughs",
      ],
      sub: "From $15 / track · DM to order",
    }),
    base("cta", {
      eyebrow: "Ready when you are",
      headline: "Send me\nthe song.\nI’ll send you\nthe studio.",
      sub: "@pianobackingsbydaniele",
      showKeyline: true,
    }),
  ];
}

// ---------- Preset copy library (one-click load into current slide) ----------
type CopyPreset = { id: string; label: string; template: TemplateId; state: Partial<SlideState> };
const COPY_PRESETS: CopyPreset[] = [
  { id: "cp-1", label: "Hook · “sound like home”", template: "classic", state: { eyebrow: "New this week", headline: "Backing tracks\nthat make you\nsound like home.", sub: "Custom accompaniments for auditions & practice.\nDM to order · spotify-quality audio" } },
  { id: "cp-2", label: "Process · “how I build”", template: "cover", state: { eyebrow: "Carousel · 1 of N", headline: "How I build\na custom backing", sub: "Swipe →" } },
  { id: "cp-3", label: "Quote · client story", template: "quote", state: { eyebrow: "From a client", headline: "“It finally felt\nlike the piano\nwas breathing\nwith me.”", sub: "— Sara M., audition prep" } },
  { id: "cp-4", label: "List · what you get", template: "list", state: { eyebrow: "What you get", headline: "Every track\nships with", list: ["High-fidelity WAV + MP3", "Your key, your tempo", "Lyric-marked lead sheet", "Unlimited play-throughs"], sub: "From $15 / track · DM to order" } },
  { id: "cp-5", label: "CTA · send me the song", template: "cta", state: { eyebrow: "Ready when you are", headline: "Send me\nthe song.\nI’ll send you\nthe studio.", sub: "@pianobackingsbydaniele" } },
  { id: "cp-6", label: "Cover · season pack", template: "cover", state: { eyebrow: "Season Pack · 4 credits", headline: "Four tracks.\nOne season.\nOne price.", sub: "$50 · save $10 · DM to claim", showKeyline: true } },
  { id: "cp-7", label: "Quote · audition win", template: "quote", state: { eyebrow: "From a client", headline: "“I booked\nthe role.\nAnd the tape\nwas your track.”", sub: "— Daniel R., NYC callback" } },
  { id: "cp-8", label: "List · how ordering works", template: "list", state: { eyebrow: "How it works", headline: "Three steps\nfrom song\nto studio", list: ["1 · DM me the song + your key", "2 · I arrange & record it", "3 · You get WAV + MP3 in 48h"], sub: "No subscription. Ever." } },
  { id: "cp-9", label: "Classic · turnaround time", template: "classic", state: { eyebrow: "Turnaround", headline: "48 hours,\nmaybe sooner.", sub: "Most tracks ship in under a day.\nDM to start the clock." } },
  { id: "cp-10", label: "CTA · recession-proof", template: "cta", state: { eyebrow: "Honest", headline: "You don’t need\na $400 accompanist.\nYou need me.", sub: "@pianobackingsbydaniele · from $15" } },
];

// ---------- Live shop data (from Supabase, anon key) ----------
type ShopStats = {
  trackCount: number;
  showCount: number;
  minPrice: number | null;
  newest: { title: string; show: string }[];
};
type ShopRow = { title: string; artist_name: string; price: number; created_at: string; is_active: boolean };
async function fetchShopStats(): Promise<ShopStats | null> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("title, artist_name, price, created_at, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !data) return null;
    const active = data as ShopRow[];
    const shows = new Set(active.map((p) => (p.artist_name || "").trim()).filter(Boolean));
    const prices = active.map((p) => p.price).filter((n) => typeof n === "number" && !isNaN(n));
    const minPrice = prices.length ? Math.min(...prices) : null;
    const newest = active.slice(0, 5).map((p) => ({ title: p.title, show: p.artist_name || "" }));
    return { trackCount: active.length, showCount: shows.size, minPrice, newest };
  } catch {
    return null;
  }
}

// ---------- Campaigns (full carousels) ----------
type Campaign = {
  id: string;
  label: string;
  blurb: string;
  build: (stats: ShopStats | null) => { name: string; slides: SlideState[]; caption: string };
};
const CAMPAIGNS: Campaign[] = [
  {
    id: "camp-open-requests",
    label: "Open for requests · Link in bio",
    blurb: "3 slides · the one you wrote",
    build: () => ({
      name: "Open for requests",
      caption:
        "Open for requests.\n\nI'm away from September 7 and I'll have quiet stretches at the piano, so I'm taking backing track orders.\n\nSend me the sheet music and a YouTube reference and I'll prepare your cut, in your key, at the tempo you actually sing it. With breath where you need to breathe.\n\nThis started as tracks I made for friends before auditions. It's still that.\n\nLink in bio.",
      slides: [
        {
          template: "classic",
          eyebrow: "Piano Backings by Daniele",
          headline: "Open for requests.",
          sub: "Custom piano tracks, one at a time.",
          list: [], showKeyline: true, logoId: "builtin-profile", showVignette: true,
        },
        {
          template: "list",
          eyebrow: "What you get",
          headline: "Your cut. Your key.\nYour tempo.\nRoom to breathe.",
          sub: "Send the sheet music and a reference.",
          list: [], showKeyline: true, logoId: "builtin-profile", showVignette: true,
        },
        {
          template: "cta",
          eyebrow: "From September 7",
          headline: "Link in bio.\nOr send me\nthe song.",
          sub: "Spots are limited while I'm away.",
          list: [], showKeyline: true, logoId: "builtin-profile", showVignette: true,
        },
      ],
    }),
  },
  {
    id: "camp-new-in-shop",
    label: "New in the shop",
    blurb: "3 slides · pulls the last tracks you shipped",
    build: (stats) => {
      const newest = stats?.newest?.filter((t) => t.title)?.slice(0, 3) ?? [];
      const first = newest[0];
      const slide2List = newest.length
        ? newest.map((t) => `${t.title}${t.show ? " — " + t.show : ""}`)
        : ["Your latest cut goes here", "Title — Show", "Title — Show"];
      return {
        name: "New in the shop",
        caption:
          "New in the shop.\n\nFresh cuts, your key, your tempo. DM to order or grab one straight from the link in bio.\n\n#pianobackingtracks #auditionprep #musicaltheatre",
        slides: [
          {
            template: "cover",
            eyebrow: "New in the shop",
            headline: first
              ? `${first.title}\nis ready\nin your key.`
              : "New cuts\nare ready\nin your key.",
            sub: "Swipe →",
            list: [], showKeyline: false, logoId: "builtin-profile", showVignette: true,
          },
          {
            template: "list",
            eyebrow: "Just shipped",
            headline: "This week’s\nbackings",
            sub: "All in your key. DM to order.",
            list: slide2List, showKeyline: true, logoId: "builtin-profile", showVignette: true,
          },
          {
            template: "cta",
            eyebrow: "Ready when you are",
            headline: "Link in bio.\nOr send me\nthe song.",
            sub: "@pianobackingsbydaniele",
            list: [], showKeyline: true, logoId: "builtin-profile", showVignette: true,
          },
        ],
      };
    },
  },
  {
    id: "camp-start-here",
    label: "Start here · value reset",
    blurb: "3 slides · pricing + what you get",
    build: (stats) => {
      const from = stats?.minPrice != null ? `$${Math.round(stats.minPrice)}` : "$15";
      return {
        name: "Start here",
        caption:
          "Start here.\n\nCustom piano backings, from " +
          from +
          " a track. Your cut, your key, your tempo. DM me the song and a reference and I’ll send the studio back.\n\nLink in bio.",
        slides: [
          {
            template: "classic",
            eyebrow: "Piano Backings by Daniele",
            headline: "Backing tracks\nthat make you\nsound like home.",
            sub: "Custom accompaniments for auditions & practice.",
            list: [], showKeyline: true, logoId: "builtin-profile", showVignette: true,
          },
          {
            template: "list",
            eyebrow: "What you get",
            headline: "Every track\nships with",
            sub: `From ${from} / track · DM to order`,
            list: ["High-fidelity WAV + MP3", "Your key, your tempo", "Lyric-marked lead sheet", "Unlimited play-throughs"],
            showKeyline: true, logoId: "builtin-profile", showVignette: true,
          },
          {
            template: "cta",
            eyebrow: "Ready when you are",
            headline: "Send me\nthe song.\nI’ll send you\nthe studio.",
            sub: "@pianobackingsbydaniele",
            list: [], showKeyline: true, logoId: "builtin-profile", showVignette: true,
          },
        ],
      };
    },
  },
];

function applyCampaign(c: Campaign, stats: ShopStats | null, logoIds: Logo[]): Carousel {
  const built = c.build(stats);
  return {
    id: uid(),
    name: built.name,
    slides: built.slides,
    logos: logoIds,
    caption: built.caption,
    updatedAt: Date.now(),
  };
}

// ---------- Storage helpers ----------
function loadCarousels(): Carousel[] {
  try { const r = localStorage.getItem(STORAGE_CAROUSELS); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; } catch { return []; }
}
function saveCarousels(c: Carousel[]) { localStorage.setItem(STORAGE_CAROUSELS, JSON.stringify(c)); }
function loadCustomLogos(): Logo[] {
  try { const r = localStorage.getItem(STORAGE_LOGOS); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; } catch { return []; }
}
function saveCustomLogos(l: Logo[]) { localStorage.setItem(STORAGE_LOGOS, JSON.stringify(l)); }
function uid() { return Math.random().toString(36).slice(2, 9); }
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

// ---------- Canvas drawing ----------
function allLogos(custom: Logo[]): Logo[] {
  const m = new Map<string, Logo>();
  [...BUILTIN_LOGOS, ...custom].forEach((l) => m.set(l.id, l));
  return Array.from(m.values());
}

function drawSlide(
  ctx: CanvasRenderingContext2D,
  state: SlideState,
  logoImgs: Record<string, HTMLImageElement>,
) {
  // background
  ctx.fillStyle = PINK;
  ctx.fillRect(0, 0, W, H);

  // subtle vignette for depth (premium-ish)
  if (state.showVignette) {
    const g = ctx.createRadialGradient(W * 0.5, H * 0.42, W * 0.2, W * 0.5, H * 0.5, W * 0.9);
    g.addColorStop(0, "rgba(255,255,255,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0.16)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // route to template
  switch (state.template) {
    case "cover": drawCover(ctx, state, logoImgs); break;
    case "quote": drawQuote(ctx, state, logoImgs); break;
    case "list": drawList(ctx, state, logoImgs); break;
    case "cta": drawCta(ctx, state, logoImgs); break;
    default: drawClassic(ctx, state, logoImgs);
  }
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | undefined,
  state: SlideState,
  cx: number,
  cy: number,
  target: "circle" | "wide" | "auto",
) {
  if (!logo) return;
  const ar = logo.width / logo.height;
  if (target === "circle" || (target === "auto" && Math.abs(ar - 1) < 0.2)) {
    const size = 76;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + size / 2, cy + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const s = Math.max(size / logo.width, size / logo.height);
    const dw = logo.width * s, dh = logo.height * s;
    ctx.drawImage(logo, cx + (size - dw) / 2, cy + (size - dh) / 2, dw, dh);
    ctx.restore();
    // cream ring
    ctx.strokeStyle = CREAM_FAINT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + size / 2, cy + size / 2, size / 2 + 3, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // wide wordmark: fit within max width, preserve aspect
    const maxW = W - MARGIN * 2;
    const maxH = 120;
    let dw = maxW, dh = dw / ar;
    if (dh > maxH) { dh = maxH; dw = dh * ar; }
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(logo, cx, cy, dw, dh);
    ctx.restore();
  }
}

function drawEyebrow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign = "left") {
  ctx.textBaseline = "top";
  ctx.textAlign = align;
  ctx.font = `700 28px/1 ${SANS}`;
  ctx.fillStyle = CREAM_DIM;
  const spacing = 6;
  const t = (text || "").toUpperCase();
  if (align === "center") {
    const totalW = letterspacedWidth(ctx, t, spacing);
    let cx = x - totalW / 2;
    for (const ch of t) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
  } else {
    let cx = x;
    for (const ch of t) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
  }
}
function letterspacedWidth(ctx: CanvasRenderingContext2D, text: string, spacing: number) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return w - (text.length ? spacing : 0);
}

function drawKeyline(ctx: CanvasRenderingContext2D, withTicks = true) {
  const ruleY = H - 230;
  const ruleLeft = MARGIN, ruleRight = W - MARGIN;
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(ruleLeft, ruleY); ctx.lineTo(ruleRight, ruleY); ctx.stroke();
  if (withTicks) {
    const tickH = 26, tickW = 6, gapIn = 4, groupGap = 14;
    const pattern = [2, 3, 2, 3];
    let cx = ruleLeft;
    ctx.fillStyle = CREAM_DIM;
    for (let g = 0; g < pattern.length; g++) {
      const n = pattern[g];
      for (let i = 0; i < n; i++) { roundRectFill(ctx, cx, ruleY - tickH, tickW, tickH, 1.5); cx += tickW + gapIn; }
      cx += groupGap - gapIn;
    }
  }
  return ruleY;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, font: string, maxWidth: number): string[] {
  ctx.font = font;
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    if (raw.trim() === "") { out.push(""); continue; }
    const words = raw.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = w; }
      else line = test;
    }
    out.push(line);
  }
  return out;
}

// ---- Template: Classic ----
function drawClassic(ctx: CanvasRenderingContext2D, s: SlideState, imgs: Record<string, HTMLImageElement>) {
  const logo = s.logoId ? imgs[s.logoId] : undefined;
  if (logo) drawLogo(ctx, logo, s, MARGIN, 96, "auto");
  const eyebrowY = logo ? 210 : 150;
  drawEyebrow(ctx, s.eyebrow, MARGIN, eyebrowY);

  const headFont = `700 104px/${104 * 1.18}px ${SERIF}`;
  ctx.font = headFont;
  ctx.fillStyle = CREAM;
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  const lines = wrapLines(ctx, s.headline, headFont, W - MARGIN * 2);
  let y = eyebrowY + 70;
  for (const ln of lines) { ctx.fillText(ln, MARGIN, y); y += 104 * 1.18; }

  const ruleY = drawKeyline(ctx, s.showKeyline);
  ctx.font = `500 30px/1.5 ${SANS}`;
  ctx.fillStyle = CREAM;
  let sy = ruleY + 34;
  for (const ln of (s.sub || "").split("\n")) { ctx.fillText(ln, MARGIN, sy); sy += 30 * 1.5; }
}

// ---- Template: Cover (centered) ----
function drawCover(ctx: CanvasRenderingContext2D, s: SlideState, imgs: Record<string, HTMLImageElement>) {
  const logo = s.logoId ? imgs[s.logoId] : undefined;
  if (logo) drawLogo(ctx, logo, s, MARGIN, 96, "auto");
  const centerY = H / 2 - 40;
  drawEyebrow(ctx, s.eyebrow, W / 2, centerY - 180, "center");

  const headFont = `700 112px/${112 * 1.16}px ${SERIF}`;
  ctx.font = headFont;
  ctx.fillStyle = CREAM;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  const lines = wrapLines(ctx, s.headline, headFont, W - MARGIN * 1.6);
  let y = centerY - 110;
  for (const ln of lines) { ctx.fillText(ln, W / 2, y); y += 112 * 1.16; }

  if (s.showKeyline) {
    const ruleY = H - 230;
    ctx.strokeStyle = CREAM; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W / 2 - 240, ruleY); ctx.lineTo(W / 2 + 240, ruleY); ctx.stroke();
    if (s.showKeyline) {
      const tickH = 26, tickW = 6, gapIn = 4, groupGap = 14; const pattern = [2, 3, 2, 3];
      let cx = W / 2 - 240;
      ctx.fillStyle = CREAM_DIM;
      for (let g = 0; g < pattern.length; g++) { const n = pattern[g]; for (let i = 0; i < n; i++) { roundRectFill(ctx, cx, ruleY - tickH, tickW, tickH, 1.5); cx += tickW + gapIn; } cx += groupGap - gapIn; }
    }
    ctx.font = `500 30px/1.4 ${SANS}`; ctx.fillStyle = CREAM; ctx.textAlign = "left";
    let sy = ruleY + 34;
    for (const ln of (s.sub || "").split("\n")) { ctx.fillText(ln, MARGIN, sy); sy += 30 * 1.4; }
  } else {
    ctx.font = `500 32px/1.4 ${SANS}`; ctx.fillStyle = CREAM; ctx.textAlign = "center";
    let sy = H - 200;
    for (const ln of (s.sub || "").split("\n")) { ctx.fillText(ln, W / 2, sy); sy += 32 * 1.4; }
  }
}

// ---- Template: Quote (italic serif, centered) ----
function drawQuote(ctx: CanvasRenderingContext2D, s: SlideState, imgs: Record<string, HTMLImageElement>) {
  const logo = s.logoId ? imgs[s.logoId] : undefined;
  if (logo) drawLogo(ctx, logo, s, MARGIN, 96, "circle");
  const centerY = H / 2 - 40;
  drawEyebrow(ctx, s.eyebrow, W / 2, centerY - 240, "center");

  const headFont = `italic 700 96px/${96 * 1.22}px ${SERIF}`;
  ctx.font = headFont; ctx.fillStyle = CREAM;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  const lines = wrapLines(ctx, s.headline, headFont, W - MARGIN * 1.4);
  let y = centerY - 160;
  for (const ln of lines) { ctx.fillText(ln, W / 2, y); y += 96 * 1.22; }

  ctx.font = `500 28px/1.4 ${SANS}`; ctx.fillStyle = CREAM_DIM;
  // attribution centered near bottom
  let sy = H - 200;
  for (const ln of (s.sub || "").split("\n")) { ctx.fillText(ln, W / 2, sy); sy += 28 * 1.4; }
}

// ---- Template: List ----
function drawList(ctx: CanvasRenderingContext2D, s: SlideState, imgs: Record<string, HTMLImageElement>) {
  const logo = s.logoId ? imgs[s.logoId] : undefined;
  if (logo) drawLogo(ctx, logo, s, MARGIN, 96, "auto");
  const eyebrowY = logo ? 210 : 150;
  drawEyebrow(ctx, s.eyebrow, MARGIN, eyebrowY);

  const headFont = `700 84px/${84 * 1.15}px ${SERIF}`;
  ctx.font = headFont; ctx.fillStyle = CREAM;
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  const lines = wrapLines(ctx, s.headline, headFont, W - MARGIN * 2);
  let y = eyebrowY + 70;
  for (const ln of lines) { ctx.fillText(ln, MARGIN, y); y += 84 * 1.15; }

  // list items
  y += 28;
  ctx.font = `600 44px/1.3 ${SANS}`;
  ctx.fillStyle = CREAM;
  for (let i = 0; i < s.list.length; i++) {
    const item = s.list[i].trim();
    if (!item) continue;
    // small piano-key glyph as bullet
    ctx.fillStyle = CREAM;
    roundRectFill(ctx, MARGIN, y + 14, 8, 28, 2);
    ctx.fillStyle = CREAM_DIM;
    ctx.font = `700 22px/1 ${SANS}`;
    const num = String(i + 1).padStart(2, "0");
    ctx.fillText(num, MARGIN + 26, y + 8);
    ctx.fillStyle = CREAM;
    ctx.font = `600 44px/1.3 ${SANS}`;
    ctx.fillText(item, MARGIN + 110, y + 6);
    y += 44 * 1.3 + 18;
  }

  const ruleY = drawKeyline(ctx, s.showKeyline);
  ctx.font = `500 28px/1.4 ${SANS}`; ctx.fillStyle = CREAM;
  let sy = ruleY + 34;
  for (const ln of (s.sub || "").split("\n")) { ctx.fillText(ln, MARGIN, sy); sy += 28 * 1.4; }
}

// ---- Template: CTA (big bottom CTA) ----
function drawCta(ctx: CanvasRenderingContext2D, s: SlideState, imgs: Record<string, HTMLImageElement>) {
  const logo = s.logoId ? imgs[s.logoId] : undefined;
  if (logo) drawLogo(ctx, logo, s, MARGIN, 96, "auto");
  const eyebrowY = logo ? 210 : 150;
  drawEyebrow(ctx, s.eyebrow, MARGIN, eyebrowY);

  const headFont = `700 120px/${120 * 1.12}px ${SERIF}`;
  ctx.font = headFont; ctx.fillStyle = CREAM;
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  const lines = wrapLines(ctx, s.headline, headFont, W - MARGIN * 2);
  let y = eyebrowY + 80;
  for (const ln of lines) { ctx.fillText(ln, MARGIN, y); y += 120 * 1.12; }

  // big downward arrow glyph near the sub
  const ruleY = drawKeyline(ctx, s.showKeyline);
  ctx.font = `700 40px/1.2 ${SANS}`;
  ctx.fillStyle = CREAM;
  let sy = ruleY + 36;
  const subLines = (s.sub || "").split("\n");
  for (const ln of subLines) { ctx.fillText(ln, MARGIN, sy); sy += 40 * 1.2; }

  // corner arrow accent (subtle premium cue)
  ctx.strokeStyle = CREAM_DIM; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W - MARGIN, H - 150);
  ctx.lineTo(W - MARGIN - 60, H - 150);
  ctx.lineTo(W - MARGIN - 30, H - 180);
  ctx.moveTo(W - MARGIN - 60, H - 150);
  ctx.lineTo(W - MARGIN - 30, H - 120);
  ctx.stroke();
}

function roundRectFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath(); ctx.fill();
}

// ---------- React component ----------
export default function IgGenerator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [customLogos, setCustomLogos] = useState<Logo[]>([]);
  const [logoImgs, setLogoImgs] = useState<Record<string, HTMLImageElement>>({});
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [activeCarouselId, setActiveCarouselId] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const [presetNameInput, setPresetNameInput] = useState("");
  const [shopStats, setShopStats] = useState<ShopStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // active carousel derived
  const activeCarousel = useMemoCarousel(carousels, activeCarouselId);
  const slide = activeCarousel?.slides[activeSlide];

  // load on mount
  useEffect(() => {
    const c = loadCarousels();
    const custom = loadCustomLogos();
    setCustomLogos(custom);
    const effectiveLogos = allLogos(custom);

    if (c.length === 0) {
      const id = uid();
      const fresh: Carousel = { id, name: "Untitled carousel", slides: starterSlides(), logos: effectiveLogos, caption: "", updatedAt: Date.now() };
      saveCarousels([fresh]);
      setCarousels([fresh]);
      setActiveCarouselId(id);
    } else {
      setCarousels(c);
      setActiveCarouselId(c[0].id);
    }
  }, []);

  // fetch shop stats behind the scenes (informs campaigns, never rendered on slides)
  useEffect(() => {
    let alive = true;
    setStatsLoading(true);
    fetchShopStats()
      .then((s) => { if (alive) { setShopStats(s); setStatsLoading(false); } })
      .catch(() => { if (alive) setStatsLoading(false); });
    return () => { alive = false; };
  }, []);

  // preload all logo images
  useEffect(() => {
    const effective = allLogos(customLogos);
    const map: Record<string, HTMLImageElement> = {};
    let pending = effective.length;
    if (pending === 0) { setLogoImgs({}); return; }
    effective.forEach((l) => {
      const img = new Image();
      img.onload = () => { map[l.id] = img; if (--pending === 0) setLogoImgs({ ...map }); };
      img.onerror = () => { if (--pending === 0) setLogoImgs({ ...map }); };
      img.src = l.src;
      if (img.complete) map[l.id] = img;
    });
  }, [customLogos]);

  // redraw when slide/logos change
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !slide) return;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawSlide(ctx, slide, logoImgs);
  }, [slide, logoImgs]);

  const raCtx = useRef<number | null>(null);
  const scheduleDraw = useCallback(() => {
    if (raCtx.current) cancelAnimationFrame(raCtx.current);
    raCtx.current = requestAnimationFrame(redraw);
  }, [redraw]);

  useEffect(() => { scheduleDraw(); }, [scheduleDraw]);

  // ---------- Carousel ops ----------
  function updateActiveCarousel(updater: (c: Carousel) => Carousel, persist = true) {
    setCarousels((prev) => {
      const idx = prev.findIndex((c) => c.id === activeCarouselId);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = updater(next[idx]);
      next[idx].updatedAt = Date.now();
      if (persist) saveCarousels(next);
      return next;
    });
  }

  function updateSlide(patch: Partial<SlideState>) {
    updateActiveCarousel((c) => {
      const slides = [...c.slides];
      slides[activeSlide] = { ...slides[activeSlide], ...patch };
      return { ...c, slides };
    });
  }

  function addSlide() {
    updateActiveCarousel((c) => ({
      ...c,
      slides: [...c.slides, { ...c.slides[activeSlide], template: "classic", eyebrow: c.slides[activeSlide].eyebrow, headline: "New slide\n\ncopy goes here.", sub: "", list: [] }],
    }));
    setActiveSlide((i) => i + 1);
  }
  function duplicateSlide() {
    updateActiveCarousel((c) => {
      const slides = [...c.slides];
      slides.splice(activeSlide + 1, 0, { ...c.slides[activeSlide] });
      return { ...c, slides };
    });
    setActiveSlide((i) => i + 1);
  }
  function deleteSlide() {
    if (!activeCarousel || activeCarousel.slides.length <= 1) { alert("A carousel needs at least one slide."); return; }
    updateActiveCarousel((c) => {
      const slides = c.slides.filter((_, i) => i !== activeSlide);
      return { ...c, slides };
    });
    setActiveSlide((i) => Math.max(0, i - 1));
  }
  function moveSlide(dir: -1 | 1) {
    updateActiveCarousel((c) => {
      const slides = [...c.slides];
      const j = activeSlide + dir;
      if (j < 0 || j >= slides.length) return c;
      [slides[activeSlide], slides[j]] = [slides[j], slides[activeSlide]];
      return { ...c, slides };
    });
    setActiveSlide((i) => i + dir);
  }

  // ---------- Carousel presets (full carousel) ----------
  function savePreset() {
    const name = presetNameInput.trim() || activeCarousel?.name || "Carousel";
    if (!activeCarousel) return;
    const next = carousels.map((c) => (c.id === activeCarouselId ? { ...c, name } : c));
    // also allow saving as a NEW copy under a new name
    setCarousels(next); saveCarousels(next);
    setPresetNameInput("");
    alert(`Saved “${name}” with ${activeCarousel.slides.length} slides.`);
  }
  function newCarousel() {
    const id = uid();
    const fresh: Carousel = { id, name: `Carousel ${carousels.length + 1}`, slides: [starterSlides()[0]], logos: allLogos(customLogos), caption: "", updatedAt: Date.now() };
    const next = [...carousels, fresh];
    setCarousels(next); saveCarousels(next);
    setActiveCarouselId(id); setActiveSlide(0);
  }
  function deleteCarousel() {
    if (!activeCarouselId || carousels.length <= 1) return;
    if (!confirm("Delete this carousel?")) return;
    const next = carousels.filter((c) => c.id !== activeCarouselId);
    setCarousels(next); saveCarousels(next);
    setActiveCarouselId(next[0].id); setActiveSlide(0);
  }
  function duplicateCarousel() {
    if (!activeCarousel) return;
    const id = uid();
    const fresh: Carousel = { id, name: `${activeCarousel.name} (copy)`, slides: activeCarousel.slides.map((s) => ({ ...s })), logos: activeCarousel.logos, caption: activeCarousel.caption || "", updatedAt: Date.now() };
    const next = [...carousels, fresh];
    setCarousels(next); saveCarousels(next);
    setActiveCarouselId(id); setActiveSlide(0);
  }

  function loadCampaign(c: Campaign) {
    const logos = allLogos(customLogos);
    const built = applyCampaign(c, shopStats, logos);
    const next = [built, ...carousels];
    setCarousels(next); saveCarousels(next);
    setActiveCarouselId(built.id); setActiveSlide(0);
  }

  function updateCaption(caption: string) {
    updateActiveCarousel((c) => ({ ...c, caption }));
  }

  // ---------- Copy presets (apply to current slide) ----------
  function applyCopyPreset(cp: CopyPreset) {
    if (!slide) return;
    updateSlide({ template: cp.template, ...cp.state } as Partial<SlideState>);
  }

  // ---------- Logos ----------
  async function onUploadLogos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const added: Logo[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      const src = await fileToDataUrl(f);
      added.push({ id: "up-" + uid(), name: f.name.replace(/\.[^.]+$/, "").slice(0, 40), src });
    }
    if (added.length === 0) return;
    const next = [...customLogos, ...added];
    setCustomLogos(next);
    saveCustomLogos(next);
    // default new uploads onto current slide
    if (added[0]) updateSlide({ logoId: added[0].id });
  }
  function deleteCustomLogo(id: string) {
    const next = customLogos.filter((l) => l.id !== id);
    setCustomLogos(next); saveCustomLogos(next);
    // clear refs
    updateActiveCarousel((c) => ({ ...c, slides: c.slides.map((s) => (s.logoId === id ? { ...s, logoId: "builtin-profile" } : s)) }));
  }

  // ---------- Export ----------
  function exportCurrent() {
    const canvas = canvasRef.current;
    if (!canvas || !slide) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      triggerDownload(blob, filename(slide, activeSlide, activeCarousel));
    }, "image/png");
  }
  function exportAll() {
    if (!activeCarousel) return;
    // render each slide to an offscreen canvas, then download sequentially
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    activeCarousel.slides.forEach((sl, idx) => {
      drawSlide(ctx, sl, logoImgs);
      off.toBlob((blob) => {
        if (blob) setTimeout(() => triggerDownload(blob, filename(sl, idx, activeCarousel)), idx * 350);
      }, "image/png");
    });
  }
  function triggerDownload(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function filename(s: SlideState, idx: number, c?: Carousel) {
    const stem = (s.eyebrow || "slide").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "slide";
    const carousel = c?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) || "carousel";
    return `${carousel}-${String(idx + 1).padStart(2, "0")}-${stem}.png`;
  }

  if (!slide || !activeCarousel) return <div className="p-10">Loading…</div>;

  const fieldCls = "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#1C0357] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40";
  const labelCls = "text-xs font-bold text-gray-600";
  const cardCls = "rounded-xl border border-black/10 bg-white p-4 shadow-sm";
  const hdrCls = "mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400";

  const logos = allLogos(customLogos);

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-[#1C0357]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">IG Post Generator</h1>
            <p className="text-xs font-medium text-gray-500">
              1080 × 1350 · 4:5 · carousel · exports at full resolution · saved locally
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={newCarousel} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-bold hover:bg-gray-50">+ Carousel</button>
            <button onClick={duplicateCarousel} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-bold hover:bg-gray-50">Duplicate</button>
            <button onClick={deleteCarousel} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(340px,440px)]">
          {/* Preview + carousel strip */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-[540px]" style={{ aspectRatio: "4 / 5" }}>
              <canvas ref={canvasRef} className="h-full w-full rounded-lg shadow-2xl ring-1 ring-black/10" style={{ aspectRatio: "4 / 5" }} />
            </div>

            {/* slide strip */}
            <div className="mt-4 flex w-full max-w-[540px] items-center gap-2 overflow-x-auto pb-2">
              {activeCarousel.slides.map((sl, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    i === activeSlide ? "bg-[#1C0357] text-white" : "bg-white text-[#1C0357] border border-black/10 hover:bg-gray-50"
                  }`}
                  title={`Slide ${i + 1} · ${sl.template}`}
                >
                  {i + 1}
                </button>
              ))}
              <button onClick={addSlide} className="shrink-0 rounded-md border border-dashed border-black/20 px-3 py-1.5 text-xs font-bold hover:bg-gray-50">+ Add</button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => moveSlide(-1)} disabled={activeSlide === 0} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold hover:bg-gray-50 disabled:opacity-40">←</button>
              <button onClick={() => moveSlide(1)} disabled={activeSlide === activeCarousel.slides.length - 1} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold hover:bg-gray-50 disabled:opacity-40">→</button>
              <button onClick={duplicateSlide} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold hover:bg-gray-50">Duplicate</button>
              <button onClick={deleteSlide} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Delete slide</button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button onClick={exportCurrent} className="rounded-xl bg-[#1C0357] px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-[#2D0B8C] active:scale-[0.98]">
                Download this slide
              </button>
              <button onClick={exportAll} className="rounded-xl bg-[#F538BC] px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-[#D81A9E] active:scale-[0.98]">
                Download all ({activeCarousel.slides.length})
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-5">
            {/* Campaigns */}
            <section className={`${cardCls} border-[#F538BC]/30 ring-1 ring-[#F538BC]/10`}>
              <h2 className={hdrCls}>Campaigns</h2>
              <select
                className={fieldCls}
                value=""
                onChange={(e) => { const camp = CAMPAIGNS.find((c) => c.id === e.target.value); if (camp) loadCampaign(camp); }}
              >
                <option value="">— Load a 3-slide campaign —</option>
                {CAMPAIGNS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label} · {c.blurb}</option>
                ))}
              </select>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                Builds a fresh carousel and loads it. The “New in the shop” campaign pulls your last shipped tracks from Supabase so the copy matches what’s live.
              </p>
            </section>

            {/* Shop insights — for me, the marketing manager */}
            <section className={cardCls}>
              <h2 className={hdrCls}>Shop insights · for crafting</h2>
              {statsLoading ? (
                <p className="text-xs text-gray-400">Loading live shop data…</p>
              ) : !shopStats ? (
                <p className="text-xs text-gray-400">Couldn’t reach Supabase — using fallback copy.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-gray-50 p-2">
                    <div className="text-xl font-black text-[#1C0357]">{shopStats.trackCount}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tracks</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <div className="text-xl font-black text-[#1C0357]">{shopStats.showCount}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Shows</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <div className="text-xl font-black text-[#1C0357]">{shopStats.minPrice != null ? `$${Math.round(shopStats.minPrice)}` : "—"}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">From</div>
                  </div>
                </div>
              )}
              {shopStats?.newest?.length ? (
                <ul className="mt-2 space-y-1">
                  {shopStats.newest.slice(0, 3).map((t, i) => (
                    <li key={i} className="flex items-baseline gap-2 text-[11px]">
                      <span className="font-black text-[#F538BC]">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-bold text-[#1C0357]">{t.title}</span>
                      {t.show && <span className="text-gray-400">— {t.show}</span>}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            {/* Carousels */}
            <section className={cardCls}>
              <h2 className={hdrCls}>Carousels</h2>
              <div className="flex gap-2">
                <select
                  value={activeCarouselId}
                  onChange={(e) => { setActiveCarouselId(e.target.value); setActiveSlide(0); }}
                  className={fieldCls}
                >
                  {[...carousels].sort((a, b) => b.updatedAt - a.updatedAt).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} · {c.slides.length} slides</option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={presetNameInput}
                  onChange={(e) => setPresetNameInput(e.target.value)}
                  placeholder={activeCarousel.name}
                  className={fieldCls}
                />
                <button onClick={savePreset} className="shrink-0 rounded-lg bg-[#F538BC] px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-[#D81A9E]">Rename</button>
              </div>
            </section>

            {/* Copy presets */}
            <section className={cardCls}>
              <h2 className={hdrCls}>Suggested copy</h2>
              <select className={fieldCls} value="" onChange={(e) => { const cp = COPY_PRESETS.find((p) => p.id === e.target.value); if (cp) applyCopyPreset(cp); }}>
                <option value="">— Load copy into this slide —</option>
                {COPY_PRESETS.map((cp) => (
                  <option key={cp.id} value={cp.id}>{cp.label}</option>
                ))}
              </select>
            </section>

            {/* Template + copy */}
            <section className={cardCls}>
              <h2 className={hdrCls}>Template & copy</h2>
              <div className="grid grid-cols-5 gap-1.5">
                {(["classic", "cover", "quote", "list", "cta"] as TemplateId[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateSlide({ template: t })}
                    className={`rounded-lg px-2 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                      slide.template === t ? "bg-[#1C0357] text-white" : "bg-gray-50 text-gray-600 border border-black/10 hover:bg-gray-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Eyebrow</span>
                  <input value={slide.eyebrow} onChange={(e) => updateSlide({ eyebrow: e.target.value })} placeholder="PIANO BACKINGS BY DANIELE" className={fieldCls} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Headline <span className="font-normal text-gray-400">(Enter = line break)</span></span>
                  <textarea value={slide.headline} onChange={(e) => updateSlide({ headline: e.target.value })} rows={5} className={`${fieldCls} font-serif leading-snug`} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Sub-line</span>
                  <textarea value={slide.sub} onChange={(e) => updateSlide({ sub: e.target.value })} rows={3} className={fieldCls} />
                </label>
                {slide.template === "list" && (
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>List items <span className="font-normal text-gray-400">(one per line)</span></span>
                    <textarea
                      value={slide.list.join("\n")}
                      onChange={(e) => updateSlide({ list: e.target.value.split("\n") })}
                      rows={5}
                      className={fieldCls}
                    />
                  </label>
                )}
              </div>
            </section>

            {/* Logo */}
            <section className={cardCls}>
              <h2 className={hdrCls}>Logo / brand mark</h2>
              <select value={slide.logoId} onChange={(e) => updateSlide({ logoId: e.target.value })} className={fieldCls}>
                <option value="">— No logo —</option>
                {logos.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}{l.builtin ? " (built-in)" : ""}</option>
                ))}
              </select>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold hover:bg-gray-50">
                  Upload logos…
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUploadLogos(e.target.files)} />
                <span className="text-[10px] text-gray-400">PNG / SVG / JPG · stored locally in browser</span>
              </div>

              {/* thumbnails */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {logos.map((l) => (
                  <div key={l.id} className="group relative">
                    <button onClick={() => updateSlide({ logoId: l.id })} className={`block h-16 w-full overflow-hidden rounded-md border bg-[#F538BC] p-1.5 ${slide.logoId === l.id ? "ring-2 ring-[#1C0357]" : "border-black/10"}`}>
                      <img src={l.src} alt={l.name} className="h-full w-full rounded object-contain" />
                    </button>
                    {!l.builtin && (
                      <button onClick={() => deleteCustomLogo(l.id)} className="absolute right-0 top-0 rounded-full bg-white/90 px-1 text-[9px] font-bold text-red-600 opacity-0 group-hover:opacity-100">×</button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Toggles */}
            <section className={cardCls}>
              <h2 className={hdrCls}>Layout</h2>
              <label className="flex cursor-pointer items-center justify-between py-1.5">
                <span className="text-sm font-bold">Piano keyline</span>
                <input type="checkbox" checked={slide.showKeyline} onChange={(e) => updateSlide({ showKeyline: e.target.checked })} className="ig-toggle" />
              </label>
              <label className="flex cursor-pointer items-center justify-between py-1.5">
                <span className="text-sm font-bold">Vignette (depth)</span>
                <input type="checkbox" checked={slide.showVignette} onChange={(e) => updateSlide({ showVignette: e.target.checked })} className="ig-toggle" />
              </label>
            </section>

            {/* Caption — saved with the carousel, copyable when posting */}
            <section className={cardCls}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className={hdrCls + " mb-0"}>Caption</h2>
                <button
                  onClick={() => navigator.clipboard?.writeText(activeCarousel.caption || "")}
                  className="rounded-md border border-black/10 px-2 py-1 text-[10px] font-bold hover:bg-gray-50"
                >
                  Copy
                </button>
              </div>
              <textarea
                value={activeCarousel.caption || ""}
                onChange={(e) => updateCaption(e.target.value)}
                rows={6}
                placeholder="Carousel caption — pasted under the post, not onto the slides."
                className={`${fieldCls} text-[12px] leading-relaxed`}
              />
            </section>

            <p className="text-[11px] leading-relaxed text-gray-400">
              Everything is saved to your browser’s localStorage — no server, no SQL. Carousels and uploaded logos persist on this machine only. Use “Upload logos…” to drop in NAS artwork once; it stays.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .ig-toggle { position: relative; height: 20px; width: 36px; cursor: pointer; appearance: none; border-radius: 9999px; background: #d1d5db; transition: background .15s; }
        .ig-toggle::before { content: ""; position: absolute; left: 2px; top: 2px; height: 16px; width: 16px; border-radius: 9999px; background: #fff; transition: transform .15s; }
        .ig-toggle:checked { background: ${PINK}; }
        .ig-toggle:checked::before { transform: translateX(16px); }
      `}</style>
    </div>
  );
}

// tiny helper hook (avoids importing useMemo at top — kept simple)
function useMemoCarousel(list: Carousel[], id: string): Carousel | undefined {
  return list.find((c) => c.id === id);
}