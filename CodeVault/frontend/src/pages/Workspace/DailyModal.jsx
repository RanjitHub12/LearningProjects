import {
  CalendarDays, X, Loader2, XCircle, FileCode, ExternalLink,
} from 'lucide-react';
import {
  Backdrop, Modal, MHead, MBody, MFoot, Btn, Step, Banner, MetaBox,
} from './styles';

/** LeetCode "daily challenge" preview — fetched via /api/v1/leetcode/daily. */
export default function DailyModal({
  open, onClose,
  loading, error, daily,
  applyToWorkspace,
}) {
  if (!open) return null;

  return (
    <Backdrop onClick={onClose}>
      <Modal onClick={e=>e.stopPropagation()} style={{ width:'min(720px,100%)' }}>
        <MHead>
          <CalendarDays size={16} style={{ color:'var(--cv-accent)' }}/>
          <span className="t">LeetCode — Daily Challenge</span>
          <button onClick={onClose}><X size={16}/></button>
        </MHead>
        <MBody>
          {loading && (
            <Step $state="active"><Loader2/><span className="lbl">Fetching today's challenge…</span></Step>
          )}
          {error && (
            <Banner $kind="error"><XCircle/><div className="msg">{error}</div></Banner>
          )}
          {daily && (
            <>
              <MetaBox>
                <div className="row"><span className="lbl">Date</span><span className="val">{daily.date}</span></div>
                <div className="row"><span className="lbl">Title</span>
                  <span className="val">#{daily.questionFrontendId} — {daily.title}</span>
                </div>
                <div className="row"><span className="lbl">Difficulty</span>
                  <span className="val">
                    <span className={`pill pill--${daily.difficulty?.toLowerCase()}`}>{daily.difficulty}</span>
                  </span>
                </div>
                <div className="row"><span className="lbl">Tags</span>
                  <span className="val tags">
                    {(daily.tags || []).map(t => <span key={t} className="pill pill--tag">{t}</span>)}
                  </span>
                </div>
              </MetaBox>
              <div style={{ padding:'12px 14px', background:'var(--cv-bg-tertiary)',
                border:'1px solid var(--cv-border-subtle)', borderRadius:9,
                fontSize:'.85rem', color:'var(--cv-text-secondary)', lineHeight:1.6,
                maxHeight:280, overflowY:'auto' }}
                dangerouslySetInnerHTML={{ __html: daily.content }}
              />
              {(daily.testCases?.length > 0) && (
                <div style={{ marginTop:10, fontSize:'.78rem', color:'var(--cv-text-muted)' }}>
                  Loading will populate the editor with LeetCode's official boilerplate plus
                  {' '}{daily.testCases.length} parsed example test case{daily.testCases.length === 1 ? '' : 's'}.
                </div>
              )}
            </>
          )}
        </MBody>
        <MFoot>
          <Btn onClick={onClose}>Close</Btn>
          {daily && (
            <>
              <Btn onClick={()=>applyToWorkspace(daily)}><FileCode size={13}/> Load Boilerplate</Btn>
              <Btn $primary onClick={()=>window.open(daily.link, '_blank', 'noopener')}>
                <ExternalLink size={13}/> Submit on LeetCode
              </Btn>
            </>
          )}
        </MFoot>
      </Modal>
    </Backdrop>
  );
}
