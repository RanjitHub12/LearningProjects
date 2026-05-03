import Editor from '@monaco-editor/react';
import {
  FileCode, Layers, Clock, HardDrive, Brain, Zap, Lightbulb,
  Copy, Check, Play,
} from 'lucide-react';
import {
  Pane, Tabs, Tab, Empty, ApBar, ApBtn, CxRow, ExplBox, Sec, IL, LBI, PC, Sel, Btn,
} from './styles';
import { LANG } from './constants';
import { renderMarkdown } from './utils';

/** Renders the markdown output from utils.renderMarkdown into JSX. */
function Markdown({ text }) {
  const blocks = renderMarkdown(text);
  return blocks.map(b => {
    if (b.kind === 'h3') return <h3 key={b.key}>{b.text}</h3>;
    if (b.kind === 'h4') return <h4 key={b.key}>{b.text}</h4>;
    if (b.kind === 'li') return <li key={b.key} style={{ marginLeft:16, marginBottom:2 }}>{b.text}</li>;
    if (b.kind === 'strong') return <p key={b.key}><strong>{b.text}</strong></p>;
    return <p key={b.key} style={{ margin:'2px 0' }}>{b.text}</p>;
  });
}

/**
 * Left pane of the Workspace: Problem statement, Solutions browser
 * (multi-upload + multi-approach), and AI deep analysis.
 */
