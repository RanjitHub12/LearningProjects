import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useThemeMode } from '../context/ThemeContext';
import {
  LayoutDashboard, FolderOpen, Upload, BarChart3,
  Settings, Sun, Moon, Zap, Code2, PanelLeftClose, PanelLeft, Flame, Folder, LogOut, Menu, X
} from 'lucide-react';
import styled from 'styled-components';
import { getStreak } from '../lib/activity';

/* ─── Mobile breakpoint ──────────────────────────────────────── */
const MB = '768px';

const Shell = styled.div`display: flex; min-height: 100vh;`;

/* Mobile top bar — visible only on small screens */
const MobileBar = styled.header`
  display: none;
  @media(max-width: ${MB}) {
    display: flex; align-items: center; gap: 10px;
    position: fixed; top: 0; left: 0; right: 0; z-index: 50;
    height: 56px; padding: 0 16px;
    background: var(--cv-glass-bg);
    backdrop-filter: blur(var(--cv-glass-blur));
    -webkit-backdrop-filter: blur(var(--cv-glass-blur));
    border-bottom: 1px solid var(--cv-border-subtle);
  }
`;

const HamburgerBtn = styled.button`
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 10px; border: none;
  background: transparent; cursor: pointer; flex-shrink: 0;
  color: var(--cv-text-secondary);
  svg { width: 22px; height: 22px; }
  &:hover { background: var(--cv-accent-muted); color: var(--cv-accent); }
`;

const MobileBrand = styled.div`
  display: flex; align-items: center; gap: 9px; flex: 1;
  .icon { width: 32px; height: 32px; border-radius: 9px;
    background: var(--cv-gradient-primary); display: flex; align-items: center;
    justify-content: center; color: #fff;
    box-shadow: var(--cv-glow-accent), 0 3px 10px rgba(99,102,241,0.3);
  }
  .name { font-family: var(--cv-font-display); font-style: italic;
    font-size: 1.15rem; font-weight: 500; letter-spacing: -0.02em;
    color: var(--cv-text-primary); }
  .name span { background: var(--cv-gradient-primary); -webkit-background-clip: text;
    -webkit-text-fill-color: transparent; background-clip: text; font-style: italic; }
`;

/* Backdrop overlay when sidebar is open on mobile */
const Overlay = styled.div`
  display: none;
  @media(max-width: ${MB}) {
    display: block; position: fixed; inset: 0; z-index: 55;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
    animation: fadeIn 0.15s ease;
  }
`;

const Sidebar = styled.aside`
  width: ${p => p.$collapsed ? '56px' : '240px'};
  min-height: 100vh; position: fixed; top: 0; left: 0; z-index: 60;
  background: var(--cv-glass-bg);
  backdrop-filter: blur(var(--cv-glass-blur));
  -webkit-backdrop-filter: blur(var(--cv-glass-blur));
  border-right: 1px solid var(--cv-border-subtle);
  display: flex; flex-direction: column;
  padding: ${p => p.$collapsed ? '16px 8px 16px' : '24px 14px 20px'};
  transition: width 0.22s ease, padding 0.22s ease, transform 0.25s ease;
  overflow: hidden;
  /* Argyle stripe along the inside edge — keeps the textile motif
     without overpowering the nav. */
  &::after {
    content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 1px;
    background: linear-gradient(180deg, transparent 0%, var(--cv-border-default) 30%, var(--cv-border-default) 70%, transparent 100%);
    pointer-events: none;
  }
  @media(max-width: ${MB}) {
    width: 260px; padding: 24px 14px 20px;
    top: 0;
    transform: translateX(${p => p.$mobileOpen ? '0' : '-100%'});
    transition: transform 0.25s ease;
    box-shadow: ${p => p.$mobileOpen ? '8px 0 30px rgba(0,0,0,0.3)' : 'none'};
  }
`;

const TopRow = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 0 ${p => p.$c ? '0' : '4px'}; margin-bottom: ${p => p.$c ? '20px' : '28px'};
  justify-content: ${p => p.$c ? 'center' : 'space-between'};
  @media(max-width: ${MB}) {
    padding: 0 4px; margin-bottom: 28px; justify-content: space-between;
  }
