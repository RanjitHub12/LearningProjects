import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { Play, RotateCcw, ChevronDown, FileCode, Lightbulb, Terminal } from 'lucide-react';

const Page = styled.div`animation: fadeIn 0.4s ease; display: flex; flex-direction: column; height: calc(100vh - 64px);`;

const TopBar = styled.div`
  display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;
  .title { font-size: 1.1rem; font-weight: 700; flex: 1; }`;

const Btn = styled.button`
  padding: 7px 16px; border-radius: 8px; border: none; cursor: pointer;
  font-family: inherit; font-size: 0.8rem; font-weight: 600;
  display: flex; align-items: center; gap: 6px; transition: all 0.15s;
  ${p => p.$primary ? `
    background: var(--cv-gradient-primary); color: #fff;
    &:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.3); }
  ` : `
    background: var(--cv-glass-bg); color: var(--cv-text-secondary);
    border: 1px solid var(--cv-border-subtle);
    &:hover { border-color: var(--cv-border-hover); }
  `}`;

const Select = styled.select`
  padding: 7px 12px; border-radius: 8px; font-family: inherit; font-size: 0.8rem;
  background: var(--cv-glass-bg); border: 1px solid var(--cv-border-subtle);
  color: var(--cv-text-primary); outline: none; cursor: pointer;`;

const SplitPane = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; min-height: 0;
  @media(max-width:900px){ grid-template-columns: 1fr; }`;

const Pane = styled.div`
  display: flex; flex-direction: column; min-height: 0;
  background: var(--cv-glass-bg); backdrop-filter: blur(20px);
  border: 1px solid var(--cv-border-subtle); border-radius: 14px;
  overflow: hidden;`;

const PaneHeader = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-bottom: 1px solid var(--cv-border-subtle);
  font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--cv-text-muted);
  svg { width: 14px; height: 14px; color: var(--cv-accent); }`;

const Tabs = styled.div`
  display: flex; border-bottom: 1px solid var(--cv-border-subtle);`;

const Tab = styled.button`
  padding: 8px 16px; border: none; cursor: pointer; font-family: inherit;
  font-size: 0.78rem; font-weight: 600; background: transparent;
  color: ${p => p.$active ? 'var(--cv-accent)' : 'var(--cv-text-muted)'};
  border-bottom: 2px solid ${p => p.$active ? 'var(--cv-accent)' : 'transparent'};
  transition: all 0.15s;
  &:hover { color: var(--cv-accent); }`;

const EditorArea = styled.textarea`
  flex: 1; padding: 16px; border: none; outline: none; resize: none;
  background: transparent; color: var(--cv-text-primary);
  font-family: var(--cv-font-mono); font-size: 0.84rem; line-height: 1.7;
  &::placeholder { color: var(--cv-text-muted); }`;

const ConsoleArea = styled.div`
  flex: 1; padding: 16px; overflow-y: auto;
  font-family: var(--cv-font-mono); font-size: 0.82rem; line-height: 1.6;
  color: var(--cv-text-secondary); white-space: pre-wrap;`;

const MetricsBar = styled.div`
  display: flex; gap: 16px; padding: 8px 16px;
  border-top: 1px solid var(--cv-border-subtle);
  font-size: 0.72rem; color: var(--cv-text-muted);
  span { display: flex; align-items: center; gap: 4px; }
  .pass { color: var(--cv-success); } .fail { color: var(--cv-danger); }`;

const ProblemContent = styled.div`
  flex: 1; padding: 20px; overflow-y: auto; font-size: 0.88rem; line-height: 1.7;
  color: var(--cv-text-secondary);
  h3 { color: var(--cv-text-primary); margin-bottom: 8px; }
  .constraints { margin-top: 16px; padding: 12px; border-radius: 8px;
    background: var(--cv-bg-tertiary); font-size: 0.82rem; }`;

const Empty = styled.div`
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; color: var(--cv-text-muted); font-size: 0.85rem;
  svg { width: 32px; height: 32px; margin-bottom: 12px; opacity: 0.3; }`;

const BOILERPLATE = {
  cpp: '#include <iostream>\\nusing namespace std;\\n\\nint main() {\\n    // Your solution here\\n    return 0;\\n}',
  python: 'def solve():\\n    # Your solution here\\n    pass\\n\\nsolve()',
  java: 'public class Solution {\\n    public static void main(String[] args) {\\n        // Your solution here\\n    }\\n}',
};

