import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Target, Clock, AlertTriangle, Play, ChevronRight } from 'lucide-react';

const Page = styled.div`animation: fadeIn 0.4s ease;`;
const Header = styled.header`margin-bottom: 28px;
  h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 4px; }
  p { color: var(--cv-text-secondary); font-size: 0.9rem; }`;

const Empty = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 380px; text-align: center;
  svg { width: 48px; height: 48px; color: var(--cv-text-muted); opacity: 0.3; margin-bottom: 16px; }
  h2 { font-size: 1.1rem; font-weight: 600; color: var(--cv-text-secondary); margin-bottom: 6px; }
  p { color: var(--cv-text-muted); max-width: 380px; font-size: 0.85rem; line-height: 1.6; }`;

const InfoBar = styled.div`
  display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;`;

const Badge = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; border-radius: 10px;
  background: var(--cv-glass-bg); border: 1px solid var(--cv-border-subtle);
  font-size: 0.82rem; font-weight: 600; color: ${p => p.$color || 'var(--cv-accent)'};
  svg { width: 16px; height: 16px; }`;

const Card = styled.div`
  background: var(--cv-glass-bg); backdrop-filter: blur(20px);
  border: 1px solid var(--cv-border-subtle); border-radius: 12px;
  padding: 16px 20px; margin-bottom: 8px;
  display: flex; align-items: center; gap: 14px;
  transition: all 0.15s ease;
  &:hover { border-color: var(--cv-border-hover); transform: translateX(2px);
    box-shadow: var(--cv-glass-shadow); }`;

const CardInfo = styled.div`flex: 1;
  .name { font-weight: 600; font-size: 0.9rem; margin-bottom: 4px; }`;

const Tags = styled.div`display: flex; gap: 4px; flex-wrap: wrap;`;

const SolveBtn = styled.button`
  padding: 8px 20px; border-radius: 8px; border: none; cursor: pointer;
  background: var(--cv-gradient-primary); color: #fff;
  font-family: inherit; font-size: 0.8rem; font-weight: 600;
  display: flex; align-items: center; gap: 6px;
  transition: all 0.2s;
  &:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.3); }`;

export default function Practice() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/problems?limit=10').then(r => r.ok ? r.json() : [])
      .then(setProblems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const startPractice = (problemId) => {
    navigate(`/workspace?id=${problemId}&practice=true`);
  };

  return (
    <Page>
      <Header><h1>Practice</h1><p>Daily queue powered by SM-2 spaced repetition. Timer starts when you open a problem.</p></Header>

      {loading ? (
        <Empty><Target /><h2>Loading...</h2></Empty>
      ) : problems.length === 0 ? (
        <Empty>
          <Target />
          <h2>No practice problems available</h2>
          <p>Upload solution files to build your vault. The SM-2 algorithm will create a personalized daily queue targeting your weakest topics.</p>
        </Empty>
      ) : (
        <>
          <InfoBar>
            <Badge><Target size={16} /> {problems.length} in queue</Badge>
            <Badge $color="var(--cv-warning)"><AlertTriangle size={16} /> Tab-switch detection active</Badge>
          </InfoBar>

          {problems.map(p => (
            <Card key={p.id}>
              <CardInfo>
                <div className="name">{p.title}</div>
                <Tags>
                  {(p.dsa_tags || []).map(t => <span key={t} className="pill pill--tag">{t}</span>)}
                </Tags>
              </CardInfo>
              <span className={`pill pill--${p.difficulty?.toLowerCase()}`}>{p.difficulty}</span>
              <SolveBtn onClick={() => startPractice(p.id)}>
                <Play size={14} /> Solve
              </SolveBtn>
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
