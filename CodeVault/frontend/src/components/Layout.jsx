import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useThemeMode } from '../context/ThemeContext';
import {
  LayoutDashboard, FolderOpen, Target, Upload, BarChart3,
  Settings, Sun, Moon, Zap, Code2, ChevronLeft, ChevronRight
} from 'lucide-react';
import styled from 'styled-components';

const Shell = styled.div`display: flex; min-height: 100vh;`;

const Sidebar = styled.aside`
  width: ${p => p.$collapsed ? '56px' : '240px'};
  min-height: 100vh; position: fixed; top: 0; left: 0; z-index: 40;
  background: var(--cv-glass-bg); backdrop-filter: blur(var(--cv-glass-blur));
  border-right: 1px solid var(--cv-border-subtle);
  display: flex; flex-direction: column;
  padding: ${p => p.$collapsed ? '16px 8px 16px' : '24px 14px 20px'};
  transition: width 0.22s ease, padding 0.22s ease;
  overflow: hidden;
`;

const Brand = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 0 ${p => p.$c ? '0' : '10px'}; margin-bottom: ${p => p.$c ? '20px' : '32px'};
  justify-content: ${p => p.$c ? 'center' : 'flex-start'};
  .icon { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: var(--cv-gradient-primary); display: flex; align-items: center;
    justify-content: center; color: #fff; box-shadow: var(--cv-glow-accent); }
  .name { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.03em;
    color: var(--cv-text-primary); white-space: nowrap;
    opacity: ${p => p.$c ? '0' : '1'}; transition: opacity 0.15s; }
  .name span { background: var(--cv-gradient-primary); -webkit-background-clip: text;
    -webkit-text-fill-color: transparent; background-clip: text; }
`;

const NavGroup = styled.div`
  margin-bottom: 20px;
  .label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--cv-text-muted);
    padding: 0 ${p => p.$c ? '0' : '12px'}; margin-bottom: 6px;
    text-align: ${p => p.$c ? 'center' : 'left'};
    opacity: ${p => p.$c ? '0' : '1'}; height: ${p => p.$c ? '0' : 'auto'};
    overflow: hidden; transition: opacity 0.15s; }
`;

const Link = styled(NavLink)`
  display: flex; align-items: center; gap: 10px;
  padding: 9px ${p => p.$c ? '0' : '12px'}; border-radius: 8px;
  justify-content: ${p => p.$c ? 'center' : 'flex-start'};
  font-size: 0.84rem; font-weight: 500;
  color: var(--cv-text-secondary); text-decoration: none;
  transition: all 0.15s ease; margin-bottom: 2px;
  svg { width: 18px; height: 18px; opacity: 0.6; transition: opacity 0.15s; flex-shrink: 0; }
  .ltext { white-space: nowrap; opacity: ${p => p.$c ? '0' : '1'};
    width: ${p => p.$c ? '0' : 'auto'}; overflow: hidden; transition: opacity 0.15s; }
  &:hover { background: var(--cv-accent-muted); color: var(--cv-text-primary);
    svg { opacity: 1; } }
  &.active { background: var(--cv-accent-muted); color: var(--cv-accent);
    font-weight: 600; svg { opacity: 1; color: var(--cv-accent); } }
`;

const Footer = styled.div`
  margin-top: auto; padding-top: 12px;
  border-top: 1px solid var(--cv-border-subtle);
  display: flex; flex-direction: column; gap: 4px;
`;

const ToggleBtn = styled.button`
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 8px; border-radius: 8px; border: none;
  background: transparent; cursor: pointer;
  font-size: 0.78rem; font-weight: 500; font-family: inherit;
  color: var(--cv-text-muted); width: 100%;
  svg { width: 16px; height: 16px; flex-shrink: 0; }
  &:hover { background: var(--cv-accent-muted); color: var(--cv-accent); }
`;

const ThemeBtn = styled.button`
  display: flex; align-items: center; gap: 10px;
  padding: 9px ${p => p.$c ? '0' : '12px'}; border-radius: 8px; border: none;
  justify-content: ${p => p.$c ? 'center' : 'flex-start'};
  background: transparent; cursor: pointer;
  font-size: 0.84rem; font-weight: 500; font-family: inherit;
  color: var(--cv-text-secondary);
  svg { width: 18px; height: 18px; opacity: 0.6; flex-shrink: 0; }
  .ltext { white-space: nowrap; opacity: ${p => p.$c ? '0' : '1'};
    width: ${p => p.$c ? '0' : 'auto'}; overflow: hidden; transition: opacity 0.15s; }
  &:hover { background: var(--cv-accent-muted); color: var(--cv-text-primary); }
`;

const StatusRow = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 8px ${p => p.$c ? '0' : '12px'}; font-size: 0.72rem; color: var(--cv-text-muted);
  justify-content: ${p => p.$c ? 'center' : 'flex-start'};
  .dot { width: 6px; height: 6px; border-radius: 50%;
    background: var(--cv-success); box-shadow: var(--cv-glow-success); }
  .ltext { opacity: ${p => p.$c ? '0' : '1'}; width: ${p => p.$c ? '0' : 'auto'};
    overflow: hidden; white-space: nowrap; transition: opacity 0.15s; }
`;

const Main = styled.main`
  flex: 1; margin-left: ${p => p.$collapsed ? '56px' : '240px'};
  padding: 32px; min-height: 100vh;
  transition: margin-left 0.22s ease;
  @media(max-width:768px){ margin-left:0; padding:16px; }
`;

export default function Layout() {
  const { mode, toggle } = useThemeMode();
  const [collapsed, setCollapsed] = useState(false);
  const c = collapsed;

  return (
    <Shell>
      <Sidebar $collapsed={c}>
        <Brand $c={c}>
          <div className="icon"><Zap size={18} /></div>
          <div className="name">Code<span>Vault</span></div>
        </Brand>

        <NavGroup $c={c}>
          <div className="label">Overview</div>
          <Link to="/" end $c={c}><LayoutDashboard /><span className="ltext">Dashboard</span></Link>
          <Link to="/problems" $c={c}><FolderOpen /><span className="ltext">Problem Vault</span></Link>
          <Link to="/practice" $c={c}><Target /><span className="ltext">Practice</span></Link>
        </NavGroup>

        <NavGroup $c={c}>
          <div className="label">Tools</div>
          <Link to="/upload" $c={c}><Upload /><span className="ltext">Bulk Upload</span></Link>
          <Link to="/workspace" $c={c}><Code2 /><span className="ltext">Workspace</span></Link>
          <Link to="/analytics" $c={c}><BarChart3 /><span className="ltext">Analytics</span></Link>
          <Link to="/admin" $c={c}><Settings /><span className="ltext">Admin</span></Link>
        </NavGroup>

        <Footer>
          <ThemeBtn onClick={toggle} $c={c}>
            {mode === 'dark' ? <Sun /> : <Moon />}
            <span className="ltext">{mode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </ThemeBtn>
          <StatusRow $c={c}><span className="dot" /><span className="ltext">API Connected</span></StatusRow>
          <ToggleBtn onClick={() => setCollapsed(!c)} title={c ? 'Expand' : 'Collapse'}>
            {c ? <ChevronRight /> : <ChevronLeft />}
          </ToggleBtn>
        </Footer>
      </Sidebar>
      <Main $collapsed={c}><Outlet /></Main>
    </Shell>
  );
}
