import styled, { keyframes } from 'styled-components';
import { Loader2 } from 'lucide-react';

const spin = keyframes`to{transform:rotate(360deg);}`;

export const Page = styled.div`animation: fadeIn .4s ease;`;

export const Btn = styled.button`
  padding: 8px 16px; border-radius: 9px; border:none; cursor:pointer;
  font-family:inherit; font-size:.83rem; font-weight:600;
  display:inline-flex; align-items:center; gap:7px; transition: all .15s;
  ${p => p.$primary ? `
    background: var(--cv-gradient-primary); color:#fff;
    &:hover{ transform: translateY(-1px); box-shadow:0 4px 16px rgba(99,102,241,.3); }
    &:disabled{ opacity:.5; cursor:not-allowed; transform:none; box-shadow:none; }
  ` : `
    background: var(--cv-bg-tertiary); color: var(--cv-text-secondary);
    border: 1px solid var(--cv-border-subtle);
    &:hover{ border-color: var(--cv-border-hover); color: var(--cv-text-primary); }
    &:disabled{ opacity:.5; cursor:not-allowed; }
  `}
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 300px) minmax(0, 1fr) minmax(280px, 320px);
  gap: 16px; min-height: 540px;
  @media(max-width: 1280px){
    grid-template-columns: minmax(260px, 280px) minmax(0, 1fr);
    .preview{ display:none; }
  }
  @media(max-width: 720px){
    grid-template-columns: 1fr;
  }
`;

export const Card = styled.div`
  background: var(--cv-glass-bg); backdrop-filter: blur(20px);
  border: 1px solid var(--cv-border-subtle); border-radius: 14px;
  display: flex; flex-direction: column; min-height: 0;
  min-width: 0; overflow: hidden;
`;

export const CardHead = styled.div`
  padding: 12px 14px; border-bottom: 1px solid var(--cv-border-subtle);
  display:flex; align-items:center; gap:8px;
  font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em;
  color: var(--cv-text-muted);
  > svg{ width:14px; height:14px; color: var(--cv-accent); flex-shrink:0; }
  .spacer{ flex:1; }
`;

export const CardBody = styled.div`flex:1; overflow-y:auto; padding: 10px;`;

export const TreeRow = styled.div`
  display: grid;
  grid-template-columns: 18px 16px 1fr auto auto auto auto;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px ${p => 8 + (p.$depth || 0) * 14}px;
  border-radius: 9px; cursor: pointer; user-select: none;
  margin-bottom: 2px; min-width: 0;
  background: ${p => p.$active ? 'var(--cv-accent-muted)' : 'transparent'};
  color: ${p => p.$active ? 'var(--cv-accent)' : 'var(--cv-text-secondary)'};
  font-size:.86rem; font-weight: 500;
  &:hover{ background: var(--cv-accent-muted); }
  .chev { background:none; border:none; cursor:pointer; padding:0; display:flex;
    align-items:center; justify-content:center; color: var(--cv-text-muted);
    width: 18px; height: 18px; border-radius: 4px;
    &:hover { color: var(--cv-accent); background: var(--cv-bg-tertiary); }
    &[disabled]{ opacity: .25; cursor: default; } }
  .glyph { display:flex; align-items:center; justify-content:center;
    color: ${p => p.$active ? 'var(--cv-accent)' : 'var(--cv-text-muted)'}; }
  .name { min-width: 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .count { font-size:.7rem; color: var(--cv-text-muted); font-family: var(--cv-font-mono);
    padding: 1px 7px; border-radius: 999px; background: var(--cv-bg-tertiary); }
  .icon-btn{ background:none; border:none; cursor:pointer; padding:4px; color: var(--cv-text-muted);
    display:flex; border-radius:6px;
    &:hover{ color: var(--cv-accent); background: var(--cv-bg-tertiary); } }
`;

export const FileTile = styled.div`
  padding: 12px; border-radius: 10px; margin-bottom: 8px;
  background: var(--cv-bg-tertiary); border: 1px solid var(--cv-border-subtle);
  display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center;
  cursor: pointer; transition: all .15s;
  &:hover{ border-color: var(--cv-border-hover); transform: translateY(-1px); }
  .icon { width: 32px; height: 32px; border-radius: 8px; display:flex; align-items:center; justify-content:center;
    background: var(--cv-accent-muted); color: var(--cv-accent); }
  .meta{ min-width: 0; }
  .title{ font-size: .92rem; font-weight: 600; color: var(--cv-text-primary); margin-bottom: 2px;
    white-space:nowrap; overflow:hidden; text-overflow: ellipsis; }
  .sub{ font-size: .72rem; color: var(--cv-text-muted); font-family: var(--cv-font-mono); }
  .actions{ display:flex; gap:4px; }
  .actions button{ background:none; border:none; cursor:pointer; color: var(--cv-text-muted); padding:4px;
    border-radius: 6px; display:flex; &:hover{ background: var(--cv-bg-secondary); color: var(--cv-text-primary); } }
`;

