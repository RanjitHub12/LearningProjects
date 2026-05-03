/**
 * Analytics — performance, retention, daily coding rhythm.
 *
 * Top stat strip → year-long contribution calendar (with day popover) →
 * last-30-days bar chart + difficulty mix + streak detail.
 */
import { useState, useEffect, useMemo } from 'react';
import PageHeader from '../../components/PageHeader';
import {
  getActivity, getDailyCounts, getStreak, getDifficultyCounts,
} from '../../lib/activity';

import { Page, Stats, StatBox } from './styles';
import { localKey, buildHeatmap } from './utils';
import Calendar from './Calendar';
import Charts from './Charts';

export default function Analytics() {
  const [activity, setActivity] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null); // 'YYYY-MM-DD'

  useEffect(() => {
    const refresh = () => setActivity(getActivity());
    refresh();
    window.addEventListener('cv:activity-changed', refresh);
    return () => window.removeEventListener('cv:activity-changed', refresh);
  }, []);

  const solvedThisDay = useMemo(() => {
    if (!selectedDay) return [];
    return activity
      .filter(a => (a.solvedAt || '').slice(0, 10) === selectedDay)
      .sort((a, b) => (b.solvedAt || '').localeCompare(a.solvedAt || ''));
  }, [activity, selectedDay]);

  const daily = useMemo(() => getDailyCounts(), [activity]);
  const { current, longest } = useMemo(() => getStreak(), [activity]);
  const diffCounts = useMemo(() => getDifficultyCounts(), [activity]);
  const heat = useMemo(() => buildHeatmap(daily), [daily]);

  const last30 = useMemo(() => {
    const arr = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = localKey(d);
      arr.push({ name: key.slice(5), date: key, count: daily[key] || 0 });
    }
    return arr;
  }, [daily]);

  const diffData = Object.entries(diffCounts).map(([name, count]) => ({ name, count }));
  const totalSolves = activity.length;
  const activeDays = Object.keys(daily).length;

  return (
    <Page>
      <PageHeader
        eyebrow="Volume III — Cadence"
        title="Analytics"
        accent="& retention."
        subtitle="Performance, retention, and your daily coding rhythm — read the calendar like sheet music for the practice you keep."
      />

      <Stats>
        <StatBox><div className="val">{totalSolves}</div><div className="lbl">Total Solves</div></StatBox>
        <StatBox><div className="val">{activeDays}</div><div className="lbl">Active Days</div></StatBox>
        <StatBox><div className="val">{current}</div><div className="lbl">Current Streak</div></StatBox>
        <StatBox><div className="val">{longest}</div><div className="lbl">Longest Streak</div></StatBox>
      </Stats>

      <Calendar
        totalSolves={totalSolves}
        heat={heat}
        selectedDay={selectedDay} setSelectedDay={setSelectedDay}
        solvedThisDay={solvedThisDay}/>

      <Charts
        totalSolves={totalSolves}
        last30={last30} diffData={diffData}
        current={current} longest={longest} activeDays={activeDays}/>
    </Page>
  );
}
