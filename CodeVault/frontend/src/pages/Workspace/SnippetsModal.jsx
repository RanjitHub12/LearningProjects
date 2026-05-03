import {
  Folder, FolderPlus, X, FileCode, BookmarkPlus, Trash2, Play, Edit2,
} from 'lucide-react';
import { Backdrop, Modal, MHead, MBody, Btn, Empty } from './styles';

/**
 * Quick-access folder modal — flat list of folders + the snippets inside.
 * The dedicated /folders page handles nesting; this is the in-Workspace
 * shortcut for "save current code" and "load a saved snippet".
 */
export default function SnippetsModal({
  open, onClose,
  code, lang, setLang, setCode,
  folders, snippets,
  activeFolderId, setActiveFolderId,
  newFolderName, setNewFolderName,
  handleCreateFolder, deleteFolder, refreshFolders,
  handleSaveSnippet,
  renamingId, renameValue, setRenameValue, startRename, commitRename, setRenamingId,
  deleteSnippet, confirm,
}) {
  if (!open) return null;

  return (
    <Backdrop onClick={onClose}>
      <Modal onClick={e=>e.stopPropagation()} style={{ width:'min(820px,100%)' }}>
        <MHead>
          <Folder size={16} style={{ color:'var(--cv-accent)' }}/>
          <span className="t">Snippets &amp; Folders</span>
          <button onClick={onClose}><X size={16}/></button>
        </MHead>
        <MBody style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16, minHeight:360 }}>
          {/* Folder list */}
          <div style={{ display:'flex', flexDirection:'column', gap:8,
            borderRight:'1px solid var(--cv-border-subtle)', paddingRight:14 }}>
            <div style={{ fontSize:'.7rem', fontWeight:700, textTransform:'uppercase',
              letterSpacing:'.06em', color:'var(--cv-text-muted)', marginBottom:2 }}>
              Folders
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <input
                value={newFolderName}
                onChange={e=>setNewFolderName(e.target.value)}
                onKeyDown={e=>{ if (e.key === 'Enter') handleCreateFolder(); }}
                placeholder="New folder…"
                style={{ flex:1, padding:'6px 8px', borderRadius:7,
                  border:'1px solid var(--cv-border-subtle)',
                  background:'var(--cv-bg-tertiary)', color:'var(--cv-text-primary)',
                  fontSize:'.78rem', fontFamily:'inherit' }}
              />
              <Btn style={{ padding:'5px 9px' }} onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                <FolderPlus size={12}/>
              </Btn>
            </div>
            {folders.length === 0 ? (
              <div style={{ fontSize:'.78rem', color:'var(--cv-text-muted)', padding:'8px 0' }}>
                No folders yet. Create one to start organizing snippets.
              </div>
            ) : folders.map(f => {
              const count = snippets.filter(s => s.folderId === f.id).length;
              const active = activeFolderId === f.id;
              return (
                <div key={f.id}
                  onClick={()=>setActiveFolderId(f.id)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 9px',
                    borderRadius:7, cursor:'pointer',
                    background: active ? 'var(--cv-accent-muted)' : 'transparent',
                    color: active ? 'var(--cv-accent)' : 'var(--cv-text-secondary)',
                    fontSize:'.83rem', fontWeight:500 }}>
                  <Folder size={13}/>
                  <span style={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {f.name}
                  </span>
                  <span style={{ fontSize:'.7rem', color:'var(--cv-text-muted)', fontFamily:'var(--cv-font-mono)' }}>
                    {count}
                  </span>
                  <button
                    onClick={async e=>{
                      e.stopPropagation();
                      const ok = await confirm({
                        title: 'Delete folder?',
                        message: `"${f.name}" and all its snippets will be permanently removed.`,
                        danger: true, confirmLabel: 'Delete',
                      });
                      if (ok) {
                        deleteFolder(f.id);
                        if (active) setActiveFolderId(null);
                        refreshFolders();
                      }
                    }}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      color:'var(--cv-text-muted)', padding:2, display:'flex' }}
                    title="Delete folder">
                    <Trash2 size={12}/>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Folder contents */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:0 }}>
            {!activeFolderId ? (
              <Empty><Folder/><div>Select or create a folder to manage snippets.</div></Empty>
            ) : (
              <>
                <div style={{ padding:'10px 12px', background:'var(--cv-bg-tertiary)',
                  border:'1px solid var(--cv-border-subtle)', borderRadius:9,
                  display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, fontSize:'.78rem', color:'var(--cv-text-secondary)' }}>
                    Save the current editor code into this folder. The title is auto-generated — you can rename it after saving.
                  </div>
                  <Btn $primary onClick={handleSaveSnippet} disabled={!code.trim()}>
                    <BookmarkPlus size={12}/> Save Snippet
                  </Btn>
                </div>

                <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column',
                  gap:6, minHeight:0 }}>
                  {snippets.filter(s => s.folderId === activeFolderId).length === 0 ? (
                    <Empty><FileCode/><div>This folder is empty. Save your first snippet above.</div></Empty>
                  ) : snippets.filter(s => s.folderId === activeFolderId).map(s => (
                    <div key={s.id} style={{ padding:'9px 11px', background:'var(--cv-bg-tertiary)',
                      border:'1px solid var(--cv-border-subtle)', borderRadius:8,
                      display:'flex', alignItems:'center', gap:10 }}>
                      <FileCode size={13} style={{ color:'var(--cv-accent)', flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        {renamingId === s.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={e=>setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={e=>{
                              if (e.key === 'Enter') commitRename();
                              if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                            }}
                            style={{ width:'100%', padding:'4px 7px', borderRadius:6,
                              border:'1px solid var(--cv-accent)',
                              background:'var(--cv-bg-secondary,#11151d)',
                              color:'var(--cv-text-primary)',
                              fontSize:'.84rem', fontFamily:'inherit', fontWeight:600 }}
                          />
                        ) : (
                          <div style={{ fontSize:'.84rem', fontWeight:600,
                            color:'var(--cv-text-primary)', whiteSpace:'nowrap',
                            overflow:'hidden', textOverflow:'ellipsis' }}>{s.title}</div>
                        )}
                        <div style={{ fontSize:'.7rem', color:'var(--cv-text-muted)',
                          fontFamily:'var(--cv-font-mono)' }}>
                          {s.language} · {(s.savedAt || '').slice(0, 10)}
                        </div>
                      </div>
                      <button
                        onClick={()=>startRename(s)}
                        style={{ background:'none', border:'none', cursor:'pointer',
                          color:'var(--cv-text-muted)', padding:4, display:'flex' }}
                        title="Rename">
                        <Edit2 size={12}/>
                      </button>
                      <Btn style={{ padding:'4px 9px', fontSize:'.7rem' }}
                        onClick={()=>{ setLang(s.language); setCode(s.code); onClose(); }}>
                        <Play size={11}/> Load
                      </Btn>
                      <button
                        onClick={async ()=>{
                          const ok = await confirm({
                            title: 'Delete snippet?',
                            message: `"${s.title}" will be permanently removed.`,
                            danger: true, confirmLabel: 'Delete',
                          });
                          if (ok) { deleteSnippet(s.id); refreshFolders(); }
                        }}
                        style={{ background:'none', border:'none', cursor:'pointer',
                          color:'var(--cv-text-muted)', padding:4, display:'flex' }}
                        title="Delete">
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </MBody>
      </Modal>
    </Backdrop>
  );
}
