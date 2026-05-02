import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { BarChart3, TrendingUp, Flame, Target, Calendar, X, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  getActivity, getDailyCounts, getStreak, getDifficultyCounts,
} from '../lib/activity';

const Page = styled.div`animation: fadeIn 0.4s ease;`;

const Grid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  @media(max-width:900px){ grid-template-columns: 1fr; }`;

const Card = styled.div`
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

const CardHead = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: 20px;
  font-size: 0.78rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--cv-text-secondary);
  svg { width: 16px; height: 16px; color: var(--cv-accent); }
  .meta { margin-left: auto; font-size: .72rem; color: var(--cv-text-muted); text-transform: none; letter-spacing: 0; font-weight: 500; }`;

const Empty = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 200px; text-align: center; color: var(--cv-text-muted); font-size: 0.85rem;
  svg { width: 32px; height: 32px; margin-bottom: 12px; opacity: 0.3; }`;

const Stats = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
  @media(max-width:900px){grid-template-columns:repeat(2,1fr);}`;

const StatBox = styled.div`
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

/* Contribution heatmap */
const HeatWrap = styled.div`
  position: relative;
  overflow-x:auto; overflow-y: hidden;
  padding-bottom:6px;
  scroll-behavior: smooth;
  &::-webkit-scrollbar{ height:8px; }
  &::-webkit-scrollbar-thumb{ background: var(--cv-border-default); border-radius: 4px; }
  &::-webkit-scrollbar-track{ background: transparent; }
`;
const ScrollBtn = styled.button`
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
const HeatGrid = styled.div`display:grid; grid-auto-flow:column; grid-template-rows:repeat(7, 13px); gap:3px;`;
const Cell = styled.button`
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
const DayPopover = styled.div`
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
const Legend = styled.div`display:flex; align-items:center; gap:6px; margin-top:10px; font-size:.7rem; color:var(--cv-text-muted);
  .b{width:11px;height:11px;border-radius:2.5px;border:1px solid var(--cv-border-subtle);}`;
const MonthRow = styled.div`display:flex; gap:0; margin-bottom:4px; font-size:.7rem; color:var(--cv-text-muted);
  padding-left:18px;`;
const Daycol = styled.div`display:flex; flex-direction:column; justify-content:space-between; padding-right:6px;
  font-size:.65rem; color:var(--cv-text-muted); height:101px; padding-top:2px;`;

// Local-time YYYY-MM-DD for a Date object — the calendar must use the
// same key format that getDailyCounts emits, which is local.
function localKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function buildHeatmap(daily) {
  // 53 weeks × 7 days, ending today.
  const today = new Date();
  today.setHours(0,0,0,0);
  const end = new Date(today);
  // Align end to Saturday so columns are full weeks (Sun-Sat).
  const offsetEnd = 6 - end.getDay();
  end.setDate(end.getDate() + offsetEnd);
  const start = new Date(end);
  start.setDate(start.getDate() - 53 * 7 + 1);

  const cells = [];
  const months = []; // [{label, colIndex}]
  let lastMonth = -1;
  let col = 0, row = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = localKey(d);
    const count = daily[key] || 0;
    let level = 0;
    if (count >= 1) level = 1;
    if (count >= 2) level = 2;
    if (count >= 4) level = 3;
    if (count >= 7) level = 4;
    const isFuture = d > today;
    cells.push({ key, count, level: isFuture ? -1 : level, label: d.toDateString() });
    if (row === 0 && d.getMonth() !== lastMonth) {
      months.push({ label: d.toLocaleString('en', { month: 'short' }), col });
      lastMonth = d.getMonth();
    }
    row = (row + 1) % 7;
    if (row === 0) col++;
  }
  return { cells, months };
}

export default function Analytics() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null); // 'YYYY-MM-DD'
  const heatRef = useRef(null);

  useEffect(() => {
    const refresh = () => setActivity(getActivity());
    refresh();
    window.addEventListener('cv:activity-changed', refresh);
    return () => window.removeEventListener('cv:activity-changed', refresh);
  }, []);

  // Scroll to the most recent week on mount/data-change so today is visible.
  useEffect(() => {
    if (heatRef.current) heatRef.current.scrollLeft = heatRef.current.scrollWidth;
  }, [activity]);

  const scrollHeat = (dir) => {
    if (!heatRef.current) return;
    heatRef.current.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  const openSolveFromCalendar = (a) => {
    if (!a?.problemId) return;
    if (a.problemId.startsWith('snippet:')) {
      navigate(`/workspace?snippet=${a.problemId.slice('snippet:'.length)}`);
    } else if (a.source === 'vault' && !a.problemId.startsWith('lc:')) {
      navigate(`/workspace?id=${a.problemId}`);
    } else {
      navigate(`/problems?q=${encodeURIComponent(a.title || '')}`);
    }
  };

  const solvedThisDay = useMemo(() => {
    if (!selectedDay) return [];
    return activity
      .filter(a => (a.solvedAt || '').slice(0, 10) === selectedDay)
      .sort((a, b) => (b.solvedAt || '').localeCompare(a.solvedAt || ''));
  }, [activity, selectedDay]);

  const daily = useMemo(() => getDailyCounts(), [activity]);
  const { current, longest } = useMemo(() => getStreak(), [activity]);
  const diffCounts = useMemo(() => getDifficultyCounts(), [activity]);

  const heat = useMemo(() => buildHeatmap(daily), [daily]);

  const last30 = useMemo(() => {
    const arr = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = localKey(d);
      arr.push({ name: key.slice(5), date: key, count: daily[key] || 0 });
    }
    return arr;
  }, [daily]);

  const diffData = Object.entries(diffCounts).map(([name, count]) => ({ name, count }));
  const totalSolves = activity.length;
  const activeDays = Object.keys(daily).length;

  return (
    <Page>
      <PageHeader
        eyebrow="Volume III — Cadence"
        title="Analytics"
        accent="& retention."
        subtitle="Performance, retention, and your daily coding rhythm — read the calendar like sheet music for the practice you keep."
      />

      <Stats>
        <StatBox><div className="val">{totalSolves}</div><div className="lbl">Total Solves</div></StatBox>
        <StatBox><div className="val">{activeDays}</div><div className="lbl">Active Days</div></StatBox>
        <StatBox><div className="val">{current}</div><div className="lbl">Current Streak</div></StatBox>
        <StatBox><div className="val">{longest}</div><div className="lbl">Longest Streak</div></StatBox>
      </Stats>

      <Card $span={2} style={{ marginBottom: 20 }}>
        <CardHead>
          <Calendar /> Contribution Calendar
          <span className="meta">{totalSolves} solves over the last year</span>
        </CardHead>
        {totalSolves > 0 ? (
          <>
            <div style={{ position: 'relative' }}>
              <ScrollBtn $side="left" onClick={() => scrollHeat(-1)} title="Scroll left"><ChevronLeft size={14}/></ScrollBtn>
              <ScrollBtn $side="right" onClick={() => scrollHeat(1)} title="Scroll right"><ChevronRight size={14}/></ScrollBtn>
              <HeatWrap ref={heatRef}>
                <MonthRow>
                  {heat.months.map((m, i) => (
                    <span key={i} style={{
                      marginLeft: i === 0 ? `${m.col * 16}px` : `${(m.col - heat.months[i-1].col) * 16 - 24}px`,
                      minWidth: 24,
                    }}>{m.label}</span>
                  ))}
                </MonthRow>
                <div style={{ display: 'flex' }}>
                  <Daycol>
                    <span>Mon</span><span>Wed</span><span>Fri</span>
                  </Daycol>
                  <HeatGrid>
                    {heat.cells.map((c, i) => {
                      const isFuture = c.level === -1;
                      const hasSolve = c.count > 0;
                      const interactive = !isFuture;
                      const handle = () => {
                        if (!interactive) return;
                        setSelectedDay(prev => prev === c.key ? null : c.key);
                      };
                      return (
                        <Cell
                          key={i}
                          $level={isFuture ? 0 : c.level}
                          $disabled={!interactive}
                          $selected={selectedDay === c.key}
                          aria-label={isFuture ? c.label : `${c.label} — ${c.count} solve${c.count===1?'':'s'}`}
                          title={isFuture ? c.label : `${c.label} · ${c.count} solve${c.count === 1 ? '' : 's'} — click for detail`}
                          style={isFuture ? { opacity: 0.25 } : {}}
                          onClick={handle}
                        />
                      );
                    })}
                  </HeatGrid>
                </div>
              </HeatWrap>
            </div>
            <Legend>
              <span>Less</span>
              <span className="b" style={{ background: 'var(--cv-bg-tertiary)' }} />
              <span className="b" style={{ background: 'rgba(99,102,241,.30)' }} />
              <span className="b" style={{ background: 'rgba(99,102,241,.55)' }} />
              <span className="b" style={{ background: 'rgba(99,102,241,.80)' }} />
              <span className="b" style={{ background: 'rgba(99,102,241,1)' }} />
              <span>More</span>
              <span style={{ marginLeft: 'auto', fontSize: '.7rem' }}>Click any day to see what you solved.</span>
            </Legend>
            {selectedDay && (
              <DayPopover>
                <div className="head">
                  <span className="date">{new Date(selectedDay + 'T00:00:00').toDateString()}</span>
                  <span className="badge">{solvedThisDay.length} solve{solvedThisDay.length === 1 ? '' : 's'}</span>
                  <button onClick={() => setSelectedDay(null)} aria-label="Close"><X size={14}/></button>
                </div>
                {solvedThisDay.length === 0 ? (
                  <div className="empty">No solves recorded on this day.</div>
                ) : (
                  solvedThisDay.map((a, i) => (
                    <div key={i} className="row" onClick={() => openSolveFromCalendar(a)}>
                      <CheckCircle2 />
                      <span className="t">{a.title || 'Untitled'}</span>
                      <span className="d">{a.difficulty || a.source}</span>
                    </div>
                  ))
                )}
              </DayPopover>
            )}
          </>
        ) : (
          <Empty><Calendar />Solve a problem to start your contribution calendar</Empty>
        )}
      </Card>

      <Grid>
        <Card>
          <CardHead><BarChart3 /> Solves — Last 30 Days</CardHead>
          {totalSolves > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={last30}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cv-border-subtle)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--cv-text-muted)', fontSize: 10 }} interval={3} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--cv-text-muted)', fontSize: 11 }} />
                <Tooltip formatter={v => [`${v} solves`, 'Count']} />
                <Bar dataKey="count" fill="var(--cv-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty><BarChart3 />No solves yet</Empty>
          )}
        </Card>

        <Card>
          <CardHead><Target /> Difficulty Mix</CardHead>
          {totalSolves > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={diffData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cv-border-subtle)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--cv-text-muted)', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--cv-text-muted)', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--cv-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty><Target />Solve problems to see your mix</Empty>
          )}
        </Card>

        <Card $span={2}>
          <CardHead><Flame /> Streak Detail</CardHead>
          {totalSolves > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <StatBox><div className="val">{current}</div><div className="lbl">Current</div></StatBox>
              <StatBox><div className="val">{longest}</div><div className="lbl">Longest</div></StatBox>
              <StatBox><div className="val">{activeDays}</div><div className="lbl">Active Days</div></StatBox>
              <StatBox><div className="val">{activeDays > 0 ? (totalSolves / activeDays).toFixed(1) : '—'}</div><div className="lbl">Avg / Day</div></StatBox>
            </div>
          ) : (
            <Empty><TrendingUp />Solve consistently to build a streak</Empty>
          )}
        </Card>
      </Grid>
    </Page>
  );
}
