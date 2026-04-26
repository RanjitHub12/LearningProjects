import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Activity, Flame, Clock, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react';

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

export default function Dashboard() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/problems?limit=200').then(r => r.ok ? r.json() : [])
      .then(d => setProblems(d)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Dynamically collect all unique tags and their counts from uploaded problems
  const tagCounts = {};
  problems.forEach(p => {
    (p.dsa_tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const allTags = Object.keys(tagCounts);
  const maxCount = Math.max(...Object.values(tagCounts), 1);
  const radarData = allTags.map(tag => ({
    subject: tag,
    score: Math.round((tagCounts[tag] / maxCount) * 100),
    count: tagCounts[tag],
  }));

  const total = problems.length;

  return (
    <Page>
      <Header>
        <h1>Dashboard</h1>
        <p>Your coding preparation command center.</p>
      </Header>

      <Stats>
        <Stat $bg="var(--cv-accent-muted)" $color="var(--cv-accent)">
          <div className="icon"><BookOpen size={20} /></div>
          <div><div className="value">{loading ? '—' : total}</div><div className="label">Problems</div></div>
        </Stat>
        <Stat $bg="rgba(34,197,94,0.1)" $color="#22c55e">
          <div className="icon"><Activity size={20} /></div>
          <div><div className="value">{loading ? '—' : allTags.length}</div><div className="label">Topics Covered</div></div>
        </Stat>
        <Stat $bg="rgba(245,158,11,0.1)" $color="#f59e0b">
          <div className="icon"><Flame size={20} /></div>
          <div><div className="value">{loading ? '—' : 0}</div><div className="label">Day Streak</div></div>
        </Stat>
        <Stat $bg="rgba(59,130,246,0.1)" $color="#3b82f6">
          <div className="icon"><Clock size={20} /></div>
          <div><div className="value">{loading ? '—' : '—'}</div><div className="label">Avg Solve Time</div></div>
        </Stat>
      </Stats>

      <Grid>
        <Card>
          <CardHead><TrendingUp /> Proficiency Radar</CardHead>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="var(--cv-border-default)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--cv-text-muted)', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} tick={false} domain={[0, 100]} />
                <Tooltip formatter={(v, n, p) => [`${p.payload.count} problems`, p.payload.subject]} />
                <Radar dataKey="score" stroke="var(--cv-accent)" fill="var(--cv-accent)" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <Empty><TrendingUp />Upload problems to see your topic coverage</Empty>
          )}
        </Card>

        <Card>
          <CardHead><Activity /> Retention Heatmap</CardHead>
          <Empty><Activity />Upload and solve problems to build your retention map</Empty>
        </Card>

        <Card $span={2}>
          <CardHead><AlertTriangle /> Weakness Triage</CardHead>
          <Empty><AlertTriangle />Start practicing to surface weak topics that need attention</Empty>
        </Card>
      </Grid>
    </Page>
  );
}
