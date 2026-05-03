import { AlertTriangle } from 'lucide-react';
import { Card, CardHead, Empty, TriageList } from './styles';

/** "Where to grow next" — the six topics with the fewest solves. */
export default function Triage({ weakest, hasHardSolves }) {
  return (
    <Card>
      <CardHead>
        <AlertTriangle />
        <span className="h">Weakness Triage</span>
        <span className="sub">topics with the fewest solves</span>
      </CardHead>
      {weakest.length >= 3 ? (
        <TriageList>
          {weakest.map(([tag, count]) => (
            <li key={tag}>
              <div className="name">{tag}</div>
              <div className="meta">
                {count} solved · {hasHardSolves ? 'practice more' : 'keep going'}
              </div>
            </li>
          ))}
        </TriageList>
      ) : (
        <Empty><AlertTriangle />Solve problems across more topics to surface weak areas.</Empty>
      )}
    </Card>
  );
}
