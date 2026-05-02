/**
 * Solve-activity tracking — localStorage-only.
 *
 * Records what the user has actually SOLVED on this site (not what was
 * uploaded). Powers the Dashboard, Analytics calendar, and streak badge.
 *
 * Schema (key "cv:activity"):
 *   [{ problemId, title, difficulty, tags, source, solvedAt }]
 *   - source: "vault" | "leetcode-daily" | "scratch"
 *   - solvedAt: ISO timestamp
 */

const KEY = 'cv:activity';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

/**
 * Day key for an activity entry, in the user's *local* timezone.
 *
 * solvedAt is an ISO timestamp; calling `.slice(0,10)` on the raw string
 * gives a UTC date, which means a solve at 4am local time in IST (UTC+5:30)
 * lands on yesterday's UTC date and silently disappears from "today" on the
 * contribution calendar. We convert to a local YYYY-MM-DD instead.
 */
function localDay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function write(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr));
  window.dispatchEvent(new Event('cv:activity-changed'));
}

export function recordSolve({ problemId, title, difficulty, tags = [], source = 'vault' }) {
  const all = read();
  // Idempotent for same calendar day + problemId — avoids spamming the streak.
  const today = todayLocal();
  const dup = all.find(a =>
    a.problemId === problemId &&
    localDay(a.solvedAt) === today
  );
  if (dup) return dup;
  const entry = { problemId, title, difficulty, tags, source, solvedAt: new Date().toISOString() };
  all.push(entry);
  write(all);
  return entry;
}

export function getActivity() { return read(); }

export function getSolvedSet() {
  return new Set(read().map(a => a.problemId).filter(Boolean));
}

export function isSolved(problemId) {
  return getSolvedSet().has(problemId);
}

/**
 * Returns { current, longest, lastSolveDate } where streaks count consecutive
 * calendar days (UTC) on which at least one solve happened.
 */
export function getStreak() {
  const days = new Set(read().map(a => localDay(a.solvedAt)).filter(Boolean));
  if (days.size === 0) return { current: 0, longest: 0, lastSolveDate: null };

  const sorted = [...days].sort();
  const lastSolveDate = sorted[sorted.length - 1];

  // Longest run anywhere in history. Use noon-local timestamps so DST
  // boundaries don't trip up the day-difference math.
  const toDate = (s) => new Date(s + 'T12:00:00');
  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round((toDate(sorted[i]) - toDate(sorted[i - 1])) / 86400000);
    run = diff === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // Current streak: walk back from today (or yesterday if today not yet solved).
  const today = todayLocal();
  const yestDate = new Date(); yestDate.setDate(yestDate.getDate() - 1);
  const yest = localDay(yestDate.toISOString());
  let cursor = days.has(today) ? today : (days.has(yest) ? yest : null);
  let current = 0;
  while (cursor && days.has(cursor)) {
    current++;
    const d = toDate(cursor);
    d.setDate(d.getDate() - 1);
    cursor = localDay(d.toISOString());
  }

  return { current, longest, lastSolveDate };
}

/** { 'YYYY-MM-DD': count } over all history, keyed by the user's local day. */
export function getDailyCounts() {
  const out = {};
  for (const a of read()) {
    const d = localDay(a.solvedAt);
    if (!d) continue;
    out[d] = (out[d] || 0) + 1;
  }
  return out;
}

/** Aggregate of solve counts per tag across solved problems. */
export function getTagCounts() {
  const out = {};
  for (const a of read()) {
    for (const t of (a.tags || [])) out[t] = (out[t] || 0) + 1;
  }
  return out;
}

/** Aggregate by difficulty. */
export function getDifficultyCounts() {
  const out = { Easy: 0, Medium: 0, Hard: 0, Impossible: 0 };
  for (const a of read()) if (a.difficulty in out) out[a.difficulty]++;
  return out;
}

export function clearActivity() { write([]); }
