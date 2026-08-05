import { useRef, useState, useEffect } from 'react';

let activeAudio: { audio: HTMLAudioElement; release: () => void } | null = null;

export const useAudioPreview = (url: string | null, duration = 10000) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (el) {
        el.pause();
        el.src = '';
        if (activeAudio?.audio === el) {
          activeAudio.release();
          activeAudio = null;
        }
      }
    };
  }, []);

  const stop = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    audioRef.current?.pause();
    if (activeAudio?.audio === audioRef.current) {
      activeAudio.release();
      activeAudio = null;
    }
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!audioRef.current || !url) return;

    if (isPlaying) {
      stop();
    } else {
      if (activeAudio && activeAudio.audio !== audioRef.current) {
        activeAudio.audio.pause();
        activeAudio.release();
      }

      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);

      activeAudio = {
        audio: audioRef.current,
        release: () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setIsPlaying(false);
        },
      };

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        audioRef.current?.pause();
        audioRef.current!.currentTime = 0;
        if (activeAudio?.audio === audioRef.current) {
          activeAudio.release();
          activeAudio = null;
        }
      }, duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (activeAudio?.audio === audioRef.current) {
      activeAudio.release();
      activeAudio = null;
    }
  };

  return {
    isPlaying,
    togglePlay,
    audioRef,
    handleEnded,
    hasAudio: !!url,
  };
};