export const Crumbs = styled.div`
  display: flex; align-items: center; gap: 4px;
  padding: 6px 14px 0; font-size: .76rem; color: var(--cv-text-muted);
  flex-wrap: wrap;
  .seg { color: var(--cv-text-secondary); cursor: pointer;
    padding: 2px 6px; border-radius: 5px;
    &:hover { background: var(--cv-bg-tertiary); color: var(--cv-text-primary); } }
  .seg.active { color: var(--cv-accent); font-weight: 600; cursor: default; background: transparent; }
  svg { width: 12px; height: 12px; opacity: .5; flex-shrink: 0; }
`;

export const Empty = styled.div`
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  min-height: 200px; padding: 30px; text-align:center; color: var(--cv-text-muted);
  font-size:.85rem;
  svg{ width:36px; height:36px; opacity:.3; margin-bottom: 10px; }
`;

export const Backdrop = styled.div`
  position: fixed; inset: 0; z-index: 600;
  background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
  display:flex; align-items:center; justify-content:center; padding: 20px;
`;

export const Modal = styled.div`
  width: min(${p => p.$w || '960px'}, 100%); max-height: 92vh;
  display:flex; flex-direction:column;
  background: var(--cv-bg-secondary, #11151d);
  border: 1px solid var(--cv-border-default); border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,.55); overflow: hidden;
`;

export const MHead = styled.div`
  display:flex; align-items:center; gap:10px;
  padding: 14px 18px; border-bottom: 1px solid var(--cv-border-subtle);
  .t{ flex:1; font-size: 1rem; font-weight: 700; color: var(--cv-text-primary); }
  button{ background:none; border:none; cursor:pointer; color: var(--cv-text-muted); padding:4px; border-radius:6px;
    display:flex; &:hover{ background: var(--cv-bg-tertiary); color: var(--cv-text-primary); } }
`;

export const MFoot = styled.div`
  display:flex; gap:8px; padding: 12px 18px;
  border-top: 1px solid var(--cv-border-subtle); justify-content: flex-end;
`;

export const FieldRow = styled.div`
  display:flex; gap: 10px; padding: 12px 18px;
  border-bottom: 1px solid var(--cv-border-subtle);
  input, select{ padding: 7px 10px; border-radius: 8px;
    background: var(--cv-bg-tertiary); border: 1px solid var(--cv-border-subtle);
    color: var(--cv-text-primary); font-family: inherit; font-size: .85rem; outline: none; }
  input{ flex: 1; }
  input:focus, select:focus{ border-color: var(--cv-accent); }
`;

export const Spinner = styled(Loader2)`animation: ${spin} 1s linear infinite;`;

export const PreviewBox = styled.div`
  padding: 14px;
  .h { font-size: 1.05rem; font-weight: 700; color: var(--cv-text-primary); margin-bottom: 4px; }
  .meta { font-size: .72rem; color: var(--cv-text-muted); font-family: var(--cv-font-mono); margin-bottom: 12px; }
  .tags { display:flex; flex-wrap:wrap; gap: 4px; margin-bottom: 12px; }
  .desc { font-size: .82rem; color: var(--cv-text-secondary); line-height: 1.55; white-space: pre-wrap;
    max-height: 220px; overflow-y: auto; padding-right: 4px; }
  .tcs { margin-top: 12px; }
  .tc { padding: 8px 10px; background: var(--cv-bg-tertiary); border:1px solid var(--cv-border-subtle);
    border-radius:7px; margin-bottom: 5px; font-size:.78rem; }
  .tc .lbl{ color: var(--cv-text-muted); font-size: .7rem; font-weight: 600; }
`;

export const VaultRow = styled.div`
  display:flex; align-items:center; gap:12px; padding: 10px 14px;
  border-radius: 9px; cursor: pointer; border: 1px solid var(--cv-border-subtle);
  background: ${p => p.$selected ? 'var(--cv-accent-muted)' : 'transparent'};
  margin-bottom: 6px; transition: all .15s;
  &:hover { border-color: var(--cv-border-hover); transform: translateX(2px); }
  .name { flex:1; min-width:0; font-size:.88rem; font-weight:600;
    color: var(--cv-text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .meta { font-size:.7rem; color: var(--cv-text-muted); font-family: var(--cv-font-mono); }
`;
