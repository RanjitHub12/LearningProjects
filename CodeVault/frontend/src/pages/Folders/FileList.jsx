import { useNavigate } from 'react-router-dom';
import {
  Folder, FileCode, Search, X, Edit2, Play, Trash2,
  ChevronsRight, FilePlus2, Library,
} from 'lucide-react';
import {
  Card, CardHead, CardBody, FileTile, Crumbs, Empty, Btn,
} from './styles';

/**
 * Centre column: filename search, breadcrumb, optional difficulty/tag filter
 * chips, and the list of file tiles for the active folder.
 */
export default function FileList({
  activeId, folders, snippets,
  filesInFolder,
  search, setSearch,
  diffFilter, setDiffFilter,
  tagFilters, toggleTag, folderTags,
  filtersActive, clearAllFilters,
  crumbs, setActiveId,
  selected, setSelected,
  renamingFile, setRenamingFile,
  renameValue, setRenameValue, commitRenameFile,
  startRenameFile, handleDeleteFile,
  openVault, openNewFile,
}) {
  const navigate = useNavigate();
  const folderName = activeId ? (folders.find(f => f.id === activeId)?.name || 'Files') : 'Files';
  const showFilterBar = activeId && snippets.filter(s => s.folderId === activeId).length > 1;

  return (
    <Card>
      <CardHead>
        <FileCode/>
        <span style={{ color:'var(--cv-text-secondary)', textTransform:'none', letterSpacing:0,
          fontSize:'.85rem', fontWeight:600 }}>{folderName}</span>
        <span className="spacer"/>
        {activeId && (
          <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
            <Search size={12} style={{ position:'absolute', left:8, color:'var(--cv-text-muted)' }}/>
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="Search files…"
              style={{ padding:'5px 8px 5px 24px', borderRadius:6,
                border:'1px solid var(--cv-border-subtle)',
                background:'var(--cv-bg-tertiary)', color:'var(--cv-text-primary)',
                fontSize:'.76rem', fontFamily:'inherit', outline:'none', width: 160 }}
            />
          </div>
        )}
      </CardHead>

      {crumbs.length > 1 && (
        <Crumbs>
          {crumbs.map((c, i) => (
            <span key={c.id} style={{ display:'flex', alignItems:'center', gap:4 }}>
              {i > 0 && <ChevronsRight/>}
              <span className={`seg ${i === crumbs.length - 1 ? 'active' : ''}`}
                onClick={()=> i !== crumbs.length - 1 && setActiveId(c.id)}>{c.name}</span>
            </span>
          ))}
        </Crumbs>
      )}

      {showFilterBar && (
        <div style={{ padding:'8px 14px 0', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:'.7rem', fontWeight:700, textTransform:'uppercase',
              letterSpacing:'.06em', color:'var(--cv-text-muted)', marginRight:4 }}>Difficulty</span>
            {['All','Easy','Medium','Hard','Impossible'].map(d => (
              <button key={d} onClick={()=>setDiffFilter(d)}
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
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <span style={{ fontSize:'.7rem', fontWeight:700, textTransform:'uppercase',
                letterSpacing:'.06em', color:'var(--cv-text-muted)', marginRight:4 }}>Topic</span>
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
              <Btn onClick={clearAllFilters} style={{ marginTop:12 }}>Clear filters</Btn>
            </Empty>
          ) : (
            <Empty>
              <FileCode/>
              <div>This folder is empty.</div>
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <Btn onClick={openVault}><Library size={13}/> Add from Vault</Btn>
                <Btn $primary onClick={openNewFile}><FilePlus2 size={13}/> New File</Btn>
              </div>
            </Empty>
          )
        ) : filesInFolder.map(s => {
          const isRen = renamingFile === s.id;
          return (
            <FileTile key={s.id} onClick={()=> !isRen && setSelected(s)}>
              <span className="icon"><FileCode size={16}/></span>
              <div className="meta">
                {isRen ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e=>setRenameValue(e.target.value)}
                    onBlur={commitRenameFile}
                    onClick={e=>e.stopPropagation()}
                    onKeyDown={e=>{
                      if (e.key === 'Enter') commitRenameFile();
                      if (e.key === 'Escape') { setRenamingFile(null); setRenameValue(''); }
                    }}
                    style={{ width:'100%', padding:'3px 6px', borderRadius:5,
                      border:'1px solid var(--cv-accent)',
                      background:'var(--cv-bg-secondary,#11151d)',
                      color:'var(--cv-text-primary)', fontSize:'.92rem',
                      fontFamily:'inherit', fontWeight:600 }}
                  />
                ) : (
                  <div className="title">{s.title}</div>
                )}
                <div className="sub">
                  {s.language} · {(s.savedAt || '').slice(0, 10)}
                  {s.difficulty ? ` · ${s.difficulty}` : ''}
                  {s.vaultProblemId ? ' · vault' : ''}
                  {(s.tags || []).length ? ` · ${(s.tags || []).slice(0, 3).join(', ')}` : ''}
                </div>
              </div>
              <div className="actions" onClick={e=>e.stopPropagation()}>
                <button onClick={()=>startRenameFile(s)} title="Rename"><Edit2 size={13}/></button>
                <button onClick={()=>navigate(`/workspace?snippet=${s.id}`)}
                  title="Open in Workspace"><Play size={13}/></button>
                <button onClick={()=>handleDeleteFile(s)} title="Delete"><Trash2 size={13}/></button>
              </div>
            </FileTile>
          );
        })}
      </CardBody>
    </Card>
  );
}
