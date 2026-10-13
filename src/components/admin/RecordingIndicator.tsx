import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import {
  getActiveRecordingLabel,
  getActiveRecordingProgress,
  isRecordingActive,
  subscribeRecording,
  type ClipProgress,
} from '@/utils/canvasRecorder';

// mm:ss for the readout, matching the vetting dialog.
function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// A floating chip that keeps the current recording visible no matter where the
// owner navigates. Vetting can be started and then left to finish in the
// background; this is the only sign it's still running.
const RecordingIndicator = () => {
  const [progress, setProgress] = useState<ClipProgress | null>(() =>
    isRecordingActive() ? getActiveRecordingProgress() : null
  );
  const [label, setLabel] = useState<string | null>(() => getActiveRecordingLabel());

  useEffect(() => {
    const unsubscribe = subscribeRecording((next) => {
      setProgress(next);
      setLabel(getActiveRecordingLabel());
    });
    return unsubscribe;
  }, []);

  if (!progress) return null;

  const pct = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border border-gray-200 bg-white shadow-lg px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <span className="text-sm font-bold text-[#1C0357]">Recording</span>
        <span className="ml-auto text-xs tabular-nums text-gray-500">{pct}%</span>
      </div>
      {label && <div className="mt-1 text-xs text-gray-600 truncate">{label}</div>}
      <Progress value={pct} className="mt-2 h-1.5" />
      <div className="mt-1 text-[11px] tabular-nums text-gray-400">
        {fmtClock(progress.loaded)} / {fmtClock(progress.total)} — you can keep working; it finishes on its own.
      </div>
    </div>
  );
};

export default RecordingIndicator;
