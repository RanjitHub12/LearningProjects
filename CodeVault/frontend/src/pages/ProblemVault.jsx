import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { FolderOpen, Search, ChevronRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { getFolders, getSnippets } from '../lib/folders';

/**
 * Problem Vault — flattened pointer view across every folder.
 *
 * The vault is no longer a separate DB-backed list; it's a global index of
 * the snippets the user saved across all folders. Each row links into the
 * Workspace via `?snippet=<id>` (or `?id=<vaultProblemId>` when the snippet
 * is linked to a vault problem reference) so the user can jump straight in.
 */

const Page = styled.div`animation: fadeIn 0.4s ease;`;

const Toolbar = styled.div`
  display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;`;

const SearchBox = styled.div`
  flex: 1; min-width: 200px; position: relative;
  svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    width: 16px; height: 16px; color: var(--cv-text-muted); }
  input { width: 100%; padding: 10px 14px 10px 38px; border-radius: 10px;
    background: var(--cv-glass-bg); border: 1px solid var(--cv-border-subtle);
    color: var(--cv-text-primary); font-family: inherit; font-size: 0.85rem;
    outline: none; transition: all 0.2s;
    &::placeholder { color: var(--cv-text-muted); }
    &:focus { border-color: var(--cv-accent); box-shadow: var(--cv-glow-accent); } }`;

const Chip = styled.button`
  padding: 7px 16px; border-radius: 999px; font-size: 0.78rem; font-weight: 600;
  cursor: pointer; border: 1px solid ${p => p.$active ? 'var(--cv-accent)' : 'var(--cv-border-default)'};
  background: ${p => p.$active ? 'var(--cv-accent-muted)' : 'transparent'};
  color: ${p => p.$active ? 'var(--cv-accent)' : 'var(--cv-text-secondary)'};
  font-family: inherit; transition: all 0.15s;
  &:hover { border-color: var(--cv-accent); color: var(--cv-accent); }`;

const TagChip = styled(Chip)`padding: 5px 12px; font-size: 0.72rem; font-weight: 500;`;

const Empty = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 350px; text-align: center;
  svg { width: 48px; height: 48px; color: var(--cv-text-muted); opacity: 0.3; margin-bottom: 16px; }
  h2 { font-size: 1.1rem; font-weight: 600; color: var(--cv-text-secondary); margin-bottom: 6px; }
  p { color: var(--cv-text-muted); max-width: 360px; font-size: 0.85rem; line-height: 1.6; }`;

const Table = styled.div`display: flex; flex-direction: column; gap: 4px;`;

const Row = styled(Link)`
  display: flex; align-items: center; gap: 14px;
  padding: 14px 18px; border-radius: 10px; text-decoration: none;
  background: var(--cv-glass-bg); border: 1px solid var(--cv-border-subtle);
  transition: all 0.15s;
  &:hover { border-color: var(--cv-border-hover); transform: translateX(2px);
    box-shadow: var(--cv-glass-shadow); }
  .title { flex: 1; font-weight: 600; font-size: 0.9rem; color: var(--cv-text-primary);
    display: flex; flex-direction: column; gap: 3px; }
  .crumb { font-size: 0.7rem; color: var(--cv-text-muted); font-weight: 500; }
  .tags { display: flex; gap: 4px; flex-wrap: wrap; }
  .arrow { color: var(--cv-text-muted); }`;

const LEVELS = ['All', 'Easy', 'Medium', 'Hard', 'Impossible'];

export default function ProblemVault() {
  const [folders, setFolders] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [tagFilters, setTagFilters] = useState([]);

  useEffect(() => {
    const refresh = () => { setFolders(getFolders()); setSnippets(getSnippets()); };
    refresh();
    window.addEventListener('cv:folders-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('cv:folders-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const folderPath = useMemo(() => {
    const byId = Object.fromEntries(folders.map(f => [f.id, f]));
    return (id) => {
      const segs = [];
      let cur = byId[id];
      while (cur) { segs.unshift(cur.name); cur = cur.parentId ? byId[cur.parentId] : null; }
      return segs.join(' / ') || '—';
    };
  }, [folders]);

  // Flat list of distinct tags across the whole vault, ordered by frequency
  // so the most common ones surface first as filter chips.
  const allTags = useMemo(() => {
    const counts = {};
    for (const s of snippets) for (const t of (s.tags || [])) counts[t] = (counts[t] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [snippets]);

  const toggleTag = (t) => setTagFilters(prev =>
    prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tagsLC = tagFilters.map(t => t.toLowerCase());
    return snippets
      .filter(s => !q
        || s.title.toLowerCase().includes(q)
        || (s.tags || []).some(t => t.toLowerCase().includes(q))
        || (s.description || '').toLowerCase().includes(q))
      .filter(s => filter === 'All' || (s.difficulty || '').toLowerCase() === filter.toLowerCase())
      .filter(s => tagsLC.length === 0 || tagsLC.every(t =>
        (s.tags || []).some(st => st.toLowerCase().includes(t))
      ))
      .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
  }, [snippets, search, filter, tagFilters]);

  return (
    <Page>
      <PageHeader
        eyebrow="The Vault"
        title="Problem"
        accent="archive."
        subtitle="Every code file you've saved across all your folders, indexed in one place. Search, filter by difficulty or tag, and jump back into any of them."
      />

      <Toolbar>
        <SearchBox>
          <Search />
          <input placeholder="Search problems, tags, descriptions..." value={search} onChange={e => setSearch(e.target.value)} />
        </SearchBox>
        {LEVELS.map(l => <Chip key={l} $active={filter === l} onClick={() => setFilter(l)}>{l}</Chip>)}
      </Toolbar>

      {allTags.length > 0 && (
        <Toolbar style={{ marginTop: -8 }}>
          {allTags.slice(0, 16).map(t => (
            <TagChip key={t} $active={tagFilters.includes(t)} onClick={() => toggleTag(t)}>{t}</TagChip>
          ))}
        </Toolbar>
      )}

      {snippets.length === 0 ? (
        <Empty>
          <FolderOpen />
          <h2>No problems yet</h2>
          <p>Open the Workspace, write a solution, pick a destination folder, then click Save. The AI fills in the title, description, and analysis automatically.</p>
        </Empty>
      ) : visible.length === 0 ? (
        <Empty>
          <FolderOpen />
          <h2>No matches</h2>
          <p>No saved problems match the current search and filters.</p>
        </Empty>
      ) : (
        <Table>
          {visible.map(s => {
            const href = s.vaultProblemId
              ? `/workspace?id=${s.vaultProblemId}&snippet=${s.id}`
              : `/workspace?snippet=${s.id}`;
            return (
              <Row key={s.id} to={href}>
                <span className="title">
                  {s.title}
                  <span className="crumb">{folderPath(s.folderId)}</span>
                </span>
                <div className="tags">
                  {(s.tags || []).slice(0, 3).map(t => <span key={t} className="pill pill--tag">{t}</span>)}
                </div>
                {s.difficulty && (
                  <span className={`pill pill--${s.difficulty.toLowerCase()}`}>{s.difficulty}</span>
                )}
                <ChevronRight size={16} className="arrow" />
              </Row>
            );
          })}
        </Table>
      )}
    </Page>
  );
}
