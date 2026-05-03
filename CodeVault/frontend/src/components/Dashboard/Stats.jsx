import { Activity, Flame, BookOpen, CheckCircle2 } from 'lucide-react';
import { Stats as StatsGrid, Stat } from './styles';

/** Four "at a glance" metric tiles: solved, topics, streak, average. */
export default function Stats({ totalSolved, topicCount, streak, avgPerDay }) {
  return (
    <StatsGrid>
      <Stat $bg="rgba(52,211,153,0.10)" $color="var(--cv-success)">
        <div className="icon"><CheckCircle2 size={18} /></div>
        <div className="body">
          <div className="value">{totalSolved}</div>
          <div className="label">Problems Solved</div>
        </div>
      </Stat>
      <Stat $bg="var(--cv-accent-muted)" $color="var(--cv-accent)">
        <div className="icon"><BookOpen size={18} /></div>
        <div className="body">
          <div className="value">{topicCount}</div>
          <div className="label">Topics Practiced</div>
        </div>
      </Stat>
      <Stat $bg="var(--cv-rose-muted)" $color="var(--cv-rose)">
        <div className="icon"><Flame size={18} /></div>
        <div className="body">
          <div className="value">{streak}</div>
          <div className="label">Day Streak</div>
        </div>
      </Stat>
      <Stat $bg="rgba(96,165,250,0.10)" $color="var(--cv-info)">
        <div className="icon"><Activity size={18} /></div>
        <div className="body">
          <div className="value">{avgPerDay}</div>
          <div className="label">Avg / Active Day</div>
        </div>
      </Stat>
    </StatsGrid>
  );
}
