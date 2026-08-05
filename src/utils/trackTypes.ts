import { Mic2, Headphones, Sparkles, AudioWaveform, Music, Radio, type LucideIcon } from 'lucide-react';

export interface TrackTypeInfo {
  value: string;
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  dotClass: string;
  desc: string;
}

export const TRACK_TYPES: Record<string, TrackTypeInfo> = {
  quick: {
    value: 'quick',
    label: 'Quick Bash',
    icon: Mic2,
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-200/50',
    dotClass: 'bg-blue-500',
    desc: 'Fast reference voice memo for practice or last-minute auditions.',
  },
  'one-take': {
    value: 'one-take',
    label: 'One-Take',
    icon: Headphones,
    badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-200/50',
    dotClass: 'bg-amber-500',
    desc: 'Single-pass authentic recording, recorded live without edits.',
  },
  polished: {
    value: 'polished',
    label: 'Polished',
    icon: Sparkles,
    badgeClass: 'bg-[#F538BC]/10 text-[#F538BC] border-[#F538BC]/20',
    dotClass: 'bg-[#F538BC]',
    desc: 'Studio-grade multi-layer mix, edited and polished.',
  },
  'full-production': {
    value: 'full-production',
    label: 'Full Production',
    icon: AudioWaveform,
    badgeClass: 'bg-violet-500/10 text-violet-700 border-violet-200/50',
    dotClass: 'bg-violet-500',
    desc: 'Complete arrangement with full production and instrument layers.',
  },
  'full-song': {
    value: 'full-song',
    label: 'Full Song',
    icon: Music,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-200/50',
    dotClass: 'bg-emerald-500',
    desc: 'The complete song, end to end.',
  },
  'audition-ready': {
    value: 'audition-ready',
    label: 'Audition Ready',
    icon: Radio,
    badgeClass: 'bg-cyan-500/10 text-cyan-700 border-cyan-200/50',
    dotClass: 'bg-cyan-500',
    desc: 'Professionally produced track, ready for a live audition.',
  },
  standard: {
    value: 'standard',
    label: 'Standard',
    icon: Music,
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200/50',
    dotClass: 'bg-gray-400',
    desc: '',
  },
};

export const getTrackTypeInfo = (type?: string | null): TrackTypeInfo =>
  (type && TRACK_TYPES[type]) || TRACK_TYPES.standard;

export const TRACK_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'polished', label: 'Polished' },
  { value: 'one-take', label: 'One-Take' },
  { value: 'full-production', label: 'Full Production' },
  { value: 'full-song', label: 'Full Song' },
  { value: 'quick', label: 'Quick Bash' },
  { value: 'audition-ready', label: 'Audition Ready' },
];

export const VOICE_TYPE_OPTIONS = ['Soprano', 'Alto', 'Tenor', 'Bass'];

export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Tracks' },
  { value: 'full-song', label: 'Full Song' },
  { value: 'audition-cut', label: 'Audition Cut' },
  { value: 'note-bash', label: 'Note Bash' },
  { value: 'general', label: 'Other' },
];

export const CATEGORY_PLURALS: Record<string, string> = {
  'full-song': 'Full Songs',
  'audition-cut': 'Audition Cuts',
  'note-bash': 'Note Bashes',
  general: 'Other Tracks',
};
