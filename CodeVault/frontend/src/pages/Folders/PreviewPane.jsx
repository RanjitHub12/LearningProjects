import { useNavigate } from 'react-router-dom';
import { Sparkles, FileCode, ArrowRight } from 'lucide-react';
import { Card, CardHead, CardBody, Empty, PreviewBox, Btn } from './styles';

/** Right column — read-only details for the currently selected file. */
export default function PreviewPane({ selected }) {
  const navigate = useNavigate();

  return (
    <Card className="preview">
      <CardHead><Sparkles/> Preview <span className="spacer"/></CardHead>
      <CardBody>
        {!selected ? (
          <Empty><FileCode/><div>Click a file to preview its description and test cases.</div></Empty>
        ) : (
          <PreviewBox>
            <div className="h">{selected.title}</div>
            <div className="meta">
              {selected.language}
              {selected.difficulty ? ` · ${selected.difficulty}` : ''}
              · saved {(selected.savedAt || '').slice(0, 10)}
            </div>
            {(selected.tags || []).length > 0 && (
              <div className="tags">
                {(selected.tags || []).map(t => <span key={t} className="pill pill--tag">{t}</span>)}
              </div>
            )}
            {selected.description ? (
              <div className="desc">{selected.description}</div>
            ) : (
              <div className="desc" style={{ color:'var(--cv-text-muted)', fontStyle:'italic' }}>
                No description was generated for this file.
              </div>
            )}
            {(selected.testCases || []).length > 0 && (
              <div className="tcs">
                <div style={{ fontSize:'.7rem', fontWeight:700, color:'var(--cv-text-muted)',
                  textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>Test Cases</div>
                {(selected.testCases || []).slice(0, 3).map((tc, i) => (
                  <div className="tc" key={i}>
                    <div><span className="lbl">Input:</span> <code>{tc.input}</code></div>
                    <div><span className="lbl">Expected:</span> <code>{tc.expected_output}</code></div>
                  </div>
                ))}
              </div>
            )}
            <Btn $primary
              style={{ width:'100%', marginTop:14, justifyContent:'center' }}
              onClick={()=>navigate(`/workspace?snippet=${selected.id}`)}>
              Open in Workspace <ArrowRight size={13}/>
            </Btn>
          </PreviewBox>
        )}
      </CardBody>
    </Card>
  );
}
