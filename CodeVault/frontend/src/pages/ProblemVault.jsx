import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { FolderOpen, Search, ChevronRight } from 'lucide-react';

const Page = styled.div`animation: fadeIn 0.4s ease;`;
const Header = styled.header`margin-bottom: 28px;
  h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 4px; }
  p { color: var(--cv-text-secondary); font-size: 0.9rem; }`;

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
  .title { flex: 1; font-weight: 600; font-size: 0.9rem; color: var(--cv-text-primary); }
  .tags { display: flex; gap: 4px; flex-wrap: wrap; }
  .arrow { color: var(--cv-text-muted); }`;

const LEVELS = ['All', 'Easy', 'Medium', 'Hard', 'Impossible'];

export default function ProblemVault() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (filter !== 'All') p.set('difficulty', filter);
        const r = await fetch(`/api/v1/problems?${p}`);
        if (r.ok) setProblems(await r.json());
      } catch {} finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [search, filter]);

  return (
    <Page>
      <Header><h1>Problem Vault</h1><p>Browse and search your ingested solutions.</p></Header>

      <Toolbar>
        <SearchBox>
          <Search />
          <input placeholder="Search problems..." value={search} onChange={e => setSearch(e.target.value)} />
        </SearchBox>
        {LEVELS.map(l => <Chip key={l} $active={filter === l} onClick={() => setFilter(l)}>{l}</Chip>)}
      </Toolbar>

      {loading ? (
        <Empty><FolderOpen /><h2>Loading...</h2></Empty>
      ) : problems.length === 0 ? (
        <Empty>
          <FolderOpen />
          <h2>No problems yet</h2>
          <p>Upload solution files via Bulk Upload. The AI engine will parse and catalog them here.</p>
        </Empty>
      ) : (
        <Table>
          {problems.map(p => (
            <Row key={p.id} to={`/workspace?id=${p.id}`}>
              <span className="title">{p.title}</span>
              <div className="tags">
                {(p.dsa_tags || []).slice(0, 3).map(t => <span key={t} className="pill pill--tag">{t}</span>)}
              </div>
              <span className={`pill pill--${p.difficulty?.toLowerCase()}`}>{p.difficulty}</span>
              <ChevronRight size={16} className="arrow" />
            </Row>
          ))}
        </Table>
      )}
    </Page>
  );
}
