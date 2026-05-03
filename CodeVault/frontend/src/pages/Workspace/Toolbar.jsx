import {
  Play, Terminal, CheckCircle2, Clock, MoreHorizontal,
  RotateCcw, CalendarDays, Folder, Save,
} from 'lucide-react';
import { TopBar, TimerBadge, Sel, Btn } from './styles';
import { BOILER } from './constants';

/** Top toolbar — language picker, Input/Run/Mark Solved + overflow menu. */
export default function Toolbar({
  problem, isPractice, timer,
  lang, setLang, code, setCode, setActiveBoiler,
  stdin, stdinOpen, setStdinOpen,
  pid, hasUserCode, solved, markSolved,
  running, runCode, interactive,
  saving, saveToVault,
  loadDaily, openFolders,
  moreOpen, setMoreOpen,
}) {
  const onLangChange = (e) => {
    const nl = e.target.value;
    setLang(nl);
    setCode(BOILER[nl] || '');
    setActiveBoiler(BOILER[nl] || '');
  };

  // Daily challenge or saved scratch — Mark Solved is allowed even without
  // a vault problem id when the user has loaded the LC daily.
  const showMarkSolved = pid || (typeof window !== 'undefined' && window.__cvDaily);

  const menuItems = [
    { icon: RotateCcw,    label: 'Reset to boilerplate', onClick: ()=>{ setCode(BOILER[lang] || ''); setActiveBoiler(BOILER[lang] || ''); } },
    { icon: CalendarDays, label: "Load today's LeetCode daily", onClick: loadDaily },
    { icon: Folder,       label: 'Snippets & folders', onClick: openFolders },
    { icon: Save,         label: saving ? 'Saving to vault…' : 'Save to Vault (analyse + test)',
                          onClick: saveToVault, disabled: saving || !code.trim() },
  ];

  return (
    <TopBar>
      <span className="title">{problem?.title || 'Loading...'}</span>
      {problem && <span className={`pill pill--${problem.difficulty?.toLowerCase()}`}>{problem.difficulty}</span>}
      {isPractice && (
        <TimerBadge $warn={timer > 1800}>
          <Clock size={14}/>
          {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
        </TimerBadge>
      )}
      <Sel value={lang} onChange={onLangChange}>
        <option value="cpp">C++</option><option value="python">Python</option><option value="java">Java</option>
      </Sel>
      <Btn onClick={()=>setStdinOpen(o => !o)} title="Provide standard input for the next Run"
        style={stdinOpen ? { background:'var(--cv-accent-muted)', color:'var(--cv-accent)', border:'1px solid var(--cv-border-hover)' } : undefined}>
        <Terminal size={13}/> Input{stdin.trim() ? ` (${stdin.split(/\r?\n/).filter(Boolean).length})` : ''}
      </Btn>
      {showMarkSolved && (
        solved
          ? <Btn style={{ background:'rgba(63,185,80,.12)', color:'#3fb950', border:'1px solid rgba(63,185,80,.25)' }} disabled>
              <CheckCircle2 size={13}/> Solved
            </Btn>
          : <Btn onClick={markSolved} disabled={(pid && !problem) || !hasUserCode}
              title={!hasUserCode ? 'Write your solution before marking solved' : 'Mark this problem as solved'}>
              <CheckCircle2 size={13}/> Mark Solved
            </Btn>
      )}
      <Btn $primary onClick={runCode} disabled={running}
        title="Run interactively — type stdin in the console while the program runs">
        <Play size={13}/> {interactive ? 'Live...' : running ? 'Starting...' : 'Run'}
      </Btn>

      {/* Overflow menu — keeps the toolbar from looking cramped.
          Closes on outside-click via a backdrop, on item-pick via inline handlers. */}
      <div style={{ position:'relative' }}>
        <Btn onClick={()=>setMoreOpen(o => !o)} title="More actions"
          style={moreOpen ? { background:'var(--cv-accent-muted)', color:'var(--cv-accent)', border:'1px solid var(--cv-border-hover)' } : undefined}>
          <MoreHorizontal size={14}/>
        </Btn>
        {moreOpen && (
          <>
            <div onClick={()=>setMoreOpen(false)}
              style={{ position:'fixed', inset:0, zIndex:50, background:'transparent' }}/>
            <div style={{
              position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:60,
              minWidth:220, padding:6, borderRadius:10,
              background:'var(--cv-bg-secondary, #11151d)',
              border:'1px solid var(--cv-border-default)',
              boxShadow:'0 12px 36px rgba(0,0,0,.45)',
            }}>
              {menuItems.map((it, i) => {
                const Icon = it.icon;
                return (
                  <button key={i}
                    disabled={it.disabled}
                    onClick={()=>{ setMoreOpen(false); it.onClick(); }}
                    style={{
                      display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left',
                      padding:'8px 12px', border:'none', background:'transparent',
                      cursor: it.disabled ? 'not-allowed' : 'pointer',
                      borderRadius:7, color: it.disabled ? 'var(--cv-text-muted)' : 'var(--cv-text-secondary)',
                      fontSize:'.82rem', fontFamily:'inherit', fontWeight:500,
                    }}
                    onMouseEnter={e=>{ if (!it.disabled) { e.currentTarget.style.background = 'var(--cv-accent-muted)'; e.currentTarget.style.color = 'var(--cv-text-primary)'; } }}
                    onMouseLeave={e=>{ e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = it.disabled ? 'var(--cv-text-muted)' : 'var(--cv-text-secondary)'; }}>
                    <Icon size={14} style={{ color:'var(--cv-accent)', flexShrink:0 }}/>
                    <span style={{ flex:1 }}>{it.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </TopBar>
  );
}
