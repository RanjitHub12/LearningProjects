import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import Editor from '@monaco-editor/react';
import {
  Play, RotateCcw, FileCode, Lightbulb, Clock, HardDrive,
  Brain, Layers, Zap, Copy, Check, ChevronUp, ChevronDown, Trash2, Eye, EyeOff,
  Maximize2, Minimize2
} from 'lucide-react';

/* ═══ Layout ══════════════════════════════════════════════════ */
const Page = styled.div`animation:fadeIn .4s ease;display:flex;flex-direction:column;height:calc(100vh - 64px);`;
const TopBar = styled.div`display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;
  .title{font-size:1.05rem;font-weight:700;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}`;
const TimerBadge = styled.div`
  display:flex;align-items:center;gap:6px;padding:5px 14px;border-radius:8px;
  font-family:var(--cv-font-mono);font-size:.85rem;font-weight:700;
  background:${p=>p.$warn?'rgba(239,68,68,.12)':'rgba(99,102,241,.1)'};
  color:${p=>p.$warn?'#f85149':'var(--cv-accent)'};
  border:1px solid ${p=>p.$warn?'rgba(239,68,68,.2)':'rgba(99,102,241,.15)'};
  ${p=>p.$warn?'animation:pulse 1s infinite;':''}
  svg{width:14px;height:14px;}`;
const FocusBadge = styled.div`
  display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;
  font-size:.7rem;font-weight:600;color:var(--cv-warning);
  background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.15);
  svg{width:12px;height:12px;}`;
const Btn = styled.button`padding:6px 14px;border-radius:8px;border:none;cursor:pointer;
  font-family:inherit;font-size:.78rem;font-weight:600;display:flex;align-items:center;gap:5px;transition:all .15s;
  ${p=>p.$primary?`background:var(--cv-gradient-primary);color:#fff;&:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(99,102,241,.3);}&:disabled{opacity:.5;cursor:not-allowed;}`
  :p.$danger?`background:rgba(239,68,68,.1);color:#ef4444;&:hover{background:rgba(239,68,68,.2);}`
  :`background:var(--cv-glass-bg);color:var(--cv-text-secondary);border:1px solid var(--cv-border-subtle);&:hover{border-color:var(--cv-border-hover);}`}`;
const Sel = styled.select`padding:6px 10px;border-radius:8px;font-family:inherit;font-size:.78rem;
  background:var(--cv-glass-bg);border:1px solid var(--cv-border-subtle);color:var(--cv-text-primary);outline:none;cursor:pointer;`;

/* LeetCode-style 2-column: Left=Problem, Right=Editor+Console stacked */
const SplitH = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1;min-height:0;
  @media(max-width:900px){grid-template-columns:1fr;}`;
const FullscreenOverlay = styled.div`
  position:fixed;top:0;left:0;right:0;bottom:0;z-index:100;background:#1e1e1e;
  display:flex;flex-direction:column;animation:fadeIn .2s ease;`;
const FSToolbar = styled.div`
  display:flex;align-items:center;gap:8px;padding:8px 16px;
  background:#252526;border-bottom:1px solid #3c3c3c;
  .title{flex:1;font-size:.82rem;font-weight:600;color:#ccc;}
  button{padding:5px 12px;border-radius:6px;border:none;cursor:pointer;
    font-family:inherit;font-size:.76rem;font-weight:600;display:flex;align-items:center;gap:5px;transition:all .15s;}
  .run-btn{background:#6366f1;color:#fff;&:hover{background:#5457e5;}}
  .exit-btn{background:#3c3c3c;color:#aaa;&:hover{background:#4c4c4c;color:#fff;}}
  select{padding:5px 8px;border-radius:6px;border:1px solid #3c3c3c;background:#2d2d2d;color:#ccc;font-family:inherit;font-size:.76rem;}`;
const Pane = styled.div`display:flex;flex-direction:column;min-height:0;
  background:var(--cv-glass-bg);backdrop-filter:blur(20px);border:1px solid var(--cv-border-subtle);border-radius:14px;overflow:hidden;`;
const Tabs = styled.div`display:flex;border-bottom:1px solid var(--cv-border-subtle);flex-shrink:0;`;
const Tab = styled.button`padding:7px 14px;border:none;cursor:pointer;font-family:inherit;font-size:.76rem;font-weight:600;
  background:transparent;color:${p=>p.$active?'var(--cv-accent)':'var(--cv-text-muted)'};
  border-bottom:2px solid ${p=>p.$active?'var(--cv-accent)':'transparent'};transition:all .15s;&:hover{color:var(--cv-accent);}`;
