/**
 * Centered modal-style toast + confirm system.
 *
 * Replaces native `alert()` / `confirm()` with on-brand dialogs that match the
 * app's glass/dark surface. Exposes a hook so any component can call:
 *   const { toast, confirm } = useToast();
 *   toast({ kind:'success', title:'Saved', message:'...' });
 *   const ok = await confirm({ title:'Delete?', message:'...', danger:true });
 */
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const fadeIn = keyframes`from{opacity:0;transform:translateY(6px) scale(.98);}to{opacity:1;transform:translateY(0) scale(1);}`;

const Backdrop = styled.div`
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
  animation: ${fadeIn} .15s ease;
`;
const Card = styled.div`
  width: min(440px, 100%);
  background: var(--cv-bg-secondary, #11151d);
  border: 1px solid var(--cv-border-default);
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.55);
  animation: ${fadeIn} .18s ease;
`;
const Head = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; border-bottom: 1px solid var(--cv-border-subtle);
  .icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center;
    background: ${p => p.$kind==='success' ? 'rgba(34,197,94,.15)'
                    : p.$kind==='error'   ? 'rgba(239,68,68,.15)'
                    : p.$kind==='warn'    ? 'rgba(245,158,11,.15)'
                    : 'var(--cv-accent-muted)'};
    color: ${p => p.$kind==='success' ? '#22c55e'
                : p.$kind==='error'   ? '#ef4444'
                : p.$kind==='warn'    ? '#f59e0b'
                : 'var(--cv-accent)'};
    flex-shrink: 0;
  }
  .t { flex:1; font-size: 1rem; font-weight: 700; color: var(--cv-text-primary); }
  button { background:none; border:none; cursor:pointer; padding:4px; border-radius:6px;
    color: var(--cv-text-muted); display:flex; align-items:center; justify-content:center;
    &:hover { background: var(--cv-bg-tertiary); color: var(--cv-text-primary); } }
`;
const Body = styled.div`
  padding: 16px; font-size: .88rem; line-height: 1.55;
  color: var(--cv-text-secondary); white-space: pre-wrap;
`;
const Foot = styled.div`
  display: flex; gap: 8px; padding: 12px 16px;
  border-top: 1px solid var(--cv-border-subtle); justify-content: flex-end;
`;
const Btn = styled.button`
  padding: 7px 16px; border-radius: 8px; border:none; cursor:pointer;
  font-family: inherit; font-size: .82rem; font-weight: 600; transition: all .15s;
  display: inline-flex; align-items: center; gap: 6px;
  ${p => p.$primary ? `
    background: var(--cv-gradient-primary); color: #fff;
    &:hover{ transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,.3); }
  ` : p.$danger ? `
    background: rgba(239,68,68,.12); color: #ef4444;
    border: 1px solid rgba(239,68,68,.25);
    &:hover{ background: rgba(239,68,68,.22); }
  ` : `
    background: var(--cv-bg-tertiary); color: var(--cv-text-secondary);
    border: 1px solid var(--cv-border-subtle);
    &:hover{ border-color: var(--cv-border-hover); color: var(--cv-text-primary); }
  `}
`;

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warn: AlertTriangle,
  info: Info,
};

const Ctx = createContext(null);

export function ToastProvider({ children }) {
  const [stack, setStack] = useState([]); // [{ id, kind, title, message, mode:'toast'|'confirm', resolver, danger, confirmLabel, cancelLabel }]
  const idRef = useRef(0);

  const close = useCallback((id, value) => {
    setStack(s => {
      const it = s.find(x => x.id === id);
      if (it?.mode === 'confirm' && it.resolver) it.resolver(value);
      return s.filter(x => x.id !== id);
    });
  }, []);

  const toast = useCallback(({ kind = 'info', title, message, autoClose = 2200 } = {}) => {
    const id = ++idRef.current;
    setStack(s => [...s, { id, kind, title, message, mode: 'toast' }]);
    if (autoClose) setTimeout(() => close(id, null), autoClose);
    return id;
  }, [close]);

  const confirm = useCallback(({ title = 'Confirm', message, danger = false,
    confirmLabel = 'Confirm', cancelLabel = 'Cancel', kind } = {}) => {
    return new Promise(resolve => {
      const id = ++idRef.current;
      setStack(s => [...s, {
        id, kind: kind || (danger ? 'warn' : 'info'), title, message,
        mode: 'confirm', resolver: resolve, danger, confirmLabel, cancelLabel,
      }]);
    });
  }, []);

  // Only render the topmost dialog so backdrops don't stack visually.
  const top = stack[stack.length - 1];

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      {top && (() => {
        const Icon = ICONS[top.kind] || Info;
        return (
          <Backdrop onClick={() => top.mode === 'toast' ? close(top.id, null) : close(top.id, false)}>
            <Card onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
              <Head $kind={top.kind}>
                <span className="icon"><Icon size={18}/></span>
                <span className="t">{top.title}</span>
                <button onClick={() => close(top.id, top.mode === 'confirm' ? false : null)} aria-label="Close"><X size={16}/></button>
              </Head>
              {top.message && <Body>{top.message}</Body>}
              <Foot>
                {top.mode === 'confirm' ? (
                  <>
                    <Btn onClick={() => close(top.id, false)}>{top.cancelLabel}</Btn>
                    <Btn $primary={!top.danger} $danger={top.danger} onClick={() => close(top.id, true)}>{top.confirmLabel}</Btn>
                  </>
                ) : (
                  <Btn $primary onClick={() => close(top.id, null)}>OK</Btn>
                )}
              </Foot>
            </Card>
          </Backdrop>
        );
      })()}
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
