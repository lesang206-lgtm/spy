import { useState, useEffect, useCallback } from 'react';
import { LoginPage } from './pages/LoginPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { useSearch } from './hooks/useSearch';
import './App.css';

const API = '/api/admin';
const BLUE = '#2563EB';

interface User { id: number; username: string; full_name: string; role: string; }
interface Product { id: number; name: string; source: string; price: number; product_url: string; image_url: string; created_at?: string; }

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token'));
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user') || 'null'); } catch { return null; }
  });
  const [page, setPage] = useState('compare');

  // Decode role from JWT
  const getTokenRole = (): string => {
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || '';
    } catch { return ''; }
  };

  useEffect(() => {
    if (token) {
      fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => {
          if (d.user) {
            // Merge role from JWT if /me doesn't have it
            const merged = { ...d.user, role: d.user.role || getTokenRole() };
            setUser(merged);
            localStorage.setItem('admin_user', JSON.stringify(merged));
          } else {
            setToken(null); setUser(null); localStorage.removeItem('admin_token');
          }
        }).catch(() => { setToken(null); setUser(null); });
    }
  }, [token]);

  const handleLogin = (t: string, u: User) => { setToken(t); setUser(u); };
  const handleLogout = () => { setToken(null); setUser(null); localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); sessionStorage.removeItem('admin_token'); sessionStorage.removeItem('admin_user'); };

  if (!token || !user) return <LoginPage onLogin={handleLogin} />;

  const userRole = user.role || getTokenRole();
  const isAdmin = userRole === 'admin' || userRole === 'editor';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <Sidebar user={{ ...user, role: userRole }} page={page} setPage={setPage} onLogout={handleLogout} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: 260 }}>
        <TopBar page={page} />
        <main style={{ flex: 1, padding: '40px 48px', maxWidth: 1200 }}>
          {page === 'compare' && <CompareSection token={token} />}
          {page === 'products' && <ProductsSection token={token} user={{ ...user, role: userRole }} />}
          {page === 'favorites' && <FavoritesSection token={token} />}
          {page === 'history' && <HistorySection token={token} />}
          {page === 'settings' && isAdmin && <SettingsSection />}
        </main>
        <Footer />
      </div>
    </div>
  );
}

