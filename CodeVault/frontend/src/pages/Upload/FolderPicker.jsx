import { Folder, FolderPlus, Check } from 'lucide-react';
import { StepCard, Btn } from './styles';

/**
 * Step 1 — choose (or create) the destination folder. Uploads land there as
 * snippets linked to the new vault problem id, so files stay browsable on the
 * Folders page.
 */
export default function FolderPicker({
  uploading,
  folderOptions,
  destFolderId, setDestFolderId,
  creatingFolder, setCreatingFolder,
  newFolderName, setNewFolderName,
  handleCreateFolder,
}) {
  const selectedLabel = folderOptions.find(o => o.id === destFolderId)?.label?.trim();

  return (
    <StepCard>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{
          width:22, height:22, borderRadius:999,
          background: destFolderId ? 'var(--cv-success)' : 'var(--cv-accent)', color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'.7rem', fontWeight:700,
        }}>
          {destFolderId ? <Check size={12}/> : '1'}
        </span>
        <span style={{ fontSize:'.78rem', fontWeight:700, textTransform:'uppercase',
          letterSpacing:'.06em', color:'var(--cv-text-secondary)' }}>
          Destination folder
        </span>
        <span style={{ flex:1 }}/>
        {destFolderId && (
          <span style={{ fontSize:'.74rem', color:'var(--cv-text-muted)' }}>
            Files will be filed into <strong style={{ color:'var(--cv-text-primary)' }}>{selectedLabel}</strong>
          </span>
        )}
      </div>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <Folder size={16} style={{ color:'var(--cv-accent)', flexShrink:0 }}/>
        <select
          value={destFolderId}
          onChange={e=>setDestFolderId(e.target.value)}
          disabled={uploading}
          style={{
            flex:1, minWidth:220, padding:'9px 12px', borderRadius:9,
            background:'var(--cv-bg-tertiary)', border:'1px solid var(--cv-border-subtle)',
            color:'var(--cv-text-primary)', fontFamily:'inherit', fontSize:'.88rem', outline:'none',
          }}>
          <option value="">— Pick a folder —</option>
          {folderOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>

        {!creatingFolder ? (
          <Btn onClick={()=>setCreatingFolder(true)} disabled={uploading}>
            <FolderPlus size={14}/> New folder
          </Btn>
        ) : (
          <div style={{ display:'flex', gap:6 }}>
            <input
              autoFocus
              value={newFolderName}
              onChange={e=>setNewFolderName(e.target.value)}
              onKeyDown={e=>{
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
              }}
              placeholder="New top-level folder…"
              style={{ padding:'9px 12px', borderRadius:9, border:'1px solid var(--cv-accent)',
                background:'var(--cv-bg-tertiary)', color:'var(--cv-text-primary)',
                fontSize:'.85rem', fontFamily:'inherit', outline:'none', minWidth:220 }}
            />
            <Btn $primary onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Btn>
            <Btn onClick={()=>{ setCreatingFolder(false); setNewFolderName(''); }}>Cancel</Btn>
          </div>
        )}
      </div>

      {!destFolderId && !creatingFolder && (
        <div style={{ fontSize:'.78rem', color:'var(--cv-text-muted)', lineHeight:1.5 }}>
          Pick an existing folder or create a new one. You can nest deeper folders later inside the
          Folders page (e.g. <strong style={{ color:'var(--cv-text-secondary)' }}>2026 → May → Hard → Graphs</strong>).
        </div>
      )}
    </StepCard>
  );
}
