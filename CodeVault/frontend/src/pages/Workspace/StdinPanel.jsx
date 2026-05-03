import { Terminal, X } from 'lucide-react';
import { Pane } from './styles';

/**
 * Standard-input panel used inside the normal Workspace layout.
 *
 * The fullscreen view re-implements its own dark-themed copy in
 * FullscreenView.jsx — the two intentionally diverge on visual chrome but
 * share the same state via props (controlled component).
 */
export default function StdinPanel({ stdin, setStdin, problem }) {
  const sampleCases = problem?.generated_test_cases || [];

  return (
    <Pane style={{ flexShrink: 0, minHeight: 160 }}>
      {/* Two-row header so the title + helper text don't fight the
          Load-sample dropdown for horizontal space. */}
      <div style={{ display:'flex', flexDirection:'column', gap:4,
        padding:'10px 14px', borderBottom:'1px solid var(--cv-border-subtle)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Terminal size={14} style={{ color:'var(--cv-accent)' }}/>
          <span style={{ fontSize:'.78rem', fontWeight:700, color:'var(--cv-text-primary)', letterSpacing:'.02em' }}>
            Standard Input
          </span>
          <span style={{ flex:1 }}/>
          {sampleCases.length > 0 && (
            <select
              onChange={e=>{
                const i = parseInt(e.target.value, 10);
                const tc = sampleCases[i];
                if (tc && typeof tc.input === 'string') setStdin(tc.input);
                e.target.value = '';
              }}
              defaultValue=""
              title="Load a static test case as stdin"
              style={{ padding:'5px 9px', borderRadius:7, border:'1px solid var(--cv-border-subtle)',
                background:'var(--cv-bg-tertiary)', color:'var(--cv-text-primary)',
                fontSize:'.74rem', fontFamily:'inherit', cursor:'pointer' }}
            >
              <option value="" disabled>Load sample…</option>
              {sampleCases.map((tc, i) => (
                <option key={i} value={i}>
                  Sample {i + 1}{tc.explanation ? ` — ${tc.explanation.slice(0, 38)}${tc.explanation.length > 38 ? '…' : ''}` : ''}
                </option>
              ))}
            </select>
          )}
          <button onClick={()=>setStdin('')} title="Clear input"
            style={{ background:'var(--cv-bg-tertiary)', border:'1px solid var(--cv-border-subtle)', cursor:'pointer',
              color:'var(--cv-text-secondary)', padding:'5px 10px', display:'flex', alignItems:'center', gap:4,
              borderRadius:7, fontSize:'.72rem', fontFamily:'inherit' }}>
            <X size={11}/> Clear
          </button>
        </div>
        <span style={{ fontSize:'.72rem', color:'var(--cv-text-muted)', lineHeight:1.4, marginLeft:24 }}>
          Manual or static input — one value per line. Piped to scanf / cin / input() before your program runs.
        </span>
      </div>
      <textarea
        value={stdin}
        onChange={e=>setStdin(e.target.value)}
        placeholder={'5\n5\n1 2 3 4 5'}
        spellCheck={false}
        style={{
          width:'100%', minHeight: 110, maxHeight: 280, resize:'vertical',
          border:'none', outline:'none', display:'block',
          background:'#0d1117', color:'#c9d1d9',
          fontFamily:'var(--cv-font-mono)', fontSize:'.86rem', lineHeight:1.65,
          padding:'14px 18px',
        }}
      />
    </Pane>
  );
}
