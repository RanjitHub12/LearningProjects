/**
 * Dashboard — editorial homepage.
 *
 * Hero (display headline + argyle SVG) followed by three numbered sections:
 *   01 At a glance      — four stat tiles
 *   02 Patterns & recency — proficiency radar + recent solves
 *   03 Where to grow next — weakness triage
 *
 * All data comes from lib/activity.js (localStorage-backed solve log).
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getActivity, getStreak, getTagCounts, getDifficultyCounts,
} from '../../lib/activity';

import { Page, Section, Grid } from './styles';
import Hero from './Hero';
import SectionLead from './SectionLead';
import Stats from './Stats';
import RadarCard from './RadarCard';
import RecentSolves from './RecentSolves';
import Triage from './Triage';

export default function Dashboard() {
  const navigate = useNavigate();
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

  // Map an activity entry to a destination route. Vault problems open at
  // /workspace?id=<uuid>; LeetCode daily entries (problemId starts "lc:")
  // have no internal route, so we fall back to a Practice search.
  const openSolve = (a) => {
    if (!a?.problemId) return;
    if (a.source === 'vault' && !a.problemId.startsWith('lc:') && !a.problemId.startsWith('snippet:')) {
      navigate(`/workspace?id=${a.problemId}`);
    } else if (a.problemId.startsWith('snippet:')) {
      navigate(`/workspace?snippet=${a.problemId.slice('snippet:'.length)}`);
    } else {
      navigate(`/problems?q=${encodeURIComponent(a.title || '')}`);
    }
  };

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
  const recent = [...activity]
    .sort((a, b) => (b.solvedAt || '').localeCompare(a.solvedAt || ''))
    .slice(0, 6);

  const weakest = Object.entries(tagCounts).sort((a, b) => a[1] - b[1]).slice(0, 6);

  const days = new Set(activity.map(a => (a.solvedAt || '').slice(0, 10)).filter(Boolean));
  const avgPerDay = days.size > 0 ? (totalSolved / days.size).toFixed(1) : '—';

  return (
    <Page>
      <Hero />

      <Section>
        <SectionLead num="01" label="At a glance" />
        <Stats
          totalSolved={totalSolved}
          topicCount={allTags.length}
          streak={streak}
          avgPerDay={avgPerDay}/>
      </Section>

      <Section>
        <SectionLead num="02" label="Patterns & recency" />
        <Grid>
          <RadarCard radarData={radarData}/>
          <RecentSolves recent={recent} openSolve={openSolve}/>
        </Grid>
      </Section>

      <Section>
        <SectionLead num="03" label="Where to grow next" />
        <Triage weakest={weakest} hasHardSolves={!!diffCounts.Hard}/>
      </Section>

      {/* Argyle ornament closes the page — gives the bottom space without filler */}
      <div style={{
        height: 18, marginTop: 24, opacity: .55,
        backgroundImage:
          'linear-gradient(45deg, transparent 48%, var(--cv-argyle-stitch) 49%, var(--cv-argyle-stitch) 51%, transparent 52%),' +
          'linear-gradient(-45deg, transparent 48%, var(--cv-argyle-stitch) 49%, var(--cv-argyle-stitch) 51%, transparent 52%)',
        backgroundSize: '14px 14px',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)',
        maskImage: 'linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)',
      }} aria-hidden />
    </Page>
  );
}
