export const KEY_VALUES = [
  "C Major (0)",
  "G Major (1♯)",
  "D Major (2♯)",
  "A Major (3♯)",
  "E Major (4♯)",
  "B Major (5♯)",
  "F♯ Major (6♯)",
  "C♯ Major (7♯)",
  "F Major (1♭)",
  "B♭ Major (2♭)",
  "E♭ Major (3♭)",
  "A♭ Major (4♭)",
  "D♭ Major (5♭)",
  "G♭ Major (6♭)",
  "C♭ Major (7♭)",
];

export const KEY_OPTIONS = KEY_VALUES.map((value) => ({ value, label: value }));

export const keyForDisplay = (key: string) =>
  key.replace(/\s*\(\d+[♯♭]?\)\s*$/, "").trim();
