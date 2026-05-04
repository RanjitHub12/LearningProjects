import { useEffect, useMemo, useState } from 'react';
import {
  X, FolderTree, FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown,
  CornerDownRight, Check, Sparkles,
} from 'lucide-react';
import styled from 'styled-components';
import { Backdrop, Modal, MHead, MBody, MFoot, Btn } from './styles';
import { getFolders, createFolder } from '../../lib/folders';

/**
 * Destination-folder picker — full tree, inline new-folder creation at any
 * depth, click-to-select. Confirms back into the Workspace's `destFolderId`.
 *
 * Layout:
 *   ┌── New top-level folder ────────────┐
 *   │  [+ root] [name input] [Create]    │
 *   ├── Tree ───────────────────────────┤
 *   │  ▾ 2026                            │
 *   │     ▸ May            [+ subfolder] │
 *   │     ▸ June           ✓ selected    │
 *   └── Footer: Cancel · Use this folder │
 */

const TreeWrap = styled.div`
  border:1px solid var(--cv-border-subtle); border-radius:10px;
  background:var(--cv-bg-tertiary); padding:6px; max-height:340px; overflow:auto;`;

const Row = styled.div`
  display:flex; align-items:center; gap:6px; padding:6px 8px; border-radius:7px;
  cursor:pointer; user-select:none; transition:background .12s, border-color .12s;
  border:1px solid transparent;
  background:${p => p.$active ? 'var(--cv-accent-muted)' : 'transparent'};
  border-color:${p => p.$active ? 'var(--cv-border-hover)' : 'transparent'};
  color:${p => p.$active ? 'var(--cv-accent)' : 'var(--cv-text-secondary)'};
  &:hover { background: var(--cv-accent-muted); color: var(--cv-text-primary); }
  .name { flex:1; font-size:.82rem; font-weight:${p => p.$active ? 700 : 500};
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .chev { width:18px; height:18px; display:flex; align-items:center; justify-content:center;
    color:var(--cv-text-muted); border-radius:5px;
    &:hover { background:rgba(255,255,255,.05); color:var(--cv-text-primary); } }
  .add { opacity:0; padding:3px 6px; border-radius:6px; font-size:.66rem;
    color:var(--cv-text-muted); display:flex; align-items:center; gap:4px;
    &:hover { background:var(--cv-bg-secondary,#11151d); color:var(--cv-accent); } }
  &:hover .add { opacity:1; }
  .check { color:var(--cv-accent); }`;

const NewRow = styled.form`
  display:flex; align-items:center; gap:6px; padding:6px 8px;
  background:rgba(99,102,241,.06); border:1px dashed rgba(99,102,241,.35);
  border-radius:7px; margin:4px 0;
  input { flex:1; background:transparent; border:none; outline:none;
    color:var(--cv-text-primary); font-family:inherit; font-size:.8rem;
    &::placeholder { color:var(--cv-text-muted); } }
  button { background:var(--cv-gradient-primary); color:#fff; border:none;
    padding:4px 10px; border-radius:6px; font-family:inherit; font-size:.7rem;
    font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;
    &:disabled { opacity:.5; cursor:not-allowed; } }
  .cancel { background:transparent; color:var(--cv-text-muted);
    &:hover { color:var(--cv-text-primary); } }`;

const Hint = styled.div`
  display:flex; align-items:flex-start; gap:8px; padding:9px 11px; margin-bottom:10px;
  border-radius:9px; background:rgba(99,102,241,.06);
  border:1px solid rgba(99,102,241,.2); color:var(--cv-text-secondary);
  font-size:.76rem; line-height:1.55;
  svg { color:var(--cv-accent); flex-shrink:0; margin-top:1px; }
  strong { color:var(--cv-text-primary); }`;

const Empty = styled.div`
  padding:24px 16px; text-align:center; color:var(--cv-text-muted); font-size:.8rem;
  svg { width:28px; height:28px; opacity:.4; margin-bottom:8px; }`;

