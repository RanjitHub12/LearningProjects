import { useState } from 'react';

export default function Login({ onAuthenticated }) {
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/v1/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map(item => item.msg).join(', ')
          : data.detail;
        throw new Error(detail || 'Authentication failed');
      }
      onAuthenticated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <form onSubmit={submit} style={{ width: 'min(100%, 420px)', padding: 32, border: '1px solid var(--cv-border-default)', borderRadius: 14, background: 'var(--cv-bg-elevated)', boxShadow: 'var(--cv-glass-shadow-lg)' }}>
        <h1 style={{ marginBottom: 8 }}>{registering ? 'Join CodeVault.' : 'Welcome back.'}</h1>
        <p style={{ color: 'var(--cv-text-secondary)', marginBottom: 24 }}>{registering ? 'Create your private practice account.' : 'Sign in to continue your practice.'}</p>
        {registering && <input required minLength={3} placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} style={inputStyle} />}
        <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
        <input required minLength={8} type="password" placeholder="Password (8+ characters)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inputStyle} />
        {error && <p role="alert" style={{ color: 'var(--cv-danger)', marginBottom: 14 }}>{error}</p>}
        <button disabled={busy} type="submit" style={buttonStyle}>{busy ? 'Please wait...' : registering ? 'Create account' : 'Sign in'}</button>
        <button type="button" onClick={() => { setRegistering(!registering); setError(''); }} style={linkStyle}>{registering ? 'Already have an account? Sign in' : 'Need an account? Register'}</button>
      </form>
    </main>
  );
}

const inputStyle = { display: 'block', width: '100%', marginBottom: 12, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--cv-border-default)', background: 'var(--cv-bg-secondary)', color: 'var(--cv-text-primary)', font: 'inherit' };
const buttonStyle = { width: '100%', padding: '12px 14px', border: 0, borderRadius: 8, background: 'var(--cv-gradient-primary)', color: '#fff', font: 'inherit', fontWeight: 700, cursor: 'pointer' };
const linkStyle = { display: 'block', margin: '16px auto 0', border: 0, background: 'transparent', color: 'var(--cv-accent)', cursor: 'pointer', font: 'inherit' };
