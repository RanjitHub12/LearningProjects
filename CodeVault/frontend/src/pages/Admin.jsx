import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Settings, Trash2, Edit3, Save, X, RefreshCw } from 'lucide-react';

const Page = styled.div`animation: fadeIn 0.4s ease;`;
const Header = styled.header`margin-bottom: 28px;
  display: flex; align-items: flex-end; justify-content: space-between;
  h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 4px; }
  p { color: var(--cv-text-secondary); font-size: 0.9rem; }`;

const DangerBtn = styled.button`
  padding: 9px 18px; border-radius: 8px; border: none; cursor: pointer;
  background: rgba(239,68,68,0.1); color: #ef4444;
  font-family: inherit; font-size: 0.82rem; font-weight: 600;
  display: flex; align-items: center; gap: 6px;
  transition: all 0.2s;
  &:hover { background: rgba(239,68,68,0.2); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }`;

const Table = styled.table`
  width: 100%; border-collapse: separate; border-spacing: 0;
  background: var(--cv-glass-bg); backdrop-filter: blur(20px);
  border: 1px solid var(--cv-border-subtle); border-radius: 14px;
  overflow: hidden;
  th { text-align: left; padding: 12px 16px; font-size: 0.72rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.06em; color: var(--cv-text-muted);
    background: var(--cv-bg-tertiary); border-bottom: 1px solid var(--cv-border-subtle); }
  td { padding: 12px 16px; font-size: 0.85rem; border-bottom: 1px solid var(--cv-border-subtle);
    vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--cv-accent-muted); }`;

const Actions = styled.div`display: flex; gap: 6px;`;

const IconBtn = styled.button`
  width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  background: ${p => p.$danger ? 'rgba(239,68,68,0.1)' : 'var(--cv-accent-muted)'};
  color: ${p => p.$danger ? '#ef4444' : 'var(--cv-accent)'};
  transition: all 0.15s;
  &:hover { transform: scale(1.1); }`;

const EditInput = styled.input`
  padding: 4px 8px; border-radius: 6px; border: 1px solid var(--cv-border-hover);
  background: var(--cv-bg-secondary); color: var(--cv-text-primary);
  font-family: inherit; font-size: 0.85rem; width: 100%; outline: none;`;

const Empty = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 300px; text-align: center;
  svg { width: 48px; height: 48px; color: var(--cv-text-muted); opacity: 0.3; margin-bottom: 16px; }
  h2 { font-size: 1.1rem; font-weight: 600; color: var(--cv-text-secondary); margin-bottom: 6px; }
  p { color: var(--cv-text-muted); font-size: 0.85rem; }`;

export default function Admin() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState({});

  const load = () => {
    setLoading(true);
    fetch('/api/v1/problems?limit=200').then(r => r.ok ? r.json() : [])
      .then(setProblems).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEdit = (p) => { setEditing(p.id); setEditVal({ title: p.title, difficulty: p.difficulty }); };
  const cancelEdit = () => { setEditing(null); setEditVal({}); };

  const saveEdit = async (id) => {
    await fetch(`/api/v1/problems/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editVal),
    });
    setEditing(null); load();
  };

  const deleteProblem = async (id) => {
    if (!confirm('Delete this problem and all solutions?')) return;
    await fetch(`/api/v1/problems/${id}`, { method: 'DELETE' });
    load();
  };

  const purgeAll = async () => {
    if (!confirm('NUCLEAR OPTION: Delete ALL problems? This cannot be undone.')) return;
    for (const p of problems) {
      await fetch(`/api/v1/problems/${p.id}`, { method: 'DELETE' });
    }
    load();
  };

  return (
    <Page>
      <Header>
        <div><h1>Admin Control</h1><p>Manage, override, and purge vault data.</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <IconBtn onClick={load} title="Refresh"><RefreshCw size={16} /></IconBtn>
          <DangerBtn onClick={purgeAll} disabled={!problems.length}>
            <Trash2 size={14} /> Mass Purge
          </DangerBtn>
        </div>
      </Header>

      {loading ? (
        <Empty><Settings /><h2>Loading...</h2></Empty>
      ) : problems.length === 0 ? (
        <Empty>
          <Settings />
          <h2>No data to manage</h2>
          <p>Upload problems first via Bulk Upload.</p>
        </Empty>
      ) : (
        <Table>
          <thead><tr>
            <th>Title</th><th>Difficulty</th><th>Tags</th><th>Solutions</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {problems.map(p => (
              <tr key={p.id}>
                <td>
                  {editing === p.id ? (
                    <EditInput value={editVal.title} onChange={e => setEditVal({...editVal, title: e.target.value})} />
                  ) : p.title}
                </td>
                <td>
                  {editing === p.id ? (
                    <select value={editVal.difficulty} onChange={e => setEditVal({...editVal, difficulty: e.target.value})}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--cv-border-hover)',
                        background: 'var(--cv-bg-secondary)', color: 'var(--cv-text-primary)', fontFamily: 'inherit' }}>
                      {['Easy','Medium','Hard','Impossible'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : (
                    <span className={`pill pill--${p.difficulty?.toLowerCase()}`}>{p.difficulty}</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {(p.dsa_tags || []).map(t => <span key={t} className="pill pill--tag">{t}</span>)}
                  </div>
                </td>
                <td>{p.solution_count || 0}</td>
                <td>
                  <Actions>
                    {editing === p.id ? (
                      <>
                        <IconBtn onClick={() => saveEdit(p.id)}><Save size={14} /></IconBtn>
                        <IconBtn onClick={cancelEdit}><X size={14} /></IconBtn>
                      </>
                    ) : (
                      <>
                        <IconBtn onClick={() => startEdit(p)}><Edit3 size={14} /></IconBtn>
                        <IconBtn $danger onClick={() => deleteProblem(p.id)}><Trash2 size={14} /></IconBtn>
                      </>
                    )}
                  </Actions>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Page>
  );
}
