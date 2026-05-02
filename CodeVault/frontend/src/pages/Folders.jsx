/**
 * Folders — local code-file browser with nested folders + vault import.
 *
 * Three-pane layout:
 *   [folder tree] | [files in active folder] | [preview / actions]
 *
 * Folders nest via parentId — you can keep e.g. 2026 / May / Hard / Graphs
 * and store a snippet inside the leaf. Files come from two sources:
 *   • New File   — author code in a Monaco modal, AI fills description /
 *                  tags / test cases on save (POST /upload/analyze).
 *   • Add from Vault — pick an existing vault problem and copy its
 *                  metadata + first solution's first approach into the
 *                  folder; everything stays in localStorage.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import Editor from '@monaco-editor/react';
import {
  Folder, FolderPlus, FilePlus2, FileCode, Trash2, Edit2, Play,
  X, Loader2, Sparkles, ArrowRight, Search, Code2,
  ChevronRight, ChevronDown, Plus, Library, ChevronsRight,
} from 'lucide-react';
import {
  getFolders, createFolder, deleteFolder, renameFolder, getChildren,
  getSnippets, addSnippet, deleteSnippet, renameSnippet,
} from '../lib/folders';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';

const spin = keyframes`to{transform:rotate(360deg);}`;

const Page = styled.div`animation: fadeIn .4s ease;`;

const Btn = styled.button`
  padding: 8px 16px; border-radius: 9px; border:none; cursor:pointer;
  font-family:inherit; font-size:.83rem; font-weight:600;
  display:inline-flex; align-items:center; gap:7px; transition: all .15s;
  ${p => p.$primary ? `
    background: var(--cv-gradient-primary); color:#fff;
    &:hover{ transform: translateY(-1px); box-shadow:0 4px 16px rgba(99,102,241,.3); }
    &:disabled{ opacity:.5; cursor:not-allowed; transform:none; box-shadow:none; }
  ` : `
    background: var(--cv-bg-tertiary); color: var(--cv-text-secondary);
    border: 1px solid var(--cv-border-subtle);
    &:hover{ border-color: var(--cv-border-hover); color: var(--cv-text-primary); }
    &:disabled{ opacity:.5; cursor:not-allowed; }
  `}
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 300px) minmax(0, 1fr) minmax(280px, 320px);
  gap: 16px; min-height: 540px;
  @media(max-width: 1280px){
    grid-template-columns: minmax(260px, 280px) minmax(0, 1fr);
    .preview{ display:none; }
  }
  @media(max-width: 720px){
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: var(--cv-glass-bg); backdrop-filter: blur(20px);
  border: 1px solid var(--cv-border-subtle); border-radius: 14px;
  display: flex; flex-direction: column; min-height: 0;
  min-width: 0; overflow: hidden;
`;
const CardHead = styled.div`
  padding: 12px 14px; border-bottom: 1px solid var(--cv-border-subtle);
  display:flex; align-items:center; gap:8px;
  font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em;
  color: var(--cv-text-muted);
  > svg{ width:14px; height:14px; color: var(--cv-accent); flex-shrink:0; }
  .spacer{ flex:1; }
`;
const CardBody = styled.div`flex:1; overflow-y:auto; padding: 10px;`;

/* ── Folder tree row ─────────────────────────────────────────── */
const TreeRow = styled.div`
  display: grid;
  grid-template-columns: 18px 16px 1fr auto auto auto auto;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px ${p => 8 + (p.$depth || 0) * 14}px;
  border-radius: 9px; cursor: pointer; user-select: none;
  margin-bottom: 2px; min-width: 0;
  background: ${p => p.$active ? 'var(--cv-accent-muted)' : 'transparent'};
  color: ${p => p.$active ? 'var(--cv-accent)' : 'var(--cv-text-secondary)'};
  font-size:.86rem; font-weight: 500;
  &:hover{ background: var(--cv-accent-muted); }
  .chev { background:none; border:none; cursor:pointer; padding:0; display:flex;
    align-items:center; justify-content:center; color: var(--cv-text-muted);
    width: 18px; height: 18px; border-radius: 4px;
    &:hover { color: var(--cv-accent); background: var(--cv-bg-tertiary); }
    &[disabled]{ opacity: .25; cursor: default; } }
  .glyph { display:flex; align-items:center; justify-content:center;
    color: ${p => p.$active ? 'var(--cv-accent)' : 'var(--cv-text-muted)'}; }
  .name { min-width: 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .count { font-size:.7rem; color: var(--cv-text-muted); font-family: var(--cv-font-mono);
    padding: 1px 7px; border-radius: 999px; background: var(--cv-bg-tertiary); }
  .icon-btn{ background:none; border:none; cursor:pointer; padding:4px; color: var(--cv-text-muted);
    display:flex; border-radius:6px;
    &:hover{ color: var(--cv-accent); background: var(--cv-bg-tertiary); } }
`;

