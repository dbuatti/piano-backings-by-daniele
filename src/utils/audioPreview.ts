import { supabase } from '@/integrations/supabase/client';

const PREVIEW_SECONDS = 15;
const PREVIEW_SAMPLE_RATE = 22050;
const FADE_SECONDS = 1.5;

// 16-bit mono PCM WAV.
const encodeWav = (samples: Float32Array, sampleRate: number): Blob => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
};

/**
 * Builds a short, low-resolution clip (first 15s, mono, 22kHz, faded out) of a track
 * so the shop can offer a preview without exposing the full paid file.
 */
export const createPreviewClip = async (sourceUrl: string): Promise<Blob> => {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Couldn't download the track (${response.status}).`);
  const encoded = await response.arrayBuffer();

  const decodeContext = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeContext.decodeAudioData(encoded);
  } finally {
    decodeContext.close();
  }

  const seconds = Math.min(PREVIEW_SECONDS, decoded.duration);
  const offline = new OfflineAudioContext(1, Math.ceil(seconds * PREVIEW_SAMPLE_RATE), PREVIEW_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  const gain = offline.createGain();
  gain.gain.setValueAtTime(1, 0);
  gain.gain.setValueAtTime(1, Math.max(0, seconds - FADE_SECONDS));
  gain.gain.linearRampToValueAtTime(0, seconds);
  source.connect(gain).connect(offline.destination);
  source.start(0, 0, seconds);
  const rendered = await offline.startRendering();

  return encodeWav(rendered.getChannelData(0), PREVIEW_SAMPLE_RATE);
};

/** Creates and uploads the preview for one product, then saves its public URL. */
export const generateProductPreview = async (productId: string, sourceUrl: string): Promise<string> => {
  const clip = await createPreviewClip(sourceUrl);
  const path = `${productId}/${Date.now()}.wav`;
  const { error: uploadError } = await supabase.storage
    .from('shop-previews')
    .upload(path, clip, { contentType: 'audio/wav', upsert: false, cacheControl: '31536000' });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from('shop-previews').getPublicUrl(path);
  const { error: updateError } = await supabase.from('products').update({ preview_url: publicUrl }).eq('id', productId);
  if (updateError) throw updateError;
  return publicUrl;
};
