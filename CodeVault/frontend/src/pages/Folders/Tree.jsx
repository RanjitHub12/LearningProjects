import {
  Folder, FolderPlus, ChevronDown, ChevronRight,
  Plus, Edit2, Trash2,
} from 'lucide-react';
import { getChildren } from '../../lib/folders';
import { Card, CardHead, CardBody, TreeRow, Empty } from './styles';

/**
 * Recursive folder tree.
 *
 * Most state (active folder, expanded set, rename/create row) lives in the
 * Folders index — passed in as props so a single source of truth survives
 * re-render and routes.
 */
export default function Tree({
  folders, snippets,
  activeId, setActiveId, setSelected,
  expanded, toggleExpand,
  renamingFolder, setRenamingFolder,
  renameValue, setRenameValue, commitRenameFolder,
  startRenameFolder,
  creatingUnder, setCreatingUnder,
  newName, setNewNameForCreate, handleCreateFolder,
  setExpanded,
  handleDeleteFolder,
}) {
  // Recursive descendant count so badges show "all files anywhere underneath",
  // not just the immediate folder.
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
            onClick={()=>{ if (!isRen) { setActiveId(f.id); setSelected(null); } }}>
            <button className="chev" disabled={!hasChildren}
              onClick={e=>{ e.stopPropagation(); if (hasChildren) toggleExpand(f.id); }}
              title={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : ''}>
              {hasChildren
                ? (isExpanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>)
                : <span style={{ width: 13 }}/>}
            </button>
            <span className="glyph"><Folder size={14}/></span>
            {isRen ? (
              <input
                autoFocus
                value={renameValue}
                onChange={e=>setRenameValue(e.target.value)}
                onBlur={commitRenameFolder}
                onClick={e=>e.stopPropagation()}
                onKeyDown={e=>{
                  if (e.key === 'Enter') commitRenameFolder();
                  if (e.key === 'Escape') { setRenamingFolder(null); setRenameValue(''); }
                }}
                style={{ minWidth:0, padding:'2px 6px', borderRadius:5, border:'1px solid var(--cv-accent)',
                  background:'var(--cv-bg-secondary,#11151d)', color:'var(--cv-text-primary)',
                  fontSize:'.82rem', fontFamily:'inherit' }}
              />
            ) : (
              <span className="name">{f.name}</span>
            )}
            <span className="count" title={totalCount === directCount ? `${directCount} file${directCount===1?'':'s'}` : `${directCount} here · ${totalCount} total`}>
              {totalCount === directCount ? directCount : `${directCount}/${totalCount}`}
            </span>
            <button className="icon-btn"
              onClick={e=>{
                e.stopPropagation();
                setCreatingUnder(f.id);
                setNewNameForCreate('');
                setExpanded(x => ({ ...x, [f.id]: true }));
              }}
              title="New subfolder"><Plus size={11}/></button>
            <button className="icon-btn"
              onClick={e=>{ e.stopPropagation(); startRenameFolder(f); }}
              title="Rename"><Edit2 size={11}/></button>
            <button className="icon-btn"
              onClick={e=>{ e.stopPropagation(); handleDeleteFolder(f); }}
              title="Delete folder"><Trash2 size={11}/></button>
          </TreeRow>

          {creatingUnder === f.id && (
            <div style={{ paddingLeft: 8 + (depth + 1) * 14 + 24, marginBottom: 4, display:'flex', gap: 6 }}>
              <input
                autoFocus
                value={newName}
                onChange={e=>setNewNameForCreate(e.target.value)}
                onKeyDown={e=>{
                  if (e.key === 'Enter') handleCreateFolder(f.id);
                  if (e.key === 'Escape') { setCreatingUnder(null); setNewNameForCreate(''); }
                }}
                onBlur={()=>{ if (!newName.trim()) setCreatingUnder(null); }}
                placeholder="Subfolder name…"
                style={{ flex:1, padding:'5px 8px', borderRadius:6, border:'1px solid var(--cv-accent)',
                  background:'var(--cv-bg-tertiary)', color:'var(--cv-text-primary)',
                  fontSize:'.78rem', fontFamily:'inherit', outline:'none' }}
              />
            </div>
          )}

          {isExpanded && hasChildren && renderTree(f.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <Card>
      <CardHead>
        <Folder/> Folders
        <span className="spacer"/>
        <button onClick={()=>{ setCreatingUnder('__root__'); setNewNameForCreate(''); }}
          title="New top-level folder"
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cv-text-muted)',
            padding:'3px 6px', borderRadius:5, display:'flex', alignItems:'center', gap:3,
            fontSize:'.7rem', fontFamily:'inherit', textTransform:'none', letterSpacing: 0 }}>
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
              onKeyDown={e=>{
                if (e.key === 'Enter') handleCreateFolder(null);
                if (e.key === 'Escape') { setCreatingUnder(null); setNewNameForCreate(''); }
              }}
              onBlur={()=>{ if (!newName.trim()) setCreatingUnder(null); }}
              placeholder="Top-level folder name…"
              style={{ flex:1, padding:'7px 9px', borderRadius:7, border:'1px solid var(--cv-accent)',
                background:'var(--cv-bg-tertiary)', color:'var(--cv-text-primary)',
                fontSize:'.82rem', fontFamily:'inherit', outline:'none' }}
            />
          </div>
        )}
        {folders.length === 0 ? (
          <Empty><Folder/><div>No folders yet. Click <strong>+ New</strong> to start.</div></Empty>
        ) : renderTree(null, 0)}
      </CardBody>
    </Card>
  );
}
