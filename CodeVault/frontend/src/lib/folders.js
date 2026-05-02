/**
 * Workspace folders & snippets — localStorage-only.
 *
 * Folders form a tree via `parentId` (null for top-level). Snippets live
 * inside exactly one folder. Both are organised so a user can keep
 * something like:
 *     2026/
 *       May/
 *         Hard/
 *           Graphs/
 *             two-sum.cpp
 *
 * Schema:
 *   cv:folders   = [{ id, name, parentId, createdAt }]
 *   cv:snippets  = [{ id, folderId, title, language, code, savedAt,
 *                     description?, difficulty?, tags?, testCases?,
 *                     vaultProblemId? }]
 *
 * The optional metadata fields are populated by the AI analysis step in
 * the Folders "New File" flow OR copied from a vault problem when the
 * user "Adds from Vault". `vaultProblemId` records that link so the
 * Workspace can reopen the original record when needed.
 */

const FKEY = 'cv:folders';
const SKEY = 'cv:snippets';

function readF() { try { return JSON.parse(localStorage.getItem(FKEY) || '[]'); } catch { return []; } }
function readS() { try { return JSON.parse(localStorage.getItem(SKEY) || '[]'); } catch { return []; } }
function writeF(a) { localStorage.setItem(FKEY, JSON.stringify(a)); window.dispatchEvent(new Event('cv:folders-changed')); }
function writeS(a) { localStorage.setItem(SKEY, JSON.stringify(a)); window.dispatchEvent(new Event('cv:folders-changed')); }

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Migrate older flat-folder records to include parentId. Idempotent. */
function migrate() {
  const folders = readF();
  let touched = false;
  for (const f of folders) {
    if (!('parentId' in f)) { f.parentId = null; touched = true; }
  }
  if (touched) writeF(folders);
}
migrate();

export function getFolders() { return readF(); }

/** All immediate children of `parentId` (null for top-level). */
export function getChildren(parentId = null) {
  return readF().filter(f => (f.parentId || null) === (parentId || null));
}

/** True if `descendant` lives anywhere underneath `ancestor`. Used to
 *  prevent illegal moves that would create a folder cycle. */
export function isDescendant(ancestorId, descendantId) {
  if (!ancestorId || !descendantId) return false;
  const folders = readF();
  let cur = folders.find(f => f.id === descendantId);
  while (cur && cur.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = folders.find(f => f.id === cur.parentId);
  }
  return false;
}

export function createFolder(name, parentId = null) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const folders = readF();
  // Same name allowed under different parents — only block siblings.
  if (folders.some(f => (f.parentId || null) === (parentId || null) && f.name.toLowerCase() === trimmed.toLowerCase())) return null;
  const f = { id: uid(), name: trimmed, parentId: parentId || null, createdAt: new Date().toISOString() };
  folders.push(f);
  writeF(folders);
  return f;
}

export function renameFolder(id, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return false;
  const folders = readF();
  const f = folders.find(x => x.id === id);
  if (!f) return false;
  f.name = trimmed;
  writeF(folders);
  return true;
}

export function moveFolder(id, newParentId) {
  if (id === newParentId) return false;
  if (newParentId && isDescendant(id, newParentId)) return false; // cycle
  const folders = readF();
  const f = folders.find(x => x.id === id);
  if (!f) return false;
  f.parentId = newParentId || null;
  writeF(folders);
  return true;
}

/** Delete a folder, all descendants, and every snippet inside any of them. */
export function deleteFolder(id) {
  const folders = readF();
  const doomed = new Set([id]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folders) {
      if (!doomed.has(f.id) && f.parentId && doomed.has(f.parentId)) {
        doomed.add(f.id); added = true;
      }
    }
  }
  writeF(folders.filter(f => !doomed.has(f.id)));
  writeS(readS().filter(s => !doomed.has(s.folderId)));
}

export function getSnippets(folderId = null) {
  const all = readS();
  return folderId === null ? all : all.filter(s => s.folderId === folderId);
}

export function getSnippet(id) {
  return readS().find(s => s.id === id) || null;
}

export function addSnippet({ folderId, title, language, code, description, difficulty, tags, testCases, vaultProblemId }) {
  if (!folderId || !code) return null;
  const snippets = readS();
  const s = {
    id: uid(),
    folderId,
    title: (title || 'Untitled').trim() || 'Untitled',
    language: language || 'cpp',
    code,
    savedAt: new Date().toISOString(),
    ...(description !== undefined && { description }),
    ...(difficulty && { difficulty }),
    ...(tags && tags.length && { tags }),
    ...(testCases && testCases.length && { testCases }),
    ...(vaultProblemId && { vaultProblemId }),
  };
  snippets.push(s);
  writeS(snippets);
  return s;
}

export function updateSnippet(id, patch) {
  const snippets = readS();
  const s = snippets.find(x => x.id === id);
  if (!s) return false;
  Object.assign(s, patch);
  writeS(snippets);
  return true;
}

export function renameSnippet(id, title) {
  const trimmed = (title || '').trim();
  if (!trimmed) return false;
  return updateSnippet(id, { title: trimmed });
}

export function deleteSnippet(id) {
  writeS(readS().filter(s => s.id !== id));
}

export function moveSnippet(id, folderId) {
  return updateSnippet(id, { folderId });
}
