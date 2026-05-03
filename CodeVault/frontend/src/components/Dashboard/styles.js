import styled from 'styled-components';

export const Page = styled.div`animation: fadeIn 0.4s ease;`;

/* ─── Hero ──────────────────────────────────────────────────────
   Editorial split: large display headline left, decorative argyle
   composition right. Generous vertical padding so the page doesn't
   feel cramped — negative space is the point. */
export const Hero = styled.section`
  display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr);
  align-items: center; gap: 48px;
  padding: 24px 0 56px;
  @media(max-width: 980px){ grid-template-columns: 1fr; gap: 28px; padding-bottom: 36px; }
`;

export const HeroCopy = styled.div`
  .eyebrow {
    font-family: var(--cv-font-display); font-style: italic; font-weight: 500;
    font-size: 0.95rem; color: var(--cv-rose); letter-spacing: 0.02em;
    display: inline-flex; align-items: center; gap: 12px; margin-bottom: 22px;
  }
  .eyebrow::before {
    content: ''; width: 36px; height: 1px; background: var(--cv-rose); opacity: .55;
  }
  h1 {
    font-size: clamp(2.8rem, 5.2vw, 4.4rem);
    line-height: .98; letter-spacing: -0.025em;
    margin-bottom: 18px;
  }
  h1 em {
    font-style: italic; color: transparent;
    background: var(--cv-gradient-primary);
    -webkit-background-clip: text; background-clip: text;
  }
  .lede {
    font-size: 1.05rem; color: var(--cv-text-secondary);
    line-height: 1.6; max-width: 460px;
  }
  .quote {
    margin-top: 28px; padding: 14px 18px;
    border-left: 2px solid var(--cv-rose);
    font-family: var(--cv-font-display); font-style: italic;
    font-size: 1rem; color: var(--cv-text-secondary); line-height: 1.55;
    max-width: 460px;
  }
  .quote .who { display: block; margin-top: 6px; font-size: .82rem; color: var(--cv-text-muted); font-style: normal; font-family: var(--cv-font-sans); letter-spacing: 0.04em; }
`;

export const HeroArt = styled.div`
  position: relative; min-height: 320px;
  display: flex; align-items: center; justify-content: center;
  &::before {
    content: ''; position: absolute; inset: -10% 5%;
    background: radial-gradient(closest-side, var(--cv-accent-muted), transparent 70%);
    filter: blur(20px); opacity: .8;
  }
  svg { position: relative; width: 100%; max-width: 460px; height: auto; }
`;

export const SectionLead = styled.div`
  display: flex; align-items: center; gap: 14px; margin-bottom: 22px;
  .label {
    font-family: var(--cv-font-display); font-style: italic; font-weight: 500;
    font-size: 1.05rem; color: var(--cv-text-primary); letter-spacing: -0.005em;
    flex-shrink: 0;
  }
  .num {
    font-family: var(--cv-font-mono); font-size: .7rem; color: var(--cv-text-muted);
    letter-spacing: 0.18em; flex-shrink: 0;
  }
  .rule {
    flex: 1; height: 1px;
    background-image: linear-gradient(90deg, var(--cv-border-default) 0, var(--cv-border-default) 50%, transparent 100%);
  }
  .diamond {
    width: 8px; height: 8px; transform: rotate(45deg);
    background: var(--cv-rose); opacity: .8; flex-shrink: 0;
    box-shadow: 0 0 12px var(--cv-rose);
  }
`;

export const Section = styled.section`margin-bottom: 64px;`;

