import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BarChart3, Target, Flame, TrendingUp } from 'lucide-react';
import { Grid, Card, CardHead, Empty, StatBox } from './styles';

/** Last-30-days bar chart, difficulty mix, and streak detail tile row. */
export default function Charts({
  totalSolves, last30, diffData,
  current, longest, activeDays,
}) {
  return (
    <Grid>
      <Card>
        <CardHead><BarChart3 /> Solves — Last 30 Days</CardHead>
        {totalSolves > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={last30}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cv-border-subtle)" />
              <XAxis dataKey="name" tick={{ fill:'var(--cv-text-muted)', fontSize:10 }} interval={3} />
              <YAxis allowDecimals={false} tick={{ fill:'var(--cv-text-muted)', fontSize:11 }} />
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
              <XAxis dataKey="name" tick={{ fill:'var(--cv-text-muted)', fontSize:12 }} />
              <YAxis allowDecimals={false} tick={{ fill:'var(--cv-text-muted)', fontSize:12 }} />
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
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12 }}>
            <StatBox><div className="val">{current}</div><div className="lbl">Current</div></StatBox>
            <StatBox><div className="val">{longest}</div><div className="lbl">Longest</div></StatBox>
            <StatBox><div className="val">{activeDays}</div><div className="lbl">Active Days</div></StatBox>
            <StatBox>
              <div className="val">{activeDays > 0 ? (totalSolves / activeDays).toFixed(1) : '—'}</div>
              <div className="lbl">Avg / Day</div>
            </StatBox>
          </div>
        ) : (
          <Empty><TrendingUp />Solve consistently to build a streak</Empty>
        )}
      </Card>
    </Grid>
  );
}