const Empty = styled.div`flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  color:var(--cv-text-muted);font-size:.84rem;text-align:center;padding:20px;
  svg{width:28px;height:28px;margin-bottom:10px;opacity:.3;}`;

/* Right pane: Editor top + Console bottom (stacked vertically) */
const RightStack = styled.div`display:flex;flex-direction:column;gap:10px;min-height:0;`;
const EditorPane = styled(Pane)`flex:1;min-height:200px;`;
const ConsolePane = styled(Pane)`height:${p=>p.$collapsed?'36px':'180px'};transition:height .2s ease;flex-shrink:0;`;
const ConsoleHead = styled.div`display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;user-select:none;
  border-bottom:${p=>p.$collapsed?'none':'1px solid rgba(255,255,255,.06)'};font-size:.7rem;font-weight:600;color:#8b949e;
  .dot{width:7px;height:7px;border-radius:50%;background:${p=>p.$c==='pass'?'#3fb950':p.$c==='fail'?'#f85149':'#484f58'};}
  .spacer{flex:1;} svg{width:14px;height:14px;color:#8b949e;}`;
const ConBody = styled.pre`flex:1;margin:0;padding:10px 14px;overflow:auto;font-family:var(--cv-font-mono);font-size:.8rem;
  line-height:1.6;color:#c9d1d9;white-space:pre-wrap;word-break:break-word;background:#0d1117;
  .err{color:#f85149;} .warn{color:#d29922;} .info{color:#58a6ff;} .dim{color:#484f58;}`;
const MetRow = styled.div`display:flex;gap:12px;padding:6px 12px;border-top:1px solid rgba(255,255,255,.06);
  font-size:.7rem;color:#8b949e;font-family:var(--cv-font-mono);background:#0d1117;
  span{display:flex;align-items:center;gap:3px;} .pass{color:#3fb950;} .fail{color:#f85149;}`;

/* Solutions tab components */
const ApBar = styled.div`display:flex;gap:5px;flex-wrap:wrap;padding:8px 12px;border-bottom:1px solid var(--cv-border-subtle);`;
const ApBtn = styled.button`padding:4px 12px;border-radius:999px;border:none;cursor:pointer;font-family:inherit;font-size:.72rem;font-weight:600;transition:all .2s;
  background:${p=>p.$active?'var(--cv-accent)':'var(--cv-bg-tertiary)'};color:${p=>p.$active?'#fff':'var(--cv-text-secondary)'};
  border:1px solid ${p=>p.$active?'var(--cv-accent)':'var(--cv-border-default)'};&:hover{border-color:var(--cv-accent);}`;
const CxRow = styled.div`display:flex;gap:10px;padding:7px 12px;align-items:center;border-bottom:1px solid var(--cv-border-subtle);font-size:.72rem;color:var(--cv-text-muted);
  .badge{display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:var(--cv-bg-tertiary);font-family:var(--cv-font-mono);color:var(--cv-accent);font-weight:600;}`;
const ExplBox = styled.div`padding:10px 12px;border-top:1px solid var(--cv-border-subtle);font-size:.8rem;color:var(--cv-text-secondary);line-height:1.6;background:var(--cv-bg-tertiary);
  .lbl{font-size:.66rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--cv-text-muted);margin-bottom:3px;}`;

/* Analysis tab */
const Sec = styled.div`padding:12px 16px;border-bottom:1px solid var(--cv-border-subtle);&:last-child{border-bottom:none;}
  .st{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--cv-accent);margin-bottom:7px;display:flex;align-items:center;gap:5px;svg{width:13px;height:13px;}}`;
const IL = styled.ul`list-style:none;padding:0;margin:0;li{padding:4px 0;font-size:.82rem;color:var(--cv-text-secondary);display:flex;align-items:flex-start;gap:7px;
  &::before{content:'→';color:var(--cv-accent);font-weight:700;flex-shrink:0;}}`;
const LBI = styled.div`padding:6px 10px;border-radius:7px;margin-bottom:4px;background:var(--cv-bg-tertiary);border:1px solid var(--cv-border-subtle);
  .cl{font-family:var(--cv-font-mono);font-size:.75rem;color:var(--cv-accent-light);margin-bottom:2px;white-space:pre-wrap;}
  .ex{font-size:.75rem;color:var(--cv-text-muted);line-height:1.5;}`;
