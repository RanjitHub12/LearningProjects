/**
 * Editorial page header used across secondary pages.
 *
 * Consistent rhythm: small italic eyebrow → display title with an optional
 * gradient-accent word → muted subtitle. A small argyle diamond cluster sits
 * top-right as a textile motif. Lighter weight than the Dashboard hero so
 * working pages don't feel like landing pages.
 */
import styled from 'styled-components';

const Wrap = styled.header`
  position: relative;
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 24px; flex-wrap: wrap;
  margin-bottom: 36px; padding-bottom: 22px;
  border-bottom: 1px solid var(--cv-border-subtle);
  /* The thin divider is "stitched" — the border itself is faint, but a tiny
     rose diamond marks the left edge so the page header always anchors. */
  &::before {
    content: ''; position: absolute; left: 0; bottom: -3px;
    width: 5px; height: 5px; transform: rotate(45deg);
    background: var(--cv-rose); box-shadow: 0 0 8px var(--cv-rose);
  }
`;

const Copy = styled.div`
  min-width: 0; flex: 1;
  .eyebrow {
    font-family: var(--cv-font-display); font-style: italic; font-weight: 500;
    font-size: 0.85rem; color: var(--cv-rose); letter-spacing: 0.02em;
    display: inline-flex; align-items: center; gap: 10px; margin-bottom: 10px;
  }
  .eyebrow::before {
    content: ''; width: 24px; height: 1px; background: var(--cv-rose); opacity: .55;
  }
  h1 {
    font-size: clamp(2rem, 3.4vw, 2.8rem);
    line-height: 1.05; letter-spacing: -0.022em;
    margin-bottom: 8px;
  }
  h1 em {
    font-style: italic; color: transparent;
    background: var(--cv-gradient-primary);
    -webkit-background-clip: text; background-clip: text;
  }
  .sub {
    color: var(--cv-text-secondary); font-size: 0.95rem; line-height: 1.55;
    max-width: 640px;
  }
`;

const Actions = styled.div`
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
`;

/* A small 3-diamond cluster — sits in the corner like a fleuron. Drawn
   via SVG so it scales cleanly and uses currentColor for theming. */
const Ornament = styled.svg`
  flex-shrink: 0; width: 56px; height: 56px;
  color: var(--cv-accent);
  opacity: .55;
  @media(max-width: 720px){ display: none; }
`;

export default function PageHeader({ eyebrow, title, accent, subtitle, children, ornament = true }) {
  return (
    <Wrap>
      <Copy>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>
          {title}{accent && <> <em>{accent}</em></>}
        </h1>
        {subtitle && <p className="sub">{subtitle}</p>}
      </Copy>
      {children && <Actions>{children}</Actions>}
      {ornament && !children && (
        <Ornament viewBox="0 0 56 56" fill="none" aria-hidden="true">
          <g stroke="currentColor" strokeWidth=".9" fill="none">
            <polygon points="28,4 44,28 28,52 12,28"/>
            <polygon points="28,14 38,28 28,42 18,28" stroke="var(--cv-rose)" strokeOpacity=".7"/>
          </g>
          <circle cx="28" cy="28" r="1.6" fill="var(--cv-rose)"/>
          <circle cx="28" cy="4"  r="1.2" fill="currentColor" fillOpacity=".7"/>
          <circle cx="28" cy="52" r="1.2" fill="currentColor" fillOpacity=".7"/>
          <circle cx="4"  cy="28" r="1.2" fill="currentColor" fillOpacity=".7"/>
          <circle cx="52" cy="28" r="1.2" fill="currentColor" fillOpacity=".7"/>
        </Ornament>
      )}
    </Wrap>
  );
}
