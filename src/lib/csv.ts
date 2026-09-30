import { format } from 'date-fns';

type Cell = string | number | boolean | null | undefined;

// Quote every cell, and stop spreadsheets treating text such as "=HYPERLINK(...)"
// typed into a form as a formula.
const cell = (value: Cell) => {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

/** Download rows as a CSV file named `<name>_YYYY-MM-DD.csv`. */
export const downloadCsv = (name: string, headers: string[], rows: Cell[][]) => {
  const csv = [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
