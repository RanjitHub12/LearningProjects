import styled from 'styled-components';

/* ═══ Layout ══════════════════════════════════════════════════ */
export const Page = styled.div`animation:fadeIn .4s ease;display:flex;flex-direction:column;height:calc(100vh - 64px);`;

export const TopBar = styled.div`display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;
  .title{font-size:1.05rem;font-weight:700;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}`;

export const TimerBadge = styled.div`
  display:flex;align-items:center;gap:6px;padding:5px 14px;border-radius:8px;
  font-family:var(--cv-font-mono);font-size:.85rem;font-weight:700;
  background:${p=>p.$warn?'rgba(239,68,68,.12)':'rgba(99,102,241,.1)'};
  color:${p=>p.$warn?'#f85149':'var(--cv-accent)'};
  border:1px solid ${p=>p.$warn?'rgba(239,68,68,.2)':'rgba(99,102,241,.15)'};
  ${p=>p.$warn?'animation:pulse 1s infinite;':''}
  svg{width:14px;height:14px;}`;

export const Btn = styled.button`padding:6px 14px;border-radius:8px;border:none;cursor:pointer;
  font-family:inherit;font-size:.78rem;font-weight:600;display:flex;align-items:center;gap:5px;transition:all .15s;
  ${p=>p.$primary?`background:var(--cv-gradient-primary);color:#fff;&:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(99,102,241,.3);}&:disabled{opacity:.5;cursor:not-allowed;}`
  :p.$danger?`background:rgba(239,68,68,.1);color:#ef4444;&:hover{background:rgba(239,68,68,.2);}`
  :`background:var(--cv-glass-bg);color:var(--cv-text-secondary);border:1px solid var(--cv-border-subtle);&:hover{border-color:var(--cv-border-hover);}`}`;

export const Sel = styled.select`padding:6px 10px;border-radius:8px;font-family:inherit;font-size:.78rem;
  background:var(--cv-glass-bg);border:1px solid var(--cv-border-subtle);color:var(--cv-text-primary);outline:none;cursor:pointer;`;

/* LeetCode-style 2-column: Left=Problem, Right=Editor+Console stacked */
export const SplitH = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1;min-height:0;
  @media(max-width:900px){grid-template-columns:1fr;}`;

export const FullscreenOverlay = styled.div`
  position:fixed;top:0;left:0;right:0;bottom:0;z-index:100;background:#1e1e1e;
  display:flex;flex-direction:column;animation:fadeIn .2s ease;`;

export const FSToolbar = styled.div`
  display:flex;align-items:center;gap:8px;padding:8px 16px;
  background:#252526;border-bottom:1px solid #3c3c3c;
  .title{flex:1;font-size:.82rem;font-weight:600;color:#ccc;}
  button{padding:5px 12px;border-radius:6px;border:none;cursor:pointer;
    font-family:inherit;font-size:.76rem;font-weight:600;display:flex;align-items:center;gap:5px;transition:all .15s;}
  .run-btn{background:#6366f1;color:#fff;&:hover{background:#5457e5;}}
  .exit-btn{background:#3c3c3c;color:#aaa;&:hover{background:#4c4c4c;color:#fff;}}
  select{padding:5px 8px;border-radius:6px;border:1px solid #3c3c3c;background:#2d2d2d;color:#ccc;font-family:inherit;font-size:.76rem;}`;

export const Pane = styled.div`display:flex;flex-direction:column;min-height:0;
  background:var(--cv-glass-bg);backdrop-filter:blur(20px);border:1px solid var(--cv-border-subtle);border-radius:14px;overflow:hidden;`;

export const Tabs = styled.div`display:flex;border-bottom:1px solid var(--cv-border-subtle);flex-shrink:0;`;

export const Tab = styled.button`padding:7px 14px;border:none;cursor:pointer;font-family:inherit;font-size:.76rem;font-weight:600;
  background:transparent;color:${p=>p.$active?'var(--cv-accent)':'var(--cv-text-muted)'};
  border-bottom:2px solid ${p=>p.$active?'var(--cv-accent)':'transparent'};transition:all .15s;&:hover{color:var(--cv-accent);}`;

export const Empty = styled.div`flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  color:var(--cv-text-muted);font-size:.84rem;text-align:center;padding:20px;
  svg{width:28px;height:28px;margin-bottom:10px;opacity:.3;}`;

/* Right pane: Editor top + Console bottom (stacked vertically) */
export const RightStack = styled.div`display:flex;flex-direction:column;gap:10px;min-height:0;`;
export const EditorPane = styled(Pane)`flex:1;min-height:200px;`;
export const ConsolePane = styled(Pane)`height:${p=>p.$collapsed?'36px':'180px'};transition:height .2s ease;flex-shrink:0;`;

