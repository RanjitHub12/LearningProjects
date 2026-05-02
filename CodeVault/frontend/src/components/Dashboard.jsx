import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Activity, Flame, Clock, BookOpen, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import {
  getActivity, getStreak, getTagCounts, getDifficultyCounts,
} from '../lib/activity';

const Page = styled.div`animation: fadeIn 0.4s ease;`;

/* ─── Hero ──────────────────────────────────────────────────────
   Editorial split: large display headline left, decorative argyle
   composition right. Generous vertical padding so the page doesn't
   feel cramped — negative space is the point. */
const Hero = styled.section`
  display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr);
  align-items: center; gap: 48px;
  padding: 24px 0 56px;
  @media(max-width: 980px){ grid-template-columns: 1fr; gap: 28px; padding-bottom: 36px; }
`;

const HeroCopy = styled.div`
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

const HeroArt = styled.div`
  position: relative; min-height: 320px;
  display: flex; align-items: center; justify-content: center;
  /* Soft halo behind the SVG so it has depth on dark/light alike */
  &::before {
    content: ''; position: absolute; inset: -10% 5%;
    background: radial-gradient(closest-side, var(--cv-accent-muted), transparent 70%);
    filter: blur(20px); opacity: .8;
  }
  svg { position: relative; width: 100%; max-width: 460px; height: auto; }
`;

/* Eyebrow + ornament divider that introduces a new section */
const SectionLead = styled.div`
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

const Section = styled.section`margin-bottom: 64px;`;

const Stats = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px;
  @media(max-width:1024px){ grid-template-columns: repeat(2, 1fr); }`;

const Stat = styled.div`
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
  /* Diamond watermark in the corner — barely there, just texture */
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

const Grid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 22px;
  @media(max-width:900px){ grid-template-columns: 1fr; }`;

const Card = styled.div`
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

const CardHead = styled.div`
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

const Empty = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 200px; text-align: center; color: var(--cv-text-muted); font-size: 0.86rem;
  padding: 20px;
  svg { width: 28px; height: 28px; margin-bottom: 14px; opacity: 0.35; }`;

const RecentList = styled.ul`list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px;
  li { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:11px;
    background: transparent; border:1px solid var(--cv-border-subtle); font-size:.88rem;
    cursor: pointer; transition: all .15s;
    &:hover { border-color: var(--cv-border-hover); transform: translateX(2px); background: var(--cv-accent-muted); }
    .t{flex:1; min-width:0; color:var(--cv-text-primary); font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
    .d{font-size:.7rem; color:var(--cv-text-muted); font-family:var(--cv-font-mono); flex-shrink:0;}
    > svg{width:14px;height:14px;color:var(--cv-success,#3fb950);flex-shrink:0;}
    .arrow{ width:14px;height:14px;color:var(--cv-text-muted); transition: transform .15s; }
    &:hover .arrow{ transform: translateX(2px); color: var(--cv-accent); } }`;

