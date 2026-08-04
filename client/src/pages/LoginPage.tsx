import { useState } from 'react';

const API = '/api/admin';

interface Props {
  onLogin: (token: string, user: any) => void;
}

export function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sai tài khoản hoặc mật khẩu');
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const BLUE = '#1E5EFF';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f7fa', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 40px', background: '#fff', borderBottom: '1px solid #e8ecf1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${BLUE}, #0046d6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L12 22"/><path d="M2 12L22 12"/></svg>
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>DrugsF</span>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 20px rgba(0,0,0,0.06)', padding: '40px 36px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', marginBottom: 8, textAlign: 'center' }}>
              Đăng nhập DrugsF
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>
              Đăng nhập để so sánh giá thuốc
            </p>

            {error && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: '0.85rem', border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Email hoặc Username</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}>👤</span>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Nhập email hoặc username" required style={{ ...inputStyle, paddingLeft: 40 }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Mật khẩu</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}>🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    required
                    style={{ ...inputStyle, paddingLeft: 40, paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem' }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} style={{
                padding: '14px 0', borderRadius: 12, border: 'none',
                background: loading ? '#93c5fd' : `linear-gradient(135deg, ${BLUE}, #0046d6)`,
                color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 600,
                transition: 'opacity 0.2s', opacity: loading ? 0.7 : 1,
                marginTop: 4,
              }}>
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <footer style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', padding: '24px 40px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>© 2026 DrugsF. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', color: '#374151', fontSize: '0.82rem', fontWeight: 500, marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1px solid #d1d5db', background: '#fff', color: '#1e293b',
  fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s',
};

const iconStyle: React.CSSProperties = {
  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
  fontSize: '0.9rem', pointerEvents: 'none',
};
