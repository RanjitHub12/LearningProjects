import { SectionLead as SectionLeadStyled } from './styles';

/** Editorial section heading: "01  At a glance ───◆". */
export default function SectionLead({ num, label }) {
  return (
    <SectionLeadStyled>
      <span className="num">{num}</span>
      <span className="label">{label}</span>
      <span className="rule"/>
      <span className="diamond"/>
    </SectionLeadStyled>
  );
}
