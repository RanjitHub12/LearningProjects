import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { BarChart3, TrendingUp, Clock, Target } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

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
  svg { width: 16px; height: 16px; color: var(--cv-accent); }`;

const Empty = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 200px; text-align: center; color: var(--cv-text-muted); font-size: 0.85rem;
  svg { width: 32px; height: 32px; margin-bottom: 12px; opacity: 0.3; }`;

const Stats = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;`;

const StatBox = styled.div`
  background: var(--cv-glass-bg); border: 1px solid var(--cv-border-subtle);
  border-radius: 12px; padding: 18px; text-align: center;
  .val { font-size: 1.5rem; font-weight: 700; color: var(--cv-text-primary); }
  .lbl { font-size: 0.72rem; color: var(--cv-text-muted); text-transform: uppercase; margin-top: 4px; }`;

export default function Analytics() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/problems?limit=200').then(r => r.ok ? r.json() : [])
      .then(setProblems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const diffCounts = { Easy: 0, Medium: 0, Hard: 0, Impossible: 0 };
  problems.forEach(p => { if (diffCounts[p.difficulty] !== undefined) diffCounts[p.difficulty]++; });
  const chartData = Object.entries(diffCounts).map(([name, count]) => ({ name, count }));
  const hasData = problems.length > 0;

  return (
    <Page>
      <Header><h1>Analytics</h1><p>Performance insights, retention trends, and readiness scores.</p></Header>

      <Stats>
        <StatBox><div className="val">{loading ? '—' : problems.length}</div><div className="lbl">Total Problems</div></StatBox>
        <StatBox><div className="val">{loading ? '—' : 0}</div><div className="lbl">Practice Sessions</div></StatBox>
        <StatBox><div className="val">{loading ? '—' : '—'}</div><div className="lbl">Avg Accuracy</div></StatBox>
      </Stats>

      <Grid>
        <Card>
          <CardHead><BarChart3 /> Difficulty Distribution</CardHead>
          {hasData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cv-border-subtle)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--cv-text-muted)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--cv-text-muted)', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--cv-accent)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty><BarChart3 />Upload problems to see distribution</Empty>
          )}
        </Card>

        <Card>
          <CardHead><TrendingUp /> Progress Over Time</CardHead>
          <Empty><TrendingUp />Complete practice sessions to track progress</Empty>
        </Card>

        <Card>
          <CardHead><Clock /> Solve Time Trends</CardHead>
          <Empty><Clock />Solve time data will appear after practice</Empty>
        </Card>

        <Card>
          <CardHead><Target /> Topic Mastery</CardHead>
          <Empty><Target />Practice across topics to build mastery data</Empty>
        </Card>
      </Grid>
    </Page>
  );
}