export default function Workspace() {
  const [params] = useSearchParams();
  const problemId = params.get('id');
  const [problem, setProblem] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('cpp');
  const [output, setOutput] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState('editor');
  const [rightTab, setRightTab] = useState('problem');
  const [approach, setApproach] = useState(0);

  useEffect(() => {
    if (!problemId) return;
    fetch(`/api/v1/problems/${problemId}`).then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setProblem(d); setCode(BOILERPLATE[lang] || ''); } });
  }, [problemId]);

  const runCode = async () => {
    setRunning(true); setOutput('Executing...');
    try {
      const r = await fetch('/api/v1/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: lang, stdin: '' }),
      });
      const d = await r.json();
      setOutput(d.stdout || d.stderr || d.error || 'No output');
      setMetrics(d.metrics || null);
    } catch (e) {
      setOutput('Execution failed: ' + e.message);
    } finally { setRunning(false); }
  };

  if (!problemId) return (
    <Page>
      <Empty style={{ height: '60vh' }}>
        <FileCode />
        <div>Select a problem from the Problem Vault to start coding</div>
      </Empty>
    </Page>
  );

  return (
    <Page>
      <TopBar>
        <span className="title">{problem?.title || 'Loading...'}</span>
        {problem && <span className={`pill pill--${problem.difficulty?.toLowerCase()}`}>{problem.difficulty}</span>}
        <Select value={lang} onChange={e => { setLang(e.target.value); setCode(BOILERPLATE[e.target.value] || ''); }}>
          <option value="cpp">C++</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
        </Select>
        <Btn onClick={() => setCode(BOILERPLATE[lang] || '')}><RotateCcw size={14} /> Reset</Btn>
        <Btn $primary onClick={runCode} disabled={running}>
          <Play size={14} /> {running ? 'Running...' : 'Run'}
        </Btn>
      </TopBar>

      <SplitPane>
        {/* Left: Editor + Console */}
        <Pane>
          <Tabs>
            <Tab $active={tab === 'editor'} onClick={() => setTab('editor')}>Editor</Tab>
            <Tab $active={tab === 'console'} onClick={() => setTab('console')}>Console</Tab>
          </Tabs>
          {tab === 'editor' ? (
            <EditorArea value={code} onChange={e => setCode(e.target.value)}
              placeholder="Write your solution..." spellCheck={false} />
          ) : (
            <>
              <ConsoleArea>{output || 'Run your code to see output here'}</ConsoleArea>
              {metrics && (
                <MetricsBar>
                  <span>⏱ {metrics.execution_ms?.toFixed(1) || '—'}ms</span>
                  <span>💾 {metrics.memory_kb?.toFixed(0) || '—'}KB</span>
                  <span className={metrics.passed ? 'pass' : 'fail'}>
                    {metrics.passed ? '✓ Passed' : '✗ Failed'}
                  </span>
                </MetricsBar>
              )}
            </>
          )}
        </Pane>

        {/* Right: Problem / Solutions / Analysis */}
        <Pane>
          <Tabs>
            <Tab $active={rightTab === 'problem'} onClick={() => setRightTab('problem')}>Problem</Tab>
            <Tab $active={rightTab === 'solutions'} onClick={() => setRightTab('solutions')}>Solutions</Tab>
            <Tab $active={rightTab === 'analysis'} onClick={() => setRightTab('analysis')}>Analysis</Tab>
          </Tabs>
          {rightTab === 'problem' ? (
            <ProblemContent>
              <h3>{problem?.title}</h3>
              <p>{problem?.problem_statement || 'No problem statement available. This will be auto-generated when files are ingested via the AI engine.'}</p>
              {problem?.dsa_tags?.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {problem.dsa_tags.map(t => <span key={t} className="pill pill--tag">{t}</span>)}
                </div>
              )}
            </ProblemContent>
          ) : rightTab === 'solutions' ? (
            <ProblemContent>
              <Empty><FileCode />Solutions will appear here after file ingestion</Empty>
            </ProblemContent>
          ) : (
            <ProblemContent>
              <Empty><Lightbulb />AI-powered line-by-line analysis will appear here</Empty>
            </ProblemContent>
          )}
        </Pane>
      </SplitPane>
    </Page>
  );
}
