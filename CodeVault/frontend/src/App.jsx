import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProblemVault from './pages/ProblemVault';
import Practice from './pages/Practice';
import Upload from './pages/Upload';
import Workspace from './pages/Workspace';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="problems" element={<ProblemVault />} />
        <Route path="practice" element={<Practice />} />
        <Route path="upload" element={<Upload />} />
        <Route path="workspace" element={<Workspace />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}