export default function LeftPane({
  rTab, setRTab,
  problem, solutions,
  solIdx, setSolIdx, apIdx, setApIdx,
  copied, copyCode, loadAp,
}) {
  const sol = solutions[solIdx] || null;
  const approaches = sol?.extracted_approaches || [];
  const ap = approaches[apIdx] || null;
  const deep = sol?.deep_analysis || null;

  return (
    <Pane>
      <Tabs>
        <Tab $active={rTab === 'problem'} onClick={()=>setRTab('problem')}>Problem</Tab>
        <Tab $active={rTab === 'solutions'} onClick={()=>setRTab('solutions')}>
          Solutions{approaches.length > 0 && ` (${approaches.length})`}
        </Tab>
        <Tab $active={rTab === 'analysis'} onClick={()=>setRTab('analysis')}>Analysis</Tab>
      </Tabs>

      {rTab === 'problem' && (
        <PC>
          {problem?.problem_statement ? <Markdown text={problem.problem_statement}/> : (
            <p style={{ color:'var(--cv-text-muted)' }}>No description available. Re-upload with AI key.</p>
          )}
          {problem?.dsa_tags?.length > 0 && (
            <div style={{ marginTop:12, display:'flex', gap:4, flexWrap:'wrap' }}>
              {problem.dsa_tags.map(t => <span key={t} className="pill pill--tag">{t}</span>)}
            </div>
          )}
          {problem?.generated_test_cases?.length > 0 && (
            <div style={{ marginTop:16 }}>
              <h4>Test Cases</h4>
              {problem.generated_test_cases.map((tc, i) => (
                <div key={i} style={{ padding:'9px 12px', borderRadius:8, marginBottom:5,
                  background:'var(--cv-bg-tertiary)', fontSize:'.8rem',
                  border:'1px solid var(--cv-border-subtle)' }}>
                  <div><strong style={{ color:'var(--cv-accent)' }}>Input:</strong> <code>{tc.input}</code></div>
                  <div><strong style={{ color:'var(--cv-success)' }}>Expected:</strong> <code>{tc.expected_output}</code></div>
                  {tc.explanation && (
                    <div style={{ color:'var(--cv-text-muted)', marginTop:3, fontStyle:'italic', fontSize:'.78rem' }}>
                      {tc.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </PC>
      )}

      {rTab === 'solutions' && (
        solutions.length === 0
          ? <Empty><FileCode/><div>No solutions yet.</div></Empty>
          : (
            <>
              {solutions.length > 1 && (
                <div style={{ padding:'7px 12px', borderBottom:'1px solid var(--cv-border-subtle)',
                  display:'flex', alignItems:'center', gap:6, fontSize:'.72rem',
                  color:'var(--cv-text-muted)' }}>
                  <Layers size={12}/>
                  <Sel value={solIdx} onChange={e=>{ setSolIdx(+e.target.value); setApIdx(0); }}
                    style={{ flex:1, fontSize:'.74rem' }}>
                    {solutions.map((s, i) => (
                      <option key={s.id} value={i}>
                        Upload {i + 1} ({s.language}) — {(s.extracted_approaches || []).length} approaches
                      </option>
                    ))}
                  </Sel>
                </div>
              )}
              {approaches.length > 0 && (
                <ApBar>
                  {approaches.map((a, i) => (
                    <ApBtn key={i} $active={apIdx === i} onClick={()=>setApIdx(i)}>
                      {a.approach_name || `Approach ${i + 1}`}
                    </ApBtn>
                  ))}
                </ApBar>
              )}
              {ap && (ap.time_complexity || ap.space_complexity) && (
                <CxRow>
                  {ap.time_complexity && <div className="badge"><Clock size={10}/> {ap.time_complexity}</div>}
                  {ap.space_complexity && <div className="badge"><HardDrive size={10}/> {ap.space_complexity}</div>}
                  <div style={{ marginLeft:'auto', display:'flex', gap:5 }}>
                    <Btn style={{ padding:'3px 9px', fontSize:'.68rem' }} onClick={copyCode}>
                      {copied ? <><Check size={9}/> Copied</> : <><Copy size={9}/> Copy</>}
                    </Btn>
                    <Btn style={{ padding:'3px 9px', fontSize:'.68rem' }} onClick={loadAp}>
                      <Play size={9}/> Load in Editor
                    </Btn>
                  </div>
                </CxRow>
              )}
              {ap?.raw_code ? (
                <div style={{ flex:1, minHeight:0 }}>
                  <Editor
                    height="100%"
                    language={LANG[sol?.language] || 'plaintext'}
                    theme="vs-dark"
                    value={ap.raw_code}
                    options={{
                      readOnly: true, minimap: { enabled: false }, fontSize: 13, lineHeight: 20,
                      padding: { top: 8 }, scrollBeyondLastLine: false, wordWrap: 'on',
                      automaticLayout: true, renderLineHighlight: 'none',
                      scrollbar: { verticalScrollbarSize: 5 },
                    }}/>
                </div>
              ) : <Empty><FileCode/><div>Select an approach</div></Empty>}
              {ap?.explanation && <ExplBox><div className="lbl">Strategy</div>{ap.explanation}</ExplBox>}
            </>
          )
      )}

      {rTab === 'analysis' && (
        !deep
          ? <Empty><Brain/><div>AI analysis not available.<br/>Set GROQ_API_KEY and re-upload.</div></Empty>
          : (
            <PC>
              {deep.overall_summary && (
                <Sec><div className="st"><Brain size={13}/> Summary</div><p>{deep.overall_summary}</p></Sec>
              )}
              {deep.key_insights?.length > 0 && (
                <Sec><div className="st"><Zap size={13}/> Key Insights</div>
                  <IL>{deep.key_insights.map((x, i) => <li key={i}>{x}</li>)}</IL>
                </Sec>
              )}
              {deep.common_mistakes?.length > 0 && (
                <Sec><div className="st" style={{ color:'var(--cv-warning)' }}><Lightbulb size={13}/> Common Mistakes</div>
                  <IL>{deep.common_mistakes.map((x, i) => <li key={i}>{x}</li>)}</IL>
                </Sec>
              )}
              {deep.approaches?.map((a, i) => (
                <Sec key={i}>
                  <div className="st"><Layers size={13}/> {a.approach_name || `Approach ${i + 1}`}</div>
                  {a.summary && <p style={{ marginBottom:7 }}>{a.summary}</p>}
                  {(a.time_complexity || a.space_complexity) && (
                    <div style={{ display:'flex', gap:7, marginBottom:8 }}>
                      {a.time_complexity && (
                        <span style={{ padding:'2px 8px', borderRadius:5, fontSize:'.72rem', fontWeight:600,
                          background:'var(--cv-bg-tertiary)', fontFamily:'var(--cv-font-mono)', color:'var(--cv-accent)' }}>
                          Time: {a.time_complexity}
                        </span>
                      )}
                      {a.space_complexity && (
                        <span style={{ padding:'2px 8px', borderRadius:5, fontSize:'.72rem', fontWeight:600,
                          background:'var(--cv-bg-tertiary)', fontFamily:'var(--cv-font-mono)', color:'var(--cv-accent)' }}>
                          Space: {a.space_complexity}
                        </span>
                      )}
                    </div>
                  )}
                  {a.line_breakdown?.length > 0 && a.line_breakdown.map((lb, j) => (
                    <LBI key={j}>
                      <div className="cl">{lb.line_number ? `L${lb.line_number}: ` : ''}{lb.code}</div>
                      <div className="ex">{lb.explanation}</div>
                    </LBI>
                  ))}
                </Sec>
              ))}
            </PC>
          )
      )}
    </Pane>
  );
}
