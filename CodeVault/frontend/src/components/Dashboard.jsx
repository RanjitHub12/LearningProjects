import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Activity, Flame, Clock, BookOpen, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  getActivity, getStreak, getTagCounts, getDifficultyCounts,
} from '../lib/activity';

const Page = styled.div`animation: fadeIn 0.4s ease;`;
const Header = styled.header`margin-bottom: 32px;
  h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 4px; }
  p { color: var(--cv-text-secondary); font-size: 0.9rem; }`;

const Stats = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px;
  @media(max-width:1024px){ grid-template-columns: repeat(2, 1fr); }`;

const Stat = styled.div`
  background: var(--cv-glass-bg); backdrop-filter: blur(20px);
  border: 1px solid var(--cv-border-subtle); border-radius: 12px;
  padding: 20px; display: flex; align-items: center; gap: 16px;
  transition: all 0.2s ease; box-shadow: var(--cv-glass-shadow);
  &:hover { border-color: var(--cv-border-hover); transform: translateY(-1px);
    box-shadow: var(--cv-glass-shadow-lg); }
  .icon { width: 42px; height: 42px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: ${p => p.$bg || 'var(--cv-accent-muted)'};
    color: ${p => p.$color || 'var(--cv-accent)'}; flex-shrink: 0; }
  .value { font-size: 1.6rem; font-weight: 700; line-height: 1; letter-spacing: -0.03em; }
  .label { font-size: 0.72rem; font-weight: 500; color: var(--cv-text-muted);
    text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }`;

const Grid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  @media(max-width:900px){ grid-template-columns: 1fr; }`;

const Card = styled.div`
  background: var(--cv-glass-bg); backdrop-filter: blur(20px);
  border: 1px solid var(--cv-border-subtle); border-radius: 14px;
  padding: 24px; box-shadow: var(--cv-glass-shadow);
  transition: all 0.2s ease;
  &:hover { border-color: var(--cv-border-hover); }
  ${p => p.$span && `grid-column: span ${p.$span};`}`;

const CardHead = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: 20px;
  font-size: 0.78rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--cv-text-secondary);
  svg { width: 16px; height: 16px; color: var(--cv-accent); }`;

const Empty = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 180px; text-align: center; color: var(--cv-text-muted); font-size: 0.85rem;
  svg { width: 32px; height: 32px; margin-bottom: 12px; opacity: 0.3; }`;

const RecentList = styled.ul`list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px;
  li { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:9px;
    background: var(--cv-bg-tertiary); border:1px solid var(--cv-border-subtle); font-size:.83rem;
    .t{flex:1; color:var(--cv-text-primary); font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
    .d{font-size:.7rem; color:var(--cv-text-muted); font-family:var(--cv-font-mono);}
    svg{width:14px;height:14px;color:var(--cv-success,#3fb950);flex-shrink:0;} }`;

const TriageList = styled.ul`list-style:none; padding:0; margin:0; display:grid; gap:8px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  li{padding:10px 12px; border-radius:9px; background:var(--cv-bg-tertiary);
    border:1px solid var(--cv-border-subtle); font-size:.8rem;
    .name{font-weight:600;color:var(--cv-text-primary);margin-bottom:2px;}
    .meta{font-size:.7rem;color:var(--cv-text-muted);font-family:var(--cv-font-mono);}}`;

export default function Dashboard() {
  const [activity, setActivity] = useState([]);

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

  // Weakness triage: tags with the fewest solves (bottom 6) — only if you've solved across enough tags.
  const weakest = Object.entries(tagCounts)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 6);

  // Avg solves per active day
  const days = new Set(activity.map(a => (a.solvedAt || '').slice(0, 10)).filter(Boolean));
  const avgPerDay = days.size > 0 ? (totalSolved / days.size).toFixed(1) : '—';

  return (
    <Page>
      <Header>
        <h1>Dashboard</h1>
        <p>Your progress on problems you've solved here. Tracks practice activity, not uploads.</p>
      </Header>

      <Stats>
        <Stat $bg="rgba(34,197,94,0.1)" $color="#22c55e">
          <div className="icon"><CheckCircle2 size={20} /></div>
          <div><div className="value">{totalSolved}</div><div className="label">Problems Solved</div></div>
        </Stat>
        <Stat $bg="var(--cv-accent-muted)" $color="var(--cv-accent)">
          <div className="icon"><BookOpen size={20} /></div>
          <div><div className="value">{allTags.length}</div><div className="label">Topics Practiced</div></div>
        </Stat>
        <Stat $bg="rgba(245,158,11,0.1)" $color="#f59e0b">
          <div className="icon"><Flame size={20} /></div>
          <div><div className="value">{streak}</div><div className="label">Day Streak</div></div>
        </Stat>
        <Stat $bg="rgba(59,130,246,0.1)" $color="#3b82f6">
          <div className="icon"><Activity size={20} /></div>
          <div><div className="value">{avgPerDay}</div><div className="label">Avg / Active Day</div></div>
        </Stat>
      </Stats>

      <Grid>
        <Card>
          <CardHead><TrendingUp /> Proficiency Radar</CardHead>
          {radarData.length >= 3 ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="var(--cv-border-default)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--cv-text-muted)', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} tick={false} domain={[0, 100]} />
                <Tooltip formatter={(v, n, p) => [`${p.payload.count} solved`, p.payload.subject]} />
                <Radar dataKey="score" stroke="var(--cv-accent)" fill="var(--cv-accent)" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <Empty><TrendingUp />Solve problems across at least 3 topics to see your radar</Empty>
          )}
        </Card>

        <Card>
          <CardHead><Clock /> Recent Solves</CardHead>
          {recent.length > 0 ? (
            <RecentList>
              {recent.map((a, i) => (
                <li key={i}>
                  <CheckCircle2 />
                  <span className="t">{a.title || 'Untitled'}</span>
                  <span className="d">{(a.solvedAt || '').slice(0, 10)}</span>
                </li>
              ))}
            </RecentList>
          ) : (
            <Empty><Clock />Mark problems as solved in the Workspace to populate this</Empty>
          )}
        </Card>

        <Card $span={2}>
          <CardHead><AlertTriangle /> Weakness Triage</CardHead>
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
            <Empty><AlertTriangle />Solve problems across more topics to surface weak areas</Empty>
          )}
        </Card>
      </Grid>
    </Page>
  );
}
