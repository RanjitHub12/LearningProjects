import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { FileCode, Maximize2 } from 'lucide-react';

import { recordSolve, isSolved as activityIsSolved } from '../../lib/activity';
import { getFolders, addSnippet } from '../../lib/folders';
import { useToast } from '../../components/Toast';

import { Page, SplitH, RightStack, EditorPane, Btn } from './styles';
import { LANG, BOILER } from './constants';
import { normaliseIndent } from './utils';

import Toolbar from './Toolbar';
import LeftPane from './LeftPane';
import ConsolePanel from './ConsolePanel';
import FullscreenView from './FullscreenView';
import SaveModal from './SaveModal';
import DailyModal from './DailyModal';
import FolderPickerModal from './FolderPickerModal';

export default function Workspace() {
  const { toast } = useToast();
  const [params] = useSearchParams();
  const pid = params.get('id');
  const snippetId = params.get('snippet');
  // Folders → "New File" hands the destination folder over via this param.
  const newInFolderId = params.get('newIn');
  const isPractice = params.get('practice') === 'true';

  // ─── Core editor state ─────────────────────────────────────
  const [problem, setProblem] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('cpp');
  // Console output is a list of typed segments so we can render user input
  // ('in') visually distinct from program output ('out'/'err') and system
  // notices ('sys'). Joined into plain text only when copying to clipboard.
  const [output, setOutput] = useState([]);
  const appendOut = (kind, text) => setOutput(o => [...o, { kind, text }]);
  const [metrics, setMetrics] = useState(null);
  const [running, setRunning] = useState(false);
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
  const [saveStep, setSaveStep] = useState(''); // 'analyze' | 'dedup' | 'save' | ''
  const [saveResult, setSaveResult] = useState(null);
  const [saving, setSaving] = useState(false);

  // ─── Solve tracking ────────────────────────────────────────
  const [solved, setSolved] = useState(false);

  // ─── Destination folder for Save ───────────────────────────
  // Save writes a snippet into this folder AND a vault problem reference.
  const [folders, setFolders] = useState([]);
  const [destFolderId, setDestFolderId] = useState(newInFolderId || null);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  useEffect(() => {
    setFolders(getFolders());
    const onChange = () => setFolders(getFolders());
    window.addEventListener('cv:folders-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('cv:folders-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  // Flatten folders into "Year / May / Hard / Graphs" rows for the picker.
  const folderOptions = useMemo(() => {
    const byId = Object.fromEntries(folders.map(f => [f.id, f]));
    const path = (f) => {
      const segs = [];
      let cur = f;
      while (cur) { segs.unshift(cur.name); cur = cur.parentId ? byId[cur.parentId] : null; }
      return segs.join(' / ');
    };
    return folders
      .map(f => ({ id: f.id, path: path(f) }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [folders]);

  // If the user arrived from Folders → New File but the folder no longer
  // exists, drop the stale id so the picker shows the placeholder.
  useEffect(() => {
    if (destFolderId && !folders.some(f => f.id === destFolderId)) setDestFolderId(null);
  }, [folders, destFolderId]);

  // ─── LeetCode daily ────────────────────────────────────────
  const [dailyOpen, setDailyOpen] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [daily, setDaily] = useState(null);
  const [dailyError, setDailyError] = useState('');

  // The boilerplate currently considered "untouched" — set whenever we seed
  // the editor with LeetCode/local boilerplate so the Mark Solved gate can
  // tell user-written code apart from the unchanged stub.
  const [activeBoiler, setActiveBoiler] = useState('');

  // "More" menu — keeps the toolbar uncluttered. Reset + Daily live here so
  // only Run / Save / Mark Solved stay visible up top.
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

  // ─── Persist editor to localStorage ────────────────────────
  // Keyed by problem id when available, else by language. localStorage so
  // the draft survives tab switches, navigation away, and browser restart.
  // The Reset-to-boilerplate menu item is the only way to wipe it.
  const codeKey = pid ? `cv:code:${pid}:${lang}` : `cv:code:scratch:${lang}`;
  useEffect(() => {
    const saved = localStorage.getItem(codeKey);
    if (saved !== null) setCode(saved);
  }, [codeKey]);
  useEffect(() => {
    if (code !== undefined) localStorage.setItem(codeKey, code);
  }, [code, codeKey]);

  // ─── Load vault problem / saved snippet ────────────────────
  useEffect(() => {
    if (!pid) return;
    fetch(`/api/v1/problems/${pid}`).then(r=>r.ok ? r.json() : null).then(d=>{
      if (d) {
        setProblem(d);
        setSolutions(d.solutions || []);
        // Only seed boilerplate when there's no persisted code for this problem+lang.
        if (localStorage.getItem(codeKey) === null) {
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
  const runInteractive = () => {
    if (running || interactive) return;
    setOutput([]); setMetrics(null); setConCollapsed(false); setRunning(true);
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/api/v1/execute/ws`);
    wsRef.current = ws;
    let startedAt = 0;

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
        appendOut('sys', '▸ Process started — type below and press Enter.\n');
      } else if (m.type === 'stdout') {
        appendOut('out', m.data);
      } else if (m.type === 'stderr') {
        appendOut('err', m.data);
      } else if (m.type === 'compile_error') {
        appendOut('err', `[ERROR] Compilation failed\n${m.data}`);
      } else if (m.type === 'error') {
        appendOut('err', `[ERROR] ${m.data}\n`);
      } else if (m.type === 'exit') {
        const ms = m.ms || (startedAt ? performance.now() - startedAt : 0);
        appendOut('sys', `\n▸ Process exited (code ${m.code}) in ${ms.toFixed(1)}ms\n`);
        setMetrics({ execution_ms: ms, memory_kb: 0, passed: m.code === 0 });
        setInteractive(false); setRunning(false);
        try { ws.close(); } catch {}
      }
    };
    ws.onerror = () => {
      appendOut('err', '[ERROR] WebSocket error\n');
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
    // Echo locally as an 'in' segment so it renders on its own visual track,
    // separate from program stdout / stderr.
    appendOut('in', text);
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

  // saveToVault accepts an options bag:
  //   - hint:   extra free-text passed to the AI when it failed to infer.
  //   - manual: { title, statement, difficulty, tags } — when present we
  //             skip the AI on the backend and persist these values directly.
  //             Used by the SaveModal's "Add details manually" form.
  const saveToVault = async (opts = {}) => {
    const { hint = '', manual = null } = opts;
    if (!code.trim() || saving) return;
    if (!destFolderId) {
      toast({ kind:'warn', title:'Pick a folder', message:'Choose a destination folder before saving.' });
      return;
    }
    setSaveOpen(true); setSaving(true); setSaveResult(null);
    setSaveStep('analyze');
    try {
      // Backend runs analyze → dedup → save sequentially. We animate the
      // visible step while we wait so the user sees progress.
      const stepTimers = manual ? [
        setTimeout(()=>setSaveStep('dedup'), 250),
        setTimeout(()=>setSaveStep('save'), 600),
      ] : [
        setTimeout(()=>setSaveStep('dedup'), 1800),
        setTimeout(()=>setSaveStep('save'), 2600),
      ];
      // Forward whatever metadata the workspace already knows about — for
      // a LeetCode daily or a vault problem, this gives the AI the title +
      // statement + sample test cases so it doesn't have to re-derive them
      // from a bare function. The backend trusts these over its own guesses.
      // When `manual` is set, these fields ARE the persisted values.
      const ctxTests = (problem?.generated_test_cases || []).map(tc => ({
        input: typeof tc.input === 'string' ? tc.input : String(tc.input ?? ''),
        expected_output: typeof tc.expected_output === 'string'
          ? tc.expected_output : String(tc.expected_output ?? ''),
      }));
      // Strip the "(LeetCode Daily)" suffix we add for display so the saved
      // title matches the canonical problem name.
      const ctxTitle = manual?.title
        ?? (problem?.title || '').replace(/\s*\(LeetCode Daily\)\s*$/i, '').trim();
      const ctxStatement = manual?.statement ?? (problem?.problem_statement || '');
      const ctxTagsArr = manual?.tags ?? (problem?.dsa_tags || []);
      const ctxDifficulty = manual?.difficulty ?? (problem?.difficulty || '');
      const r = await fetch('/api/v1/upload/save-from-workspace', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          code, language: lang, hint,
          context_title: ctxTitle,
          context_statement: ctxStatement,
          context_tags: ctxTagsArr,
          context_difficulty: ctxDifficulty,
          context_test_cases: ctxTests,
          manual: !!manual,
        }),
      });
      stepTimers.forEach(clearTimeout);
      const d = await r.json();
      setSaveResult(d);
      setSaveStep('');

      // On a clean save OR a duplicate (same vault problem already exists),
      // also drop a snippet into the chosen folder so the folder view shows
      // it and the Problem Vault picks it up via the cv:snippets index.
      const linkedVaultId = d?.problem_id || d?.duplicate_of_id || '';
      const linkedTitle = d?.title || d?.duplicate_of_title || 'Untitled';
      if ((d?.status === 'saved' || d?.status === 'duplicate') && destFolderId) {
        try {
          addSnippet({
            folderId: destFolderId,
            title: linkedTitle,
            language: lang,
            code,
            description: d?.problem_statement || '',
            difficulty: d?.difficulty || '',
            tags: d?.dsa_tags || [],
            vaultProblemId: linkedVaultId || undefined,
          });
        } catch {}
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

  // Mark Solved is only meaningful for problems that already live in the
  // vault — i.e. ones that have been Save'd into a folder. Unsaved daily
  // challenges and scratch code can't be marked solved; the user must Save
  // first (which auto-records the solve as part of the pipeline).
  const markSolved = () => {
    if (!problem || !pid) {
      toast({
        kind: 'warn',
        title: 'Save first',
        message: 'Pick a destination folder and click Save before marking this as solved.',
      });
      return;
    }
    recordSolve({
      problemId: pid,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.dsa_tags || [],
      source: 'vault',
    });
    setSolved(true);
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
    try { localStorage.setItem(`cv:code:scratch:${chosenLang}`, boiler); } catch {}
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
    const text = output.map(s => s.text).join('');
    navigator.clipboard.writeText(text).then(()=>{
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
        pid={pid} hasUserCode={hasUserCode} solved={solved} markSolved={markSolved}
        running={running} runCode={runCode} interactive={interactive}
        saving={saving} saveToVault={saveToVault}
        loadDaily={loadDaily}
        folderOptions={folderOptions} destFolderId={destFolderId} setDestFolderId={setDestFolderId}
        openFolderPicker={()=>setFolderPickerOpen(true)}
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
        onRetryHint={(hint)=>saveToVault({ hint })}
        onSaveManual={(manual)=>saveToVault({ manual })}/>

      <DailyModal
        open={dailyOpen} onClose={()=>setDailyOpen(false)}
        loading={dailyLoading} error={dailyError} daily={daily}
        applyToWorkspace={applyDailyToWorkspace}/>

      <FolderPickerModal
        open={folderPickerOpen} onClose={()=>setFolderPickerOpen(false)}
        currentId={destFolderId}
        onPick={(id)=>setDestFolderId(id)}/>
    </Page>
  );
}