export const ConsoleHead = styled.div`display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;user-select:none;
  border-bottom:${p=>p.$collapsed?'none':'1px solid rgba(255,255,255,.06)'};font-size:.7rem;font-weight:600;color:#8b949e;
  .dot{width:7px;height:7px;border-radius:50%;background:${p=>p.$c==='pass'?'#3fb950':p.$c==='fail'?'#f85149':'#484f58'};}
  .spacer{flex:1;} svg{width:14px;height:14px;color:#8b949e;}`;

export const ConBody = styled.pre`flex:1;margin:0;padding:10px 14px;overflow:auto;font-family:var(--cv-font-mono);font-size:.8rem;
  line-height:1.6;color:#c9d1d9;white-space:pre-wrap;word-break:break-word;background:#0d1117;
  .err{color:#f85149;} .warn{color:#d29922;} .info{color:#58a6ff;} .dim{color:#484f58;}
  .in{color:#3fb950;background:rgba(63,185,80,.06);border-left:2px solid rgba(63,185,80,.45);
    padding-left:8px;margin-left:-10px;}
  .in .prompt{color:#3fb950;font-weight:700;opacity:.8;}`;

export const MetRow = styled.div`display:flex;gap:12px;padding:6px 12px;border-top:1px solid rgba(255,255,255,.06);
  font-size:.7rem;color:#8b949e;font-family:var(--cv-font-mono);background:#0d1117;
  span{display:flex;align-items:center;gap:3px;} .pass{color:#3fb950;} .fail{color:#f85149;}`;

export const StdinBar = styled.form`display:flex;align-items:center;gap:8px;padding:7px 10px;
  border-top:1px solid rgba(255,255,255,.08);background:#0d1117;
  .prompt{font-family:var(--cv-font-mono);font-size:.78rem;color:#3fb950;flex-shrink:0;}
  input{flex:1;background:transparent;border:none;outline:none;color:#c9d1d9;
    font-family:var(--cv-font-mono);font-size:.8rem;padding:2px 0;}
  input::placeholder{color:#484f58;}
  button{background:transparent;border:1px solid rgba(255,255,255,.12);color:#8b949e;
    padding:3px 9px;border-radius:6px;font-family:inherit;font-size:.7rem;font-weight:600;cursor:pointer;
    display:flex;align-items:center;gap:4px;}
  button:hover{border-color:rgba(255,255,255,.25);color:#c9d1d9;}
  button.kill{color:#f85149;border-color:rgba(248,81,73,.25);}
  button.kill:hover{background:rgba(248,81,73,.1);}`;

/* Solutions tab components */
export const ApBar = styled.div`display:flex;gap:5px;flex-wrap:wrap;padding:8px 12px;border-bottom:1px solid var(--cv-border-subtle);`;

export const ApBtn = styled.button`padding:4px 12px;border-radius:999px;border:none;cursor:pointer;font-family:inherit;font-size:.72rem;font-weight:600;transition:all .2s;
  background:${p=>p.$active?'var(--cv-accent)':'var(--cv-bg-tertiary)'};color:${p=>p.$active?'#fff':'var(--cv-text-secondary)'};
  border:1px solid ${p=>p.$active?'var(--cv-accent)':'var(--cv-border-default)'};&:hover{border-color:var(--cv-accent);}`;

export const CxRow = styled.div`display:flex;gap:10px;padding:7px 12px;align-items:center;border-bottom:1px solid var(--cv-border-subtle);font-size:.72rem;color:var(--cv-text-muted);
  .badge{display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:var(--cv-bg-tertiary);font-family:var(--cv-font-mono);color:var(--cv-accent);font-weight:600;}`;

export const ExplBox = styled.div`padding:10px 12px;border-top:1px solid var(--cv-border-subtle);font-size:.8rem;color:var(--cv-text-secondary);line-height:1.6;background:var(--cv-bg-tertiary);
  .lbl{font-size:.66rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--cv-text-muted);margin-bottom:3px;}`;

/* Analysis tab */
export const Sec = styled.div`padding:12px 16px;border-bottom:1px solid var(--cv-border-subtle);&:last-child{border-bottom:none;}
  .st{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--cv-accent);margin-bottom:7px;display:flex;align-items:center;gap:5px;svg{width:13px;height:13px;}}`;

export const IL = styled.ul`list-style:none;padding:0;margin:0;li{padding:4px 0;font-size:.82rem;color:var(--cv-text-secondary);display:flex;align-items:flex-start;gap:7px;
  &::before{content:'→';color:var(--cv-accent);font-weight:700;flex-shrink:0;}}`;

