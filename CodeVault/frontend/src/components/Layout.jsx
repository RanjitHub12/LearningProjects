import { Outlet, NavLink } from 'react-router-dom';
import { useThemeMode } from '../context/ThemeContext';
import {
  LayoutDashboard, FolderOpen, Target, Upload, BarChart3,
  Settings, Sun, Moon, Zap, Code2
} from 'lucide-react';
import styled from 'styled-components';

const Shell = styled.div`display: flex; min-height: 100vh;`;

const Sidebar = styled.aside`
  width: 240px; min-height: 100vh; position: fixed; top: 0; left: 0; z-index: 40;
  background: var(--cv-glass-bg); backdrop-filter: blur(var(--cv-glass-blur));
  border-right: 1px solid var(--cv-border-subtle);
  display: flex; flex-direction: column;
  padding: 24px 14px 20px;
  transition: background 0.3s ease;
  @media(max-width:768px){ display:none; }
`;

const Brand = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 0 10px; margin-bottom: 32px;
  .icon { width: 34px; height: 34px; border-radius: 10px;
    background: var(--cv-gradient-primary); display: flex; align-items: center;
    justify-content: center; color: #fff; box-shadow: var(--cv-glow-accent); }
  .name { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.03em;
    color: var(--cv-text-primary); }
  .name span { background: var(--cv-gradient-primary); -webkit-background-clip: text;
    -webkit-text-fill-color: transparent; background-clip: text; }
`;

const NavGroup = styled.div`
  margin-bottom: 24px;
  .label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--cv-text-muted);
    padding: 0 12px; margin-bottom: 6px; }
`;

const Link = styled(NavLink)`
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 8px;
  font-size: 0.84rem; font-weight: 500;
  color: var(--cv-text-secondary); text-decoration: none;
  transition: all 0.15s ease; margin-bottom: 2px;
  svg { width: 18px; height: 18px; opacity: 0.6; transition: opacity 0.15s; }
  &:hover { background: var(--cv-accent-muted); color: var(--cv-text-primary);
    svg { opacity: 1; } }
  &.active { background: var(--cv-accent-muted); color: var(--cv-accent);
    font-weight: 600; svg { opacity: 1; color: var(--cv-accent); } }
`;

const Footer = styled.div`
  margin-top: auto; padding-top: 16px;
  border-top: 1px solid var(--cv-border-subtle);
  display: flex; flex-direction: column; gap: 4px;
`;

const ThemeBtn = styled.button`
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 8px; border: none;
  background: transparent; cursor: pointer;
  font-size: 0.84rem; font-weight: 500; font-family: inherit;
  color: var(--cv-text-secondary);
  svg { width: 18px; height: 18px; opacity: 0.6; }
  &:hover { background: var(--cv-accent-muted); color: var(--cv-text-primary); }
`;

const StatusRow = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; font-size: 0.72rem; color: var(--cv-text-muted);
  .dot { width: 6px; height: 6px; border-radius: 50%;
    background: var(--cv-success); box-shadow: var(--cv-glow-success); }
`;

const Main = styled.main`
  flex: 1; margin-left: 240px; padding: 32px;
  min-height: 100vh; max-width: 1400px;
  @media(max-width:768px){ margin-left:0; padding:16px; }
`;

export default function Layout() {
  const { mode, toggle } = useThemeMode();
  return (
    <Shell>
      <Sidebar>
        <Brand>
          <div className="icon"><Zap size={18} /></div>
          <div className="name">Code<span>Vault</span></div>
        </Brand>

        <NavGroup>
          <div className="label">Overview</div>
          <Link to="/" end><LayoutDashboard /> Dashboard</Link>
          <Link to="/problems"><FolderOpen /> Problem Vault</Link>
          <Link to="/practice"><Target /> Practice</Link>
        </NavGroup>

        <NavGroup>
          <div className="label">Tools</div>
          <Link to="/upload"><Upload /> Bulk Upload</Link>
          <Link to="/workspace"><Code2 /> Workspace</Link>
          <Link to="/analytics"><BarChart3 /> Analytics</Link>
          <Link to="/admin"><Settings /> Admin</Link>
        </NavGroup>

        <Footer>
          <ThemeBtn onClick={toggle}>
            {mode === 'dark' ? <Sun /> : <Moon />}
            {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </ThemeBtn>
          <StatusRow><span className="dot" /> API Connected</StatusRow>
        </Footer>
      </Sidebar>
      <Main><Outlet /></Main>
    </Shell>
  );
}
