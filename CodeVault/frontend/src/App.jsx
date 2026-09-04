import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import ProblemVault from './pages/ProblemVault';
import Upload from './pages/Upload';
import Workspace from './pages/Workspace';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import Folders from './pages/Folders';
import { apiFetch } from './lib/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    apiFetch('/api/v1/auth/me')
      .then(response => response.ok ? response.json() : null)
      .then(setUser)
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) return <div style={{ padding: 32 }}>Loading...</div>;
  if (!user) return <Login onAuthenticated={setUser} />;

  const logout = async () => {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <Routes>
      <Route path="/" element={<Layout user={user} onLogout={logout} />}>
        <Route index element={<Home />} />
        <Route path="problems" element={<ProblemVault />} />
        <Route path="upload" element={<Upload />} />
        <Route path="workspace" element={<Workspace />} />
        <Route path="folders" element={<Folders />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}
