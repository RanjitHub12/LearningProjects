import styled from 'styled-components';

export const Page = styled.div`animation: fadeIn 0.4s ease;`;

export const Grid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  @media(max-width:900px){ grid-template-columns: 1fr; }`;

export const Card = styled.div`
  position: relative;
  background: var(--cv-glass-bg); backdrop-filter: blur(var(--cv-glass-blur));
  -webkit-backdrop-filter: blur(var(--cv-glass-blur));
  border: 1px solid transparent; background-clip: padding-box;
  border-radius: 16px; padding: 26px; box-shadow: var(--cv-glass-shadow);
  &::before {
    content: ''; position: absolute; inset: 0; padding: 1px; border-radius: inherit;
    background: var(--cv-gradient-border);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    pointer-events: none; opacity: .5;
  }
  ${p => p.$span && `grid-column: span ${p.$span};`}`;

export const CardHead = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: 20px;
  font-size: 0.78rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--cv-text-secondary);
  svg { width: 16px; height: 16px; color: var(--cv-accent); }
  .meta { margin-left: auto; font-size: .72rem; color: var(--cv-text-muted);
    text-transform: none; letter-spacing: 0; font-weight: 500; }`;

export const Empty = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 200px; text-align: center; color: var(--cv-text-muted); font-size: 0.85rem;
  svg { width: 32px; height: 32px; margin-bottom: 12px; opacity: 0.3; }`;

export const Stats = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
  @media(max-width:900px){grid-template-columns:repeat(2,1fr);}`;

export const StatBox = styled.div`
  position: relative;
  background: var(--cv-glass-bg); backdrop-filter: blur(var(--cv-glass-blur));
  border: 1px solid transparent; background-clip: padding-box;
  border-radius: 14px; padding: 20px; text-align: center;
  &::before {
    content: ''; position: absolute; inset: 0; padding: 1px; border-radius: inherit;
    background: var(--cv-gradient-border);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    pointer-events: none; opacity: .45;
  }
  .val { font-family: var(--cv-font-display); font-style: italic; font-weight: 500;
    font-size: 1.85rem; color: var(--cv-text-primary); letter-spacing: -.02em; }
  .lbl { font-size: 0.7rem; color: var(--cv-text-muted); text-transform: uppercase;
    letter-spacing: 0.08em; margin-top: 4px; font-weight: 600; }`;

/* ── Contribution heatmap ──────────────────────────────────── */
export const HeatWrap = styled.div`
  position: relative;
  overflow-x:auto; overflow-y: hidden;
  padding-bottom:6px;
  scroll-behavior: smooth;
  &::-webkit-scrollbar{ height:8px; }
  &::-webkit-scrollbar-thumb{ background: var(--cv-border-default); border-radius: 4px; }
  &::-webkit-scrollbar-track{ background: transparent; }
`;

export const ScrollBtn = styled.button`
  position: absolute; top: 50%; transform: translateY(-50%);
  ${p => p.$side === 'left' ? 'left: 4px;' : 'right: 4px;'}
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--cv-bg-secondary, #11151d);
  border: 1px solid var(--cv-border-default);
  color: var(--cv-text-secondary);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  z-index: 2; opacity: .85;
  &:hover{ opacity: 1; border-color: var(--cv-accent); color: var(--cv-accent); }
  &:disabled{ opacity: .25; cursor: default; }
`;

export const HeatGrid = styled.div`display:grid; grid-auto-flow:column; grid-template-rows:repeat(7, 13px); gap:3px;`;

export const Cell = styled.button`
  width:13px; height:13px; border-radius:3px; padding:0;
  background:${p =>
    p.$level === 0 ? 'var(--cv-bg-tertiary)' :
    p.$level === 1 ? 'rgba(99,102,241,.30)' :
    p.$level === 2 ? 'rgba(99,102,241,.55)' :
    p.$level === 3 ? 'rgba(99,102,241,.80)' :
    'rgba(99,102,241,1)'};
  border:1px solid ${p => p.$selected ? 'var(--cv-accent)' : 'var(--cv-border-subtle)'};
  cursor: ${p => p.$disabled ? 'default' : 'pointer'};
  outline: ${p => p.$selected ? '1px solid var(--cv-accent)' : 'none'};
  &:hover{ ${p => !p.$disabled && 'outline:1px solid var(--cv-accent);'} }
`;

export const DayPopover = styled.div`
  margin-top: 12px; padding: 14px; border-radius: 12px;
  background: var(--cv-bg-tertiary); border: 1px solid var(--cv-border-default);
  display: flex; flex-direction: column; gap: 8px;
  animation: fadeIn .18s ease;
  .head { display:flex; align-items:center; gap:10px;
    .date { font-size: .92rem; font-weight: 700; color: var(--cv-text-primary); flex:1; }
    .badge { padding: 3px 9px; border-radius: 99px; font-size: .7rem; font-weight: 600;
      background: var(--cv-accent-muted); color: var(--cv-accent); font-family: var(--cv-font-mono); }
    button { background:none; border:none; cursor:pointer; color: var(--cv-text-muted); padding:4px;
      border-radius:6px; display:flex; &:hover{ background: var(--cv-bg-secondary); color: var(--cv-text-primary);} }
  }
  .empty { font-size: .82rem; color: var(--cv-text-muted); padding: 6px 0; }
  .row { display:flex; align-items:center; gap:10px; padding: 8px 10px; border-radius: 8px;
    background: var(--cv-bg-secondary, #11151d); border: 1px solid var(--cv-border-subtle);
    font-size: .82rem; cursor: pointer; transition: all .15s;
    &:hover { border-color: var(--cv-border-hover); background: var(--cv-accent-muted); }
    .t { flex:1; color: var(--cv-text-primary); font-weight: 500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .d { font-size: .7rem; color: var(--cv-text-muted); font-family: var(--cv-font-mono); }
    svg { width: 13px; height: 13px; color: var(--cv-success, #3fb950); }
  }
`;

export const Legend = styled.div`display:flex; align-items:center; gap:6px; margin-top:10px; font-size:.7rem; color:var(--cv-text-muted);
  .b{width:11px;height:11px;border-radius:2.5px;border:1px solid var(--cv-border-subtle);}`;

export const MonthRow = styled.div`display:flex; gap:0; margin-bottom:4px; font-size:.7rem; color:var(--cv-text-muted);
  padding-left:18px;`;

export const Daycol = styled.div`display:flex; flex-direction:column; justify-content:space-between; padding-right:6px;
  font-size:.65rem; color:var(--cv-text-muted); height:101px; padding-top:2px;`;
