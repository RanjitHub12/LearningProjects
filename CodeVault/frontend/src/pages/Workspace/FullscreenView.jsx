import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Clock, Play, Minimize2, Send, Square, RotateCw } from 'lucide-react';
import { FullscreenOverlay, FSToolbar, TimerBadge } from './styles';
import { LANG, BOILER } from './constants';
import { renderConsole } from './utils';

/** Distraction-free fullscreen editor with a right-hand console + live stdin
 *  panel so the user can type runtime input and re-run without leaving the
 *  fullscreen view. */
export default function FullscreenView({
  problem, isPractice, timer,
  lang, setLang, code, setCode, setActiveBoiler,
  running, runCode, output,
  interactive, onSendLine, onKill,
  exit,
}) {
  const conLines = renderConsole(running && !output ? '⏳ Compiling and executing...' : output);
  const [line, setLine] = useState('');
  const inputRef = useRef(null);
  const bodyRef = useRef(null);

  // Persist the side-panel width across fullscreen sessions.
  const [panelW, setPanelW] = useState(() => {
    const saved = parseInt(localStorage.getItem('cv:fs:panelW') || '', 10);
    return Number.isFinite(saved) && saved >= 240 && saved <= 900 ? saved : 380;
  });
  const dragRef = useRef(null);
  useEffect(() => { localStorage.setItem('cv:fs:panelW', String(panelW)); }, [panelW]);

  // Drag-to-resize. We track the active drag in a ref so the move/up
  // listeners (attached to window) can read the latest start values without
  // re-binding on every state change.
  const onDragStart = (e) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: panelW };
    const onMove = (ev) => {
      const d = dragRef.current; if (!d) return;
      const next = Math.min(900, Math.max(240, d.startW + (d.startX - ev.clientX)));
      setPanelW(next);
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    if (interactive) inputRef.current?.focus();
  }, [interactive]);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [output]);

  const submit = (e) => {
    e?.preventDefault();
    if (!interactive) return;
    onSendLine?.(line + '\n');
    setLine('');
  };

  return (
    <FullscreenOverlay>
      <FSToolbar>
        <span className="title">{problem?.title || 'Editor'}</span>
        {isPractice && (
          <TimerBadge $warn={timer > 1800}><Clock size={12}/>
            {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
          </TimerBadge>
        )}
        <select
          value={lang}
          onChange={e=>{
            const nl = e.target.value;
            setLang(nl);
            setCode(BOILER[nl] || '');
            setActiveBoiler(BOILER[nl] || '');
          }}>
          <option value="cpp">C++</option><option value="python">Python</option><option value="java">Java</option>
        </select>
        <button
          className="run-btn"
          onClick={runCode}
          disabled={running}
          title="Run interactively — type stdin in the side panel while it runs">
          <Play size={12}/> {interactive ? 'Live...' : running ? 'Starting...' : 'Run'}
        </button>
        <button className="exit-btn" onClick={exit}><Minimize2 size={12}/> Exit</button>
      </FSToolbar>

      <div style={{ flex:1, minHeight:0, display:'flex' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <Editor
            height="100%"
            language={LANG[lang] || 'plaintext'}
            theme="vs-dark"
            value={code}
            onChange={v=>setCode(v || '')}
            options={{
              minimap: { enabled: true }, fontSize: 15, lineHeight: 24,
              padding: { top: 10 }, scrollBeyondLastLine: false, wordWrap: 'on',
              automaticLayout: true, tabSize: 4, renderLineHighlight: 'line',
            }}/>
        </div>

        {/* Drag handle — grab and pull left/right to resize the side panel */}
        <div onMouseDown={onDragStart}
          title="Drag to resize the input panel"
          style={{ width:5, cursor:'col-resize', background:'#3c3c3c',
            borderLeft:'1px solid #2a2a2a', borderRight:'1px solid #2a2a2a',
            flexShrink:0 }}
          onMouseEnter={e=>{ e.currentTarget.style.background = '#6366f1'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background = '#3c3c3c'; }}/>

        {/* Right-hand console + runtime stdin panel */}
        <aside style={{ width:panelW, flexShrink:0,
          background:'#11151d', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
            borderBottom:'1px solid #3c3c3c', fontSize:'.7rem', fontWeight:700,
            color:'#c9d1d9', letterSpacing:'.04em', textTransform:'uppercase' }}>
            <span style={{ width:7, height:7, borderRadius:'50%',
              background: interactive ? '#3fb950' : running ? '#d29922' : '#484f58' }}/>
            <span>{interactive ? 'Live · running' : running ? 'Starting…' : 'Console'}</span>
            <span style={{ flex:1 }}/>
            <button onClick={runCode} disabled={running}
              title="Run again with the same code"
              style={{ background:'#2d2d2d', border:'1px solid #3c3c3c', color:'#c9d1d9',
                padding:'4px 9px', borderRadius:6, fontFamily:'inherit', fontSize:'.7rem',
                fontWeight:600, cursor: running ? 'not-allowed' : 'pointer',
                opacity: running ? .5 : 1, display:'flex', alignItems:'center', gap:4 }}>
              <RotateCw size={11}/> Re-run
            </button>
          </div>

          <div ref={bodyRef} style={{ flex:1, overflow:'auto', padding:'10px 14px',
            fontFamily:'var(--cv-font-mono)', fontSize:'.78rem', lineHeight:1.6,
            color:'#c9d1d9', background:'#0d1117', whiteSpace:'pre-wrap',
            wordBreak:'break-word' }}>
            {output || running
              ? conLines.map(l => (
                  <div key={l.key} className={l.cls || undefined}
                    style={l.cls === 'err' ? { color:'#f85149' }
                      : l.cls === 'warn' ? { color:'#d29922' }
                      : l.cls === 'info' ? { color:'#58a6ff' }
                      : l.cls === 'dim' ? { color:'#484f58' } : undefined}>
                    {l.text}
                  </div>
                ))
              : <div style={{ color:'#484f58' }}>Click Run to start. Type input below while the program runs.</div>}
          </div>

          <form onSubmit={submit} style={{ display:'flex', alignItems:'center', gap:8,
            padding:'8px 10px', borderTop:'1px solid #3c3c3c', background:'#0d1117' }}>
            <span style={{ color: interactive ? '#3fb950' : '#484f58',
              fontFamily:'var(--cv-font-mono)', fontSize:'.78rem' }}>stdin ›</span>
            <input
              ref={inputRef}
              value={line}
              onChange={e=>setLine(e.target.value)}
              disabled={!interactive}
              placeholder={interactive ? 'Type a line and press Enter' : 'Run the program to enable input'}
              autoComplete="off" spellCheck={false}
              style={{ flex:1, background:'transparent', border:'none', outline:'none',
                color:'#c9d1d9', fontFamily:'var(--cv-font-mono)', fontSize:'.8rem',
                padding:'2px 0' }}/>
            <button type="submit" disabled={!interactive}
              title="Send line (Enter)"
              style={{ background:'transparent', border:'1px solid rgba(255,255,255,.12)',
                color: interactive ? '#c9d1d9' : '#484f58', padding:'3px 9px',
                borderRadius:6, fontFamily:'inherit', fontSize:'.7rem', fontWeight:600,
                cursor: interactive ? 'pointer' : 'not-allowed', display:'flex',
                alignItems:'center', gap:4 }}>
              <Send size={11}/> Send
            </button>
            <button type="button" onClick={onKill} disabled={!interactive}
              title="Terminate process"
              style={{ background:'transparent',
                border:'1px solid rgba(248,81,73,.25)',
                color: interactive ? '#f85149' : '#5c2a2a',
                padding:'3px 9px', borderRadius:6, fontFamily:'inherit', fontSize:'.7rem',
                fontWeight:600, cursor: interactive ? 'pointer' : 'not-allowed',
                display:'flex', alignItems:'center', gap:4 }}>
              <Square size={10}/> Stop
            </button>
          </form>
        </aside>
      </div>
    </FullscreenOverlay>
  );
}
