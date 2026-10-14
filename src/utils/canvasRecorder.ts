// Module-level canvas recorder that keeps running even when the component that
// started it is unmounted (e.g. the user navigates to another page). Unlike a
// requestAnimationFrame loop, a wall-clock timer keeps advancing while the tab
// is hidden, so a "cue and leave" recording still completes on time and the
// resulting blob is handed back to the original async caller.

export interface RecordingAudio {
  context: AudioContext;
  source: AudioBufferSourceNode;
}

export interface ClipProgress {
  loaded: number;
  total: number;
}

export interface RecordCanvasClipOptions {
  canvas: HTMLCanvasElement;
  /** Recording length in seconds (the full track, or 6 for a silent card). */
  duration: number;
  /** Paints one frame; called with elapsed seconds at least once per tick. */
  drawFrame: (elapsedSeconds: number) => void;
  /** Optional audio mixed into the clip (decoded track, not yet started). */
  audio?: RecordingAudio;
  fps?: number;
  /** Human label for a global "recording…" indicator (e.g. the song title). */
  label?: string;
  onProgress?: (progress: ClipProgress) => void;
}

type Listener = (progress: ClipProgress | null) => void;

const listeners = new Set<Listener>();
let activeProgress: ClipProgress | null = null;
let activeLabel: string | null = null;
let recording = false;

export function isRecordingActive(): boolean {
  return recording;
}

export function getActiveRecordingProgress(): ClipProgress | null {
  return activeProgress;
}

export function getActiveRecordingLabel(): string | null {
  return activeLabel;
}

/** Subscribe to background-recording state; returns an unsubscribe function. */
export function subscribeRecording(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  const snapshot = activeProgress;
  listeners.forEach((listener) => listener(snapshot));
}

export async function recordCanvasClip(
  options: RecordCanvasClipOptions
): Promise<Blob | null> {
  const { canvas, duration, drawFrame, audio } = options;
  if (typeof MediaRecorder === 'undefined') return null;
  // Guard survives component unmounts so a background recording is never
  // accidentally doubled up by a freshly mounted page.
  if (recording) throw new Error('A recording is already in progress.');
  activeLabel = options.label ?? null;

  const canvasCtx = canvas.getContext('2d');
  if (!canvasCtx) return null;

  const fps = options.fps ?? 30;
  const frameMs = Math.round(1000 / fps);
  const videoTrack = canvas.captureStream(fps).getVideoTracks()[0];
  if (!videoTrack) return null;

  let dest: MediaStreamAudioDestinationNode | null = null;
  let audioTrack: MediaStreamTrack | null = null;
  if (audio) {
    dest = audio.context.createMediaStreamDestination();
    audio.source.connect(dest);
    audioTrack = dest.stream.getAudioTracks()[0] ?? null;
  }

  const stream = new MediaStream(audioTrack ? [videoTrack, audioTrack] : [videoTrack]);
  const mimeType = [
    audioTrack ? 'video/webm;codecs=vp9,opus' : 'video/webm;codecs=vp9',
    audioTrack ? 'video/webm;codecs=vp8,opus' : 'video/webm;codecs=vp8',
    'video/webm',
  ].find((mime) => MediaRecorder.isTypeSupported(mime));
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined
  );
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recording = true;
  activeProgress = { loaded: 0, total: duration };
  emit();

  try {
    drawFrame(0);
    const startedAt = performance.now();
    recorder.start();
    audio?.source.start();

    await new Promise<void>((resolve) => {
      let tickTimer: ReturnType<typeof setTimeout>;
      const tick = () => {
        const el = (performance.now() - startedAt) / 1000;
        if (el < duration) {
          drawFrame(el);
          // Push the drawn frame into the stream at the target rate. Drawing
          // less often than the stream's fps yields a low-frame-rate file.
          (videoTrack as MediaStreamTrack & { requestFrame?: () => void }).requestFrame?.();
          activeProgress = { loaded: Math.min(el, duration), total: duration };
          emit();
          tickTimer = setTimeout(tick, frameMs);
        } else {
          resolve();
        }
      };
      tickTimer = setTimeout(tick, frameMs);
    });

    recorder.stop();
    try {
      audio?.source.stop();
    } catch {
      // Already ended.
    }
    stream.getTracks().forEach((track) => track.stop());
    dest?.disconnect();
    await stopped;
    await audio?.context.close().catch(() => undefined);
    return new Blob(chunks, { type: 'video/webm' });
  } finally {
    recording = false;
    activeProgress = null;
    activeLabel = null;
    emit();
  }
}