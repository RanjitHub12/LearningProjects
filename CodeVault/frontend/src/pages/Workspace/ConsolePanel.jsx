import { useState, useRef, useEffect } from 'react';
import {
  ChevronUp, ChevronDown, Copy, Check, Clock, HardDrive, Send, Square,
} from 'lucide-react';
import { ConsolePane, ConsoleHead, ConBody, MetRow, StdinBar } from './styles';
import { renderConsole } from './utils';

export default function ConsolePanel({
  output, running, metrics, conCollapsed, setConCollapsed,
  outCopied, copyOutput,
  interactive, onSendLine, onKill,
}) {
  const cStatus = metrics ? (metrics.passed ? 'pass' : 'fail') : (running ? 'running' : 'idle');
  const showSpinner = running && !interactive && !output;
  const lines = renderConsole(showSpinner ? '⏳ Compiling and executing...' : output);

  const [line, setLine] = useState('');
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  useEffect(() => {
    if (interactive && !conCollapsed) inputRef.current?.focus();
  }, [interactive, conCollapsed]);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [output]);

  const submitLine = (e) => {
    e?.preventDefault();
    if (!interactive) return;
    onSendLine?.(line + '\n');
    setLine('');
  };

  return (
    <ConsolePane $collapsed={conCollapsed}>
      <ConsoleHead $collapsed={conCollapsed} $c={cStatus} onClick={()=>setConCollapsed(!conCollapsed)}>
        <span className="dot"/>
        <span>{interactive ? 'Interactive · running' : running ? 'Executing...' : metrics ? (metrics.passed ? 'Accepted' : 'Wrong Answer / Error') : 'Console'}</span>
        <span className="spacer"/>
        {metrics && (
          <span style={{ fontSize:'.68rem', color: metrics.passed ? '#3fb950' : '#f85149', marginRight:8 }}>
            {metrics.execution_ms?.toFixed(1)}ms
          </span>
        )}
        {output && (
          <button
            onClick={e=>{ e.stopPropagation(); copyOutput(); }}
            title="Copy entire console output"
            style={{ background:'none', border:'none', cursor:'pointer', color:'#8b949e',
              padding:'2px 6px', display:'flex', alignItems:'center', gap:4, borderRadius:5,
              fontSize:'.66rem', fontFamily:'inherit', marginRight:6 }}>
            {outCopied ? <><Check size={11} style={{ color:'#3fb950' }}/> Copied</> : <><Copy size={11}/> Copy</>}
          </button>
        )}
        {conCollapsed ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </ConsoleHead>
      {!conCollapsed && (
        <>
          <ConBody ref={bodyRef}>
            {lines.map(l => <div key={l.key} className={l.cls || undefined}>{l.text}</div>)}
          </ConBody>
          {interactive && (
            <StdinBar onSubmit={submitLine}>
              <span className="prompt">stdin ›</span>
              <input
                ref={inputRef}
                value={line}
                onChange={e=>setLine(e.target.value)}
                placeholder="Type input and press Enter to send a line"
                autoComplete="off"
                spellCheck={false}/>
              <button type="submit" title="Send line (Enter)"><Send size={11}/> Send</button>
              <button type="button" className="kill" onClick={onKill} title="Terminate process"><Square size={10}/> Stop</button>
            </StdinBar>
          )}
          {metrics && (
            <MetRow>
              <span><Clock size={10}/> {metrics.execution_ms?.toFixed(1) || '—'}ms</span>
              <span><HardDrive size={10}/> {metrics.memory_kb?.toFixed(0) || '—'}KB</span>
              <span className={metrics.passed ? 'pass' : 'fail'}>
                {metrics.passed ? '✓ Exit 0' : '✗ Non-zero exit'}
              </span>
            </MetRow>
          )}
        </>
      )}
    </ConsolePane>
  );
}