const TriageList = styled.ul`list-style:none; padding:0; margin:0; display:grid; gap:12px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  li{padding:16px 18px; border-radius:11px;
    border:1px solid var(--cv-border-subtle); background: transparent;
    font-size:.84rem; transition: all .15s;
    &:hover{ border-color: var(--cv-border-hover); transform: translateY(-1px); }
    .name{font-weight:600;color:var(--cv-text-primary);margin-bottom:6px; font-size:.95rem; letter-spacing: -.005em;}
    .meta{font-size:.7rem;color:var(--cv-text-muted);font-family:var(--cv-font-mono); letter-spacing: .04em;}}`;

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

      {/* Backdrop lattice fades in around the diamonds */}
      <rect x="0" y="0" width="460" height="360" fill="url(#argLattice)"
            mask="url(#argMask)" style={{ color: 'var(--cv-accent)' }}/>
      <mask id="argMask">
        <radialGradient id="argMaskGrad" cx="50%" cy="50%" r="55%">
          <stop offset="0%"  stopColor="white" stopOpacity=".9"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </radialGradient>
        <rect x="0" y="0" width="460" height="360" fill="url(#argMaskGrad)"/>
      </mask>

      {/* Three large argyle diamonds — slightly offset for movement */}
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

      {/* Stitch accents — argyle "thread" lines */}
      <line x1="80" y1="40" x2="380" y2="320" stroke="var(--cv-rose)" strokeOpacity=".35" strokeWidth=".6" strokeDasharray="2 6"/>
      <line x1="80" y1="320" x2="380" y2="40" stroke="var(--cv-accent)" strokeOpacity=".30" strokeWidth=".6" strokeDasharray="2 6"/>

      {/* Floating dots for texture */}
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

      {/* Arc — sweeping pen-stroke that ties the composition */}
      <path d="M30 230 Q 230 -40 430 230" stroke="var(--cv-accent-light)" strokeOpacity=".4" strokeWidth="1" fill="none"/>
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState([]);

  // Map an activity entry to a destination route. Vault problems open at
  // /workspace?id=<uuid>; LeetCode daily entries (problemId starts "lc:")
  // have no internal route, so we fall back to a Practice search.
  const openSolve = (a) => {
    if (!a?.problemId) return;
    if (a.source === 'vault' && !a.problemId.startsWith('lc:') && !a.problemId.startsWith('snippet:')) {
      navigate(`/workspace?id=${a.problemId}`);
    } else if (a.problemId.startsWith('snippet:')) {
      navigate(`/workspace?snippet=${a.problemId.slice('snippet:'.length)}`);
    } else {
      navigate(`/problems?q=${encodeURIComponent(a.title || '')}`);
    }
  };

  useEffect(() => {
    const refresh = () => setActivity(getActivity());
    refresh();
    window.addEventListener('cv:activity-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('cv:activity-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const { current: streak } = getStreak();
  const tagCounts = getTagCounts();
  const diffCounts = getDifficultyCounts();
  const allTags = Object.keys(tagCounts);
  const maxCount = Math.max(...Object.values(tagCounts), 1);
  const radarData = allTags.map(tag => ({
    subject: tag,
    score: Math.round((tagCounts[tag] / maxCount) * 100),
    count: tagCounts[tag],
  }));

  const totalSolved = activity.length;
  const recent = [...activity].sort((a, b) => (b.solvedAt || '').localeCompare(a.solvedAt || '')).slice(0, 6);

  const weakest = Object.entries(tagCounts)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 6);

  const days = new Set(activity.map(a => (a.solvedAt || '').slice(0, 10)).filter(Boolean));
  const avgPerDay = days.size > 0 ? (totalSolved / days.size).toFixed(1) : '—';

  return (
    <Page>
      <Hero>
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
      </Hero>

      <Section>
        <SectionLead>
          <span className="num">01</span>
          <span className="label">At a glance</span>
          <span className="rule"/>
          <span className="diamond"/>
        </SectionLead>
        <Stats>
          <Stat $bg="rgba(52,211,153,0.10)" $color="var(--cv-success)">
            <div className="icon"><CheckCircle2 size={18} /></div>
            <div className="body"><div className="value">{totalSolved}</div><div className="label">Problems Solved</div></div>
          </Stat>
          <Stat $bg="var(--cv-accent-muted)" $color="var(--cv-accent)">
            <div className="icon"><BookOpen size={18} /></div>
            <div className="body"><div className="value">{allTags.length}</div><div className="label">Topics Practiced</div></div>
          </Stat>
          <Stat $bg="var(--cv-rose-muted)" $color="var(--cv-rose)">
            <div className="icon"><Flame size={18} /></div>
            <div className="body"><div className="value">{streak}</div><div className="label">Day Streak</div></div>
          </Stat>
          <Stat $bg="rgba(96,165,250,0.10)" $color="var(--cv-info)">
            <div className="icon"><Activity size={18} /></div>
            <div className="body"><div className="value">{avgPerDay}</div><div className="label">Avg / Active Day</div></div>
          </Stat>
        </Stats>
      </Section>

      <Section>
        <SectionLead>
          <span className="num">02</span>
          <span className="label">Patterns &amp; recency</span>
          <span className="rule"/>
          <span className="diamond"/>
        </SectionLead>
        <Grid>
          <Card>
            <CardHead><TrendingUp /> <span className="h">Proficiency Radar</span><span className="sub">across topics</span></CardHead>
            {radarData.length >= 3 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="var(--cv-border-default)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--cv-text-muted)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} tick={false} domain={[0, 100]} />
                  <Tooltip formatter={(v, n, p) => [`${p.payload.count} solved`, p.payload.subject]} />
                  <Radar dataKey="score" stroke="var(--cv-accent)" fill="var(--cv-accent)" fillOpacity={0.18} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <Empty><TrendingUp />Solve problems across at least three topics to see your radar.</Empty>
            )}
          </Card>

          <Card>
            <CardHead><Clock /> <span className="h">Recent Solves</span><span className="sub">last six</span></CardHead>
            {recent.length > 0 ? (
              <RecentList>
                {recent.map((a, i) => (
                  <li key={i} onClick={() => openSolve(a)} title="Open this problem"
                      role="button" tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openSolve(a); }}>
                    <CheckCircle2 />
                    <span className="t">{a.title || 'Untitled'}</span>
                    <span className="d">{(a.solvedAt || '').slice(0, 10)}</span>
                    <ArrowRight className="arrow"/>
                  </li>
                ))}
              </RecentList>
            ) : (
              <Empty><Clock />Mark problems as solved in the Workspace to populate this list.</Empty>
            )}
          </Card>
        </Grid>
      </Section>

      <Section>
        <SectionLead>
          <span className="num">03</span>
          <span className="label">Where to grow next</span>
          <span className="rule"/>
          <span className="diamond"/>
        </SectionLead>
        <Card>
          <CardHead><AlertTriangle /> <span className="h">Weakness Triage</span><span className="sub">topics with the fewest solves</span></CardHead>
          {weakest.length >= 3 ? (
            <TriageList>
              {weakest.map(([tag, count]) => (
                <li key={tag}>
                  <div className="name">{tag}</div>
                  <div className="meta">{count} solved · {diffCounts.Hard ? 'practice more' : 'keep going'}</div>
                </li>
              ))}
            </TriageList>
          ) : (
            <Empty><AlertTriangle />Solve problems across more topics to surface weak areas.</Empty>
          )}
        </Card>
      </Section>

      {/* Argyle ornament closes the page — gives the bottom space without filler */}
      <div style={{
        height: 18, marginTop: 24, opacity: .55,
        backgroundImage:
          'linear-gradient(45deg, transparent 48%, var(--cv-argyle-stitch) 49%, var(--cv-argyle-stitch) 51%, transparent 52%),' +
          'linear-gradient(-45deg, transparent 48%, var(--cv-argyle-stitch) 49%, var(--cv-argyle-stitch) 51%, transparent 52%)',
        backgroundSize: '14px 14px',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)',
        maskImage: 'linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)',
      }} aria-hidden />
    </Page>
  );
}