`;

const Brand = styled.div`
  display: flex; align-items: center; gap: 11px;
  .icon { width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
    background: var(--cv-gradient-primary); display: flex; align-items: center;
    justify-content: center; color: #fff;
    box-shadow: var(--cv-glow-accent), 0 4px 14px rgba(99,102,241,0.35);
    position: relative; overflow: hidden;
    &::after {
      content: ''; position: absolute; inset: 0;
      background-image:
        linear-gradient(45deg, transparent 48%, rgba(255,255,255,.20) 50%, transparent 52%),
        linear-gradient(-45deg, transparent 48%, rgba(255,255,255,.20) 50%, transparent 52%);
      background-size: 12px 12px;
      mix-blend-mode: overlay; opacity: .9;
    }
  }
  .name { font-family: var(--cv-font-display); font-style: italic;
    font-size: 1.28rem; font-weight: 500; letter-spacing: -0.02em;
    color: var(--cv-text-primary); white-space: nowrap;
    opacity: ${p => p.$c ? '0' : '1'};
    width: ${p => p.$c ? '0' : 'auto'}; overflow: hidden;
    transition: opacity 0.15s; }
  .name span { background: var(--cv-gradient-primary); -webkit-background-clip: text;
    -webkit-text-fill-color: transparent; background-clip: text; font-style: italic; }
  @media(max-width: ${MB}) {
    .name { opacity: 1; width: auto; }
  }
`;

const TopToggle = styled.button`
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px; border: none;
  background: transparent; cursor: pointer; flex-shrink: 0;
  color: var(--cv-text-muted);
  svg { width: 17px; height: 17px; }
  &:hover { background: var(--cv-accent-muted); color: var(--cv-accent); }
  @media(max-width: ${MB}) { display: none; }
`;

/* On mobile, the sidebar close button */
const MobileClose = styled.button`
  display: none;
  @media(max-width: ${MB}) {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 10px; border: none;
    background: var(--cv-accent-muted); cursor: pointer; flex-shrink: 0;
    color: var(--cv-text-secondary);
    svg { width: 18px; height: 18px; }
    &:hover { color: var(--cv-accent); }
  }
`;

const NavGroup = styled.div`
  margin-bottom: 20px;
  .label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--cv-text-muted);
    padding: 0 ${p => p.$c ? '0' : '12px'}; margin-bottom: 6px;
    text-align: ${p => p.$c ? 'center' : 'left'};
    opacity: ${p => p.$c ? '0' : '1'}; height: ${p => p.$c ? '0' : 'auto'};
    overflow: hidden; transition: opacity 0.15s; }
  @media(max-width: ${MB}) {
    .label { opacity: 1; height: auto; padding: 0 12px; text-align: left; }
  }
`;

const Link = styled(NavLink)`
  position: relative;
  display: flex; align-items: center; gap: 11px;
  padding: 9px ${p => p.$c ? '0' : '13px'}; border-radius: 9px;
  justify-content: ${p => p.$c ? 'center' : 'flex-start'};
  font-size: 0.86rem; font-weight: 500;
  color: var(--cv-text-secondary); text-decoration: none;
  transition: all 0.18s ease; margin-bottom: 2px;
  svg { width: 17px; height: 17px; opacity: 0.65; transition: opacity 0.15s; flex-shrink: 0; }
  .ltext { white-space: nowrap; opacity: ${p => p.$c ? '0' : '1'};
    width: ${p => p.$c ? '0' : 'auto'}; overflow: hidden; transition: opacity 0.15s;
    letter-spacing: 0.005em; }
  &:hover { background: var(--cv-accent-muted); color: var(--cv-text-primary);
    svg { opacity: 1; } }
  &.active {
    background: var(--cv-accent-muted); color: var(--cv-accent);
    font-weight: 600; svg { opacity: 1; color: var(--cv-accent); }
  }
  /* Argyle "stitch" diamond appears beside the active link */
  &.active::before {
    content: ''; position: absolute; left: ${p => p.$c ? '50%' : '4px'};
    top: 50%; width: 4px; height: 4px;
    background: var(--cv-rose); transform: translateY(-50%) rotate(45deg);
    box-shadow: 0 0 8px var(--cv-rose);
    ${p => p.$c && 'left: 50%; transform: translate(-50%,-50%) rotate(45deg); top: auto; bottom: 4px;'}
  }
  @media(max-width: ${MB}) {
    padding: 11px 13px; justify-content: flex-start; font-size: 0.9rem;
    .ltext { opacity: 1; width: auto; }
    &.active::before { left: 4px; top: 50%; transform: translateY(-50%) rotate(45deg); bottom: auto; }
  }