/* ===== SIDEBAR ===== */
function Sidebar({ user, page, setPage, onLogout }: { user: User; page: string; setPage: (p: string) => void; onLogout: () => void }) {
  const isAdmin = (user.role || '').toLowerCase() === 'admin' || (user.role || '').toLowerCase() === 'editor';

  const menuItems = [
    { key: 'products', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>, label: 'Tất cả sản phẩm' },
    { key: 'favorites', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>, label: 'Yêu thích' },
    { key: 'compare', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, label: 'So sánh giá' },
    { key: 'history', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label: 'Lịch sử' },
  ];

  const pharmacies = [
    { name: 'Pharmacity', color: '#22c55e' },
    { name: 'Long Châu', color: '#3b82f6' },
    { name: 'Thuốc Sĩ', color: '#f59e0b' },
    { name: 'Medigo', color: '#8b5cf6' },
  ];

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: 260,
      background: '#fff', borderRight: '1px solid #e8ecf1',
      display: 'flex', flexDirection: 'column', zIndex: 100,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 24px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #1E5EFF, #0046d6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: '0.85rem',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L12 22"/><path d="M2 12L22 12"/></svg>
        </div>
        <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>
          <span style={{ color: '#1E5EFF' }}>drugs</span><span style={{ color: '#22c55e' }}>F</span>
        </span>
      </div>

      {/* Search */}
      <div style={{ padding: '0 20px', marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Tìm kiếm thuốc..."
            style={{
              width: '100%', height: 44, padding: '0 14px 0 42px',
              borderRadius: 12, border: '1px solid #e8ecf1', background: '#f8fafc',
              fontSize: '0.88rem', color: '#1e293b', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* DANH MỤC */}
      <div style={{ padding: '0 16px', flex: 1 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', letterSpacing: 0.8, padding: '0 8px', marginBottom: 8, textTransform: 'uppercase' }}>
          Danh mục
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menuItems.map(m => {
            const active = page === m.key;
            return (
              <button key={m.key} onClick={() => setPage(m.key)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 12,
                border: 'none', cursor: 'pointer', width: '100%',
                background: active ? '#eff6ff' : 'transparent',
                color: active ? '#1E5EFF' : '#475569',
                fontWeight: active ? 600 : 500, fontSize: '0.9rem',
                fontFamily: 'inherit', textAlign: 'left',
                transition: 'background 0.15s, color 0.15s',
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; } }}
              >
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </nav>

        {/* NHÀ THUỐC ĐỐI TÁC */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', letterSpacing: 0.8, padding: '0 8px', marginBottom: 10, textTransform: 'uppercase' }}>
            Nhà thuốc đối tác
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pharmacies.map(p => (
              <div key={p.name} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                cursor: 'default', transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${p.color}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.2 }}>{p.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings + Logout - fixed at bottom */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #e8ecf1', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {isAdmin && (
          <button onClick={() => setPage('settings')} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 14px', borderRadius: 12,
            border: 'none', cursor: 'pointer', width: '100%',
            background: page === 'settings' ? '#eff6ff' : 'transparent',
            color: page === 'settings' ? '#1E5EFF' : '#475569',
            fontWeight: page === 'settings' ? 600 : 500, fontSize: '0.9rem',
            fontFamily: 'inherit', textAlign: 'left',
            transition: 'background 0.15s, color 0.15s',
          }}
            onMouseEnter={e => { if (page !== 'settings') { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; } }}
            onMouseLeave={e => { if (page !== 'settings') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; } }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <span>Cài đặt</span>
          </button>
        )}
        <button onClick={onLogout} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 14px', borderRadius: 12,
          border: 'none', cursor: 'pointer', width: '100%',
          background: 'transparent', color: '#ef4444',
          fontWeight: 500, fontSize: '0.9rem',
          fontFamily: 'inherit', textAlign: 'left',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}

/* ===== TOP BAR ===== */
function TopBar({ page }: { page: string }) {
  const titles: Record<string, string> = { compare: 'So sánh giá thuốc', products: 'Danh sách sản phẩm', favorites: 'Sản phẩm yêu thích', history: 'Lịch sử tìm kiếm', settings: 'Cài đặt' };
  return (
    <header style={{ height: 72, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', position: 'sticky', top: 0, zIndex: 5 }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{titles[page] || 'Dashboard'}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button style={{ ...iconBtn, position: 'relative' }}>
          🔔
          <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '2px solid #fff' }} />
        </button>
      </div>
    </header>
  );
}

/* ===== COMPARE ===== */
function CompareSection({ token }: { token: string }) {
  const { data, loading, error, search } = useSearch();
  const [keyword, setKeyword] = useState('');

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); search(keyword); };

  const formatPrice = (v: number) => v > 0 ? Math.round(v).toLocaleString('vi-VN') + '₫' : '—';
  const sourceLabels: Record<string, string> = { thuocsi: 'Thuốc Sĩ', longchau: 'Long Châu', pharmart: 'Pharmart', medigo: 'Medigo' };
  const sourceColors: Record<string, string> = { thuocsi: '#3b82f6', longchau: '#22c55e', pharmart: '#f59e0b', medigo: '#8b5cf6' };

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Xin chào! 👋</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>So sánh giá thuốc từ 4 nhà thuốc trên toàn quốc.<br/>Tìm kiếm sản phẩm và tìm mức giá tốt nhất.</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderRadius: 14, background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ color: '#94a3b8', fontSize: '1.1rem' }}>🔍</span>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Nhập tên thuốc cần so sánh (ví dụ: paracetamol, Panadol...)" style={{ border: 'none', background: 'none', outline: 'none', fontSize: '1rem', color: '#1e293b', width: '100%' }} />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '18px 36px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${BLUE}, #1d4ed8)`, color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
          {loading ? '⏳...' : '🔍 Tìm kiếm'}
        </button>
      </form>

      {/* Loading */}
      {loading && <div style={{ padding: 80, textAlign: 'center' }}><LoadingSpinner /></div>}
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: 20, borderRadius: 14, marginBottom: 24, border: '1px solid #fecaca' }}>{error}</div>}

      {/* Results */}
      {data && data.matches && data.matches.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <h3 style={{ color: '#1e293b', fontSize: '1.2rem', fontWeight: 600 }}>Kết quả so sánh</h3>
            <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>{data.matches.length} sản phẩm trùng khớp</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {data.matches.map((m: any, i: number) => {
              const cheapest = m.cheapest;
              // Sort sources: cheapest first
              const sources = ['thuocsi', 'longchau', 'pharmart', 'medigo'].sort((a, b) => {
                if (a === cheapest) return -1;
                if (b === cheapest) return 1;
                return 0;
              });
              return (
                <div key={i} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', minHeight: 300 }}>
                    {/* Left: Product Info */}
                    <div style={{ width: 320, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', borderRight: '1px solid #f1f5f9', flexShrink: 0 }}>
                      <div style={{ width: 200, height: 200, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        {m.products && Object.values(m.products).find((p: any) => p.image_url) ? (
                          <img src={(Object.values(m.products).find((p: any) => p.image_url) as any).image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }} />
                        ) : <span style={{ fontSize: '4rem', opacity: 0.3 }}>💊</span>}
                      </div>
                      <h4 style={{ color: '#1e293b', fontSize: '1.05rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.4, marginBottom: 16, maxWidth: 260 }}>{m.name}</h4>
                      <button onClick={async () => {
                        const firstProduct = Object.values(m.products || {}).find((p: any) => p) as any;
                        try {
                          const res = await fetch('/api/admin/favorites', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ product_name: m.name, source: firstProduct?.source || '', price: firstProduct?.price || 0, sale_price: firstProduct?.salePrice || 0, image_url: firstProduct?.image_url || '', product_url: firstProduct?.product_url || '' }),
                          });
                          const d = await res.json();
                          if (d.favorite) alert('Đã thêm vào yêu thích!');
                          else alert('Sản phẩm đã có trong danh sách yêu thích');
                        } catch { alert('Lỗi khi thêm yêu thích'); }
                      }} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#ef4444', marginBottom: 12, fontFamily: 'inherit' }}>❤️ Yêu thích</button>
                      {cheapest && cheapest !== 'unknown' && (
                        <span style={{ padding: '6px 16px', borderRadius: 8, background: '#dcfce7', color: '#16a34a', fontSize: '0.82rem', fontWeight: 600 }}>
                          🏆 Rẻ nhất: {sourceLabels[cheapest]} — {formatPrice(m.prices?.[cheapest])}
                        </span>
                      )}
                    </div>

                    {/* Right: 4 Pharmacy Cards */}
                    <div style={{ flex: 1, padding: 28, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                      {sources.map(src => {
                        const price = m.prices?.[src] || 0;
                        const isCheapest = cheapest === src && price > 0;
                        const hasProduct = price > 0;
                        const product = m.products?.[src];
                        return (
                          <div key={src} style={{
                            background: isCheapest ? '#f0fdf4' : '#fff',
                            borderRadius: 14,
                            padding: 20,
                            textAlign: 'center',
                            border: isCheapest ? '2px solid #22c55e' : '1px solid #e5e7eb',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            boxShadow: isCheapest ? '0 4px 12px rgba(34,197,94,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                          }}>
                            {/* Rẻ nhất badge */}
                            {isCheapest && (
                              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 14px', borderRadius: 8, background: '#22c55e', color: '#fff', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(34,197,94,0.3)' }}>
                                🏆 Rẻ nhất
                              </div>
                            )}

                            {/* Pharmacy header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, marginTop: isCheapest ? 8 : 0 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: sourceColors[src], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>
                                {src.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ color: '#334155', fontSize: '0.82rem', fontWeight: 600 }}>{sourceLabels[src]}</span>
                            </div>

                            {/* Product image */}
                            <div style={{ width: '100%', height: 100, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                              {product?.image_url ? (
                                <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : <span style={{ fontSize: '2rem', opacity: 0.3 }}>💊</span>}
                            </div>

                            {/* Price */}
                            <div style={{ color: isCheapest ? '#16a34a' : hasProduct ? '#1e293b' : '#94a3b8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>
                              {hasProduct ? formatPrice(price) : 'Không có'}
                            </div>

                            {/* Buy button */}
                            {hasProduct ? (
                              <a href={product?.product_url || '#'} target="_blank" rel="noopener noreferrer" style={{
                                marginTop: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                padding: '12px 0',
                                borderRadius: 10,
                                background: isCheapest ? '#22c55e' : BLUE,
                                color: '#fff',
                                textDecoration: 'none',
                                fontSize: '0.88rem',
                                fontWeight: 600,
                                transition: 'all 0.2s',
                                boxShadow: isCheapest ? '0 2px 8px rgba(34,197,94,0.3)' : '0 2px 8px rgba(37,99,235,0.2)',
                              }}>
                                🛒 Mua
                              </a>
                            ) : (
                              <div style={{ marginTop: 'auto', padding: '12px 0', borderRadius: 10, background: '#f1f5f9', color: '#94a3b8', fontSize: '0.82rem' }}>
                                Chưa có giá
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {data && data.matches && data.matches.length === 0 && (
        <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔍</div>
          <p style={{ fontSize: '1rem', marginBottom: 4 }}>Không tìm thấy sản phẩm phù hợp</p>
          <p style={{ fontSize: '0.85rem' }}>Thử tìm với từ khóa khác</p>
        </div>
      )}

      {!data && !loading && (
        <div style={{ textAlign: 'center', padding: 100, color: '#94a3b8' }}>
          <div style={{ fontSize: '4.5rem', marginBottom: 20 }}>💊</div>
          <p style={{ fontSize: '1.1rem', marginBottom: 8, color: '#64748b' }}>Nhập tên thuốc để bắt đầu so sánh giá</p>
          <p style={{ fontSize: '0.9rem' }}>Hệ thống sẽ tìm kiếm và so sánh giá từ 4 nhà thuốc</p>
        </div>
      )}
    </div>
  );
}

/* ===== PRODUCTS ===== */
function ProductsSection({ token, user }: { token: string; user: User }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceTab, setSourceTab] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const limit = 15;
  const isAdmin = (user.role || '').toLowerCase() === 'admin' || (user.role || '').toLowerCase() === 'editor';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (sourceTab !== 'all') params.set('source', sourceTab);
    const r = await fetch(`${API}/products?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    setProducts(d.products || []);
    setTotal(d.total || 0);
    setLoading(false);
  }, [page, search, sourceTab, token]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async () => {
    if (!selected) return;
    await fetch(`${API}/products/${selected.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setModal(null); setSelected(null); fetchProducts();
  };

  const handleSave = async (form: any) => {
    const method = selected?.id ? 'PUT' : 'POST';
    const url = selected?.id ? `${API}/products/${selected.id}` : `${API}/products`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
    setModal(null); setSelected(null); fetchProducts();
  };

  const sources = [
    { key: 'all', label: 'Tất cả', color: '#64748b' },
    { key: 'thuocsi', label: 'Thuốc Sĩ', color: '#3b82f6' },
    { key: 'longchau', label: 'Long Châu', color: '#22c55e' },
    { key: 'pharmart', label: 'Pharmart', color: '#f59e0b' },
    { key: 'medigo', label: 'Medigo', color: '#8b5cf6' },
  ];

  const sourceLabels: Record<string, string> = { thuocsi: 'Thuốc Sĩ', longchau: 'Long Châu', pharmart: 'Pharmart', medigo: 'Medigo' };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Quản lý Sản phẩm</h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Quản lý thông tin sản phẩm thuốc từ 4 nhà thuốc</p>
        </div>
      
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: '#fff', border: '1px solid #e5e7eb' }}>
          <span style={{ color: '#94a3b8' }}>🔍</span>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm tên thuốc, hoạt chất, nhà sản xuất..." style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.88rem', width: '100%' }} />
        </div>
        <select value={sourceTab} onChange={e => { setSourceTab(e.target.value); setPage(1); }} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.88rem', color: '#334155', cursor: 'pointer', minWidth: 140 }}>
          {sources.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.88rem', color: '#334155', cursor: 'pointer', minWidth: 140 }}>
          <option value="newest">Mới nhất</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
          <option value="name">Tên A-Z</option>
        </select>
        <button onClick={fetchProducts} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.95rem' }}>🔄</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {sources.filter(s => s.key !== 'all').map(s => (
          <div key={s.key} style={{ flex: 1, padding: '14px 18px', borderRadius: 12, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontWeight: 700, fontSize: '0.75rem' }}>
              {s.key.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{s.label}</div>
              <div style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.95rem' }}>{products.filter(p => p.source === s.key).length}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb' }}>Đang tải...</div>
      ) : (
        <>
          <style>{`
            .product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
            @media (max-width: 1200px) { .product-grid { grid-template-columns: repeat(3, 1fr); } }
            @media (max-width: 900px) { .product-grid { grid-template-columns: repeat(2, 1fr); } }
            @media (max-width: 600px) { .product-grid { grid-template-columns: 1fr; } }
          `}</style>
          <div className="product-grid">
            {products.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 180, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: '1px solid #f1f5f9' }}>
                  {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <span style={{ fontSize: '2.5rem', opacity: 0.2 }}>💊</span>}
                </div>
                <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                  <span style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 6, background: '#f1f5f9', fontSize: '0.75rem', color: '#64748b' }}>{sourceLabels[p.source] || p.source}</span>
                  <div style={{ fontWeight: 700, color: BLUE, fontSize: '1rem', marginTop: 'auto' }}>{p.price > 0 ? Math.round(p.price).toLocaleString('vi-VN') + '₫' : '—'}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') : '—'}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {isAdmin ? (
                      <>
                        {p.product_url && <a href={p.product_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: '#f1f5f9', color: '#64748b', textDecoration: 'none', fontSize: '0.8rem', textAlign: 'center', fontWeight: 500 }}>👁 Xem</a>}
                        <button onClick={() => { setSelected(p); setModal('edit'); }} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', background: '#eff6ff', color: BLUE, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>✏️ Sửa</button>
                        <button onClick={() => { setSelected(p); setModal('delete'); }} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>🗑️</button>
                      </>
                    ) : (
                      p.product_url && <a href={p.product_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: BLUE, color: '#fff', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center', display: 'block' }}>🛒 Mua</a>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb' }}>Không tìm thấy sản phẩm</div>
            )}
          </div>
        </>
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 24 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtn}>←</button>
        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Trang {page} / {Math.ceil(total / limit) || 1} ({total} sản phẩm)</span>
        <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} style={pageBtn}>→</button>
      </div>

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <ProductModal product={selected} onSave={handleSave} onClose={() => { setModal(null); setSelected(null); }} />
      )}

      {/* Delete Modal */}
      {modal === 'delete' && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 36, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: '#fef2f2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 12 }}>⚠️</div>
              <h3 style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Xác nhận xóa</h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Bạn có chắc muốn xóa sản phẩm này? Hành động này không thể hoàn tác.</p>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 24 }}>
              <div style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.9rem' }}>{selected.name}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: 2 }}>{sourceLabels[selected.source] || selected.source} • {selected.price > 0 ? Math.round(selected.price).toLocaleString('vi-VN') + '₫' : '—'}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDelete} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>🗑️ Xóa</button>
              <button onClick={() => { setModal(null); setSelected(null); }} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductModal({ product, onSave, onClose }: { product: any; onSave: (f: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: product?.name || '', source: product?.source || 'thuocsi', price: product?.price?.toString() || '',
    product_url: product?.product_url || '', image_url: product?.image_url || '',
  });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 0, width: 520, maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 700 }}>{product ? '✏️ Chỉnh sửa sản phẩm' : '➕ Thêm sản phẩm mới'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
        </div>
        {/* Body */}
        <form onSubmit={e => { e.preventDefault(); onSave({ ...product, ...form, price: Number(form.price) || 0 }); }} style={{ padding: '24px 32px', overflowY: 'auto', maxHeight: 'calc(85vh - 140px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>Tên sản phẩm <span style={{ color: '#ef4444' }}>*</span></label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Nhập tên sản phẩm" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Nguồn</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={inputStyle}>
                  <option value="thuocsi">Thuốc Sĩ</option><option value="longchau">Long Châu</option><option value="pharmart">Pharmart</option><option value="medigo">Medigo</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Giá (₫)</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>URL hình ảnh</label>
              <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
              {form.image_url && (
                <div style={{ marginTop: 8, width: 80, height: 80, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <img src={form.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>URL sản phẩm</label>
              <input value={form.product_url} onChange={e => setForm(f => ({ ...f, product_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
            </div>
          </div>
          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, marginTop: 28, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
            <button type="submit" style={{ flex: 1, padding: '13px 0', borderRadius: 10, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>💾 Lưu</button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}>Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===== FAVORITES ===== */
function FavoritesSection({ token }: { token: string }) {
  const [sort, setSort] = useState('date');
  const [page, setPage] = useState(1);
  const perPage = 12;
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      fetch('/api/admin/favorites', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setFavorites(d.favorites || [])).catch(() => {});
    }
  }, [token]);

  const sorted = [...favorites].sort((a: any, b: any) => {
    if (sort === 'price_asc') return (a.sale_price || a.price || 0) - (b.sale_price || b.price || 0);
    if (sort === 'price_desc') return (b.sale_price || b.price || 0) - (a.sale_price || a.price || 0);
    if (sort === 'name') return (a.product_name || '').localeCompare(b.product_name || '');
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  const paged = sorted.slice((page - 1) * perPage, page * perPage);

  const formatPrice = (v: number) => v > 0 ? Math.round(v).toLocaleString('vi-VN') + '₫' : '';

  const removeFavorite = async (id: number) => {
    await fetch(`/api/admin/favorites/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setFavorites(favorites.filter((f: any) => f.id !== id));
  };

  const sourceLabels: Record<string, string> = { thuocsi: 'Thuốc Sĩ', longchau: 'Long Châu', pharmart: 'Pharmart', medigo: 'Medigo' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Sản phẩm yêu thích</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{favorites.length} sản phẩm đã lưu</p>
        </div>
        {favorites.length > 0 && (
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
            <option value="date">Sắp xếp theo ngày</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
            <option value="name">Tên A-Z</option>
          </select>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {paged.map((p: any) => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}>
            <button onClick={() => removeFavorite(p.id)} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', zIndex: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>✕</button>
            <div style={{ height: 180, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f1f5f9' }}>
              {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 16 }} /> : <span style={{ fontSize: '3rem', opacity: 0.2 }}>💊</span>}
            </div>
            <div style={{ padding: '14px 16px 16px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{sourceLabels[p.source] || p.source}</div>
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem', lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 48 }}>{p.product_name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
                <span style={{ color: BLUE, fontWeight: 700, fontSize: '1.1rem' }}>{formatPrice(p.sale_price || p.price)}</span>
              </div>
              {p.product_url && <a href={p.product_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>Xem</a>}
            </div>
          </div>
        ))}
      </div>

      {paged.length === 0 && (
        <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📦</div>
          <p>Chưa có sản phẩm yêu thích nào</p>
          <p style={{ fontSize: '0.85rem', marginTop: 8 }}>Nhấn ❤️ trên sản phẩm để thêm vào danh sách yêu thích</p>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#334155' }}>←</button>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Trang {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#334155' }}>→</button>
        </div>
      )}
    </div>
  );
}

/* ===== HISTORY ===== */
function HistorySection({ token }: { token: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewData, setViewData] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewKeyword, setViewKeyword] = useState('');
  const limit = 15;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('keyword', search);
    const r = await fetch(`${API}/history?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    setHistory(d.history || []);
    setTotal(d.total || 0);
    setLoading(false);
  }, [page, search, token]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const viewCompare = async (keyword: string) => {
    setViewKeyword(keyword);
    setViewLoading(true);
    setViewData(null);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
      const d = await r.json();
      setViewData(d);
    } catch {}
    setViewLoading(false);
  };

  const formatPrice = (v: number) => v > 0 ? Math.round(v).toLocaleString('vi-VN') + '₫' : '—';
  const sourceLabels: Record<string, string> = { thuocsi: 'Thuốc Sĩ', longchau: 'Long Châu', pharmart: 'Pharmart', medigo: 'Medigo' };
  const sourceColors: Record<string, string> = { thuocsi: '#3b82f6', longchau: '#22c55e', pharmart: '#f59e0b', medigo: '#8b5cf6' };

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Lịch sử 🔍</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>{total} lượt tìm kiếm</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); setPage(1); fetchHistory(); }} style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 12, background: '#fff', border: '1px solid #e5e7eb' }}>
          <span style={{ color: '#94a3b8' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo keyword..." style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.9rem', width: '100%' }} />
        </div>
        <button type="submit" style={{ padding: '14px 28px', borderRadius: 12, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>Tìm</button>
      </form>

      {loading ? <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div> : (
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={th}>Thời gian</th><th style={th}>Keyword</th><th style={th}>Kết quả</th><th style={th}>Nguồn</th><th style={{ ...th, textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h: any) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{new Date(h.created_at).toLocaleString('vi-VN')}</td>
                  <td style={td}><span style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: 6, fontSize: '0.85rem' }}>{h.keyword}</span></td>
                  <td style={td}>{h.total_results || (h.thuocsi_count + h.longchau_count + h.pharmart_count + h.medigo_count)} sản phẩm</td>
                  <td style={td}>{[h.thuocsi_ok && 'Thuốc Sĩ', h.longchau_ok && 'Long Châu', h.pharmart_ok && 'Pharmart', h.medigo_ok && 'Medigo'].filter(Boolean).join(', ') || '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button onClick={() => viewCompare(h.keyword)} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>👁 Xem</button>
                  </td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 24 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtn}>←</button>
        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Trang {page} / {Math.ceil(total / limit) || 1}</span>
        <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} style={pageBtn}>→</button>
      </div>

      {/* Compare Modal */}
      {(viewLoading || viewData) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '95%', maxWidth: 1100, maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h3 style={{ color: '#1e293b', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>⚖️ So sánh: "{viewKeyword}"</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '4px 0 0' }}>{viewData?.matches?.length || 0} sản phẩm trùng khớp</p>
              </div>
              <button onClick={() => { setViewData(null); setViewKeyword(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#94a3b8', padding: 4 }}>✕</button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
              {viewLoading && <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>⏳ Đang tìm kiếm...</div>}

              {viewData?.matches?.map((m: any, i: number) => {
                const cheapest = m.cheapest;
                const sources = ['thuocsi', 'longchau', 'pharmart', 'medigo'].sort((a, b) => {
                  if (a === cheapest) return -1;
                  if (b === cheapest) return 1;
                  return 0;
                });
                return (
                  <div key={i} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', minHeight: 260 }}>
                      {/* Left: Product Info */}
                      <div style={{ width: 260, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', borderRight: '1px solid #f1f5f9', flexShrink: 0 }}>
                        <div style={{ width: 160, height: 160, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                          {m.products && Object.values(m.products).find((p: any) => p.image_url) ? (
                            <img src={(Object.values(m.products).find((p: any) => p.image_url) as any).image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }} />
                          ) : <span style={{ fontSize: '3rem', opacity: 0.3 }}>💊</span>}
                        </div>
                        <h4 style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.4, marginBottom: 12, maxWidth: 220 }}>{m.name}</h4>
                        {cheapest && cheapest !== 'unknown' && (
                          <span style={{ padding: '5px 14px', borderRadius: 8, background: '#dcfce7', color: '#16a34a', fontSize: '0.78rem', fontWeight: 600 }}>
                            🏆 Rẻ nhất: {sourceLabels[cheapest]} — {formatPrice(m.prices?.[cheapest])}
                          </span>
                        )}
                      </div>

                      {/* Right: 4 Pharmacy Cards */}
                      <div style={{ flex: 1, padding: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                        {sources.map(src => {
                          const price = m.prices?.[src] || 0;
                          const isCheapest = cheapest === src && price > 0;
                          const hasProduct = price > 0;
                          const product = m.products?.[src];
                          return (
                            <div key={src} style={{
                              background: isCheapest ? '#f0fdf4' : '#fff', borderRadius: 12, padding: 16, textAlign: 'center',
                              border: isCheapest ? '2px solid #22c55e' : '1px solid #e5e7eb',
                              display: 'flex', flexDirection: 'column', position: 'relative',
                            }}>
                              {isCheapest && (
                                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', padding: '3px 12px', borderRadius: 6, background: '#22c55e', color: '#fff', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>🏆 Rẻ nhất</div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12, marginTop: isCheapest ? 6 : 0 }}>
                                <div style={{ width: 24, height: 24, borderRadius: 6, background: sourceColors[src], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>{src.charAt(0).toUpperCase()}</div>
                                <span style={{ color: '#334155', fontSize: '0.78rem', fontWeight: 600 }}>{sourceLabels[src]}</span>
                              </div>
                              <div style={{ width: '100%', height: 80, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                                {product?.image_url ? (
                                  <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>💊</span>}
                              </div>
                              <div style={{ color: isCheapest ? '#16a34a' : hasProduct ? '#1e293b' : '#94a3b8', fontSize: '1rem', fontWeight: 700, marginBottom: 10 }}>
                                {hasProduct ? formatPrice(price) : 'Không có'}
                              </div>
                              {hasProduct && product?.product_url && (
                                <a href={product.product_url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 'auto', padding: '7px 0', borderRadius: 8, background: isCheapest ? '#22c55e' : BLUE, color: '#fff', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>🛒 Mua</a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {viewData && viewData.matches && viewData.matches.length === 0 && (
                <div style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
                  <p>Không tìm thấy sản phẩm trùng khớp</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== FOOTER ===== */
function Footer() {
  return (
    <footer style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '24px 48px', marginTop: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>© 2026 PharmaCompare. All rights reserved.</span>
      <div style={{ display: 'flex', gap: 24 }}>
        {['Privacy Policy', 'Terms of Service', 'Contact Support'].map(l => <a key={l} href="#" style={{ color: '#94a3b8', fontSize: '0.82rem', textDecoration: 'none' }}>{l}</a>)}
      </div>
    </footer>
  );
}

/* ===== SETTINGS SECTION ===== */
function SettingsSection() {
  const [activeTab, setActiveTab] = useState('chung');
  const [msg, setMsg] = useState('');
  const [appName, setAppName] = useState('drugsF - So sánh giá thuốc');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [currency, setCurrency] = useState('VND');
  const [syncInterval, setSyncInterval] = useState('30');
  const [retryCount, setRetryCount] = useState('3');
  const [pauseOnError, setPauseOnError] = useState('false');
  const [autoDelete, setAutoDelete] = useState(true);

  const tabs = [
    { key: 'chung', icon: 'ℹ️', label: 'Chung' },
    { key: 'thu-thap', icon: '🗄️', label: 'Thu thập dữ liệu' },
    { key: 'nha-thuoc', icon: '🏪', label: 'Nhà thuốc đối tác' },
    { key: 'thong-bao', icon: '🔔', label: 'Thông báo' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Cài đặt hệ thống</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Quản lý các thiết lập cơ bản của hệ thống.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 28 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '12px 20px', borderRadius: 0, border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '0.88rem', fontWeight: activeTab === t.key ? 600 : 400,
            color: activeTab === t.key ? BLUE : '#64748b',
            borderBottom: activeTab === t.key ? `2px solid ${BLUE}` : '2px solid transparent',
            marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {msg && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: '0.88rem', border: '1px solid #bbf7d0' }}>{msg}</div>}

      {/* Tab content */}
      {activeTab === 'chung' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* General Info */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>ℹ️</div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Thông tin chung</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelSt}>Tên hệ thống</label>
                <input value={appName} onChange={e => setAppName(e.target.value)} style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Múi giờ</label>
                <select value={timezone} onChange={e => setTimezone(e.target.value)} style={inputSt}>
                  <option value="Asia/Ho_Chi_Minh">(GMT+07:00) Asia/Ho Chi Minh</option>
                  <option value="Asia/Bangkok">(GMT+07:00) Asia/Bangkok</option>
                </select>
              </div>
              <div>
                <label style={labelSt}>Đơn vị tiền tệ</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputSt}>
                  <option value="VND">VND (Việt Nam Đồng)</option>
                  <option value="USD">USD (US Dollar)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Data Collection */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🗄️</div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Cài đặt thu thập dữ liệu</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelSt}>Khoảng thời gian cập nhật</label>
                <select value={syncInterval} onChange={e => setSyncInterval(e.target.value)} style={inputSt}>
                  <option value="15">Mỗi 15 phút</option>
                  <option value="30">Mỗi 30 phút</option>
                  <option value="60">Mỗi 1 giờ</option>
                  <option value="360">Mỗi 6 giờ</option>
                </select>
              </div>
              <div>
                <label style={labelSt}>Số lần thử lại khi lỗi</label>
                <select value={retryCount} onChange={e => setRetryCount(e.target.value)} style={inputSt}>
                  <option value="1">1 lần</option>
                  <option value="3">3 lần</option>
                  <option value="5">5 lần</option>
                </select>
              </div>
              <div>
                <label style={labelSt}>Tạm dừng khi gặp lỗi liên tục</label>
                <select value={pauseOnError} onChange={e => setPauseOnError(e.target.value)} style={inputSt}>
                  <option value="false">Không tạm dừng</option>
                  <option value="true">Tạm dừng sau 5 lỗi liên tiếp</option>
                </select>
              </div>
            </div>
          </div>

          {/* System Management */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🛡️</div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Quản lý hệ thống</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 10 }}>
                <div>
                  <div style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.88rem' }}>Xóa dữ liệu cũ</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 2 }}>Tự động xóa dữ liệu quá 90 ngày</div>
                </div>
                <ToggleSwitch checked={autoDelete} onChange={() => setAutoDelete(!autoDelete)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 10 }}>
                <div>
                  <div style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.88rem' }}>Sao lưu dữ liệu</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 2 }}>Tạo bản sao lưu thủ công</div>
                </div>
                <button onClick={() => { setMsg('Đã sao lưu thành công!'); setTimeout(() => setMsg(''), 3000); }} style={{ padding: '6px 16px', borderRadius: 8, border: `1px solid ${BLUE}`, background: '#fff', color: BLUE, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>Sao lưu</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'thu-thap' && (
        <div style={{ ...cardStyle, maxWidth: 600 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>Cài đặt thu thập dữ liệu</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Cấu hình cách hệ thống thu thập dữ liệu giá từ các nhà thuốc.</p>
        </div>
      )}

      {activeTab === 'nha-thuoc' && (
        <div style={{ ...cardStyle, maxWidth: 600 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>Nhà thuốc đối tác</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Quản lý kết nối với các nhà thuốc đối tác.</p>
        </div>
      )}

      {activeTab === 'thong-bao' && (
        <div style={{ ...cardStyle, maxWidth: 600 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>Thông báo</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Cấu hình thông báo hệ thống.</p>
        </div>
      )}

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
        <button onClick={() => { setMsg('Đã lưu thay đổi!'); setTimeout(() => setMsg(''), 3000); }} style={{
          padding: '14px 32px', borderRadius: 12, border: 'none', background: BLUE, color: '#fff',
          cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          💾 Lưu thay đổi
        </button>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', background: checked ? BLUE : '#d1d5db', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: checked ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

const iconBtn: React.CSSProperties = { width: 42, height: 42, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' };
const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const labelSt: React.CSSProperties = { display: 'block', color: '#374151', fontSize: '0.82rem', fontWeight: 500, marginBottom: 6 };
const inputSt: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#1e293b', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', height: 44 };
const pageBtn: React.CSSProperties = { padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#334155', cursor: 'pointer', fontSize: '0.88rem' };
const th: React.CSSProperties = { padding: '14px 20px', textAlign: 'left', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 };
const td: React.CSSProperties = { padding: '16px 20px', color: '#334155', fontSize: '0.9rem' };
const labelStyle: React.CSSProperties = { display: 'block', color: '#374151', fontSize: '0.82rem', fontWeight: 500, marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#1e293b', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' };

export default App;
