/**
 * Workspace folders & snippets — localStorage-only.
 *
 * Lets the user organize code snippets into folders directly from the editor.
 * Schema:
 *   cv:folders   = [{ id, name, createdAt }]
 *   cv:snippets  = [{ id, folderId, title, language, code, savedAt }]
 */

const FKEY = 'cv:folders';
const SKEY = 'cv:snippets';

function readF() { try { return JSON.parse(localStorage.getItem(FKEY) || '[]'); } catch { return []; } }
function readS() { try { return JSON.parse(localStorage.getItem(SKEY) || '[]'); } catch { return []; } }
function writeF(a) { localStorage.setItem(FKEY, JSON.stringify(a)); window.dispatchEvent(new Event('cv:folders-changed')); }
function writeS(a) { localStorage.setItem(SKEY, JSON.stringify(a)); window.dispatchEvent(new Event('cv:folders-changed')); }

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function getFolders() { return readF(); }

export function createFolder(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const folders = readF();
  if (folders.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) return null;
  const f = { id: uid(), name: trimmed, createdAt: new Date().toISOString() };
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

export function deleteFolder(id) {
  writeF(readF().filter(f => f.id !== id));
  // Cascade: drop snippets in that folder.
  writeS(readS().filter(s => s.folderId !== id));
}

export function getSnippets(folderId = null) {
  const all = readS();
  return folderId === null ? all : all.filter(s => s.folderId === folderId);
}

export function addSnippet({ folderId, title, language, code }) {
  if (!folderId || !code) return null;
  const snippets = readS();
  const s = {
    id: uid(),
    folderId,
    title: (title || 'Untitled').trim(),
    language: language || 'cpp',
    code,
    savedAt: new Date().toISOString(),
  };
  snippets.push(s);
  writeS(snippets);
  return s;
}

export function deleteSnippet(id) {
  writeS(readS().filter(s => s.id !== id));
}

export function moveSnippet(id, folderId) {
  const snippets = readS();
  const s = snippets.find(x => x.id === id);
  if (!s) return false;
  s.folderId = folderId;
  writeS(snippets);
  return true;
}