export const Stats = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px;
  @media(max-width:1024px){ grid-template-columns: repeat(2, 1fr); }`;

export const Stat = styled.div`
  position: relative;
  background: var(--cv-glass-bg); backdrop-filter: blur(var(--cv-glass-blur));
  -webkit-backdrop-filter: blur(var(--cv-glass-blur));
  border: 1px solid transparent; background-clip: padding-box;
  border-radius: 16px; padding: 28px 24px;
  display: flex; flex-direction: column; gap: 18px;
  min-height: 160px;
  transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: var(--cv-glass-shadow);
  overflow: hidden;
  &::before {
    content: ''; position: absolute; inset: 0; padding: 1px; border-radius: inherit;
    background: var(--cv-gradient-border);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    pointer-events: none; opacity: .5; transition: opacity .2s ease;
  }
  &::after {
    content: ''; position: absolute; right: -18px; bottom: -18px;
    width: 80px; height: 80px; transform: rotate(45deg);
    border: 1px solid var(--cv-argyle-stitch); opacity: .35;
    pointer-events: none;
  }
  &:hover { transform: translateY(-2px); box-shadow: var(--cv-glass-shadow-lg);
    &::before { opacity: 1; } }
  .icon { width: 40px; height: 40px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    background: ${p => p.$bg || 'var(--cv-accent-muted)'};
    color: ${p => p.$color || 'var(--cv-accent)'};
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.04); }
  .value { font-family: var(--cv-font-display); font-weight: 500; font-style: italic;
    font-size: 2.4rem; line-height: 1; letter-spacing: -0.025em; color: var(--cv-text-primary); }
  .label { font-size: 0.7rem; font-weight: 600; color: var(--cv-text-muted);
    text-transform: uppercase; letter-spacing: 0.12em; margin-top: 6px; }
  .body { margin-top: auto; }`;

export const Grid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 22px;
  @media(max-width:900px){ grid-template-columns: 1fr; }`;

export const Card = styled.div`
  position: relative;
  background: var(--cv-glass-bg); backdrop-filter: blur(var(--cv-glass-blur));
  -webkit-backdrop-filter: blur(var(--cv-glass-blur));
  border: 1px solid transparent; background-clip: padding-box;
  border-radius: 18px; padding: 32px;
  box-shadow: var(--cv-glass-shadow);
  transition: box-shadow 0.2s ease;
  &::before {
    content: ''; position: absolute; inset: 0; padding: 1px; border-radius: inherit;
    background: var(--cv-gradient-border);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    pointer-events: none; opacity: .5;
  }
  &:hover { box-shadow: var(--cv-glass-shadow-lg); }
  ${p => p.$span && `grid-column: span ${p.$span};`}`;

export const CardHead = styled.div`
  display: flex; align-items: baseline; gap: 10px; margin-bottom: 24px;
  .h {
    font-family: var(--cv-font-display); font-style: italic; font-weight: 500;
    font-size: 1.15rem; color: var(--cv-text-primary); letter-spacing: -.01em;
  }
  .sub {
    font-size: .75rem; color: var(--cv-text-muted); letter-spacing: .04em;
    margin-left: auto;
  }
  svg { width: 14px; height: 14px; color: var(--cv-rose); }`;

export const Empty = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 200px; text-align: center; color: var(--cv-text-muted); font-size: 0.86rem;
  padding: 20px;
  svg { width: 28px; height: 28px; margin-bottom: 14px; opacity: 0.35; }`;

export const RecentList = styled.ul`list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px;
  li { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:11px;
    background: transparent; border:1px solid var(--cv-border-subtle); font-size:.88rem;
    cursor: pointer; transition: all .15s;
    &:hover { border-color: var(--cv-border-hover); transform: translateX(2px); background: var(--cv-accent-muted); }
    .t{flex:1; min-width:0; color:var(--cv-text-primary); font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
    .d{font-size:.7rem; color:var(--cv-text-muted); font-family:var(--cv-font-mono); flex-shrink:0;}
    > svg{width:14px;height:14px;color:var(--cv-success,#3fb950);flex-shrink:0;}
    .arrow{ width:14px;height:14px;color:var(--cv-text-muted); transition: transform .15s; }
    &:hover .arrow{ transform: translateX(2px); color: var(--cv-accent); } }`;

export const TriageList = styled.ul`list-style:none; padding:0; margin:0; display:grid; gap:12px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  li{padding:16px 18px; border-radius:11px;
    border:1px solid var(--cv-border-subtle); background: transparent;
    font-size:.84rem; transition: all .15s;
    &:hover{ border-color: var(--cv-border-hover); transform: translateY(-1px); }
    .name{font-weight:600;color:var(--cv-text-primary);margin-bottom:6px; font-size:.95rem; letter-spacing: -.005em;}
    .meta{font-size:.7rem;color:var(--cv-text-muted);font-family:var(--cv-font-mono); letter-spacing: .04em;}}`;
