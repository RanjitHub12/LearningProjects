import { useNavigate } from 'react-router-dom';
import {
  Brain, Zap, ChevronRight, ArrowRight, AlertTriangle,
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
      {analysisResults.map((r, i) => {
        const heuristic = r.engine === 'heuristic';
        const minimal = r.engine === 'groq-minimal';
        return (
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

          {(heuristic || minimal) && (
            <div style={{
              display:'flex', alignItems:'flex-start', gap:8, padding:'10px 12px',
              borderRadius:8, margin:'10px 0',
              background: heuristic ? 'rgba(239,68,68,.08)' : 'rgba(210,153,34,.1)',
              border: `1px solid ${heuristic ? 'rgba(239,68,68,.25)' : 'rgba(210,153,34,.25)'}`,
              color: heuristic ? '#f85149' : '#d29922',
              fontSize:'.74rem', lineHeight:1.5,
            }}>
              <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }}/>
              <div>
                {heuristic
                  ? <><strong>AI did not run.</strong> Title and tags were guessed from the filename / pattern matching. Set <code>GROQ_API_KEY</code> (or <code>GEMINI_API_KEY</code>) in the backend <code>.env</code> and restart the server for real AI analysis.</>
                  : <><strong>Limited analysis.</strong> The full extraction failed (likely token limits on a long file); a slimmer prompt was used so title / description / tags are present but deep analysis was skipped.</>}
              </div>
            </div>
          )}

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
        );
      })}
    </ResultsSection>
  );
}
