import { useState, useEffect } from 'react';
import {
  Save, X, Clock, CheckCircle2, XCircle, Loader2,
  AlertTriangle, Eye, Sparkles,
} from 'lucide-react';
import {
  Backdrop, Modal, MHead, MBody, Step, Banner, MetaBox,
  TestList, TestRow, MFoot, Btn,
} from './styles';
import { STEP_ORDER } from './constants';

/**
 * Save-to-Vault progress modal — shows the analyze/test/dedup/save pipeline,
 * surfaces failed test details, and confirms a successful save.
 */
export default function SaveModal({
  open, onClose, saving,
  saveStep, saveResult, onRetry,
}) {
  const [hint, setHint] = useState('');
  // Reset the hint whenever the modal closes so a stale hint doesn't carry
  // over into the next save attempt.
  useEffect(() => { if (!open) setHint(''); }, [open]);
  if (!open) return null;
  const needsHint = saveResult && (saveResult.status === 'analysis_failed' || saveResult.status === 'no_tests');

  const stepStateOf = (key) => {
    if (!saveResult) return saveStep === key ? 'active' : (saveStep && STEP_ORDER.indexOf(saveStep) > STEP_ORDER.indexOf(key) ? 'done' : 'pending');
    const s = saveResult.status;
    if (s === 'analysis_failed') return key === 'analyze' ? 'fail' : 'pending';
    if (s === 'no_tests') return key === 'analyze' ? 'done' : key === 'test' ? 'fail' : 'pending';
    if (s === 'tests_failed') return key === 'analyze' ? 'done' : key === 'test' ? 'fail' : 'pending';
    if (s === 'duplicate') return (key === 'analyze' || key === 'test') ? 'done' : key === 'dedup' ? 'fail' : 'pending';
    if (s === 'saved') return 'done';
    return 'pending';
  };

  const steps = [
    { key:'analyze', label:'Analyze code with AI (title, description, tags, test cases, comments)' },
    { key:'test',    label:'Run code against AI-generated test cases' },
    { key:'dedup',   label:'Check vault for duplicate problems' },
    { key:'save',    label:'Save problem and solution to vault' },
  ];

  const safeClose = () => { if (!saving) onClose(); };

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
                <div className="row"><span className="lbl">Tests</span>
                  <span className="val" style={{ color:'#3fb950' }}>
                    {saveResult.tests_passed}/{saveResult.tests_total} passed
                  </span>
                </div>
              </MetaBox>
            </>
          )}

          {saveResult?.status === 'tests_failed' && (
            <>
              <Banner $kind="error" style={{ marginTop:14 }}>
                <XCircle/><div className="msg">{saveResult.message} The code was not saved.</div>
              </Banner>
              <TestList>
                {(saveResult.test_results || []).map((t, i) => (
                  <TestRow key={i} $pass={t.passed}>
                    <div className="head">
                      {t.passed ? <CheckCircle2 size={13}/> : <XCircle size={13}/>}
                      Test {i + 1} — {t.passed ? 'Passed' : 'Failed'}
                    </div>
                    <div className="row"><span className="lbl">Input:</span><pre>{t.input || '(empty)'}</pre></div>
                    <div className="row"><span className="lbl">Expected:</span><pre>{t.expected_output}</pre></div>
                    <div className="row"><span className="lbl">Actual:</span><pre>{t.actual_output || '(empty)'}</pre></div>
                    {t.error && (
                      <div className="row">
                        <span className="lbl">Error:</span>
                        <pre style={{ color:'#f85149' }}>{t.error}</pre>
                      </div>
                    )}
                  </TestRow>
                ))}
              </TestList>
            </>
          )}

          {saveResult?.status === 'duplicate' && (
            <Banner $kind="warn" style={{ marginTop:14 }}>
              <AlertTriangle/>
              <div className="msg">
                A similar problem <strong>"{saveResult.duplicate_of_title}"</strong> already exists in the vault.
                Your code passed all tests but was not saved to avoid duplication.
              </div>
            </Banner>
          )}

          {saveResult?.status === 'no_tests' && (
            <Banner $kind="warn" style={{ marginTop:14 }}>
              <AlertTriangle/><div className="msg">{saveResult.message}</div>
            </Banner>
          )}

          {saveResult?.status === 'analysis_failed' && (
            <Banner $kind="error" style={{ marginTop:14 }}>
              <XCircle/><div className="msg">{saveResult.message}</div>
            </Banner>
          )}

          {needsHint && (
            <div style={{ marginTop:12, padding:12, borderRadius:10,
              border:'1px solid var(--cv-border-subtle)', background:'var(--cv-glass-bg)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8,
                fontSize:'.78rem', fontWeight:700, color:'var(--cv-text-primary)' }}>
                <Sparkles size={13} style={{ color:'var(--cv-accent)' }}/>
                Help the AI understand the problem
              </div>
              <div style={{ fontSize:'.72rem', color:'var(--cv-text-muted)', marginBottom:8, lineHeight:1.5 }}>
                The AI couldn't infer enough from the code alone. Add a short
                description (problem name, what the function does, expected
                input / output) and retry — the hint is appended to the analysis prompt.
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
        </MBody>
        <MFoot>
          <Btn onClick={safeClose} disabled={saving}>Close</Btn>
          {needsHint && (
            <Btn $primary onClick={()=>onRetry?.(hint)} disabled={saving || !hint.trim()}>
              <Sparkles size={13}/> Retry with hint
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