const FileTile = styled.div`
  padding: 12px; border-radius: 10px; margin-bottom: 8px;
  background: var(--cv-bg-tertiary); border: 1px solid var(--cv-border-subtle);
  display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center;
  cursor: pointer; transition: all .15s;
  &:hover{ border-color: var(--cv-border-hover); transform: translateY(-1px); }
  .icon { width: 32px; height: 32px; border-radius: 8px; display:flex; align-items:center; justify-content:center;
    background: var(--cv-accent-muted); color: var(--cv-accent); }
  .meta{ min-width: 0; }
  .title{ font-size: .92rem; font-weight: 600; color: var(--cv-text-primary); margin-bottom: 2px;
    white-space:nowrap; overflow:hidden; text-overflow: ellipsis; }
  .sub{ font-size: .72rem; color: var(--cv-text-muted); font-family: var(--cv-font-mono); }
  .actions{ display:flex; gap:4px; }
  .actions button{ background:none; border:none; cursor:pointer; color: var(--cv-text-muted); padding:4px;
    border-radius: 6px; display:flex; &:hover{ background: var(--cv-bg-secondary); color: var(--cv-text-primary); } }
`;

const Crumbs = styled.div`
  display: flex; align-items: center; gap: 4px;
  padding: 6px 14px 0; font-size: .76rem; color: var(--cv-text-muted);
  flex-wrap: wrap;
  .seg { color: var(--cv-text-secondary); cursor: pointer;
    padding: 2px 6px; border-radius: 5px;
    &:hover { background: var(--cv-bg-tertiary); color: var(--cv-text-primary); } }
  .seg.active { color: var(--cv-accent); font-weight: 600; cursor: default; background: transparent; }
  svg { width: 12px; height: 12px; opacity: .5; flex-shrink: 0; }
`;

const Empty = styled.div`
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  min-height: 200px; padding: 30px; text-align:center; color: var(--cv-text-muted);
  font-size:.85rem;
  svg{ width:36px; height:36px; opacity:.3; margin-bottom: 10px; }
`;

/* ── Modal primitives ───────────────────────────────────────── */
const Backdrop = styled.div`
  position: fixed; inset: 0; z-index: 600;
  background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
  display:flex; align-items:center; justify-content:center; padding: 20px;
`;
const Modal = styled.div`
  width: min(${p => p.$w || '960px'}, 100%); max-height: 92vh;
  display:flex; flex-direction:column;
  background: var(--cv-bg-secondary, #11151d);
  border: 1px solid var(--cv-border-default); border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,.55); overflow: hidden;
`;
const MHead = styled.div`
  display:flex; align-items:center; gap:10px;
  padding: 14px 18px; border-bottom: 1px solid var(--cv-border-subtle);
  .t{ flex:1; font-size: 1rem; font-weight: 700; color: var(--cv-text-primary); }
  button{ background:none; border:none; cursor:pointer; color: var(--cv-text-muted); padding:4px; border-radius:6px;
    display:flex; &:hover{ background: var(--cv-bg-tertiary); color: var(--cv-text-primary); } }
`;
const MFoot = styled.div`
  display:flex; gap:8px; padding: 12px 18px;
  border-top: 1px solid var(--cv-border-subtle); justify-content: flex-end;
`;
const FieldRow = styled.div`
  display:flex; gap: 10px; padding: 12px 18px;
  border-bottom: 1px solid var(--cv-border-subtle);
  input, select{ padding: 7px 10px; border-radius: 8px;
    background: var(--cv-bg-tertiary); border: 1px solid var(--cv-border-subtle);
    color: var(--cv-text-primary); font-family: inherit; font-size: .85rem; outline: none; }
  input{ flex: 1; }
  input:focus, select:focus{ border-color: var(--cv-accent); }
`;

const Spinner = styled(Loader2)`animation: ${spin} 1s linear infinite;`;

const PreviewBox = styled.div`
  padding: 14px;
  .h { font-size: 1.05rem; font-weight: 700; color: var(--cv-text-primary); margin-bottom: 4px; }
  .meta { font-size: .72rem; color: var(--cv-text-muted); font-family: var(--cv-font-mono); margin-bottom: 12px; }
  .tags { display:flex; flex-wrap:wrap; gap: 4px; margin-bottom: 12px; }
  .desc { font-size: .82rem; color: var(--cv-text-secondary); line-height: 1.55; white-space: pre-wrap;
    max-height: 220px; overflow-y: auto; padding-right: 4px; }
  .tcs { margin-top: 12px; }
  .tc { padding: 8px 10px; background: var(--cv-bg-tertiary); border:1px solid var(--cv-border-subtle);
    border-radius:7px; margin-bottom: 5px; font-size:.78rem; }
  .tc .lbl{ color: var(--cv-text-muted); font-size: .7rem; font-weight: 600; }
`;

