import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { FileCode, Maximize2 } from 'lucide-react';

import { recordSolve, isSolved as activityIsSolved } from '../../lib/activity';
import {
  getFolders, createFolder, deleteFolder,
  getSnippets, addSnippet, deleteSnippet, renameSnippet,
} from '../../lib/folders';
import { useToast } from '../../components/Toast';

import { Page, SplitH, RightStack, EditorPane, Btn } from './styles';
import { LANG, BOILER } from './constants';
import { normaliseIndent } from './utils';

import Toolbar from './Toolbar';
import LeftPane from './LeftPane';
import StdinPanel from './StdinPanel';
import ConsolePanel from './ConsolePanel';
import FullscreenView from './FullscreenView';
import SaveModal from './SaveModal';
import SnippetsModal from './SnippetsModal';
import DailyModal from './DailyModal';

export default function Workspace() {
  const { toast, confirm } = useToast();
  const [params] = useSearchParams();
  const pid = params.get('id');
  const snippetId = params.get('snippet');
  const isPractice = params.get('practice') === 'true';

  // ─── Core editor state ─────────────────────────────────────
  const [problem, setProblem] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('cpp');
  const [output, setOutput] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [running, setRunning] = useState(false);
  // stdin handed to /api/v1/execute. Programs reading via scanf/cin/input()
  // get this string (newline-separated answers) as their standard input.
  const [stdin, setStdin] = useState('');
  const [stdinOpen, setStdinOpen] = useState(false);
  // Interactive run (WebSocket + streaming stdin) — separate from one-shot Run.
  const [interactive, setInteractive] = useState(false);
  const wsRef = useRef(null);
  const [rTab, setRTab] = useState('problem');
  const [solIdx, setSolIdx] = useState(0);
  const [apIdx, setApIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [outCopied, setOutCopied] = useState(false);
  const [conCollapsed, setConCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // ─── Save-to-Vault pipeline ────────────────────────────────
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveStep, setSaveStep] = useState(''); // 'analyze' | 'test' | 'dedup' | 'save' | ''
  const [saveResult, setSaveResult] = useState(null);
  const [saving, setSaving] = useState(false);

  // ─── Solve tracking ────────────────────────────────────────
  const [solved, setSolved] = useState(false);

  // ─── Snippets / folders modal ──────────────────────────────
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // ─── LeetCode daily ────────────────────────────────────────
  const [dailyOpen, setDailyOpen] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [daily, setDaily] = useState(null);
  const [dailyError, setDailyError] = useState('');

  // The boilerplate currently considered "untouched" — set whenever we seed
  // the editor with LeetCode/local boilerplate so the Mark Solved gate can
  // tell user-written code apart from the unchanged stub.
  const [activeBoiler, setActiveBoiler] = useState('');

  // "More" menu — keeps the toolbar uncluttered. Reset / Daily / Snippets /
  // Save-to-Vault live in here so only Run / Mark Solved / Input stay visible.
  const [moreOpen, setMoreOpen] = useState(false);

  // ─── Practice timer ────────────────────────────────────────
  // Stored as a wall-clock start timestamp in sessionStorage so leaving and
  // returning continues counting from the original start, not from zero.
  const sessionKey = isPractice && pid ? `cv:practice:${pid}` : null;
  const [timer, setTimer] = useState(() => {
    if (!sessionKey) return 0;
    const raw = sessionStorage.getItem(sessionKey);
    if (!raw) return 0;
    try {
      const { startedAt } = JSON.parse(raw);
      return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    } catch { return 0; }
  });
  const timerRef = useRef(null);

  useEffect(() => {
    if (!sessionKey) return;
    let state;
    try { state = JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch {}
    if (!state?.startedAt) {
      state = { startedAt: Date.now() };
      sessionStorage.setItem(sessionKey, JSON.stringify(state));
    }
    timerRef.current = setInterval(() => {
      setTimer(Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [sessionKey]);

  // ─── Persist editor + stdin to sessionStorage ──────────────
  // Keyed by problem id when available, else by language. Restores on reload.
  const codeKey = pid ? `cv:code:${pid}:${lang}` : `cv:code:scratch:${lang}`;
  const stdinKey = pid ? `cv:stdin:${pid}` : `cv:stdin:scratch`;
  useEffect(() => {
    const saved = sessionStorage.getItem(codeKey);
    if (saved !== null) setCode(saved);
  }, [codeKey]);
  useEffect(() => {
    if (code !== undefined) sessionStorage.setItem(codeKey, code);
  }, [code, codeKey]);
  useEffect(() => {
    const saved = sessionStorage.getItem(stdinKey);
    if (saved !== null) setStdin(saved);
  }, [stdinKey]);
  useEffect(() => {
    sessionStorage.setItem(stdinKey, stdin);
  }, [stdin, stdinKey]);

  // ─── Load vault problem / saved snippet ────────────────────
  useEffect(() => {
    if (!pid) return;
    fetch(`/api/v1/problems/${pid}`).then(r=>r.ok ? r.json() : null).then(d=>{
      if (d) {
        setProblem(d);
        setSolutions(d.solutions || []);
        // Only seed boilerplate when there's no persisted code for this problem+lang.
        if (sessionStorage.getItem(codeKey) === null) {
          setCode(BOILER[lang] || '');
          setActiveBoiler(BOILER[lang] || '');
        }
      }
    });
  }, [pid]);

  // Open a saved snippet from the Folders page (?snippet=ID): hydrate the
  // editor + the Problem panel from its stored AI-generated metadata.
  useEffect(() => {
    if (!snippetId || pid) return;
    import('../../lib/folders').then(({ getSnippet }) => {
      const s = getSnippet(snippetId);
      if (!s) return;
      setLang(s.language || 'cpp');
      setCode(s.code || '');
      setProblem({
        id: `snippet:${s.id}`,
        title: s.title || 'Snippet',
        difficulty: s.difficulty || 'Medium',
        problem_statement: s.description || '',
        dsa_tags: s.tags || [],
        generated_test_cases: s.testCases || [],
      });
      setSolutions([]);
    });
  }, [snippetId, pid]);

  // True once the user has actually written something beyond whatever
  // boilerplate is currently seeded. Compares against both the local
  // language stub and any LeetCode-supplied snippet so an untouched daily
  // editor still disables Mark Solved.
  const hasUserCode = (() => {
    const c = (code || '').trim();
    if (!c) return false;
    const norm = (s) => (s || '').replace(/\s+/g, '');
    const stripped = norm(c);
    const candidates = [...Object.values(BOILER).map(norm), norm(activeBoiler)].filter(Boolean);
    return !candidates.includes(stripped);
  })();

  const sol = solutions[solIdx] || null;
  const approaches = sol?.extracted_approaches || [];
  const ap = approaches[apIdx] || null;

  // ─── Run / Save / Mark Solved ──────────────────────────────
  // Run is always interactive — opens the streaming WebSocket. The legacy
  // one-shot endpoint is unused from the UI; it stays in the backend for
  // Save-to-Vault's test runner.
  const runCode = () => runInteractive();

  // Run = interactive. Opens a WebSocket to /api/v1/execute/ws, streams
  // stdout/stderr into the console as they arrive, and forwards user-typed
  // lines to the process stdin. If the loaded problem has test cases and
  // the code lacks a main, the backend AI-wraps it before compiling.
  // Any text in the StdinPanel is sent up-front so existing one-shot flows
  // (paste all your inputs first, click Run) still work unchanged.
  const runInteractive = () => {
    if (running || interactive) return;
    setOutput(''); setMetrics(null); setConCollapsed(false); setRunning(true);
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/api/v1/execute/ws`);
    wsRef.current = ws;
    let buf = '';
    let startedAt = 0;
    const append = (txt) => { buf += txt; setOutput(buf); };

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'start', code, language: lang,
        test_cases: problem?.generated_test_cases || [],
      }));
    };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.type === 'runner_added') {
        if (m.code && m.code !== code) {
          setCode(m.code);
          setActiveBoiler('');
          toast({
            kind: 'info',
            title: 'AI added a runner',
            message: 'Your code had no main, so the AI generated one that reads stdin per the test cases. Editor updated.',
          });
        }
      } else if (m.type === 'started') {
        startedAt = performance.now();
        setInteractive(true);
        append('▸ Process started — type below and press Enter.\n');
        // Pre-feed any text the user staged in the StdinPanel.
        if (stdin) {
          const seed = stdin.endsWith('\n') ? stdin : stdin + '\n';
          ws.send(JSON.stringify({ type: 'stdin', data: seed }));
          append(seed);
        }
      } else if (m.type === 'stdout' || m.type === 'stderr') {
        append(m.data);
      } else if (m.type === 'compile_error') {
        append(`[ERROR] Compilation failed\n${m.data}`);
      } else if (m.type === 'error') {
        append(`[ERROR] ${m.data}\n`);
      } else if (m.type === 'exit') {
        const ms = m.ms || (startedAt ? performance.now() - startedAt : 0);
        append(`\n▸ Process exited (code ${m.code}) in ${ms.toFixed(1)}ms\n`);
        setMetrics({ execution_ms: ms, memory_kb: 0, passed: m.code === 0 });
        setInteractive(false); setRunning(false);
        try { ws.close(); } catch {}
      }
    };
    ws.onerror = () => {
      append('[ERROR] WebSocket error\n');
    };
    ws.onclose = () => {
      setInteractive(false); setRunning(false);
      if (wsRef.current === ws) wsRef.current = null;
    };
  };

  const sendStdinLine = (text) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'stdin', data: text }));
    // Echo locally so the user sees what they typed in the transcript.
    setOutput(o => o + text);
  };

  const killInteractive = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'kill' }));
  };

  // Tear down any active interactive session on unmount so the backend
  // process doesn't outlive the page.
  useEffect(() => () => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: 'kill' })); } catch {}
      try { ws.close(); } catch {}
    }
  }, []);

  const saveToVault = async (hint = '') => {
    if (!code.trim() || saving) return;
    setSaveOpen(true); setSaving(true); setSaveResult(null);
    setSaveStep('analyze');
    try {
      // Backend runs analyze → test → dedup → save sequentially. We animate
      // the visible step every ~600ms while we wait so the user sees progress.
      const stepTimers = [
        setTimeout(()=>setSaveStep('test'), 1500),
        setTimeout(()=>setSaveStep('dedup'), 3500),
        setTimeout(()=>setSaveStep('save'), 4500),
      ];
      const r = await fetch('/api/v1/upload/save-from-workspace', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ code, language: lang, hint }),
      });
      stepTimers.forEach(clearTimeout);
      const d = await r.json();
      setSaveResult(d);
      setSaveStep('');

      // If the user wrote only a function and the AI auto-generated a main /
      // driver to read stdin and call it, replace the editor with the runnable
      // version so the user can see (and re-run) what the AI produced.
      if (d?.runner_added && d.executable_code && d.executable_code !== code) {
        setCode(d.executable_code);
        toast({
          kind: 'info',
          title: 'AI added a runner',
          message: 'Your function had no main, so the AI generated one that reads stdin per the test cases. Editor updated.',
        });
      }

      // Auto-record an activity entry when the save pipeline accepted the
      // code so the dashboard / streak / contribution calendar update without
      // a separate Mark Solved click.
      if (d?.status === 'saved' && d.problem_id) {
        recordSolve({
          problemId: d.problem_id,
          title: d.title,
          difficulty: d.difficulty,
          tags: d.dsa_tags || [],
          source: 'vault',
        });
        setSolved(true);
      }
    } catch (e) {
      setSaveResult({ status:'analysis_failed', message:`Network error: ${e.message}` });
      setSaveStep('');
    } finally {
      setSaving(false);
    }
  };

  // Track whether the loaded problem has been marked solved.
  useEffect(() => {
    setSolved(pid ? activityIsSolved(pid) : false);
  }, [pid, problem]);

  const markSolved = () => {
    if (problem && pid) {
      recordSolve({
        problemId: pid,
        title: problem.title,
        difficulty: problem.difficulty,
        tags: problem.dsa_tags || [],
        source: 'vault',
      });
      setSolved(true);
      return;
    }
    // Daily challenge or scratch path — uses metadata stashed when loaded.
    const dly = window.__cvDaily;
    if (dly) {
      recordSolve({
        problemId: `lc:${dly.title}`,
        title: `${dly.title} (LeetCode Daily)`,
        difficulty: dly.difficulty,
        tags: dly.tags || [],
        source: 'leetcode-daily',
      });
      setSolved(true);
    }
  };

  // ─── Folders / snippets (modal) ────────────────────────────
  const refreshFolders = () => {
    setFolders(getFolders());
    setSnippets(getSnippets());
  };
  const openFolders = () => { refreshFolders(); setFoldersOpen(true); };
  const handleCreateFolder = () => {
    const f = createFolder(newFolderName);
    if (f) { setNewFolderName(''); setActiveFolderId(f.id); refreshFolders(); }
  };
  const handleSaveSnippet = () => {
    if (!activeFolderId || !code.trim()) return;
    // Auto-name: prefer the loaded problem title, else a language-stamped default.
    const auto = problem?.title
      || (window.__cvDaily?.title)
      || `${lang.toUpperCase()} snippet · ${new Date().toLocaleString()}`;
    const created = addSnippet({ folderId: activeFolderId, title: auto, language: lang, code });
    refreshFolders();
    if (created) {
      toast({ kind:'success', title:'Snippet saved', message:'Saved to folder. Click the pencil icon to rename.' });
    }
  };
  const startRename = (snip) => { setRenamingId(snip.id); setRenameValue(snip.title); };
  const commitRename = () => {
    if (renamingId && renameValue.trim()) renameSnippet(renamingId, renameValue.trim());
    setRenamingId(null); setRenameValue('');
    refreshFolders();
  };

  // ─── LeetCode daily ────────────────────────────────────────
  const loadDaily = async () => {
    setDailyOpen(true); setDailyLoading(true); setDailyError(''); setDaily(null);
    try {
      const r = await fetch('/api/v1/leetcode/daily');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setDaily(await r.json());
    } catch (e) {
      setDailyError(`Could not load LeetCode daily challenge: ${e.message}`);
    } finally {
      setDailyLoading(false);
    }
  };

  // Apply a fetched LeetCode daily payload: pick the current language's
  // boilerplate (falling back to cpp/python/java in order), populate the
  // Problem panel with statement + tags + parsed test cases, and stash daily
  // metadata so Mark Solved can record it.
  const applyDailyToWorkspace = (d) => {
    const langOrder = [lang, 'cpp', 'python', 'java'];
    let chosenLang = lang;
    let boiler = '';
    for (const L of langOrder) {
      if (d.snippets && d.snippets[L]) { chosenLang = L; boiler = d.snippets[L]; break; }
    }
    if (!boiler) boiler = BOILER[chosenLang] || '';
    setLang(chosenLang);
    setCode(boiler);
    setActiveBoiler(boiler);
    // Clear any stale persisted code for this language so the boilerplate we
    // just loaded is the visible state until the user edits.
    try { sessionStorage.setItem(`cv:code:scratch:${chosenLang}`, boiler); } catch {}
    setProblem({
      title: `${d.title} (LeetCode Daily)`,
      difficulty: d.difficulty,
      problem_statement: d.plainContent || '',
      dsa_tags: d.tags || [],
      generated_test_cases: (d.testCases || []).map(tc => ({
        input: tc.input,
        expected_output: tc.expected_output,
        explanation: tc.explanation,
      })),
    });
    setSolutions([]);
    window.__cvDaily = { title: d.title, difficulty: d.difficulty, tags: d.tags, link: d.link };
    setDailyOpen(false);
    toast({
      kind:'success', title:'Daily challenge loaded',
      message:`Boilerplate, description, and ${(d.testCases||[]).length} example test case${(d.testCases||[]).length===1?'':'s'} are now in the workspace.`,
    });
  };

  // ─── Solutions tab actions ─────────────────────────────────
  const loadAp = () => {
    if (ap?.raw_code) {
      setCode(normaliseIndent(ap.raw_code));
      setActiveBoiler(''); // loaded a real solution — no boilerplate to compare against
    }
  };
  const copyCode = () => {
    if (ap?.raw_code) {
      navigator.clipboard.writeText(normaliseIndent(ap.raw_code));
      setCopied(true);
      setTimeout(()=>setCopied(false), 1500);
    }
  };
  const copyOutput = () => {
    navigator.clipboard.writeText(output).then(()=>{
      setOutCopied(true);
      setTimeout(()=>setOutCopied(false), 1500);
    }).catch(()=>{});
  };

  // ─── Render ────────────────────────────────────────────────
  if (fullscreen) {
    return (
      <FullscreenView
        problem={problem} isPractice={isPractice} timer={timer}
        lang={lang} setLang={setLang} code={code} setCode={setCode} setActiveBoiler={setActiveBoiler}
        running={running} runCode={runCode} output={output}
        interactive={interactive} onSendLine={sendStdinLine} onKill={killInteractive}
        exit={()=>setFullscreen(false)}/>
    );
  }

  return (
    <Page>
      <Toolbar
        problem={problem} isPractice={isPractice} timer={timer}
        lang={lang} setLang={setLang} code={code} setCode={setCode} setActiveBoiler={setActiveBoiler}
        stdin={stdin} stdinOpen={stdinOpen} setStdinOpen={setStdinOpen}
        pid={pid} hasUserCode={hasUserCode} solved={solved} markSolved={markSolved}
        running={running} runCode={runCode} interactive={interactive}
        saving={saving} saveToVault={saveToVault}
        loadDaily={loadDaily} openFolders={openFolders}
        moreOpen={moreOpen} setMoreOpen={setMoreOpen}/>

      <SplitH>
        <LeftPane
          rTab={rTab} setRTab={setRTab}
          problem={problem} solutions={solutions}
          solIdx={solIdx} setSolIdx={setSolIdx} apIdx={apIdx} setApIdx={setApIdx}
          copied={copied} copyCode={copyCode} loadAp={loadAp}/>

        <RightStack>
          <EditorPane>
            <div style={{ display:'flex', alignItems:'center', padding:'6px 12px',
              borderBottom:'1px solid var(--cv-border-subtle)', fontSize:'.7rem', fontWeight:600,
              color:'var(--cv-text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>
              <FileCode size={13} style={{ marginRight:6, color:'var(--cv-accent)' }}/> Editor
              <span style={{ flex:1 }}/>
              <Btn style={{ padding:'3px 8px', fontSize:'.66rem' }} onClick={()=>setFullscreen(true)}>
                <Maximize2 size={11}/> Fullscreen
              </Btn>
            </div>
            <div style={{ flex:1, minHeight:0 }}>
              <Editor
                height="100%" language={LANG[lang] || 'plaintext'} theme="vs-dark"
                value={code} onChange={v=>setCode(v || '')}
                options={{
                  minimap: { enabled: false }, fontSize: 14, lineHeight: 22,
                  padding: { top: 8 }, scrollBeyondLastLine: false, wordWrap: 'on',
                  automaticLayout: true, tabSize: 4, renderLineHighlight: 'line',
                  scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
                }}/>
            </div>
          </EditorPane>

          {stdinOpen && (
            <StdinPanel stdin={stdin} setStdin={setStdin} problem={problem}/>
          )}

          <ConsolePanel
            output={output} running={running} metrics={metrics}
            conCollapsed={conCollapsed} setConCollapsed={setConCollapsed}
            outCopied={outCopied} copyOutput={copyOutput}
            interactive={interactive} onSendLine={sendStdinLine} onKill={killInteractive}/>
        </RightStack>
      </SplitH>

      <SaveModal
        open={saveOpen} onClose={()=>setSaveOpen(false)} saving={saving}
        saveStep={saveStep} saveResult={saveResult}
        onRetry={(hint)=>saveToVault(hint)}/>

      <SnippetsModal
        open={foldersOpen} onClose={()=>setFoldersOpen(false)}
        code={code} lang={lang} setLang={setLang} setCode={setCode}
        folders={folders} snippets={snippets}
        activeFolderId={activeFolderId} setActiveFolderId={setActiveFolderId}
        newFolderName={newFolderName} setNewFolderName={setNewFolderName}
        handleCreateFolder={handleCreateFolder}
        deleteFolder={deleteFolder} refreshFolders={refreshFolders}
        handleSaveSnippet={handleSaveSnippet}
        renamingId={renamingId} renameValue={renameValue} setRenameValue={setRenameValue}
        startRename={startRename} commitRename={commitRename} setRenamingId={setRenamingId}
        deleteSnippet={deleteSnippet} confirm={confirm}/>

      <DailyModal
        open={dailyOpen} onClose={()=>setDailyOpen(false)}
        loading={dailyLoading} error={dailyError} daily={daily}
        applyToWorkspace={applyDailyToWorkspace}/>
    </Page>
  );
}
