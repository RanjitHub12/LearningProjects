import styled, { keyframes } from 'styled-components';

export const Page = styled.div`animation: fadeIn 0.4s ease;`;

export const DropArea = styled.div`
  border: 2px dashed ${p => p.$active ? 'var(--cv-accent)' : 'var(--cv-border-default)'};
  border-radius: 16px; padding: 48px; text-align: center; cursor: pointer;
  background: ${p => p.$active ? 'var(--cv-accent-muted)' : 'var(--cv-glass-bg)'};
  backdrop-filter: blur(20px); transition: all 0.25s ease;
  &:hover { border-color: var(--cv-accent); background: var(--cv-accent-muted); }
  svg { color: var(--cv-accent); margin-bottom: 16px; }
  .title { font-size: 1rem; font-weight: 600; margin-bottom: 6px; }
  .sub { color: var(--cv-text-muted); font-size: 0.82rem; }`;

export const FileList = styled.div`margin-top: 24px; display: flex; flex-direction: column; gap: 8px;`;

export const FileRow = styled.div`
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 10px;
  background: var(--cv-glass-bg); border: 1px solid var(--cv-border-subtle);
  svg { width: 18px; height: 18px; flex-shrink: 0; }
  .name { flex: 1; font-size: 0.85rem; font-weight: 500; }
  .size { font-size: 0.75rem; color: var(--cv-text-muted); }
  .status { font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 4px; }
  .status--done { color: var(--cv-success); }
  .status--err { color: var(--cv-danger); }
  .status--pending { color: var(--cv-warning); }`;

export const ActionBar = styled.div`
  margin-top: 20px; display: flex; gap: 12px; justify-content: flex-end;`;

export const Btn = styled.button`
  padding: 10px 24px; border-radius: 10px; border: none; cursor: pointer;
  font-family: inherit; font-size: 0.85rem; font-weight: 600;
  transition: all 0.2s ease;
  ${p => p.$primary ? `
    background: var(--cv-gradient-primary); color: #fff;
    box-shadow: 0 2px 12px rgba(99,102,241,0.25);
    &:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(99,102,241,0.35); }
    &:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }
  ` : `
    background: var(--cv-bg-tertiary); color: var(--cv-text-secondary);
    border: 1px solid var(--cv-border-default);
    &:hover { border-color: var(--cv-border-hover); }
  `}`;

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

export const ProcessingOverlay = styled.div`
  margin-top: 32px; text-align: center;
  .spinner { animation: ${spin} 1s linear infinite; color: var(--cv-accent); margin-bottom: 12px; }
  .msg { font-size: 0.9rem; color: var(--cv-text-secondary); }
  .sub { font-size: 0.78rem; color: var(--cv-text-muted); margin-top: 4px; }`;

export const ResultsSection = styled.div`margin-top: 28px; animation: fadeIn 0.5s ease;`;

export const ResultCard = styled.div`
  background: var(--cv-glass-bg); backdrop-filter: blur(20px);
  border: 1px solid var(--cv-border-subtle); border-radius: 14px;
  padding: 20px 24px; margin-bottom: 12px;
  box-shadow: var(--cv-glass-shadow);
  transition: all 0.2s ease;
  &:hover { border-color: var(--cv-border-hover); }`;

export const ResultHeader = styled.div`
  display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
  .icon { width: 36px; height: 36px; border-radius: 8px; display: flex;
    align-items: center; justify-content: center;
    background: var(--cv-accent-muted); color: var(--cv-accent); }
  .info { flex: 1; }
  .info .name { font-size: 1rem; font-weight: 700; }
  .info .meta { font-size: 0.78rem; color: var(--cv-text-muted); margin-top: 2px; }`;

export const ApproachList = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;`;

export const ApproachPill = styled.span`
  padding: 5px 14px; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
  background: rgba(99,102,241,0.08); color: var(--cv-accent);
  border: 1px solid rgba(99,102,241,0.15);
  display: flex; align-items: center; gap: 4px;`;

export const TagRow = styled.div`display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px;`;

export const OpenBtn = styled.button`
  margin-top: 12px; padding: 8px 20px; border-radius: 8px; border: none;
  background: var(--cv-gradient-primary); color: #fff; cursor: pointer;
  font-family: inherit; font-size: 0.8rem; font-weight: 600;
  display: inline-flex; align-items: center; gap: 6px;
  transition: all 0.2s;
  &:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.3); }`;

/* Step-1 destination card — kept loose-ish so the index file stays readable. */
export const StepCard = styled.div`
  background: var(--cv-glass-bg); backdrop-filter: blur(20px);
  border: 1px solid var(--cv-border-subtle); border-radius: 14px;
  padding: 18px; margin-bottom: 18px;
  display: flex; flex-direction: column; gap: 12px;`;
