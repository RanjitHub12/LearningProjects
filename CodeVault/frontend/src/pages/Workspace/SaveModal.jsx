import { useState, useEffect } from 'react';
import {
  Save, X, Clock, CheckCircle2, XCircle, Loader2,
  AlertTriangle, Eye, Sparkles, PencilLine, Cpu,
} from 'lucide-react';
import {
  Backdrop, Modal, MHead, MBody, Step, Banner, MetaBox,
  MFoot, Btn,
} from './styles';
import { STEP_ORDER } from './constants';

const DIFFS = ['Easy', 'Medium', 'Hard', 'Impossible'];

// Pre-fill the manual form from whatever the AI managed to produce, so the
// user just edits/completes it instead of typing from scratch.
const fromResult = (r) => ({
  title: r?.title || '',
  statement: r?.problem_statement || '',
  difficulty: r?.difficulty || 'Medium',
  tagsCSV: (r?.dsa_tags || []).join(', '),
});

/**
 * Save-to-Vault progress modal — shows the analyze/dedup/save pipeline,
 * confirms a successful save, and offers a manual-entry form when the AI
 * couldn't help (rate-limited, heuristic fallback, or analysis_failed).
 */
export default function SaveModal({
  open, onClose, saving,
  saveStep, saveResult,
  onRetryHint, onSaveManual,
}) {
  const [hint, setHint] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ title:'', statement:'', difficulty:'Medium', tagsCSV:'' });

  useEffect(() => {
    if (!open) {
      setHint(''); setManualOpen(false);
      setManual({ title:'', statement:'', difficulty:'Medium', tagsCSV:'' });
    }
  }, [open]);

  // When the AI returns a heuristic / failed result, auto-pop the manual
  // form (pre-filled with whatever we got) so the user can take over fast.
  useEffect(() => {
    if (!saveResult) return;
    const usedHeuristic = saveResult.engine === 'heuristic';
    const failed = saveResult.status === 'analysis_failed';
    if (usedHeuristic || failed) {
      setManual(fromResult(saveResult));
      setManualOpen(true);
    }
  }, [saveResult]);

  if (!open) return null;

  const stepStateOf = (key) => {
    if (!saveResult) return saveStep === key ? 'active' : (saveStep && STEP_ORDER.indexOf(saveStep) > STEP_ORDER.indexOf(key) ? 'done' : 'pending');
    const s = saveResult.status;
    if (s === 'analysis_failed') return key === 'analyze' ? 'fail' : 'pending';
    if (s === 'duplicate') return key === 'analyze' ? 'done' : key === 'dedup' ? 'fail' : 'pending';
    if (s === 'saved') return 'done';
    return 'pending';
  };

  const steps = [
    { key:'analyze', label:'Analyze code with AI (title, description, tags, complexity)' },
    { key:'dedup',   label:'Check vault for duplicate problems' },
    { key:'save',    label:'Save problem and solution to vault' },
  ];

  const safeClose = () => { if (!saving) onClose(); };
  const usedHeuristic = saveResult?.engine === 'heuristic';
  const failed = saveResult?.status === 'analysis_failed';

  const submitManual = () => {
    const tags = manual.tagsCSV.split(',').map(t => t.trim()).filter(Boolean);
    onSaveManual?.({
      title: manual.title.trim(),
      statement: manual.statement,
      difficulty: manual.difficulty,
      tags,
    });
  };

  return (
    <Backdrop onClick={safeClose}>
      <Modal onClick={e=>e.stopPropagation()}>
        <MHead>
          <Save size={16} style={{ color:'var(--cv-accent)' }}/>
          <span className="t">Save to CodeVault</span>
          <button onClick={safeClose} disabled={saving}><X size={16}/></button>
        </MHead>
        <MBody>
          {steps.map(s => {
            const state = stepStateOf(s.key);
            const Icon = state === 'done' ? CheckCircle2
              : state === 'fail' ? XCircle
              : state === 'active' ? Loader2
              : Clock;
            return <Step key={s.key} $state={state}><Icon/><span className="lbl">{s.label}</span></Step>;
          })}

          {/* Show which engine produced the analysis. The heuristic engine
              is a no-AI fallback whose output is rough — surfacing this
              nudges the user toward editing or filling things in manually. */}
          {saveResult?.engine && saveResult.status !== 'analysis_failed' && (
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6,
              fontSize:'.7rem', color: usedHeuristic ? 'var(--cv-warning)' : 'var(--cv-text-muted)',
              fontWeight:600, letterSpacing:'.04em', textTransform:'uppercase' }}>
              <Cpu size={11}/>
              Engine: {saveResult.engine}
              {usedHeuristic && ' · low-quality fallback (AI unavailable)'}
              {saveResult.engine === 'manual' && ' · entered by you'}
            </div>
          )}

          {saveResult?.status === 'saved' && (
            <>
              <Banner $kind="success" style={{ marginTop:14 }}>
                <CheckCircle2/><div className="msg">{saveResult.message}</div>
              </Banner>
              <MetaBox>
                <div className="row"><span className="lbl">Title</span><span className="val">{saveResult.title}</span></div>
                <div className="row"><span className="lbl">Difficulty</span>
                  <span className="val">
                    <span className={`pill pill--${saveResult.difficulty?.toLowerCase()}`}>{saveResult.difficulty}</span>
                  </span>
                </div>
                <div className="row"><span className="lbl">Tags</span>
                  <span className="val tags">
                    {(saveResult.dsa_tags || []).map(t => <span key={t} className="pill pill--tag">{t}</span>)}
                  </span>
                </div>
                <div className="row"><span className="lbl">Approaches</span>
                  <span className="val">{saveResult.approaches_found} ({(saveResult.approach_names || []).join(', ')})</span>
                </div>
              </MetaBox>
            </>
          )}

          {saveResult?.status === 'duplicate' && (
            <Banner $kind="warn" style={{ marginTop:14 }}>
              <AlertTriangle/>
              <div className="msg">
                A similar problem <strong>"{saveResult.duplicate_of_title}"</strong> already exists in the vault — not saved to avoid duplication.
              </div>
            </Banner>
          )}

          {failed && (
            <Banner $kind="error" style={{ marginTop:14 }}>
              <XCircle/><div className="msg">{saveResult.message}</div>
            </Banner>
          )}

          {/* Hint retry — only meaningful when the AI ran and failed. */}
          {failed && !manualOpen && (
            <div style={{ marginTop:12, padding:12, borderRadius:10,
              border:'1px solid var(--cv-border-subtle)', background:'var(--cv-glass-bg)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8,
                fontSize:'.78rem', fontWeight:700, color:'var(--cv-text-primary)' }}>
                <Sparkles size={13} style={{ color:'var(--cv-accent)' }}/>
                Help the AI understand the problem
              </div>
              <div style={{ fontSize:'.72rem', color:'var(--cv-text-muted)', marginBottom:8, lineHeight:1.5 }}>
                Add a short description and retry, or skip the AI entirely and fill in the details yourself.
              </div>
              <textarea
                value={hint}
                onChange={e=>setHint(e.target.value)}
                disabled={saving}
                placeholder={'e.g. "Two Sum — given an array and a target, return the indices of two numbers that add up to the target."'}
                spellCheck={false}
                rows={3}
                style={{ width:'100%', resize:'vertical', borderRadius:8,
                  border:'1px solid var(--cv-border-subtle)',
                  background:'var(--cv-bg-secondary, #11151d)',
                  color:'var(--cv-text-primary)', padding:'8px 10px',
                  fontFamily:'inherit', fontSize:'.78rem', lineHeight:1.5,
                  outline:'none', boxSizing:'border-box' }}/>
            </div>
          )}

          {/* Manual-entry form. Auto-opens on heuristic / failed results,
              and the user can also open it from the footer at any time. */}
          {manualOpen && (
            <div style={{ marginTop:12, padding:12, borderRadius:10,
              border:'1px dashed rgba(99,102,241,.35)', background:'rgba(99,102,241,.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4,
                fontSize:'.78rem', fontWeight:700, color:'var(--cv-text-primary)' }}>
                <PencilLine size={13} style={{ color:'var(--cv-accent)' }}/>
                Add the details yourself
              </div>
              <div style={{ fontSize:'.7rem', color:'var(--cv-text-muted)',
                marginBottom:10, lineHeight:1.5 }}>
                Fill in the metadata you want stored. Saving from here skips the AI
                entirely — useful when the model is rate-limited or you want full control.
              </div>

              <Field label="Title">
                <input value={manual.title}
                  onChange={e=>setManual(m => ({ ...m, title: e.target.value }))}
                  placeholder="e.g. Two Sum" spellCheck={false}
                  style={inputStyle}/>
              </Field>

              <Field label="Description / problem statement">
                <textarea value={manual.statement}
                  onChange={e=>setManual(m => ({ ...m, statement: e.target.value }))}
                  placeholder="Markdown is fine. Cover the problem, input/output, constraints."
                  rows={5} spellCheck={false}
                  style={{ ...inputStyle, resize:'vertical', fontFamily:'inherit', lineHeight:1.5 }}/>
              </Field>

              <div style={{ display:'flex', gap:10 }}>
                <Field label="Difficulty" style={{ flex:1 }}>
                  <select value={manual.difficulty}
                    onChange={e=>setManual(m => ({ ...m, difficulty: e.target.value }))}
                    style={inputStyle}>
                    {DIFFS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Tags (comma-separated)" style={{ flex:2 }}>
                  <input value={manual.tagsCSV}
                    onChange={e=>setManual(m => ({ ...m, tagsCSV: e.target.value }))}
                    placeholder="Array, Hash Map, Two Pointers" spellCheck={false}
                    style={inputStyle}/>
                </Field>
              </div>
            </div>
          )}
        </MBody>
        <MFoot>
          <Btn onClick={safeClose} disabled={saving}>Close</Btn>

          {/* Toggle for manual entry — always available unless we already saved. */}
          {!saveResult || saveResult.status === 'analysis_failed' || saveResult.status === 'duplicate' ? (
            !manualOpen ? (
              <Btn onClick={()=>{ setManual(fromResult(saveResult)); setManualOpen(true); }}
                disabled={saving}
                title="Skip AI and enter title, description, difficulty and tags yourself">
                <PencilLine size={13}/> Add details manually
              </Btn>
            ) : (
              <Btn onClick={()=>setManualOpen(false)} disabled={saving}>
                Cancel manual entry
              </Btn>
            )
          ) : null}

          {failed && !manualOpen && (
            <Btn $primary onClick={()=>onRetryHint?.(hint)} disabled={saving || !hint.trim()}>
              <Sparkles size={13}/> Retry with hint
            </Btn>
          )}

          {manualOpen && (
            <Btn $primary onClick={submitManual}
              disabled={saving || !manual.title.trim()}
              title={!manual.title.trim() ? 'Title is required' : 'Save with these details (skips AI)'}>
              <Save size={13}/> {saving ? 'Saving…' : 'Save with these details'}
            </Btn>
          )}

          {saveResult?.status === 'saved' && saveResult.problem_id && (
            <Btn $primary onClick={()=>{ window.location.href = `/workspace?id=${saveResult.problem_id}`; }}>
              <Eye size={13}/> Open in Workspace
            </Btn>
          )}
          {saveResult?.status === 'duplicate' && saveResult.duplicate_of_id && (
            <Btn $primary onClick={()=>{ window.location.href = `/workspace?id=${saveResult.duplicate_of_id}`; }}>
              <Eye size={13}/> View Existing
            </Btn>
          )}
        </MFoot>
      </Modal>
    </Backdrop>
  );
}

/* ── tiny local atoms ─────────────────────────────────────── */

const inputStyle = {
  width:'100%', borderRadius:8,
  border:'1px solid var(--cv-border-subtle)',
  background:'var(--cv-bg-secondary, #11151d)',
  color:'var(--cv-text-primary)', padding:'7px 10px',
  fontFamily:'inherit', fontSize:'.78rem',
  outline:'none', boxSizing:'border-box',
};

function Field({ label, children, style }) {
  return (
    <label style={{ display:'block', marginBottom:8, ...style }}>
      <span style={{ display:'block', fontSize:'.66rem', fontWeight:700,
        color:'var(--cv-text-muted)', textTransform:'uppercase',
        letterSpacing:'.05em', marginBottom:4 }}>
        {label}
      </span>
      {children}
    </label>
  );
}