`;

const Footer = styled.div`
  margin-top: auto; padding-top: 12px;
  border-top: 1px solid var(--cv-border-subtle);
  display: flex; flex-direction: column; gap: 4px;
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
  @media(max-width: ${MB}) {
    padding: 11px 12px; justify-content: flex-start;
    .ltext { opacity: 1; width: auto; }
  }
`;

const StreakBadge = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 9px ${p => p.$c ? '0' : '12px'}; border-radius: 9px; margin-bottom: 4px;
  justify-content: ${p => p.$c ? 'center' : 'flex-start'};
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.18);
  color: var(--cv-warning, #f59e0b);
  svg { width: 16px; height: 16px; flex-shrink: 0; }
  .val { font-weight: 700; font-size: .9rem; }
  .lbl { font-size: .72rem; color: var(--cv-text-muted); white-space: nowrap;
    opacity: ${p => p.$c ? '0' : '1'}; width: ${p => p.$c ? '0' : 'auto'}; overflow: hidden; }
  @media(max-width: ${MB}) {
    padding: 9px 12px; justify-content: flex-start;
    .lbl { opacity: 1; width: auto; }
  }
`;

const StatusRow = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 8px ${p => p.$c ? '0' : '12px'}; font-size: 0.72rem; color: var(--cv-text-muted);
  justify-content: ${p => p.$c ? 'center' : 'flex-start'};
  .dot { width: 6px; height: 6px; border-radius: 50%;
    background: var(--cv-success); box-shadow: var(--cv-glow-success); }
  .ltext { opacity: ${p => p.$c ? '0' : '1'}; width: ${p => p.$c ? '0' : 'auto'};
    overflow: hidden; white-space: nowrap; transition: opacity 0.15s; }
  @media(max-width: ${MB}) {
    padding: 8px 12px; justify-content: flex-start;
    .ltext { opacity: 1; width: auto; }
  }
`;

const Main = styled.main`
  flex: 1; position: relative; margin-left: ${p => p.$collapsed ? '56px' : '240px'};
  padding: 36px 40px; min-height: 100vh;
  transition: margin-left 0.22s ease;
  @media(max-width:1024px){ padding: 28px; }
  @media(max-width: ${MB}){
    margin-left: 0; padding: 16px;
    padding-top: 72px; /* space for fixed mobile top bar */
    min-height: 100dvh;
  }
