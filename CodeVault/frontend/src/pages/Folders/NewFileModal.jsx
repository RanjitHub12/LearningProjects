import Editor from '@monaco-editor/react';
import { Code2, X, Sparkles } from 'lucide-react';
import {
  Backdrop, Modal, MHead, FieldRow, MFoot, Btn, Spinner,
} from './styles';

/** Author a fresh code file; AI fills metadata via /upload/analyze on save. */
export default function NewFileModal({
  open, onClose,
  newFileName, setNewFileName,
  newLang, onLangChange,
  newCode, setNewCode,
  analyzing, saveNewFile,
}) {
  if (!open) return null;
  const safeClose = () => { if (!analyzing) onClose(); };

  return (
    <Backdrop onClick={safeClose}>
      <Modal onClick={e=>e.stopPropagation()}>
        <MHead>
          <Code2 size={16} style={{ color:'var(--cv-accent)' }}/>
          <span className="t">New code file</span>
          <button onClick={safeClose}><X size={16}/></button>
        </MHead>
        <FieldRow>
          <input
            value={newFileName}
            onChange={e=>setNewFileName(e.target.value)}
            placeholder="File name (optional — AI can suggest one)"
          />
          <select value={newLang} onChange={e=>onLangChange(e.target.value)}>
            <option value="cpp">C++</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>
        </FieldRow>
        <div style={{ flex:1, minHeight:360 }}>
          <Editor
            height="420px"
            language={newLang === 'cpp' ? 'cpp' : newLang}
            theme="vs-dark"
            value={newCode}
            onChange={v=>setNewCode(v || '')}
            options={{
              minimap: { enabled: false }, fontSize: 14, lineHeight: 22, padding: { top: 8 },
              scrollBeyondLastLine: false, wordWrap: 'on', automaticLayout: true, tabSize: 4,
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            }}
          />
        </div>
        <MFoot>
          <div style={{ flex:1, fontSize:'.78rem', color:'var(--cv-text-muted)',
            display:'flex', alignItems:'center', gap:6 }}>
            <Sparkles size={13} style={{ color:'var(--cv-accent)' }}/>
            On save, AI will generate a description, tags, and test cases.
          </div>
          <Btn onClick={safeClose} disabled={analyzing}>Cancel</Btn>
          <Btn $primary onClick={saveNewFile} disabled={analyzing || !newCode.trim()}>
            {analyzing ? <><Spinner size={13}/> Analyzing…</> : <>Save File</>}
          </Btn>
        </MFoot>
      </Modal>
    </Backdrop>
  );
}
