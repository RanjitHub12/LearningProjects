import { useNavigate } from 'react-router-dom';
import {
  Brain, Zap, ChevronRight, ArrowRight,
} from 'lucide-react';
import {
  ProcessingOverlay, ResultsSection, ResultCard, ResultHeader,
  ApproachList, ApproachPill, TagRow, OpenBtn,
} from './styles';

/** Spinner shown while a single file is in flight. */
export function Processing({ currentFile }) {
  if (!currentFile) return null;
  return (
    <ProcessingOverlay>
      <Brain size={36} className="spinner" />
      <div className="msg">AI engine is analyzing <strong>{currentFile}</strong></div>
      <div className="sub">Extracting approaches, detecting DSA tags, generating analysis...</div>
    </ProcessingOverlay>
  );
}

/** Card list of completed analyses + per-file "Open in Workspace" button. */
export default function Results({ analysisResults }) {
  const navigate = useNavigate();
  if (analysisResults.length === 0) return null;

  return (
    <ResultsSection>
      <h2 style={{ fontSize:'1.1rem', fontWeight:700, marginBottom:16 }}>
        <Zap size={18} style={{ color:'var(--cv-success)', verticalAlign:'middle', marginRight:8 }} />
        Extraction Results
      </h2>
      {analysisResults.map((r, i) => (
        <ResultCard key={i}>
          <ResultHeader>
            <div className="icon"><Brain size={18} /></div>
            <div className="info">
              <div className="name">{r.title}</div>
              <div className="meta">
                from {r.filename} · {r.approaches_found} approach{r.approaches_found !== 1 ? 'es' : ''} extracted
                {r.has_deep_analysis && ' · Deep analysis ✓'}
              </div>
            </div>
            <span className={`pill pill--${r.difficulty?.toLowerCase()}`}>{r.difficulty}</span>
          </ResultHeader>

          {r.approach_names?.length > 0 && (
            <ApproachList>
              {r.approach_names.map((name, j) => (
                <ApproachPill key={j}>
                  <ChevronRight size={10} /> {name}
                </ApproachPill>
              ))}
            </ApproachList>
          )}

          {r.dsa_tags?.length > 0 && (
            <TagRow>
              {r.dsa_tags.map(t => <span key={t} className="pill pill--tag">{t}</span>)}
            </TagRow>
          )}

          <OpenBtn onClick={()=>navigate(`/workspace?id=${r.problem_id}`)}>
            Open in Workspace <ArrowRight size={14} />
          </OpenBtn>
        </ResultCard>
      ))}
    </ResultsSection>
  );
}
