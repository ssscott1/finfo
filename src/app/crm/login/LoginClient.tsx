'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/crm/dashboard');
      router.refresh();
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoText}>finfo</span>
          <span style={styles.logoTag}>CRM</span>
        </div>
        <h1 style={styles.heading}>Sign in</h1>
        <form onSubmit={handleLogin}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#f5f7f5',
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '40px 36px',
    width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,.08)',
  },
  logo: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 24 },
  logoText: { fontSize: 28, fontWeight: 800, color: '#0A2E1A', letterSpacing: '-1px' },
  logoTag: {
    fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
    background: '#00C16A', color: '#fff', borderRadius: 4, padding: '2px 6px',
  },
  heading: { fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 24px' },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
    fontSize: 15, outline: 'none', boxSizing: 'border-box',
  },
  error: { color: '#C0392B', fontSize: 13, margin: '0 0 12px', background: '#FFF1F0', borderRadius: 6, padding: '8px 12px' },
  button: {
    width: '100%', padding: '12px', background: '#00C16A', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', marginTop: 8,
  },
};
