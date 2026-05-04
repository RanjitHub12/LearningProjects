import {
  Play, CheckCircle2, Clock, MoreHorizontal,
  RotateCcw, CalendarDays, Save, FolderTree,
} from 'lucide-react';
import { TopBar, TimerBadge, Sel, Btn } from './styles';
import { BOILER } from './constants';

/** Top toolbar — language picker, destination folder, Run / Save / Mark Solved + overflow menu. */
export default function Toolbar({
  problem, isPractice, timer,
  lang, setLang, code, setCode, setActiveBoiler,
  pid, hasUserCode, solved, markSolved,
  running, runCode, interactive,
  saving, saveToVault,
  loadDaily,
  folderOptions, destFolderId, setDestFolderId, openFolderPicker,
  moreOpen, setMoreOpen,
}) {
  const onLangChange = (e) => {
    const nl = e.target.value;
    setLang(nl);
    setCode(BOILER[nl] || '');
    setActiveBoiler(BOILER[nl] || '');
  };

  // Mark Solved only applies to problems that already exist in the vault —
  // unsaved scratch / freshly-loaded daily challenges have to be Saved first.
  const showMarkSolved = !!pid;

  const menuItems = [
    { icon: RotateCcw,    label: 'Reset to boilerplate', onClick: ()=>{ setCode(BOILER[lang] || ''); setActiveBoiler(BOILER[lang] || ''); } },
    { icon: CalendarDays, label: "Load today's LeetCode daily", onClick: loadDaily },
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
      <Sel value={destFolderId || ''} onChange={e=>setDestFolderId(e.target.value || null)}
        title="Folder to save into when you click Save"
        style={destFolderId ? {
          borderColor:'var(--cv-border-hover)', color:'var(--cv-accent)',
          background:'var(--cv-accent-muted)', fontWeight:600,
        } : undefined}>
        <option value="">— Save to folder —</option>
        {folderOptions.map(f => (
          <option key={f.id} value={f.id}>{f.path}</option>
        ))}
      </Sel>
      <Btn onClick={openFolderPicker}
        title="Browse folders, create new ones, or pick a subfolder"
        style={{ padding:'6px 10px' }}>
        <FolderTree size={13}/> Browse
      </Btn>
      <Btn onClick={()=>saveToVault()} disabled={saving || !code.trim() || !destFolderId}
        title={!destFolderId ? 'Pick a destination folder first' : 'Save to folder + create vault reference (AI fills title, description, analysis)'}
        style={!destFolderId || saving || !code.trim() ? undefined : {
          background:'var(--cv-gradient-primary)', color:'#fff', border:'none',
        }}>
        <Save size={13}/> {saving ? 'Saving…' : 'Save'}
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