`;

const Account = styled.div`
  position: absolute; top: 16px; right: 24px; z-index: 5;
  display: flex; align-items: center; gap: 8px;
  padding: 5px 7px 5px 11px; border: 1px solid var(--cv-border-default);
  border-radius: 999px; background: var(--cv-glass-bg);
  color: var(--cv-text-secondary); font-size: .76rem;
  .name { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button { display: inline-flex; align-items: center; justify-content: center; padding: 5px;
    border: 0; border-radius: 50%; background: transparent; color: var(--cv-text-muted); cursor: pointer; }
  button:hover { color: var(--cv-danger); background: var(--cv-accent-muted); }
  @media(max-width: ${MB}) {
    position: static; border: none; background: none; padding: 0; gap: 6px;
  }
`;

/* Account inside mobile bar — only the logout button */
const MobileAccount = styled.div`
  display: none;
  @media(max-width: ${MB}) {
    display: flex; align-items: center; gap: 6px;
    color: var(--cv-text-secondary); font-size: .76rem;
    .name { max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    button { display: inline-flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border: 0; border-radius: 50%;
      background: transparent; color: var(--cv-text-muted); cursor: pointer; }
    button:hover { color: var(--cv-danger); background: var(--cv-accent-muted); }
  }
`;

/* Hide desktop account on mobile since it's in the mobile bar */
const DesktopAccount = styled.div`
  @media(max-width: ${MB}) { display: none; }
`;

export default function Layout({ user, onLogout }) {
  const { mode, toggle } = useThemeMode();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 768);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [streak, setStreak] = useState(() => getStreak());
  const c = collapsed;

  // Track window resizing for mobile detection
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const refresh = () => setStreak(getStreak());
    refresh();
    window.addEventListener('cv:activity-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('cv:activity-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen, isMobile]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <Shell>
      {/* ─── Mobile Top Bar ──────────────────────────────────── */}
      <MobileBar>
        <HamburgerBtn onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? <X /> : <Menu />}
        </HamburgerBtn>
        <MobileBrand>
          <div className="icon"><Zap size={16} /></div>
          <div className="name">Code<span>Vault</span></div>
        </MobileBrand>
        <MobileAccount>
          <span className="name" title={user?.email}>{user?.username}</span>
          <button onClick={onLogout} aria-label="Log out" title="Log out"><LogOut size={16} /></button>
        </MobileAccount>
      </MobileBar>

      {/* ─── Overlay (mobile only) ───────────────────────────── */}
      {mobileOpen && isMobile && <Overlay onClick={closeMobile} />}

      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <Sidebar $collapsed={c} $mobileOpen={mobileOpen}>
        <TopRow $c={c}>
          {(!c || isMobile) && (
            <Brand $c={isMobile ? false : c}>
              <div className="icon"><Zap size={18} /></div>
              <div className="name">Code<span>Vault</span></div>
            </Brand>
          )}
          <TopToggle onClick={() => setCollapsed(!c)} title={c ? 'Expand sidebar' : 'Collapse sidebar'} aria-label={c ? 'Expand sidebar' : 'Collapse sidebar'}>
            {c ? <PanelLeft /> : <PanelLeftClose />}
          </TopToggle>
          <MobileClose onClick={closeMobile} aria-label="Close menu">
            <X />
          </MobileClose>
        </TopRow>

        <NavGroup $c={isMobile ? false : c}>
          <div className="label">Overview</div>
          <Link to="/" end $c={isMobile ? false : c}><LayoutDashboard /><span className="ltext">Dashboard</span></Link>
          <Link to="/problems" $c={isMobile ? false : c}><FolderOpen /><span className="ltext">Problem Vault</span></Link>
        </NavGroup>

        <NavGroup $c={isMobile ? false : c}>
          <div className="label">Tools</div>
          <Link to="/upload" $c={isMobile ? false : c}><Upload /><span className="ltext">Bulk Upload</span></Link>
          <Link to="/workspace" $c={isMobile ? false : c}><Code2 /><span className="ltext">Workspace</span></Link>
          <Link to="/folders" $c={isMobile ? false : c}><Folder /><span className="ltext">Folders</span></Link>
          <Link to="/analytics" $c={isMobile ? false : c}><BarChart3 /><span className="ltext">Analytics</span></Link>
          <Link to="/admin" $c={isMobile ? false : c}><Settings /><span className="ltext">Admin</span></Link>
        </NavGroup>

        <Footer>
          <StreakBadge $c={isMobile ? false : c} title={`Current streak: ${streak.current} day${streak.current === 1 ? '' : 's'} · Longest: ${streak.longest}`}>
            <Flame />
            <span className="val">{streak.current}</span>
            <span className="lbl">day{streak.current === 1 ? '' : 's'} streak</span>
          </StreakBadge>
          <ThemeBtn onClick={toggle} $c={isMobile ? false : c}>
            {mode === 'dark' ? <Sun /> : <Moon />}
            <span className="ltext">{mode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </ThemeBtn>
          <StatusRow $c={isMobile ? false : c}><span className="dot" /><span className="ltext">API Connected</span></StatusRow>
        </Footer>
      </Sidebar>
      <Main $collapsed={c}>
        {location.pathname !== '/workspace' && (
          <DesktopAccount>
            <Account>
              <span className="name" title={user?.email}>{user?.username}</span>
              <button onClick={onLogout} aria-label="Log out" title="Log out"><LogOut size={14} /></button>
            </Account>
          </DesktopAccount>
        )}
        <Outlet />
      </Main>
    </Shell>
  );
}