const VaultRow = styled.div`
  display:flex; align-items:center; gap:12px; padding: 10px 14px;
  border-radius: 9px; cursor: pointer; border: 1px solid var(--cv-border-subtle);
  background: ${p => p.$selected ? 'var(--cv-accent-muted)' : 'transparent'};
  margin-bottom: 6px; transition: all .15s;
  &:hover { border-color: var(--cv-border-hover); transform: translateX(2px); }
  .name { flex:1; min-width:0; font-size:.88rem; font-weight:600;
    color: var(--cv-text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .meta { font-size:.7rem; color: var(--cv-text-muted); font-family: var(--cv-font-mono); }
`;

const BOILER = {
  cpp:'#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your solution here\n    return 0;\n}\n',
  python:'def solve():\n    # Your solution here\n    pass\n\nsolve()\n',
  java:'public class Solution {\n    public static void main(String[] args) {\n        // Your solution here\n    }\n}\n',
};

export default function Folders() {
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const [folders, setFolders] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renamingFile, setRenamingFile] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [search, setSearch] = useState('');
  // Optional file-list filters. The user can stack a difficulty filter
  // ("Hard") with one or more tag/algorithm filters ("graph", "dp"). All
  // filters AND together; tags use case-insensitive substring match so
  // "graph" hits both "Graph" and "Graph Theory".
  const [diffFilter, setDiffFilter] = useState('All'); // 'All' | 'Easy' | …
  const [tagFilters, setTagFilters] = useState([]);     // [string]
  const [expanded, setExpanded] = useState({}); // { folderId: true }

  // Inline subfolder creation: clicking the + on a folder reveals an
  // input row underneath it. State keys: parent folder id (or '__root__').
  const [creatingUnder, setCreatingUnder] = useState(null);
  const [newName, setNewNameForCreate] = useState('');

  // New File modal state
  const [newOpen, setNewOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newLang, setNewLang] = useState('cpp');
  const [newCode, setNewCode] = useState(BOILER.cpp);
  const [analyzing, setAnalyzing] = useState(false);

  // Add-from-Vault modal state
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultProblems, setVaultProblems] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultSearch, setVaultSearch] = useState('');
  const [vaultSelected, setVaultSelected] = useState(null);
  const [importing, setImporting] = useState(false);

  const refresh = () => { setFolders(getFolders()); setSnippets(getSnippets()); };

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener('cv:folders-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('cv:folders-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  // Default-select the first top-level folder once loaded.
  useEffect(() => {
    if (!activeId && folders.length) {
      const top = folders.find(f => !f.parentId);
      if (top) setActiveId(top.id);
    }
  }, [folders, activeId]);

  const filesInFolder = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tagsLC = tagFilters.map(t => t.toLowerCase());
    return snippets
      .filter(s => s.folderId === activeId)
      .filter(s => !q || s.title.toLowerCase().includes(q))
      .filter(s => diffFilter === 'All' || (s.difficulty || '').toLowerCase() === diffFilter.toLowerCase())
      .filter(s => tagsLC.length === 0 || tagsLC.every(t =>
        (s.tags || []).some(st => st.toLowerCase().includes(t))
      ))
      .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
  }, [snippets, activeId, search, diffFilter, tagFilters]);

  // Tag universe for the current folder — drives the chip suggestions.
  // Sorted by frequency so the most-relevant tags surface first.
  const folderTags = useMemo(() => {
    const counts = {};
    for (const s of snippets.filter(x => x.folderId === activeId)) {
      for (const t of (s.tags || [])) counts[t] = (counts[t] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [snippets, activeId]);

  const toggleTag = (t) => setTagFilters(prev =>
    prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
  );
  const clearAllFilters = () => { setDiffFilter('All'); setTagFilters([]); setSearch(''); };
  const filtersActive = diffFilter !== 'All' || tagFilters.length > 0 || search.trim().length > 0;

  // Recursive descendant count for a folder so badges show "all files
  // anywhere underneath", not just the immediate folder.
  const countDescendantFiles = (folderId) => {
    const stack = [folderId];
    let total = 0;
    const childMap = {};
    folders.forEach(f => {
      const k = f.parentId || '__root__';
      (childMap[k] = childMap[k] || []).push(f.id);
    });
    while (stack.length) {
      const cur = stack.pop();
      total += snippets.filter(s => s.folderId === cur).length;
      (childMap[cur] || []).forEach(c => stack.push(c));
    }
    return total;
  };

  // Path crumbs from root → activeId.
  const crumbs = useMemo(() => {
    if (!activeId) return [];
    const byId = Object.fromEntries(folders.map(f => [f.id, f]));
    const path = [];
    let cur = byId[activeId];
    while (cur) { path.unshift(cur); cur = cur.parentId ? byId[cur.parentId] : null; }
    return path;
  }, [activeId, folders]);

  // ─── Folder ops ────────────────────────────────────────────
  const handleCreateFolder = (parentId) => {
    const f = createFolder(newName, parentId);
    if (!f) {
      toast({ kind:'warn', title:'Could not create folder',
        message: newName.trim() ? 'A sibling folder with that name already exists.' : 'Folder name is required.' });
      return;
    }
    setNewNameForCreate(''); setCreatingUnder(null); setActiveId(f.id);
    if (parentId) setExpanded(e => ({ ...e, [parentId]: true }));
  };

  const handleDeleteFolder = async (f) => {
    const ok = await confirm({ title:'Delete folder?', message:`"${f.name}" and everything inside it (subfolders + files) will be permanently removed.`, danger:true, confirmLabel:'Delete' });
    if (!ok) return;
    deleteFolder(f.id);
    if (activeId === f.id) setActiveId(null);
    setSelected(null);
  };

  const handleDeleteFile = async (s) => {
    const ok = await confirm({ title:'Delete file?', message:`"${s.title}" will be permanently removed.`, danger:true, confirmLabel:'Delete' });
    if (!ok) return;
    deleteSnippet(s.id);
    if (selected?.id === s.id) setSelected(null);
  };

  const startRenameFolder = (f) => { setRenamingFolder(f.id); setRenameValue(f.name); };
  const commitRenameFolder = () => {
    if (renamingFolder && renameValue.trim()) renameFolder(renamingFolder, renameValue.trim());
    setRenamingFolder(null); setRenameValue('');
  };
  const startRenameFile = (s) => { setRenamingFile(s.id); setRenameValue(s.title); };
  const commitRenameFile = () => {
    if (renamingFile && renameValue.trim()) renameSnippet(renamingFile, renameValue.trim());
    setRenamingFile(null); setRenameValue('');
  };

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  // ─── New File ──────────────────────────────────────────────
  const openNewFile = () => {
    if (!activeId) {
      toast({ kind:'warn', title:'No folder selected', message:'Create or pick a folder first.' });
      return;
    }
    setNewFileName(''); setNewLang('cpp'); setNewCode(BOILER.cpp); setNewOpen(true);
  };

  const onLangChange = (l) => { setNewLang(l); setNewCode(BOILER[l] || ''); };

  const saveNewFile = async () => {
    if (!newCode.trim()) {
      toast({ kind:'warn', title:'Nothing to save', message:'Write some code before saving.' });
      return;
    }
    setAnalyzing(true);
    let analysis = null;
    try {
      const r = await fetch('/api/v1/upload/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newCode, language: newLang, filename: (newFileName || 'snippet') + '.' + newLang }),
      });
      if (r.ok) analysis = await r.json();
    } catch {}
    setAnalyzing(false);

    const title = (newFileName || analysis?.title || 'Untitled').trim() || 'Untitled';
    const created = addSnippet({
      folderId: activeId,
      title, language: newLang, code: newCode,
      description: analysis?.problem_statement || '',
      difficulty: analysis?.difficulty || '',
      tags: analysis?.dsa_tags || [],
      testCases: analysis?.generated_test_cases || [],
    });
    setNewOpen(false);
    if (created) {
      setSelected(created);
      toast({
        kind:'success',
        title: analysis && !analysis.error ? 'File saved with AI analysis' : 'File saved',
        message: analysis && !analysis.error
          ? `Description, tags, and ${(analysis.generated_test_cases||[]).length} test case${(analysis.generated_test_cases||[]).length===1?'':'s'} attached.`
          : 'AI analysis was unavailable — saved without metadata.',
      });
    }
  };

  // ─── Add from Vault ────────────────────────────────────────
  const openVault = async () => {
    if (!activeId) {
      toast({ kind:'warn', title:'No folder selected', message:'Create or pick a folder first.' });
      return;
    }
    setVaultOpen(true); setVaultSelected(null); setVaultSearch(''); setVaultLoading(true);
    try {
      const r = await fetch('/api/v1/problems?limit=200');
      if (r.ok) setVaultProblems(await r.json());
    } catch {} finally { setVaultLoading(false); }
  };

  const filteredVault = useMemo(() => {
    const q = vaultSearch.trim().toLowerCase();
    if (!q) return vaultProblems;
    return vaultProblems.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.dsa_tags || []).some(t => t.toLowerCase().includes(q)) ||
      (p.difficulty || '').toLowerCase().includes(q)
    );
  }, [vaultProblems, vaultSearch]);

  const importFromVault = async () => {
    if (!vaultSelected || !activeId) return;
    setImporting(true);
    try {
      // Pull the full problem record (the list endpoint may not include
      // solutions/approaches; the detail endpoint does).
      const r = await fetch(`/api/v1/problems/${vaultSelected.id}`);
      const full = r.ok ? await r.json() : vaultSelected;
      const sol = (full.solutions || [])[0] || null;
      const approaches = sol?.extracted_approaches || [];
      const ap = approaches[0] || null;
      const code = ap?.raw_code || '// No code captured for this vault problem.\n';
      const language = sol?.language || 'cpp';
      const created = addSnippet({
        folderId: activeId,
        title: full.title,
        language,
        code,
        description: full.problem_statement || '',
        difficulty: full.difficulty || '',
        tags: full.dsa_tags || [],
        testCases: full.generated_test_cases || [],
        vaultProblemId: full.id,
      });
      setVaultOpen(false);
      if (created) {
        setSelected(created);
        toast({ kind:'success', title:'Added from vault',
          message:`"${full.title}" copied into this folder${ap ? ' with its first approach.' : '.'}` });
      }
    } catch (e) {
      toast({ kind:'error', title:'Import failed', message: e.message });
    } finally { setImporting(false); }
  };

  // ─── Tree render ───────────────────────────────────────────
  const renderTree = (parentId, depth) => {
    const children = getChildren(parentId);
    if (!children.length && parentId !== null) return null;
    return children.map(f => {
      const isRen = renamingFolder === f.id;
      const grandkids = getChildren(f.id);
      const hasChildren = grandkids.length > 0;
      const isExpanded = !!expanded[f.id];
      const directCount = snippets.filter(s => s.folderId === f.id).length;
      const totalCount = countDescendantFiles(f.id);
      return (
        <div key={f.id}>
          <TreeRow $depth={depth} $active={activeId === f.id}
            onClick={() => { if (!isRen) { setActiveId(f.id); setSelected(null); }}}>
            <button className="chev" disabled={!hasChildren}
              onClick={e => { e.stopPropagation(); if (hasChildren) toggleExpand(f.id); }}
              title={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : ''}
            >
              {hasChildren ? (isExpanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>) : <span style={{ width: 13 }}/>}
            </button>
            <span className="glyph"><Folder size={14}/></span>
            {isRen ? (
              <input
                autoFocus
                value={renameValue}
                onChange={e=>setRenameValue(e.target.value)}
                onBlur={commitRenameFolder}
                onClick={e=>e.stopPropagation()}
                onKeyDown={e=>{ if(e.key==='Enter') commitRenameFolder(); if(e.key==='Escape'){ setRenamingFolder(null); setRenameValue(''); }}}
                style={{ minWidth:0, padding:'2px 6px', borderRadius:5, border:'1px solid var(--cv-accent)',
                  background:'var(--cv-bg-secondary,#11151d)', color:'var(--cv-text-primary)', fontSize:'.82rem', fontFamily:'inherit' }}
              />
            ) : (
              <span className="name">{f.name}</span>
            )}
            <span className="count" title={totalCount === directCount ? `${directCount} file${directCount===1?'':'s'}` : `${directCount} here · ${totalCount} total`}>
              {totalCount === directCount ? directCount : `${directCount}/${totalCount}`}
            </span>
            <button className="icon-btn" onClick={e=>{ e.stopPropagation(); setCreatingUnder(f.id); setNewNameForCreate(''); setExpanded(x => ({ ...x, [f.id]: true })); }} title="New subfolder"><Plus size={11}/></button>
            <button className="icon-btn" onClick={e=>{ e.stopPropagation(); startRenameFolder(f); }} title="Rename"><Edit2 size={11}/></button>
            <button className="icon-btn" onClick={e=>{ e.stopPropagation(); handleDeleteFolder(f); }} title="Delete folder"><Trash2 size={11}/></button>
          </TreeRow>

          {creatingUnder === f.id && (
            <div style={{ paddingLeft: 8 + (depth + 1) * 14 + 24, marginBottom: 4, display:'flex', gap: 6 }}>
              <input
                autoFocus
                value={newName}
                onChange={e=>setNewNameForCreate(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') handleCreateFolder(f.id); if(e.key==='Escape'){ setCreatingUnder(null); setNewNameForCreate(''); } }}
                onBlur={() => { if (!newName.trim()) { setCreatingUnder(null); } }}
                placeholder="Subfolder name…"
                style={{ flex:1, padding:'5px 8px', borderRadius:6, border:'1px solid var(--cv-accent)',
                  background:'var(--cv-bg-tertiary)', color:'var(--cv-text-primary)', fontSize:'.78rem', fontFamily:'inherit', outline:'none' }}
              />
            </div>
          )}

          {isExpanded && hasChildren && renderTree(f.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Local archive"
        title="Folders"
        accent="& files."
        subtitle="Organise code files in this browser. Nest folders (Year → Month → Difficulty → Topic), add fresh files, or pull existing problems straight from the vault."
      >
        <Btn onClick={openVault} disabled={!activeId} title="Pick a problem from the vault to copy into this folder">
          <Library size={14}/> Add from Vault
        </Btn>
        <Btn $primary onClick={openNewFile} disabled={!activeId}><FilePlus2 size={14}/> New File</Btn>
      </PageHeader>

      <Grid>
        {/* ── Folder tree ──────────────────────────── */}
        <Card>
          <CardHead>
            <Folder/> Folders
            <span className="spacer"/>
            <button onClick={()=>{ setCreatingUnder('__root__'); setNewNameForCreate(''); }}
              title="New top-level folder"
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cv-text-muted)',
                padding:'3px 6px', borderRadius:5, display:'flex', alignItems:'center', gap:3, fontSize:'.7rem', fontFamily:'inherit', textTransform:'none', letterSpacing: 0 }}>
              <FolderPlus size={12}/> New
            </button>
          </CardHead>
          <CardBody>
            {creatingUnder === '__root__' && (
              <div style={{ display:'flex', gap:6, marginBottom: 10 }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={e=>setNewNameForCreate(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter') handleCreateFolder(null); if(e.key==='Escape'){ setCreatingUnder(null); setNewNameForCreate(''); }}}
                  onBlur={() => { if (!newName.trim()) setCreatingUnder(null); }}
                  placeholder="Top-level folder name…"
                  style={{ flex:1, padding:'7px 9px', borderRadius:7, border:'1px solid var(--cv-accent)',
                    background:'var(--cv-bg-tertiary)', color:'var(--cv-text-primary)', fontSize:'.82rem', fontFamily:'inherit', outline:'none' }}
                />
              </div>
            )}
            {folders.length === 0 ? (
              <Empty><Folder/><div>No folders yet. Click <strong>+ New</strong> to start.</div></Empty>
            ) : renderTree(null, 0)}
          </CardBody>
        </Card>

        {/* ── Files pane ───────────────────────────── */}
        <Card>
          <CardHead>
            <FileCode/>
            <span style={{ color: 'var(--cv-text-secondary)', textTransform:'none', letterSpacing:0, fontSize:'.85rem', fontWeight:600 }}>
              {activeId ? (folders.find(f=>f.id===activeId)?.name || 'Files') : 'Files'}
            </span>
            <span className="spacer"/>
            {activeId && (
              <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                <Search size={12} style={{ position:'absolute', left:8, color:'var(--cv-text-muted)' }}/>
                <input
                  value={search}
                  onChange={e=>setSearch(e.target.value)}
                  placeholder="Search files…"
                  style={{ padding:'5px 8px 5px 24px', borderRadius:6, border:'1px solid var(--cv-border-subtle)',
                    background:'var(--cv-bg-tertiary)', color:'var(--cv-text-primary)', fontSize:'.76rem', fontFamily:'inherit', outline:'none', width: 160 }}
                />
              </div>
            )}
          </CardHead>
          {crumbs.length > 1 && (
            <Crumbs>
              {crumbs.map((c, i) => (
                <span key={c.id} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  {i > 0 && <ChevronsRight />}
                  <span className={`seg ${i === crumbs.length-1 ? 'active' : ''}`}
                    onClick={() => i !== crumbs.length-1 && setActiveId(c.id)}>{c.name}</span>
                </span>
              ))}
            </Crumbs>
          )}

          {/* Filter bar — difficulty chips + tag suggestions. Only renders
              once a folder is active and there are at least a couple of files. */}
          {activeId && snippets.filter(s => s.folderId === activeId).length > 1 && (
            <div style={{ padding: '8px 14px 0', display:'flex', flexDirection:'column', gap: 8 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6, flexWrap:'wrap' }}>
                <span style={{ fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--cv-text-muted)', marginRight: 4 }}>Difficulty</span>
                {['All','Easy','Medium','Hard','Impossible'].map(d => (
                  <button key={d}
                    onClick={()=>setDiffFilter(d)}
                    style={{
                      padding:'3px 10px', borderRadius:999, border:'1px solid',
                      borderColor: diffFilter === d ? 'var(--cv-accent)' : 'var(--cv-border-default)',
                      background:  diffFilter === d ? 'var(--cv-accent-muted)' : 'transparent',
                      color:       diffFilter === d ? 'var(--cv-accent)' : 'var(--cv-text-secondary)',
                      fontSize:'.72rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                    }}>{d}</button>
                ))}
                {filtersActive && (
                  <button onClick={clearAllFilters} title="Clear all filters"
                    style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer',
                      color:'var(--cv-text-muted)', fontSize:'.72rem', fontFamily:'inherit',
                      padding:'3px 8px', borderRadius:6, display:'flex', alignItems:'center', gap:4 }}>
                    <X size={11}/> Clear
                  </button>
                )}
              </div>
              {folderTags.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap: 6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--cv-text-muted)', marginRight: 4 }}>Topic</span>
                  {folderTags.slice(0, 14).map(t => {
                    const on = tagFilters.includes(t);
                    return (
                      <button key={t} onClick={()=>toggleTag(t)}
                        style={{
                          padding:'3px 10px', borderRadius:999, border:'1px solid',
                          borderColor: on ? 'var(--cv-rose)' : 'var(--cv-border-default)',
                          background:  on ? 'var(--cv-rose-muted)' : 'transparent',
                          color:       on ? 'var(--cv-rose)' : 'var(--cv-text-secondary)',
                          fontSize:'.72rem', fontWeight:500, cursor:'pointer', fontFamily:'inherit',
                        }}>{t}</button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <CardBody>
            {!activeId ? (
              <Empty><Folder/><div>Select or create a folder to see its files.</div></Empty>
            ) : filesInFolder.length === 0 ? (
              filtersActive ? (
                <Empty>
                  <Search/>
                  <div>No files match the current filters.</div>
                  <Btn onClick={clearAllFilters} style={{ marginTop: 12 }}>Clear filters</Btn>
                </Empty>
              ) : (
                <Empty>
                  <FileCode/>
                  <div>This folder is empty.</div>
                  <div style={{ display:'flex', gap:8, marginTop: 12 }}>
                    <Btn onClick={openVault}><Library size={13}/> Add from Vault</Btn>
                    <Btn $primary onClick={openNewFile}><FilePlus2 size={13}/> New File</Btn>
                  </div>
                </Empty>
              )
            ) : filesInFolder.map(s => {
              const isRen = renamingFile === s.id;
              return (
                <FileTile key={s.id} onClick={() => !isRen && setSelected(s)}>
                  <span className="icon"><FileCode size={16}/></span>
                  <div className="meta">
                    {isRen ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e=>setRenameValue(e.target.value)}
                        onBlur={commitRenameFile}
                        onClick={e=>e.stopPropagation()}
                        onKeyDown={e=>{ if(e.key==='Enter') commitRenameFile(); if(e.key==='Escape'){ setRenamingFile(null); setRenameValue(''); }}}
                        style={{ width:'100%', padding:'3px 6px', borderRadius:5, border:'1px solid var(--cv-accent)',
                          background:'var(--cv-bg-secondary,#11151d)', color:'var(--cv-text-primary)', fontSize:'.92rem', fontFamily:'inherit', fontWeight:600 }}
                      />
                    ) : (
                      <div className="title">{s.title}</div>
                    )}
                    <div className="sub">
                      {s.language} · {(s.savedAt||'').slice(0,10)}
                      {s.difficulty ? ` · ${s.difficulty}` : ''}
                      {s.vaultProblemId ? ' · vault' : ''}
                      {(s.tags||[]).length ? ` · ${(s.tags||[]).slice(0,3).join(', ')}` : ''}
                    </div>
                  </div>
                  <div className="actions" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>startRenameFile(s)} title="Rename"><Edit2 size={13}/></button>
                    <button onClick={()=>navigate(`/workspace?snippet=${s.id}`)} title="Open in Workspace"><Play size={13}/></button>
                    <button onClick={()=>handleDeleteFile(s)} title="Delete"><Trash2 size={13}/></button>
                  </div>
                </FileTile>
              );
            })}
          </CardBody>
        </Card>

        {/* ── Preview pane ─────────────────────────── */}
        <Card className="preview">
          <CardHead><Sparkles/> Preview <span className="spacer"/></CardHead>
          <CardBody>
            {!selected ? (
              <Empty><FileCode/><div>Click a file to preview its description and test cases.</div></Empty>
            ) : (
              <PreviewBox>
                <div className="h">{selected.title}</div>
                <div className="meta">
                  {selected.language}
                  {selected.difficulty ? ` · ${selected.difficulty}` : ''}
                  · saved {(selected.savedAt||'').slice(0,10)}
                </div>
                {(selected.tags||[]).length > 0 && (
                  <div className="tags">
                    {(selected.tags||[]).map(t => <span key={t} className="pill pill--tag">{t}</span>)}
                  </div>
                )}
                {selected.description ? (
                  <div className="desc">{selected.description}</div>
                ) : (
                  <div className="desc" style={{ color:'var(--cv-text-muted)', fontStyle:'italic' }}>
                    No description was generated for this file.
                  </div>
                )}
                {(selected.testCases||[]).length > 0 && (
                  <div className="tcs">
                    <div style={{ fontSize:'.7rem', fontWeight:700, color:'var(--cv-text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>Test Cases</div>
                    {(selected.testCases||[]).slice(0,3).map((tc, i) => (
                      <div className="tc" key={i}>
                        <div><span className="lbl">Input:</span> <code>{tc.input}</code></div>
                        <div><span className="lbl">Expected:</span> <code>{tc.expected_output}</code></div>
                      </div>
                    ))}
                  </div>
                )}
                <Btn $primary style={{ width:'100%', marginTop: 14, justifyContent:'center' }} onClick={()=>navigate(`/workspace?snippet=${selected.id}`)}>
                  Open in Workspace <ArrowRight size={13}/>
                </Btn>
              </PreviewBox>
            )}
          </CardBody>
        </Card>
      </Grid>

      {/* ── New File modal ──────────────────────────────── */}
      {newOpen && (
        <Backdrop onClick={()=>{ if(!analyzing) setNewOpen(false); }}>
          <Modal onClick={e=>e.stopPropagation()}>
            <MHead>
              <Code2 size={16} style={{ color:'var(--cv-accent)' }}/>
              <span className="t">New code file</span>
              <button onClick={()=>{ if(!analyzing) setNewOpen(false); }}><X size={16}/></button>
            </MHead>
            <FieldRow>
              <input
                value={newFileName}
                onChange={e=>setNewFileName(e.target.value)}
                placeholder="File name (optional — AI can suggest one)"
              />
              <select value={newLang} onChange={e=>onLangChange(e.target.value)}>
                <option value="cpp">C++</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
            </FieldRow>
            <div style={{ flex:1, minHeight: 360 }}>
              <Editor
                height="420px"
                language={newLang === 'cpp' ? 'cpp' : newLang}
                theme="vs-dark"
                value={newCode}
                onChange={v=>setNewCode(v||'')}
                options={{
                  minimap:{ enabled:false }, fontSize:14, lineHeight:22, padding:{ top: 8 },
                  scrollBeyondLastLine:false, wordWrap:'on', automaticLayout:true, tabSize:4,
                  scrollbar:{ verticalScrollbarSize:6, horizontalScrollbarSize:6 },
                }}
              />
            </div>
            <MFoot>
              <div style={{ flex:1, fontSize:'.78rem', color:'var(--cv-text-muted)', display:'flex', alignItems:'center', gap:6 }}>
                <Sparkles size={13} style={{ color:'var(--cv-accent)' }}/>
                On save, AI will generate a description, tags, and test cases.
              </div>
              <Btn onClick={()=>{ if(!analyzing) setNewOpen(false); }} disabled={analyzing}>Cancel</Btn>
              <Btn $primary onClick={saveNewFile} disabled={analyzing || !newCode.trim()}>
                {analyzing ? <><Spinner size={13}/> Analyzing…</> : <>Save File</>}
              </Btn>
            </MFoot>
          </Modal>
        </Backdrop>
      )}

      {/* ── Add from Vault modal ────────────────────────── */}
      {vaultOpen && (
        <Backdrop onClick={()=>{ if(!importing) setVaultOpen(false); }}>
          <Modal onClick={e=>e.stopPropagation()} $w="720px">
            <MHead>
              <Library size={16} style={{ color:'var(--cv-accent)' }}/>
              <span className="t">Add from Vault</span>
              <button onClick={()=>{ if(!importing) setVaultOpen(false); }}><X size={16}/></button>
            </MHead>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--cv-border-subtle)' }}>
              <div style={{ position:'relative' }}>
                <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--cv-text-muted)' }}/>
                <input
                  value={vaultSearch}
                  onChange={e=>setVaultSearch(e.target.value)}
                  placeholder="Search by title, tag, difficulty…"
                  style={{ width:'100%', padding:'9px 12px 9px 32px', borderRadius:8, border:'1px solid var(--cv-border-subtle)',
                    background:'var(--cv-bg-tertiary)', color:'var(--cv-text-primary)', fontSize:'.85rem', fontFamily:'inherit', outline:'none' }}
                />
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding: 14, minHeight: 320, maxHeight: 480 }}>
              {vaultLoading ? (
                <Empty><Spinner/><div>Loading vault problems…</div></Empty>
              ) : filteredVault.length === 0 ? (
                <Empty><Library/><div>{vaultProblems.length === 0 ? 'No problems in the vault yet.' : 'No matches.'}</div></Empty>
              ) : filteredVault.map(p => (
                <VaultRow key={p.id} $selected={vaultSelected?.id === p.id} onClick={()=>setVaultSelected(p)}>
                  <FileCode size={14} style={{ color:'var(--cv-accent)', flexShrink:0 }}/>
                  <span className="name">{p.title}</span>
                  {p.difficulty && <span className={`pill pill--${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>}
                  {(p.dsa_tags||[]).slice(0, 2).map(t => <span key={t} className="pill pill--tag">{t}</span>)}
                </VaultRow>
              ))}
            </div>
            <MFoot>
              <div style={{ flex:1, fontSize:'.78rem', color:'var(--cv-text-muted)' }}>
                {vaultSelected ? <>Importing into <strong style={{color:'var(--cv-text-primary)'}}>{folders.find(f=>f.id===activeId)?.name}</strong></> : 'Pick a problem to import.'}
              </div>
              <Btn onClick={()=>{ if(!importing) setVaultOpen(false); }} disabled={importing}>Cancel</Btn>
              <Btn $primary onClick={importFromVault} disabled={!vaultSelected || importing}>
                {importing ? <><Spinner size={13}/> Importing…</> : <><Library size={13}/> Add to folder</>}
              </Btn>
            </MFoot>
          </Modal>
        </Backdrop>
      )}
    </Page>
  );
}