export default function FolderPickerModal({
  open, onClose, currentId, onPick,
}) {
  const [folders, setFolders] = useState([]);
  const [expanded, setExpanded] = useState({});
  // Local pending selection — committed only when the user clicks "Use this".
  const [pickedId, setPickedId] = useState(currentId || null);
  // Inline-create state, keyed by parent id (or '__root__' for top-level).
  const [creatingUnder, setCreatingUnder] = useState(null);
  const [newName, setNewName] = useState('');

  const refresh = () => setFolders(getFolders());

  useEffect(() => {
    if (!open) return;
    refresh();
    setPickedId(currentId || null);
    setCreatingUnder(null);
    setNewName('');
    // Auto-expand the chain leading to the current selection so the user
    // sees their existing pick highlighted on open.
    if (currentId) {
      const all = getFolders();
      const byId = Object.fromEntries(all.map(f => [f.id, f]));
      const exp = {};
      let cur = byId[currentId];
      while (cur?.parentId) { exp[cur.parentId] = true; cur = byId[cur.parentId]; }
      setExpanded(exp);
    }
    const onChange = () => refresh();
    window.addEventListener('cv:folders-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('cv:folders-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [open, currentId]);

  const childrenOf = useMemo(() => {
    const map = new Map();
    for (const f of folders) {
      const k = f.parentId || null;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(f);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [folders]);

  if (!open) return null;

  const submitCreate = (parentId) => {
    const f = createFolder(newName, parentId);
    if (!f) return;
    setNewName(''); setCreatingUnder(null);
    setPickedId(f.id);
    if (parentId) setExpanded(e => ({ ...e, [parentId]: true }));
    refresh();
  };

  const renderRow = (f, depth) => {
    const kids = childrenOf.get(f.id) || [];
    const isOpen = !!expanded[f.id];
    const active = pickedId === f.id;
    return (
      <div key={f.id}>
        <Row $active={active} style={{ paddingLeft: 6 + depth * 16 }}
          onClick={()=>setPickedId(f.id)}>
          <span className="chev"
            onClick={e=>{ e.stopPropagation();
              if (kids.length) setExpanded(s => ({ ...s, [f.id]: !s[f.id] })); }}>
            {kids.length
              ? (isOpen ? <ChevronDown size={13}/> : <ChevronRight size={13}/>)
              : <span style={{ width:13, display:'inline-block' }}/>}
          </span>
          {active ? <FolderOpen size={14}/> : <Folder size={14}/>}
          <span className="name">{f.name}</span>
          {active && <Check size={13} className="check"/>}
          <span className="add"
            onClick={e=>{ e.stopPropagation();
              setCreatingUnder(f.id); setNewName('');
              setExpanded(s => ({ ...s, [f.id]: true })); }}>
            <CornerDownRight size={11}/> Subfolder
          </span>
        </Row>
        {creatingUnder === f.id && (
          <NewRow onSubmit={e=>{ e.preventDefault(); submitCreate(f.id); }}
            style={{ marginLeft: 6 + (depth + 1) * 16 }}>
            <FolderPlus size={13} style={{ color:'var(--cv-accent)' }}/>
            <input autoFocus value={newName}
              onChange={e=>setNewName(e.target.value)}
              placeholder={`New folder under "${f.name}"`}/>
            <button type="submit" disabled={!newName.trim()}><Check size={11}/> Create</button>
            <button type="button" className="cancel"
              onClick={()=>{ setCreatingUnder(null); setNewName(''); }}>Cancel</button>
          </NewRow>
        )}
        {isOpen && kids.map(c => renderRow(c, depth + 1))}
      </div>
    );
  };

  const roots = childrenOf.get(null) || [];
  const pickedPath = (() => {
    if (!pickedId) return '';
    const byId = Object.fromEntries(folders.map(f => [f.id, f]));
    const segs = [];
    let cur = byId[pickedId];
    while (cur) { segs.unshift(cur.name); cur = cur.parentId ? byId[cur.parentId] : null; }
    return segs.join(' / ');
  })();

  return (
    <Backdrop onClick={onClose}>
      <Modal onClick={e=>e.stopPropagation()} style={{ width:'min(560px, 100%)' }}>
        <MHead>
          <FolderTree size={16} style={{ color:'var(--cv-accent)' }}/>
          <span className="t">Choose a destination folder</span>
          <button onClick={onClose}><X size={16}/></button>
        </MHead>
        <MBody>
          <Hint>
            <Sparkles size={14}/>
            <div>
              Pick where this code should live. <strong>Click a folder to select it</strong>,
              hover to add a subfolder, or create a brand-new top-level folder below.
              The Workspace will save your file here and add a pointer to the Problem Vault.
            </div>
          </Hint>

          {creatingUnder === '__root__' ? (
            <NewRow onSubmit={e=>{ e.preventDefault(); submitCreate(null); }}>
              <FolderPlus size={13} style={{ color:'var(--cv-accent)' }}/>
              <input autoFocus value={newName}
                onChange={e=>setNewName(e.target.value)}
                placeholder="New top-level folder name"/>
              <button type="submit" disabled={!newName.trim()}><Check size={11}/> Create</button>
              <button type="button" className="cancel"
                onClick={()=>{ setCreatingUnder(null); setNewName(''); }}>Cancel</button>
            </NewRow>
          ) : (
            <Btn onClick={()=>{ setCreatingUnder('__root__'); setNewName(''); }}
              style={{ width:'100%', justifyContent:'center', marginBottom:10 }}>
              <FolderPlus size={13}/> New top-level folder
            </Btn>
          )}

          <TreeWrap>
            {roots.length === 0 && creatingUnder !== '__root__' ? (
              <Empty>
                <FolderTree/>
                <div>No folders yet. Create one above to get started.</div>
              </Empty>
            ) : roots.map(f => renderRow(f, 0))}
          </TreeWrap>
        </MBody>
        <MFoot>
          <div style={{ flex:1, fontSize:'.74rem', color:'var(--cv-text-muted)',
            alignSelf:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {pickedPath
              ? <>Selected: <strong style={{ color:'var(--cv-text-primary)' }}>{pickedPath}</strong></>
              : 'No folder selected'}
          </div>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn $primary onClick={()=>{ if (pickedId) { onPick(pickedId); onClose(); } }}
            disabled={!pickedId}>
            <Check size={13}/> Use this folder
          </Btn>
        </MFoot>
      </Modal>
    </Backdrop>
  );
}