export const LBI = styled.div`padding:6px 10px;border-radius:7px;margin-bottom:4px;background:var(--cv-bg-tertiary);border:1px solid var(--cv-border-subtle);
  .cl{font-family:var(--cv-font-mono);font-size:.75rem;color:var(--cv-accent-light);margin-bottom:2px;white-space:pre-wrap;}
  .ex{font-size:.75rem;color:var(--cv-text-muted);line-height:1.5;}`;

export const PC = styled.div`flex:1;padding:16px;overflow-y:auto;font-size:.85rem;line-height:1.7;color:var(--cv-text-secondary);
  h3{color:var(--cv-text-primary);margin-bottom:6px;} h4{color:var(--cv-text-primary);margin:10px 0 5px;font-size:.88rem;}
  p{margin-bottom:6px;} code{font-family:var(--cv-font-mono);font-size:.8rem;background:var(--cv-bg-tertiary);padding:1px 5px;border-radius:4px;}`;

/* Save-to-Vault modal */
export const Backdrop = styled.div`position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:200;
  display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .15s ease;`;

export const Modal = styled.div`width:min(640px,100%);max-height:90vh;display:flex;flex-direction:column;
  background:var(--cv-bg-secondary,#11151d);border:1px solid var(--cv-border-default);border-radius:14px;overflow:hidden;
  box-shadow:0 20px 60px rgba(0,0,0,.5);`;

export const MHead = styled.div`display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--cv-border-subtle);
  .t{font-size:1rem;font-weight:700;color:var(--cv-text-primary);flex:1;}
  button{background:none;border:none;cursor:pointer;color:var(--cv-text-muted);padding:4px;border-radius:6px;
    display:flex;align-items:center;justify-content:center;&:hover{background:var(--cv-bg-tertiary);color:var(--cv-text-primary);}}`;

export const MBody = styled.div`padding:14px 18px;overflow-y:auto;flex:1;`;

export const Step = styled.div`display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;margin-bottom:6px;
  background:var(--cv-bg-tertiary);border:1px solid var(--cv-border-subtle);font-size:.85rem;
  color:${p=>p.$state==='done'?'var(--cv-success,#3fb950)':p.$state==='fail'?'#f85149':p.$state==='active'?'var(--cv-accent)':'var(--cv-text-muted)'};
  .lbl{flex:1;color:var(--cv-text-secondary);font-weight:500;}
  svg{width:16px;height:16px;flex-shrink:0;${p=>p.$state==='active'?'animation:spin 1s linear infinite;':''}}
  @keyframes spin{to{transform:rotate(360deg);}}`;

export const TestList = styled.div`margin-top:10px;display:flex;flex-direction:column;gap:5px;`;

export const TestRow = styled.div`padding:8px 10px;border-radius:8px;font-size:.76rem;font-family:var(--cv-font-mono);
  background:${p=>p.$pass?'rgba(63,185,80,.06)':'rgba(248,81,73,.06)'};
  border:1px solid ${p=>p.$pass?'rgba(63,185,80,.2)':'rgba(248,81,73,.25)'};
  color:var(--cv-text-secondary);
  .head{display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:3px;
    color:${p=>p.$pass?'#3fb950':'#f85149'};}
  .row{display:flex;gap:6px;line-height:1.5;} .lbl{color:var(--cv-text-muted);min-width:60px;}
  pre{margin:0;white-space:pre-wrap;word-break:break-word;color:var(--cv-text-primary);}`;

export const Banner = styled.div`padding:11px 13px;border-radius:9px;margin-bottom:12px;font-size:.85rem;
  display:flex;align-items:flex-start;gap:9px;line-height:1.5;
  background:${p=>p.$kind==='success'?'rgba(63,185,80,.08)':p.$kind==='warn'?'rgba(245,158,11,.08)':'rgba(248,81,73,.08)'};
  border:1px solid ${p=>p.$kind==='success'?'rgba(63,185,80,.25)':p.$kind==='warn'?'rgba(245,158,11,.25)':'rgba(248,81,73,.25)'};
  color:${p=>p.$kind==='success'?'#3fb950':p.$kind==='warn'?'var(--cv-warning)':'#f85149'};
  svg{width:18px;height:18px;flex-shrink:0;margin-top:1px;} .msg{flex:1;color:var(--cv-text-primary);}`;

export const MFoot = styled.div`display:flex;gap:8px;padding:12px 18px;border-top:1px solid var(--cv-border-subtle);justify-content:flex-end;`;

export const MetaBox = styled.div`padding:10px 12px;background:var(--cv-bg-tertiary);border:1px solid var(--cv-border-subtle);
  border-radius:9px;margin-bottom:10px;font-size:.8rem;
  .row{display:flex;gap:8px;margin-bottom:4px;} .lbl{color:var(--cv-text-muted);min-width:80px;font-weight:600;}
  .val{color:var(--cv-text-primary);flex:1;} .tags{display:flex;gap:4px;flex-wrap:wrap;}`;
