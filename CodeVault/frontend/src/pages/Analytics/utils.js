/**
 * Local-time YYYY-MM-DD for a Date object — the calendar must use the
 * same key format that getDailyCounts() emits, which is local. Using
 * `.toISOString().slice(0,10)` would silently break for non-UTC users.
 */
export function localKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Build a 53 × 7 contribution heatmap ending today. Returns
 * `{ cells, months }` where cells is row-major within each column and
 * months is the column index where each new month starts.
 */
export function buildHeatmap(daily) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  // Align end to Saturday so columns are full weeks (Sun-Sat).
  const offsetEnd = 6 - end.getDay();
  end.setDate(end.getDate() + offsetEnd);
  const start = new Date(end);
  start.setDate(start.getDate() - 53 * 7 + 1);

  const cells = [];
  const months = [];
  let lastMonth = -1;
  let col = 0, row = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = localKey(d);
    const count = daily[key] || 0;
    let level = 0;
    if (count >= 1) level = 1;
    if (count >= 2) level = 2;
    if (count >= 4) level = 3;
    if (count >= 7) level = 4;
    const isFuture = d > today;
    cells.push({ key, count, level: isFuture ? -1 : level, label: d.toDateString() });
    if (row === 0 && d.getMonth() !== lastMonth) {
      months.push({ label: d.toLocaleString('en', { month: 'short' }), col });
      lastMonth = d.getMonth();
    }
    row = (row + 1) % 7;
    if (row === 0) col++;
  }
  return { cells, months };
}
