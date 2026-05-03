/**
 * Folders — local code-file browser with nested folders + vault import.
 *
 * Three-pane layout: [folder tree] | [files in active folder] | [preview / actions]
 *
 * Folders nest via parentId — you can keep e.g. 2026 / May / Hard / Graphs and
 * store a snippet inside the leaf. Files come from two sources:
 *   • New File   — author code in a Monaco modal, AI fills description / tags /
 *                  test cases on save (POST /upload/analyze).
 *   • Add from Vault — pick an existing vault problem and copy its metadata +
 *                  first solution's first approach into the folder; everything
 *                  stays in localStorage.
 */
import { useEffect, useMemo, useState } from 'react';
import { FilePlus2, Library } from 'lucide-react';

import {
  getFolders, createFolder, deleteFolder, renameFolder,
  getSnippets, addSnippet, deleteSnippet, renameSnippet,
} from '../../lib/folders';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';

import { Page, Btn, Grid } from './styles';
import { BOILER } from './constants';
import Tree from './Tree';
import FileList from './FileList';
import PreviewPane from './PreviewPane';
import NewFileModal from './NewFileModal';
import AddFromVaultModal from './AddFromVaultModal';

export default function Folders() {
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
  const [diffFilter, setDiffFilter] = useState('All');
  const [tagFilters, setTagFilters] = useState([]);
  const [expanded, setExpanded] = useState({});

  // Inline subfolder creation: clicking + on a folder reveals an input row.
  // State keys: parent folder id (or '__root__').
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
      toast({
        kind:'warn', title:'Could not create folder',
        message: newName.trim() ? 'A sibling folder with that name already exists.' : 'Folder name is required.',
      });
      return;
    }
    setNewNameForCreate(''); setCreatingUnder(null); setActiveId(f.id);
    if (parentId) setExpanded(e => ({ ...e, [parentId]: true }));
  };

  const handleDeleteFolder = async (f) => {
    const ok = await confirm({
      title:'Delete folder?',
      message:`"${f.name}" and everything inside it (subfolders + files) will be permanently removed.`,
      danger:true, confirmLabel:'Delete',
    });
    if (!ok) return;
    deleteFolder(f.id);
    if (activeId === f.id) setActiveId(null);
    setSelected(null);
  };

  const handleDeleteFile = async (s) => {
    const ok = await confirm({
      title:'Delete file?', message:`"${s.title}" will be permanently removed.`,
      danger:true, confirmLabel:'Delete',
    });
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
        body: JSON.stringify({
          code: newCode, language: newLang,
          filename: (newFileName || 'snippet') + '.' + newLang,
        }),
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
          ? `Description, tags, and ${(analysis.generated_test_cases || []).length} test case${(analysis.generated_test_cases || []).length === 1 ? '' : 's'} attached.`
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
    } catch {} finally {
      setVaultLoading(false);
    }
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
      // The list endpoint may not include solutions/approaches; the detail
      // endpoint does, so always pull the full record before importing.
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
        toast({
          kind:'success', title:'Added from vault',
          message:`"${full.title}" copied into this folder${ap ? ' with its first approach.' : '.'}`,
        });
      }
    } catch (e) {
      toast({ kind:'error', title:'Import failed', message: e.message });
    } finally {
      setImporting(false);
    }
  };

  const activeFolderName = folders.find(f => f.id === activeId)?.name || '';

  return (
    <Page>
      <PageHeader
        eyebrow="Local archive"
        title="Folders"
        accent="& files."
        subtitle="Organise code files in this browser. Nest folders (Year → Month → Difficulty → Topic), add fresh files, or pull existing problems straight from the vault.">
        <Btn onClick={openVault} disabled={!activeId}
          title="Pick a problem from the vault to copy into this folder">
          <Library size={14}/> Add from Vault
        </Btn>
        <Btn $primary onClick={openNewFile} disabled={!activeId}>
          <FilePlus2 size={14}/> New File
        </Btn>
      </PageHeader>

      <Grid>
        <Tree
          folders={folders} snippets={snippets}
          activeId={activeId} setActiveId={setActiveId} setSelected={setSelected}
          expanded={expanded} setExpanded={setExpanded} toggleExpand={toggleExpand}
          renamingFolder={renamingFolder} setRenamingFolder={setRenamingFolder}
          renameValue={renameValue} setRenameValue={setRenameValue} commitRenameFolder={commitRenameFolder}
          startRenameFolder={startRenameFolder}
          creatingUnder={creatingUnder} setCreatingUnder={setCreatingUnder}
          newName={newName} setNewNameForCreate={setNewNameForCreate}
          handleCreateFolder={handleCreateFolder}
          handleDeleteFolder={handleDeleteFolder}/>

        <FileList
          activeId={activeId} folders={folders} snippets={snippets}
          filesInFolder={filesInFolder}
          search={search} setSearch={setSearch}
          diffFilter={diffFilter} setDiffFilter={setDiffFilter}
          tagFilters={tagFilters} toggleTag={toggleTag} folderTags={folderTags}
          filtersActive={filtersActive} clearAllFilters={clearAllFilters}
          crumbs={crumbs} setActiveId={setActiveId}
          selected={selected} setSelected={setSelected}
          renamingFile={renamingFile} setRenamingFile={setRenamingFile}
          renameValue={renameValue} setRenameValue={setRenameValue} commitRenameFile={commitRenameFile}
          startRenameFile={startRenameFile} handleDeleteFile={handleDeleteFile}
          openVault={openVault} openNewFile={openNewFile}/>

        <PreviewPane selected={selected}/>
      </Grid>

      <NewFileModal
        open={newOpen} onClose={()=>setNewOpen(false)}
        newFileName={newFileName} setNewFileName={setNewFileName}
        newLang={newLang} onLangChange={onLangChange}
        newCode={newCode} setNewCode={setNewCode}
        analyzing={analyzing} saveNewFile={saveNewFile}/>

      <AddFromVaultModal
        open={vaultOpen} onClose={()=>setVaultOpen(false)}
        vaultLoading={vaultLoading} vaultProblems={vaultProblems} filteredVault={filteredVault}
        vaultSearch={vaultSearch} setVaultSearch={setVaultSearch}
        vaultSelected={vaultSelected} setVaultSelected={setVaultSelected}
        importing={importing} importFromVault={importFromVault}
        activeFolderName={activeFolderName}/>
    </Page>
  );
}
