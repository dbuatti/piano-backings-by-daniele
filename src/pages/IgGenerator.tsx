import { useEffect, useRef, useState } from "react";

// Brand tokens — pulled from src/globals.css (--accent)
const PINK = "#F538BC";
const DARK_PINK = "#D81A9E"; // a slightly deeper shade for the keyline ticks
const CREAM = "#FAF3E8";
const CREAM_DIM = "rgba(250, 243, 232, 0.78)";

const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const W = 1080;
const H = 1350;
const MARGIN = Math.round(W * 0.10); // ~108px left margin

export type SlideState = {
  eyebrow: string;
  headline: string;
  sub: string;
  showLogo: boolean;
  showKeyline: boolean;
};

const DEFAULT_STATE: SlideState = {
  eyebrow: "Piano Backings by Daniele",
  headline: "Backing tracks\nthat make you\nsound like home.",
  sub: "Custom accompaniments for auditions & practice. DM to order.",
  showLogo: true,
  showKeyline: true,
};

type Preset = { id: string; name: string; state: SlideState; updatedAt: number };

const STORAGE_KEY = "pb_ig_presets_v1";

function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function savePresets(p: Preset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function drawSlide(
  ctx: CanvasRenderingContext2D,
  state: SlideState,
  logo: HTMLImageElement | null,
) {
  // 1) Solid pink background
  ctx.fillStyle = PINK;
  ctx.fillRect(0, 0, W, H);

  // 2) Optional logo mark — small circular brand mark at top-left margin
  if (state.showLogo && logo) {
    const size = 64;
    const x = MARGIN;
    const y = 96;
    ctx.save();
    // circular clip
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    // draw cover-fit
    const s = Math.max(size / logo.width, size / logo.height);
    const dw = logo.width * s;
    const dh = logo.height * s;
    ctx.drawImage(logo, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
    ctx.restore();
  }

  // 3) Eyebrow — uppercase, letterspaced, small, sans
  const eyebrowY = state.showLogo && logo ? 200 : 150;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = `700 30px/1 ${SANS}`;
  ctx.fillStyle = CREAM;
  const eyebrowSpacing = 6; // px between letters
  const eyebrowText = (state.eyebrow || "").toUpperCase();
  drawLetterspaced(ctx, eyebrowText, MARGIN, eyebrowY, eyebrowSpacing);

  // 4) Headline — large serif, generous leading, left aligned ragged right
  const headlineLines = (state.headline || "")
    .split("\n")
    .map((l) => l)
    .filter((l, i, arr) => !(i === arr.length - 1 && l.trim() === ""));
  const headlineTop = eyebrowY + 70;
  const headlineSize = 108;
  const headlineLh = headlineSize * 1.18; // generous leading
  ctx.font = `700 ${headlineSize}px/${headlineLh}px ${SERIF}`;
  ctx.fillStyle = CREAM;
  let y = headlineTop;
  for (const line of headlineLines) {
    ctx.fillText(line, MARGIN, y);
    y += headlineLh;
  }

  // 5) Hairline cream rule across most of the width, near the bottom
  const ruleY = H - 230;
  const ruleLeft = MARGIN;
  const ruleRight = W - MARGIN;

  // 6) Piano-key ticks sitting on the rule at the left, in 2-3-2-3 grouping
  if (state.showKeyline) {
    // hairline rule
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ruleLeft, ruleY);
    ctx.lineTo(ruleRight, ruleY);
    ctx.stroke();

    // black-key grouping 2-3-2-3, subtle short vertical ticks going UP from the rule
    const tickH = 26;
    const tickW = 6;
    const gapInGroup = 4;  // gap between ticks within a group of black keys
    const groupGap = 14;   // gap between groups (simulating a white-key gap)
    const pattern = [2, 3, 2, 3];
    let cx = ruleLeft;
    ctx.fillStyle = CREAM_DIM;
    for (let g = 0; g < pattern.length; g++) {
      const n = pattern[g];
      for (let i = 0; i < n; i++) {
        // round the top a touch
        roundRectFill(ctx, cx, ruleY - tickH, tickW, tickH, 1.5);
        cx += tickW + gapInGroup;
      }
      cx += groupGap - gapInGroup; // extra space between groups
    }
  }

  // 7) Sub-line beneath the rule, small sans
  ctx.font = `500 30px/1.4 ${SANS}`;
  ctx.fillStyle = CREAM;
  const subTop = ruleY + 34;
  // support explicit line breaks in sub too
  const subLines = (state.sub || "").split("\n");
  let sy = subTop;
  for (const line of subLines) {
    ctx.fillText(line, MARGIN, sy);
    sy += 30 * 1.4;
  }
}

function drawLetterspaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
) {
  let cx = x;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

function roundRectFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

// ---------- React component ----------

export default function IgGenerator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const [state, setState] = useState<SlideState>(DEFAULT_STATE);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [activePresetId, setActivePresetId] = useState("");

  // Load presets on mount + preload logo
  useEffect(() => {
    setPresets(loadPresets());
    const img = new Image();
    img.src = "/daniele-profile.png";
    img.onload = () => {
      logoRef.current = img;
      redraw();
    };
    // If image is cached, onload may have already fired before assignment
    if (img.complete) {
      logoRef.current = img;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw whenever state changes
  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Render at full resolution for crisp export
    canvas.width = W;
    canvas.height = H;
    drawSlide(ctx, state, logoRef.current);
  }

  function update<K extends keyof SlideState>(key: K, value: SlideState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  // Download at true 1080x1350
  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const stem =
          (state.eyebrow || "slide")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 40) || "slide";
        a.href = url;
        a.download = `${stem}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      "image/png",
    );
  }

  function savePreset() {
    const name = presetName.trim();
    if (!name) {
      alert("Give the preset a name first.");
      return;
    }
    const next: Preset[] = [
      ...presets.filter((p) => p.id !== activePresetId),
      {
        id: activePresetId || uid(),
        name,
        state,
        updatedAt: Date.now(),
      },
    ];
    setPresets(next);
    savePresets(next);
    setActivePresetId(next.find((p) => p.name === name)?.id || "");
  }

  function loadPreset(id: string) {
    setActivePresetId(id);
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setState(p.state);
    setPresetName(p.name);
  }

  function deletePreset() {
    if (!activePresetId) return;
    if (!confirm("Delete this preset?")) return;
    const next = presets.filter((p) => p.id !== activePresetId);
    setPresets(next);
    savePresets(next);
    setActivePresetId("");
    setPresetName("");
  }

  function newSlide() {
    setActivePresetId("");
    setPresetName("");
    setState(DEFAULT_STATE);
  }

  const fieldCls =
    "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#1C0357] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40";

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-[#1C0357]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              IG Post Generator
            </h1>
            <p className="text-xs font-medium text-gray-500">
              1080 × 1350 · 4:5 · exports at full resolution
            </p>
          </div>
          <button
            onClick={newSlide}
            className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-bold hover:bg-gray-50"
          >
            + New slide
          </button>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(320px,420px)]">
          {/* Preview */}
          <div className="flex flex-col items-center">
            <div
              className="w-full max-w-[540px]"
              style={{ aspectRatio: "4 / 5" }}
            >
              <canvas
                ref={canvasRef}
                className="h-full w-full rounded-lg shadow-2xl ring-1 ring-black/10"
                style={{ aspectRatio: "4 / 5" }}
              />
            </div>
            <button
              onClick={downloadPng}
              className="mt-6 rounded-xl bg-[#1C0357] px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-[#2D0B8C] active:scale-[0.98]"
            >
              Download PNG
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-5">
            {/* Presets */}
            <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Presets
              </h2>
              <div className="flex gap-2">
                <select
                  value={activePresetId}
                  onChange={(e) => loadPreset(e.target.value)}
                  className={fieldCls}
                >
                  <option value="">— Load preset —</option>
                  {[...presets]
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={deletePreset}
                  disabled={!activePresetId}
                  className="shrink-0 rounded-lg border border-black/10 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Del
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name…"
                  className={fieldCls}
                />
                <button
                  onClick={savePreset}
                  className="shrink-0 rounded-lg bg-[#F538BC] px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-[#D81A9E]"
                >
                  Save
                </button>
              </div>
            </section>

            {/* Copy */}
            <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Slide copy
              </h2>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-gray-600">Eyebrow</span>
                  <input
                    value={state.eyebrow}
                    onChange={(e) => update("eyebrow", e.target.value)}
                    placeholder="PIANO BACKINGS BY DANIELE"
                    className={fieldCls}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-gray-600">
                    Headline{" "}
                    <span className="font-normal text-gray-400">
                      (use Enter for line breaks)
                    </span>
                  </span>
                  <textarea
                    value={state.headline}
                    onChange={(e) => update("headline", e.target.value)}
                    rows={5}
                    placeholder={"Backing tracks\nthat make you\nsound like home."}
                    className={`${fieldCls} font-serif leading-snug`}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-gray-600">Sub-line</span>
                  <textarea
                    value={state.sub}
                    onChange={(e) => update("sub", e.target.value)}
                    rows={3}
                    placeholder="Custom accompaniments for auditions & practice. DM to order."
                    className={fieldCls}
                  />
                </label>
              </div>
            </section>

            {/* Toggles */}
            <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Layout
              </h2>
              <label className="flex cursor-pointer items-center justify-between py-1.5">
                <span className="text-sm font-bold">Piano keyline</span>
                <input
                  type="checkbox"
                  checked={state.showKeyline}
                  onChange={(e) => update("showKeyline", e.target.checked)}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-gray-200 transition checked:bg-[#F538BC] relative
                    before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition
                    checked:before:translate-x-4"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between py-1.5">
                <span className="text-sm font-bold">Brand logo mark</span>
                <input
                  type="checkbox"
                  checked={state.showLogo}
                  onChange={(e) => update("showLogo", e.target.checked)}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-gray-200 transition checked:bg-[#F538BC] relative
                    before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition
                    checked:before:translate-x-4"
                />
              </label>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}