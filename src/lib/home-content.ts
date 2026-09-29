// Editable home-page content. Replace the placeholders below; placeholder items are
// only shown in development and preview builds (VITE_SHOW_PLACEHOLDERS=true), never
// on the live site.

export const SHOW_PLACEHOLDERS = import.meta.env.DEV || import.meta.env.VITE_SHOW_PLACEHOLDERS === 'true';

/** Replaces the old "20+ performers helped" stat. */
export const CREDITS = ['Wicked', 'The Bodyguard', 'Into the Woods (VCA)', '12+ years as a music director'];

export const KEY_FACTS = ['3–5 day turnaround', 'Free transposition', 'MP3 320kbps', 'Prices in AUD', 'Delivered worldwide'];

export interface Testimonial {
  quote: string;
  name: string;
  /** e.g. "Audition, Les Mis (2025)" or "Musical theatre student, WAAPA" */
  context: string;
  placeholder?: boolean;
}

// TODO(Daniele): add 3–4 real, named quotes (with each person's permission) and
// delete `placeholder: true`. Don't publish invented quotes.
export const TESTIMONIALS: Testimonial[] = [
  { quote: 'Client quote goes here.', name: 'Client name', context: 'What they used the track for', placeholder: true },
  { quote: 'Client quote goes here.', name: 'Client name', context: 'What they used the track for', placeholder: true },
  { quote: 'Client quote goes here.', name: 'Client name', context: 'What they used the track for', placeholder: true },
];

// One short clip per tier. Drop the MP3s into src/assets/samples/ with these exact
// names (15–30 seconds each is plenty); until a file exists, its tier shows a
// placeholder in development only.
const sampleFiles = import.meta.glob('../assets/samples/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const sample = (name: string): string | null => sampleFiles[`../assets/samples/${name}.mp3`] || null;

export const TIER_SAMPLES = [
  { tier: 'Note Bash', price: 15, file: 'note-bash.mp3', src: sample('note-bash'), about: 'One clean pass with the melody played through, for learning notes.' },
  { tier: 'Audition Ready', price: 30, file: 'audition-ready.mp3', src: sample('audition-ready'), about: 'A detailed, expressive recording of your 16 or 32 bar cut.' },
  { tier: 'Full Song', price: 50, file: 'full-song.mp3', src: sample('full-song'), about: 'The complete piece, fully voiced and performance ready.' },
];
