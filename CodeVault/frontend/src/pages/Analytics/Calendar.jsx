import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, CheckCircle2,
} from 'lucide-react';
import {
  Card, CardHead, Empty, HeatWrap, ScrollBtn, HeatGrid, Cell,
  DayPopover, Legend, MonthRow, Daycol,
} from './styles';

/**
 * Year-long contribution calendar with a per-day popover.
 *
 * The cell click toggles the popover for that day; clicking a row in the
 * popover navigates back to the originating Workspace / Problem page.
 */
export default function Calendar({
  totalSolves, heat,
  selectedDay, setSelectedDay,
  solvedThisDay,
}) {
  const navigate = useNavigate();
  const heatRef = useRef(null);

  // Auto-scroll to the most recent week on mount/data-change so today is visible.
  useEffect(() => {
    if (heatRef.current) heatRef.current.scrollLeft = heatRef.current.scrollWidth;
  }, [heat]);

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

  return (
    <Card $span={2} style={{ marginBottom: 20 }}>
      <CardHead>
        <CalendarIcon /> Contribution Calendar
        <span className="meta">{totalSolves} solves over the last year</span>
      </CardHead>

      {totalSolves === 0 ? (
        <Empty><CalendarIcon />Solve a problem to start your contribution calendar</Empty>
      ) : (
        <>
          <div style={{ position:'relative' }}>
            <ScrollBtn $side="left" onClick={()=>scrollHeat(-1)} title="Scroll left">
              <ChevronLeft size={14}/>
            </ScrollBtn>
            <ScrollBtn $side="right" onClick={()=>scrollHeat(1)} title="Scroll right">
              <ChevronRight size={14}/>
            </ScrollBtn>
            <HeatWrap ref={heatRef}>
              <MonthRow>
                {heat.months.map((m, i) => (
                  <span key={i} style={{
                    marginLeft: i === 0
                      ? `${m.col * 16}px`
                      : `${(m.col - heat.months[i-1].col) * 16 - 24}px`,
                    minWidth: 24,
                  }}>{m.label}</span>
                ))}
              </MonthRow>
              <div style={{ display:'flex' }}>
                <Daycol>
                  <span>Mon</span><span>Wed</span><span>Fri</span>
                </Daycol>
                <HeatGrid>
                  {heat.cells.map((c, i) => {
                    const isFuture = c.level === -1;
                    return (
                      <Cell
                        key={i}
                        $level={isFuture ? 0 : c.level}
                        $disabled={isFuture}
                        $selected={selectedDay === c.key}
                        aria-label={isFuture ? c.label : `${c.label} — ${c.count} solve${c.count===1?'':'s'}`}
                        title={isFuture
                          ? c.label
                          : `${c.label} · ${c.count} solve${c.count === 1 ? '' : 's'} — click for detail`}
                        style={isFuture ? { opacity: 0.25 } : {}}
                        onClick={()=>{
                          if (isFuture) return;
                          setSelectedDay(prev => prev === c.key ? null : c.key);
                        }}
                      />
                    );
                  })}
                </HeatGrid>
              </div>
            </HeatWrap>
          </div>

          <Legend>
            <span>Less</span>
            <span className="b" style={{ background:'var(--cv-bg-tertiary)' }} />
            <span className="b" style={{ background:'rgba(99,102,241,.30)' }} />
            <span className="b" style={{ background:'rgba(99,102,241,.55)' }} />
            <span className="b" style={{ background:'rgba(99,102,241,.80)' }} />
            <span className="b" style={{ background:'rgba(99,102,241,1)' }} />
            <span>More</span>
            <span style={{ marginLeft:'auto', fontSize:'.7rem' }}>
              Click any day to see what you solved.
            </span>
          </Legend>

          {selectedDay && (
            <DayPopover>
              <div className="head">
                <span className="date">{new Date(selectedDay + 'T00:00:00').toDateString()}</span>
                <span className="badge">
                  {solvedThisDay.length} solve{solvedThisDay.length === 1 ? '' : 's'}
                </span>
                <button onClick={()=>setSelectedDay(null)} aria-label="Close"><X size={14}/></button>
              </div>
              {solvedThisDay.length === 0 ? (
                <div className="empty">No solves recorded on this day.</div>
              ) : solvedThisDay.map((a, i) => (
                <div key={i} className="row" onClick={()=>openSolveFromCalendar(a)}>
                  <CheckCircle2 />
                  <span className="t">{a.title || 'Untitled'}</span>
                  <span className="d">{a.difficulty || a.source}</span>
                </div>
              ))}
            </DayPopover>
          )}
        </>
      )}
    </Card>
  );
}
