import { Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardHead, Empty, RecentList } from './styles';

/** Last six solves — clicking a row navigates back to where it was solved. */
export default function RecentSolves({ recent, openSolve }) {
  return (
    <Card>
      <CardHead>
        <Clock />
        <span className="h">Recent Solves</span>
        <span className="sub">last six</span>
      </CardHead>
      {recent.length > 0 ? (
        <RecentList>
          {recent.map((a, i) => (
            <li key={i}
              onClick={() => openSolve(a)}
              title="Open this problem"
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
  );
}
