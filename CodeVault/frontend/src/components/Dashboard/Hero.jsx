import { Hero as HeroSection, HeroCopy, HeroArt } from './styles';

/* ─── Decorative SVG: argyle constellation ──────────────────────
   Three overlapping argyle diamonds arranged like a brooch, with
   stitched accent lines and floating dots. Uses currentColor for
   dark/light parity and the brand gradients via <defs>. */
function ArgyleArt() {
  return (
    <svg viewBox="0 0 460 360" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="argDiaA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="var(--cv-accent)"     stopOpacity=".55"/>
          <stop offset="100%" stopColor="var(--cv-accent-deep)" stopOpacity=".15"/>
        </linearGradient>
        <linearGradient id="argDiaB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="var(--cv-rose)" stopOpacity=".5"/>
          <stop offset="100%" stopColor="var(--cv-rose)" stopOpacity=".08"/>
        </linearGradient>
        <linearGradient id="argDiaC" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%"  stopColor="#60a5fa" stopOpacity=".4"/>
          <stop offset="100%" stopColor="#60a5fa" stopOpacity=".05"/>
        </linearGradient>
        <pattern id="argLattice" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
          <path d="M0 11 L11 0 L22 11 L11 22 Z" fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth=".6"/>
        </pattern>
      </defs>

      <rect x="0" y="0" width="460" height="360" fill="url(#argLattice)"
            mask="url(#argMask)" style={{ color: 'var(--cv-accent)' }}/>
      <mask id="argMask">
        <radialGradient id="argMaskGrad" cx="50%" cy="50%" r="55%">
          <stop offset="0%"  stopColor="white" stopOpacity=".9"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </radialGradient>
        <rect x="0" y="0" width="460" height="360" fill="url(#argMaskGrad)"/>
      </mask>

      <g>
        <polygon points="120,180 230,40 340,180 230,320" fill="url(#argDiaA)"
                 stroke="var(--cv-accent)" strokeOpacity=".55" strokeWidth="1"/>
        <polygon points="120,180 230,40 340,180 230,320" fill="none"
                 stroke="var(--cv-accent-light)" strokeOpacity=".18" strokeWidth="1"
                 strokeDasharray="2 4"/>
      </g>
      <g transform="translate(80 0)">
        <polygon points="120,180 230,90 340,180 230,270" fill="url(#argDiaB)"
                 stroke="var(--cv-rose)" strokeOpacity=".55" strokeWidth="1"/>
      </g>
      <g transform="translate(-80 0)">
        <polygon points="120,180 230,110 340,180 230,250" fill="url(#argDiaC)"
                 stroke="#60a5fa" strokeOpacity=".4" strokeWidth="1"/>
      </g>

      <line x1="80" y1="40" x2="380" y2="320" stroke="var(--cv-rose)" strokeOpacity=".35" strokeWidth=".6" strokeDasharray="2 6"/>
      <line x1="80" y1="320" x2="380" y2="40" stroke="var(--cv-accent)" strokeOpacity=".30" strokeWidth=".6" strokeDasharray="2 6"/>

      <g fill="var(--cv-rose)" fillOpacity=".75">
        <circle cx="230" cy="40"  r="2.5"/>
        <circle cx="230" cy="320" r="2.5"/>
        <circle cx="120" cy="180" r="2.5"/>
        <circle cx="340" cy="180" r="2.5"/>
      </g>
      <g fill="var(--cv-accent)" fillOpacity=".6">
        <circle cx="60"  cy="100" r="1.5"/>
        <circle cx="400" cy="120" r="1.5"/>
        <circle cx="80"  cy="280" r="1.5"/>
        <circle cx="400" cy="260" r="1.5"/>
      </g>

      <path d="M30 230 Q 230 -40 430 230" stroke="var(--cv-accent-light)" strokeOpacity=".4" strokeWidth="1" fill="none"/>
    </svg>
  );
}

export default function Hero() {
  return (
    <HeroSection>
      <HeroCopy>
        <div className="eyebrow">Volume I — The Practice Ledger</div>
        <h1>Train deliberately.<br/><em>Build a craft.</em></h1>
        <p className="lede">
          A quiet ledger of your practice. Every problem you solve here is
          woven into the patterns below — topics mastered, days kept, weaknesses
          surfaced. Take your time.
        </p>
        <blockquote className="quote">
          “Repetition is the mother of skill.”
          <span className="who">— Tony Robbins</span>
        </blockquote>
      </HeroCopy>
      <HeroArt><ArgyleArt /></HeroArt>
    </HeroSection>
  );
}
