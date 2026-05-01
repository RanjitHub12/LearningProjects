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

function write(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr));
  window.dispatchEvent(new Event('cv:activity-changed'));
}

export function recordSolve({ problemId, title, difficulty, tags = [], source = 'vault' }) {
  const all = read();
  // Idempotent for same calendar day + problemId — avoids spamming the streak.
  const today = new Date().toISOString().slice(0, 10);
  const dup = all.find(a =>
    a.problemId === problemId &&
    (a.solvedAt || '').slice(0, 10) === today
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
  const days = new Set(read().map(a => (a.solvedAt || '').slice(0, 10)).filter(Boolean));
  if (days.size === 0) return { current: 0, longest: 0, lastSolveDate: null };

  const sorted = [...days].sort();
  const lastSolveDate = sorted[sorted.length - 1];

  // Longest run anywhere in history.
  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(sorted[i - 1] + 'T00:00:00Z');
    const b = new Date(sorted[i] + 'T00:00:00Z');
    const diff = Math.round((b - a) / 86400000);
    run = diff === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // Current streak: walk back from today (or yesterday if today not yet solved).
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let cursor = days.has(today) ? today : (days.has(yest) ? yest : null);
  let current = 0;
  while (cursor && days.has(cursor)) {
    current++;
    const d = new Date(cursor + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }

  return { current, longest, lastSolveDate };
}

/** { 'YYYY-MM-DD': count } over all history. */
export function getDailyCounts() {
  const out = {};
  for (const a of read()) {
    const d = (a.solvedAt || '').slice(0, 10);
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