const PC = styled.div`flex:1;padding:16px;overflow-y:auto;font-size:.85rem;line-height:1.7;color:var(--cv-text-secondary);
  h3{color:var(--cv-text-primary);margin-bottom:6px;} h4{color:var(--cv-text-primary);margin:10px 0 5px;font-size:.88rem;}
  p{margin-bottom:6px;} code{font-family:var(--cv-font-mono);font-size:.8rem;background:var(--cv-bg-tertiary);padding:1px 5px;border-radius:4px;}`;

const LANG = { cpp:'cpp', python:'python', java:'java' };
const BOILER = {
  cpp:'#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your solution here\n    return 0;\n}',
  python:'def solve():\n    # Your solution here\n    pass\n\nsolve()',
  java:'public class Solution {\n    public static void main(String[] args) {\n        // Your solution here\n    }\n}',
};

export default function Workspace() {
  const [params] = useSearchParams();
  const pid = params.get('id');
  const isPractice = params.get('practice') === 'true';
  const [problem, setProblem] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('cpp');
  const [output, setOutput] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [running, setRunning] = useState(false);
  const [rTab, setRTab] = useState('problem');
  const [solIdx, setSolIdx] = useState(0);
  const [apIdx, setApIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [conCollapsed, setConCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // Practice mode timer
  const [timer, setTimer] = useState(0);
  const [focusLost, setFocusLost] = useState(0);
  const timerRef = useRef(null);

  // Start timer in practice mode
  useEffect(() => {
    if (!isPractice) return;
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [isPractice]);

  // Tab-switch / focus-loss detection
  useEffect(() => {
    if (!isPractice) return;
    const onBlur = () => setFocusLost(f => f + 1);
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [isPractice]);

  useEffect(() => {
    if (!pid) return;
    fetch(`/api/v1/problems/${pid}`).then(r=>r.ok?r.json():null).then(d=>{
      if(d){setProblem(d);setSolutions(d.solutions||[]);setCode(BOILER[lang]||'');}
    });
  }, [pid]);

  const sol = solutions[solIdx]||null;
  const approaches = sol?.extracted_approaches||[];
  const ap = approaches[apIdx]||null;
  const deep = sol?.deep_analysis||null;

  const runCode = async () => {
    setRunning(true);setOutput('');setMetrics(null);setConCollapsed(false);
    try {
      const r = await fetch('/api/v1/execute',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({code,language:lang,stdin:''})});
      const d = await r.json();
      let o='';
      if(d.error) o+=`[ERROR] ${d.error}\n`;
      if(d.stderr) o+=d.stderr+'\n';
      if(d.stdout) o+=d.stdout;
      if(!o.trim()) o='(no output)';
      setOutput(o.trim()); setMetrics(d.metrics||null);
    } catch(e){setOutput(`[ERROR] ${e.message}`);}
    finally{setRunning(false);}
  };

  const loadAp=()=>{if(ap?.raw_code){setCode(ap.raw_code);}};
  const copyCode=()=>{if(ap?.raw_code){navigator.clipboard.writeText(ap.raw_code);setCopied(true);setTimeout(()=>setCopied(false),1500);}};

  const cStatus = metrics?(metrics.passed?'pass':'fail'):(running?'running':'idle');

  const renderCon = (text) => {
    if(!text) return <span className="dim">Run your code to see output...</span>;
    return text.split('\n').map((l,i)=>{
      if(l.startsWith('[ERROR]')) return <div key={i} className="err">{l}</div>;
      if(/error|Error|fatal/.test(l)) return <div key={i} className="err">{l}</div>;
      if(/warning|Warning/.test(l)) return <div key={i} className="warn">{l}</div>;
      if(/note:|info:/i.test(l)) return <div key={i} className="info">{l}</div>;
      return <div key={i}>{l}</div>;
    });
  };

  const renderMd = (text) => {
    if(!text) return null;
    return text.split('\n').map((l,i)=>{
      if(l.startsWith('# ')) return <h3 key={i}>{l.slice(2)}</h3>;
      if(l.startsWith('## ')) return <h4 key={i}>{l.slice(3)}</h4>;
      if(l.startsWith('- ')) return <li key={i} style={{marginLeft:16,marginBottom:2}}>{l.slice(2)}</li>;
      if(l.startsWith('**')) return <p key={i}><strong>{l.replace(/\*\*/g,'')}</strong></p>;
      if(l.startsWith('```')||!l.trim()) return null;
      return <p key={i} style={{margin:'2px 0'}}>{l}</p>;
    });
  };

  const noProblem = !pid && !problem;

  // Fullscreen editor mode
  if (fullscreen) return (
    <FullscreenOverlay>
      <FSToolbar>
        <span className="title">{problem?.title || 'Editor'}</span>
        {isPractice && (
          <TimerBadge $warn={timer>1800}><Clock size={12}/>
            {String(Math.floor(timer/60)).padStart(2,'0')}:{String(timer%60).padStart(2,'0')}
          </TimerBadge>
        )}
        <select value={lang} onChange={e=>{setLang(e.target.value);setCode(BOILER[e.target.value]||'');}}>
          <option value="cpp">C++</option><option value="python">Python</option><option value="java">Java</option>
        </select>
        <button className="run-btn" onClick={runCode} disabled={running}><Play size={12}/> {running?'Running...':'Run'}</button>
        <button className="exit-btn" onClick={()=>setFullscreen(false)}><Minimize2 size={12}/> Exit</button>
      </FSToolbar>
      <div style={{flex:1,minHeight:0}}>
        <Editor height="100%" language={LANG[lang]||'plaintext'} theme="vs-dark" value={code}
          onChange={v=>setCode(v||'')}
          options={{minimap:{enabled:true},fontSize:15,lineHeight:24,padding:{top:10},scrollBeyondLastLine:false,
            wordWrap:'on',automaticLayout:true,tabSize:4,renderLineHighlight:'line'}}/>
      </div>
      {(output||running)&&(
        <div style={{height:160,borderTop:'1px solid #3c3c3c',background:'#0d1117',overflow:'auto',padding:'10px 14px',
          fontFamily:'var(--cv-font-mono)',fontSize:'.8rem',lineHeight:1.6,color:'#c9d1d9',whiteSpace:'pre-wrap'}}>
          {renderCon(running?'⏳ Compiling and executing...':output)}
        </div>
      )}
    </FullscreenOverlay>
  );

  return (
    <Page>
      <TopBar>
        <span className="title">{problem?.title||'Loading...'}</span>
        {problem&&<span className={`pill pill--${problem.difficulty?.toLowerCase()}`}>{problem.difficulty}</span>}
        {isPractice && (
          <TimerBadge $warn={timer > 1800}>
            <Clock size={14}/>
            {String(Math.floor(timer/60)).padStart(2,'0')}:{String(timer%60).padStart(2,'0')}
          </TimerBadge>
        )}
        {isPractice && focusLost > 0 && (
          <FocusBadge><EyeOff size={12}/> Focus lost: {focusLost}</FocusBadge>
        )}
        <Sel value={lang} onChange={e=>{setLang(e.target.value);setCode(BOILER[e.target.value]||'');}}>
          <option value="cpp">C++</option><option value="python">Python</option><option value="java">Java</option>
        </Sel>
        <Btn onClick={()=>setCode(BOILER[lang]||'')}><RotateCcw size={13}/> Reset</Btn>
        <Btn $primary onClick={runCode} disabled={running}><Play size={13}/> {running?'Running...':'Run'}</Btn>
      </TopBar>

      <SplitH>
        {/* ═══ LEFT: Problem / Solutions / Analysis ═══ */}
        <Pane>
          <Tabs>
            <Tab $active={rTab==='problem'} onClick={()=>setRTab('problem')}>Problem</Tab>
            <Tab $active={rTab==='solutions'} onClick={()=>setRTab('solutions')}>Solutions{approaches.length>0&&` (${approaches.length})`}</Tab>
            <Tab $active={rTab==='analysis'} onClick={()=>setRTab('analysis')}>Analysis</Tab>
          </Tabs>

          {rTab==='problem'&&(
            <PC>
              {problem?.problem_statement?renderMd(problem.problem_statement):(
                <p style={{color:'var(--cv-text-muted)'}}>No description available. Re-upload with AI key.</p>
              )}
              {problem?.dsa_tags?.length>0&&(
                <div style={{marginTop:12,display:'flex',gap:4,flexWrap:'wrap'}}>
                  {problem.dsa_tags.map(t=><span key={t} className="pill pill--tag">{t}</span>)}
                </div>
              )}
              {problem?.generated_test_cases?.length>0&&(
                <div style={{marginTop:16}}>
                  <h4>Test Cases</h4>
                  {problem.generated_test_cases.map((tc,i)=>(
                    <div key={i} style={{padding:'9px 12px',borderRadius:8,marginBottom:5,background:'var(--cv-bg-tertiary)',fontSize:'.8rem',border:'1px solid var(--cv-border-subtle)'}}>
                      <div><strong style={{color:'var(--cv-accent)'}}>Input:</strong> <code>{tc.input}</code></div>
                      <div><strong style={{color:'var(--cv-success)'}}>Expected:</strong> <code>{tc.expected_output}</code></div>
                      {tc.explanation&&<div style={{color:'var(--cv-text-muted)',marginTop:3,fontStyle:'italic',fontSize:'.78rem'}}>{tc.explanation}</div>}
                    </div>
                  ))}
                </div>
              )}
            </PC>
          )}

          {rTab==='solutions'&&(
            solutions.length===0?<Empty><FileCode/><div>No solutions yet.</div></Empty>:(
              <>
                {solutions.length>1&&(
                  <div style={{padding:'7px 12px',borderBottom:'1px solid var(--cv-border-subtle)',display:'flex',alignItems:'center',gap:6,fontSize:'.72rem',color:'var(--cv-text-muted)'}}>
                    <Layers size={12}/> <Sel value={solIdx} onChange={e=>{setSolIdx(+e.target.value);setApIdx(0);}} style={{flex:1,fontSize:'.74rem'}}>
                      {solutions.map((s,i)=><option key={s.id} value={i}>Upload {i+1} ({s.language}) — {(s.extracted_approaches||[]).length} approaches</option>)}
                    </Sel>
                  </div>
                )}
                {approaches.length>0&&<ApBar>{approaches.map((a,i)=>(
                  <ApBtn key={i} $active={apIdx===i} onClick={()=>setApIdx(i)}>{a.approach_name||`Approach ${i+1}`}</ApBtn>
                ))}</ApBar>}
                {ap&&(ap.time_complexity||ap.space_complexity)&&(
                  <CxRow>
                    {ap.time_complexity&&<div className="badge"><Clock size={10}/> {ap.time_complexity}</div>}
                    {ap.space_complexity&&<div className="badge"><HardDrive size={10}/> {ap.space_complexity}</div>}
                    <div style={{marginLeft:'auto',display:'flex',gap:5}}>
                      <Btn style={{padding:'3px 9px',fontSize:'.68rem'}} onClick={copyCode}>{copied?<><Check size={9}/> Copied</>:<><Copy size={9}/> Copy</>}</Btn>
                      <Btn style={{padding:'3px 9px',fontSize:'.68rem'}} onClick={loadAp}><Play size={9}/> Load in Editor</Btn>
                    </div>
                  </CxRow>
                )}
                {ap?.raw_code?(
                  <div style={{flex:1,minHeight:0}}>
                    <Editor height="100%" language={LANG[sol?.language]||'plaintext'} theme="vs-dark"
                      value={ap.raw_code} options={{readOnly:true,minimap:{enabled:false},fontSize:13,lineHeight:20,
                        padding:{top:8},scrollBeyondLastLine:false,wordWrap:'on',automaticLayout:true,
                        renderLineHighlight:'none',scrollbar:{verticalScrollbarSize:5}}}/>
                  </div>
                ):<Empty><FileCode/><div>Select an approach</div></Empty>}
                {ap?.explanation&&<ExplBox><div className="lbl">Strategy</div>{ap.explanation}</ExplBox>}
              </>
            )
          )}

          {rTab==='analysis'&&(
            !deep?<Empty><Brain/><div>AI analysis not available.<br/>Set GROQ_API_KEY and re-upload.</div></Empty>:(
              <PC>
                {deep.overall_summary&&<Sec><div className="st"><Brain size={13}/> Summary</div><p>{deep.overall_summary}</p></Sec>}
                {deep.key_insights?.length>0&&<Sec><div className="st"><Zap size={13}/> Key Insights</div><IL>{deep.key_insights.map((x,i)=><li key={i}>{x}</li>)}</IL></Sec>}
                {deep.common_mistakes?.length>0&&<Sec><div className="st" style={{color:'var(--cv-warning)'}}><Lightbulb size={13}/> Common Mistakes</div><IL>{deep.common_mistakes.map((x,i)=><li key={i}>{x}</li>)}</IL></Sec>}
                {deep.approaches?.map((a,i)=>(
                  <Sec key={i}>
                    <div className="st"><Layers size={13}/> {a.approach_name||`Approach ${i+1}`}</div>
                    {a.summary&&<p style={{marginBottom:7}}>{a.summary}</p>}
                    {(a.time_complexity||a.space_complexity)&&(
                      <div style={{display:'flex',gap:7,marginBottom:8}}>
                        {a.time_complexity&&<span style={{padding:'2px 8px',borderRadius:5,fontSize:'.72rem',fontWeight:600,background:'var(--cv-bg-tertiary)',fontFamily:'var(--cv-font-mono)',color:'var(--cv-accent)'}}>Time: {a.time_complexity}</span>}
                        {a.space_complexity&&<span style={{padding:'2px 8px',borderRadius:5,fontSize:'.72rem',fontWeight:600,background:'var(--cv-bg-tertiary)',fontFamily:'var(--cv-font-mono)',color:'var(--cv-accent)'}}>Space: {a.space_complexity}</span>}
                      </div>
                    )}
                    {a.line_breakdown?.length>0&&<>{a.line_breakdown.map((lb,j)=>(
                      <LBI key={j}><div className="cl">{lb.line_number?`L${lb.line_number}: `:''}{lb.code}</div><div className="ex">{lb.explanation}</div></LBI>
                    ))}</>}
                  </Sec>
                ))}
              </PC>
            )
          )}
        </Pane>

        {/* ═══ RIGHT: Editor (top) + Console (bottom, always visible) ═══ */}
        <RightStack>
          <EditorPane>
            <div style={{display:'flex',alignItems:'center',padding:'6px 12px',borderBottom:'1px solid var(--cv-border-subtle)',fontSize:'.7rem',fontWeight:600,color:'var(--cv-text-muted)',textTransform:'uppercase',letterSpacing:'.05em'}}>
              <FileCode size={13} style={{marginRight:6,color:'var(--cv-accent)'}}/> Editor
              <span style={{flex:1}}/>
              <Btn style={{padding:'3px 8px',fontSize:'.66rem'}} onClick={()=>setFullscreen(true)}><Maximize2 size={11}/> Fullscreen</Btn>
            </div>
            <div style={{flex:1,minHeight:0}}>
              <Editor height="100%" language={LANG[lang]||'plaintext'} theme="vs-dark" value={code}
                onChange={v=>setCode(v||'')}
                options={{minimap:{enabled:false},fontSize:14,lineHeight:22,padding:{top:8},scrollBeyondLastLine:false,
                  wordWrap:'on',automaticLayout:true,tabSize:4,renderLineHighlight:'line',
                  scrollbar:{verticalScrollbarSize:5,horizontalScrollbarSize:5}}}/>
            </div>
          </EditorPane>

          <ConsolePane $collapsed={conCollapsed}>
            <ConsoleHead $collapsed={conCollapsed} $c={cStatus} onClick={()=>setConCollapsed(!conCollapsed)}>
              <span className="dot"/>
              <span>{running?'Executing...':metrics?(metrics.passed?'Accepted':'Wrong Answer / Error'):'Console'}</span>
              <span className="spacer"/>
              {metrics&&<span style={{fontSize:'.68rem',color:metrics.passed?'#3fb950':'#f85149',marginRight:8}}>{metrics.execution_ms?.toFixed(1)}ms</span>}
              {conCollapsed?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
            </ConsoleHead>
            {!conCollapsed&&(
              <>
                <ConBody>{renderCon(running?'⏳ Compiling and executing...':output)}</ConBody>
                {metrics&&(
                  <MetRow>
                    <span><Clock size={10}/> {metrics.execution_ms?.toFixed(1)||'—'}ms</span>
                    <span><HardDrive size={10}/> {metrics.memory_kb?.toFixed(0)||'—'}KB</span>
                    <span className={metrics.passed?'pass':'fail'}>{metrics.passed?'✓ Exit 0':'✗ Non-zero exit'}</span>
                  </MetRow>
                )}
              </>
            )}
          </ConsolePane>
        </RightStack>
      </SplitH>
    </Page>
  );
}
