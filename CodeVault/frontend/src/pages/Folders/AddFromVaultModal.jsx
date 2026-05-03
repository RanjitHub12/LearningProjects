import { Library, X, Search, FileCode } from 'lucide-react';
import {
  Backdrop, Modal, MHead, MFoot, Btn, Empty, Spinner, VaultRow,
} from './styles';

/** Pick an existing vault problem and copy its metadata + first approach into the active folder. */
export default function AddFromVaultModal({
  open, onClose,
  vaultLoading, vaultProblems, filteredVault,
  vaultSearch, setVaultSearch,
  vaultSelected, setVaultSelected,
  importing, importFromVault,
  activeFolderName,
}) {
  if (!open) return null;
  const safeClose = () => { if (!importing) onClose(); };

  return (
    <Backdrop onClick={safeClose}>
      <Modal onClick={e=>e.stopPropagation()} $w="720px">
        <MHead>
          <Library size={16} style={{ color:'var(--cv-accent)' }}/>
          <span className="t">Add from Vault</span>
          <button onClick={safeClose}><X size={16}/></button>
        </MHead>

        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--cv-border-subtle)' }}>
          <div style={{ position:'relative' }}>
            <Search size={14} style={{ position:'absolute', left:11, top:'50%',
              transform:'translateY(-50%)', color:'var(--cv-text-muted)' }}/>
            <input
              value={vaultSearch}
              onChange={e=>setVaultSearch(e.target.value)}
              placeholder="Search by title, tag, difficulty…"
              style={{ width:'100%', padding:'9px 12px 9px 32px', borderRadius:8,
                border:'1px solid var(--cv-border-subtle)',
                background:'var(--cv-bg-tertiary)', color:'var(--cv-text-primary)',
                fontSize:'.85rem', fontFamily:'inherit', outline:'none' }}
            />
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:14, minHeight:320, maxHeight:480 }}>
          {vaultLoading ? (
            <Empty><Spinner/><div>Loading vault problems…</div></Empty>
          ) : filteredVault.length === 0 ? (
            <Empty>
              <Library/>
              <div>{vaultProblems.length === 0 ? 'No problems in the vault yet.' : 'No matches.'}</div>
            </Empty>
          ) : filteredVault.map(p => (
            <VaultRow key={p.id} $selected={vaultSelected?.id === p.id} onClick={()=>setVaultSelected(p)}>
              <FileCode size={14} style={{ color:'var(--cv-accent)', flexShrink:0 }}/>
              <span className="name">{p.title}</span>
              {p.difficulty && <span className={`pill pill--${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>}
              {(p.dsa_tags || []).slice(0, 2).map(t => <span key={t} className="pill pill--tag">{t}</span>)}
            </VaultRow>
          ))}
        </div>

        <MFoot>
          <div style={{ flex:1, fontSize:'.78rem', color:'var(--cv-text-muted)' }}>
            {vaultSelected
              ? <>Importing into <strong style={{ color:'var(--cv-text-primary)' }}>{activeFolderName}</strong></>
              : 'Pick a problem to import.'}
          </div>
          <Btn onClick={safeClose} disabled={importing}>Cancel</Btn>
          <Btn $primary onClick={importFromVault} disabled={!vaultSelected || importing}>
            {importing ? <><Spinner size={13}/> Importing…</> : <><Library size={13}/> Add to folder</>}
          </Btn>
        </MFoot>
      </Modal>
    </Backdrop>
  );
}
