import { useEffect, useRef, useState } from 'react';

// The frame TikTok uses as the post's cover, in milliseconds. Without it TikTok
// takes frame 0 — for these title cards that is the blank pink of the fade-in.
// Kept in step with COVER_TIMESTAMP_MS in the two posting functions.
export const TEASER_COVER_MS = 1500;

/**
 * Shows the exact frame that will be used as the TikTok cover, so a teaser's
 * cover can be checked before (and after) posting rather than by squinting at a
 * video player.
 */
export default function TeaserCoverFrame({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !src) return;

    let cancelled = false;
    const draw = () => {
      if (cancelled || !video.videoWidth) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setReady(true);
    };
    const seek = () => {
      if (cancelled) return;
      const duration = video.duration || 0;
      // Stay just inside the end, in case the video is shorter than the cover time.
      const target = duration > 0.1 ? Math.min(TEASER_COVER_MS / 1000, duration - 0.05) : 0;
      try {
        video.currentTime = target;
      } catch {
        draw();
      }
    };
    const onError = () => !cancelled && setError('Could not load the teaser video.');

    video.addEventListener('loadedmetadata', seek);
    video.addEventListener('loadeddata', seek);
    video.addEventListener('seeked', draw);
    video.addEventListener('error', onError);
    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', seek);
      video.removeEventListener('loadeddata', seek);
      video.removeEventListener('seeked', draw);
      video.removeEventListener('error', onError);
    };
  }, [src]);

  if (!src) return null;

  return (
    <div className={className}>
      <p className="mb-1 text-xs font-medium text-gray-500">
        Cover photo (frame at {(TEASER_COVER_MS / 1000).toFixed(1)}s)
      </p>
      {error ? (
        <p className="text-xs text-amber-600">{error}</p>
      ) : (
        <>
          <video ref={videoRef} src={src} muted playsInline preload="metadata" className="hidden" />
          <canvas
            ref={canvasRef}
            className={`w-full max-w-[240px] rounded-xl border border-gray-200 bg-black ${ready ? '' : 'hidden'}`}
          />
          {!ready && <div className="h-40 w-24 animate-pulse rounded-xl bg-gray-100" />}
        </>
      )}
    </div>
  );
}
