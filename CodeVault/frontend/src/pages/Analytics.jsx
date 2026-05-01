import { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { BarChart3, TrendingUp, Flame, Target, Calendar } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  getActivity, getDailyCounts, getStreak, getDifficultyCounts,
} from '../lib/activity';

const Page = styled.div`animation: fadeIn 0.4s ease;`;
const Header = styled.header`margin-bottom: 28px;
  h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 4px; }
  p { color: var(--cv-text-secondary); font-size: 0.9rem; }`;

const Grid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  @media(max-width:900px){ grid-template-columns: 1fr; }`;

const Card = styled.div`
  background: var(--cv-glass-bg); backdrop-filter: blur(20px);
  border: 1px solid var(--cv-border-subtle); border-radius: 14px;
  padding: 24px; box-shadow: var(--cv-glass-shadow);
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
  background: var(--cv-glass-bg); border: 1px solid var(--cv-border-subtle);
  border-radius: 12px; padding: 18px; text-align: center;
  .val { font-size: 1.5rem; font-weight: 700; color: var(--cv-text-primary); }
  .lbl { font-size: 0.72rem; color: var(--cv-text-muted); text-transform: uppercase; margin-top: 4px; }`;

/* Contribution heatmap */
const HeatWrap = styled.div`overflow-x:auto; padding-bottom:6px;`;
const HeatGrid = styled.div`display:grid; grid-auto-flow:column; grid-template-rows:repeat(7, 13px); gap:3px;`;
const Cell = styled.div`
  width:13px; height:13px; border-radius:3px;
  background:${p =>
    p.$level === 0 ? 'var(--cv-bg-tertiary)' :
    p.$level === 1 ? 'rgba(99,102,241,.30)' :
    p.$level === 2 ? 'rgba(99,102,241,.55)' :
    p.$level === 3 ? 'rgba(99,102,241,.80)' :
    'rgba(99,102,241,1)'};
  border:1px solid var(--cv-border-subtle);
  cursor:default;
  &:hover{outline:1px solid var(--cv-accent);}
`;
const Legend = styled.div`display:flex; align-items:center; gap:6px; margin-top:10px; font-size:.7rem; color:var(--cv-text-muted);
  .b{width:11px;height:11px;border-radius:2.5px;border:1px solid var(--cv-border-subtle);}`;
const MonthRow = styled.div`display:flex; gap:0; margin-bottom:4px; font-size:.7rem; color:var(--cv-text-muted);
  padding-left:18px;`;
const Daycol = styled.div`display:flex; flex-direction:column; justify-content:space-between; padding-right:6px;
  font-size:.65rem; color:var(--cv-text-muted); height:101px; padding-top:2px;`;

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
    const key = d.toISOString().slice(0, 10);
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
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const refresh = () => setActivity(getActivity());
    refresh();
    window.addEventListener('cv:activity-changed', refresh);
    return () => window.removeEventListener('cv:activity-changed', refresh);
  }, []);

  const daily = useMemo(() => getDailyCounts(), [activity]);
  const { current, longest } = useMemo(() => getStreak(), [activity]);
  const diffCounts = useMemo(() => getDifficultyCounts(), [activity]);

  const heat = useMemo(() => buildHeatmap(daily), [daily]);

  const last30 = useMemo(() => {
    const arr = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      arr.push({ name: key.slice(5), date: key, count: daily[key] || 0 });
    }
    return arr;
  }, [daily]);

  const diffData = Object.entries(diffCounts).map(([name, count]) => ({ name, count }));
  const totalSolves = activity.length;
  const activeDays = Object.keys(daily).length;

  return (
    <Page>
      <Header>
        <h1>Analytics</h1>
        <p>Performance, retention, and your daily coding cadence.</p>
      </Header>

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
          <HeatWrap>
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
                {heat.cells.map((c, i) => (
                  <Cell
                    key={i}
                    $level={c.level === -1 ? 0 : c.level}
                    title={c.level === -1 ? c.label : `${c.label} · ${c.count} solve${c.count === 1 ? '' : 's'}`}
                    style={c.level === -1 ? { opacity: 0.25 } : {}}
                  />
                ))}
              </HeatGrid>
            </div>
            <Legend>
              <span>Less</span>
              <span className="b" style={{ background: 'var(--cv-bg-tertiary)' }} />
              <span className="b" style={{ background: 'rgba(99,102,241,.30)' }} />
              <span className="b" style={{ background: 'rgba(99,102,241,.55)' }} />
              <span className="b" style={{ background: 'rgba(99,102,241,.80)' }} />
              <span className="b" style={{ background: 'rgba(99,102,241,1)' }} />
              <span>More</span>
            </Legend>
          </HeatWrap>
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
