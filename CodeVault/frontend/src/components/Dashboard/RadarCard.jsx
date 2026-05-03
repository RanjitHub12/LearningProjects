import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card, CardHead, Empty } from './styles';

/** Topic-coverage radar driven by getTagCounts(). Hidden until 3+ topics. */
export default function RadarCard({ radarData }) {
  return (
    <Card>
      <CardHead>
        <TrendingUp />
        <span className="h">Proficiency Radar</span>
        <span className="sub">across topics</span>
      </CardHead>
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
  );
}
