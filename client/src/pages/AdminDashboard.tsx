import { useState, useEffect, useCallback } from 'react';

const API = '/api/admin';

// ===== TYPES =====
interface User {
  id: number; username: string; full_name: string; role: string; permissions: string[];
}
interface Product {
  id: number; name: string; source: string; price: number; product_url: string; image_url: string; created_at: string;
}
interface Source {
  id: number; slug: string; name: string; url: string; is_active: boolean; scraper_type: string; last_scraped_at: string; total_products: number;
}
interface HistoryEntry {
  id: number; keyword: string; total_results: number; thuocsi_ok: boolean; longchau_ok: boolean; pharmart_ok: boolean; medigo_ok: boolean; created_at: string;
}

// ===== ADMIN APP =====
export function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [page, setPage] = useState('products');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    if (token) {
      fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => { if (d.user) setUser(d.user); else { setToken(null); localStorage.removeItem('admin_token'); } })
        .catch(() => { setToken(null); localStorage.removeItem('admin_token'); });
    }
  }, [token]);

  const handleLogin = (t: string, u: User) => {
    setToken(t);
    localStorage.setItem('admin_token', t);
    setUser(u);
  };

  if (!token || !user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fa' }}>
      <Sidebar page={page} setPage={setPage} searchValue={searchValue} setSearchValue={setSearchValue} />
      <main style={{ flex: 1, padding: 28, overflow: 'auto', marginLeft: 260 }}>
        {page === 'products' && <ProductsPage token={token} />}
        {page === 'compare' && <ComparePage />}
        {page === 'history' && <HistoryPage token={token} />}
        {page === 'settings' && <SettingsPage token={token} />}
      </main>
    </div>
  );
}

// ===== SIDEBAR =====
function Sidebar({ page, setPage, searchValue, setSearchValue }: { page: string; setPage: (p: string) => void; searchValue: string; setSearchValue: (v: string) => void }) {
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
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
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

      {/* Settings - fixed at bottom */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #e8ecf1' }}>
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
      </div>
    </aside>
  );
}

// ===== LOGIN =====
function LoginScreen({ onLogin }: { onLogin: (t: string, u: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      onLogin(d.token, d.user);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', width: 400, boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
        <h1 style={{ color: '#1e293b', fontSize: '1.5rem', textAlign: 'center', marginBottom: 6 }}>
          <span style={{ color: '#1E5EFF' }}>drugs</span><span style={{ color: '#22c55e' }}>F</span>
        </h1>
        <p style={{ color: '#64748b', textAlign: 'center', marginBottom: 28, fontSize: '0.85rem' }}>Đăng nhập quản trị</p>
        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: '0.85rem', border: '1px solid #fecaca' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Tên đăng nhập" required style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" required style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          <button type="submit" disabled={loading} style={{ ...inp, background: '#1E5EFF', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: loading ? 0.6 : 1, border: 'none' }}>
            {loading ? '...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ===== PRODUCTS PAGE =====
function ProductsPage({ token }: { token: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceTab, setSourceTab] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const limit = 20;

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

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa sản phẩm này?')) return;
    await fetch(`${API}/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchProducts();
  };

  const handleSave = async (product: any) => {
    const method = product.id ? 'PUT' : 'POST';
    const url = product.id ? `${API}/products/${product.id}` : `${API}/products`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(product) });
    setEditProduct(null); setShowAdd(false); fetchProducts();
  };

  const sources = [
    { key: 'all', label: 'Tất cả', icon: '📦', color: '#94a3b8' },
    { key: 'thuocsi', label: 'Thuốc Sĩ', icon: '💊', color: '#3b82f6' },
    { key: 'longchau', label: 'Long Châu', icon: '🏥', color: '#22c55e' },
    { key: 'pharmart', label: 'Pharmart', icon: '💉', color: '#f59e0b' },
    { key: 'medigo', label: 'Medigo', icon: '🩺', color: '#8b5cf6' },
  ];

  const sourceColors: Record<string, string> = { thuocsi: '#3b82f6', longchau: '#22c55e', pharmart: '#f59e0b', medigo: '#8b5cf6' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: '#1e293b', fontSize: '1.4rem', margin: 0 }}>Quản lý Sản phẩm</h2>
        <button onClick={() => setShowAdd(true)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1E5EFF', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>+ Thêm sản phẩm</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {sources.map(s => (
          <button key={s.key} onClick={() => { setSourceTab(s.key); setPage(1); }}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              background: sourceTab === s.key ? s.color : '#f1f5f9',
              color: sourceTab === s.key ? '#fff' : '#64748b',
            }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm kiếm tên thuốc..." style={{ ...inp, flex: 1, background: '#fff', border: '1px solid #e2e8f0' }} />
      </div>

      <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
        Hiển thị <strong style={{ color: '#1e293b' }}>{products.length}</strong> / <strong style={{ color: '#1e293b' }}>{total}</strong> sản phẩm
      </div>

      {loading ? <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>Đang tải...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {products.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e8ecf1', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ height: 180, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div style={{ color: '#cbd5e1', fontSize: '2rem' }}>💊</div>
                )}
                <div style={{ position: 'absolute', top: 8, left: 8, background: sourceColors[p.source] || '#94a3b8', color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600 }}>
                  {sources.find(s => s.key === p.source)?.label || p.source}
                </div>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ color: '#1e293b', fontSize: '0.9rem', fontWeight: 600, marginBottom: 6, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.name}
                </div>
                <div style={{ color: '#22c55e', fontSize: '1.1rem', fontWeight: 700, marginBottom: 10 }}>
                  {p.price > 0 ? Math.round(p.price).toLocaleString('vi-VN') + '₫' : 'Liên hệ'}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {p.product_url && <a href={p.product_url} target="_blank" rel="noopener noreferrer" style={{ ...cardBtn, background: '#f1f5f9', color: '#475569', textDecoration: 'none', flex: 1, textAlign: 'center' }}>🔗 Xem</a>}
                  <button onClick={() => setEditProduct(p)} style={{ ...cardBtn, background: '#1E5EFF', color: '#fff', flex: 1 }}>✏️ Sửa</button>
                  <button onClick={() => handleDelete(p.id)} style={{ ...cardBtn, background: '#fee2e2', color: '#dc2626', flex: 1 }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📦</div>
              <p>Không tìm thấy sản phẩm nào</p>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtn}>←</button>
        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Trang {page} / {Math.ceil(total / limit) || 1}</span>
        <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} style={pageBtn}>→</button>
      </div>

      {(editProduct || showAdd) && <ProductModal product={editProduct} onSave={handleSave} onClose={() => { setEditProduct(null); setShowAdd(false); }} />}
    </div>
  );
}

function ProductModal({ product, onSave, onClose }: { product: Product | null; onSave: (p: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: product?.name || '', source: product?.source || 'thuocsi', price: product?.price?.toString() || '',
    product_url: product?.product_url || '', image_url: product?.image_url || '',
  });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <h3 style={{ color: '#1e293b', marginBottom: 20, fontSize: '1.15rem' }}>{product ? '✏️ Chỉnh sửa sản phẩm' : '➕ Thêm sản phẩm mới'}</h3>
        <form onSubmit={e => { e.preventDefault(); onSave({ ...product, ...form, price: Number(form.price) || 0 }); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tên sản phẩm" required style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <option value="thuocsi">Thuốc Sĩ</option><option value="longchau">Long Châu</option><option value="pharmart">Pharmart</option><option value="medigo">Medigo</option>
          </select>
          <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="Giá (₫)" style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          <input value={form.product_url} onChange={e => setForm(f => ({ ...f, product_url: e.target.value }))} placeholder="URL sản phẩm" style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="URL hình ảnh" style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" style={{ ...inp, background: '#1E5EFF', color: '#fff', cursor: 'pointer', flex: 1, fontWeight: 600, border: 'none' }}>💾 Lưu</button>
            <button type="button" onClick={onClose} style={{ ...inp, background: '#f1f5f9', color: '#475569', cursor: 'pointer', flex: 1, border: '1px solid #e2e8f0' }}>Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== COMPARE PAGE =====
function ComparePage() {
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true); setError(''); setData(null);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
      const d = await r.json();
      setData(d);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const formatPrice = (v: number) => v > 0 ? Math.round(v).toLocaleString('vi-VN') + '₫' : '—';

  return (
    <div>
      <h2 style={{ color: '#1e293b', fontSize: '1.4rem', marginBottom: 24 }}>So sánh giá</h2>
      <form onSubmit={doSearch} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Nhập tên thuốc cần so sánh..." style={{ ...inp, flex: 1, background: '#fff', border: '1px solid #e2e8f0' }} />
        <button type="submit" disabled={loading} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#1E5EFF', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', fontFamily: 'inherit' }}>
          {loading ? '⏳...' : '🔍 Tìm'}
        </button>
      </form>
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: '0.88rem', border: '1px solid #fecaca' }}>{error}</div>}
      {data && data.matches && data.matches.length > 0 && (
        <div>
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 16, color: '#64748b', border: '1px solid #e8ecf1' }}>
            Tìm thấy <strong style={{ color: '#1e293b' }}>{data.matches.length}</strong> nhóm sản phẩm trùng khớp
          </div>
          {data.matches.map((m: any, i: number) => {
            const cheapest = m.cheapest;
            return (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 16, border: cheapest ? '1px solid #22c55e' : '1px solid #e8ecf1' }}>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem', marginBottom: 12 }}>{m.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {['thuocsi', 'longchau', 'pharmart', 'medigo'].map(src => {
                    const price = m.prices?.[src];
                    const isCheapest = cheapest === src;
                    const labels: Record<string, string> = { thuocsi: 'Thuốc Sĩ', longchau: 'Long Châu', pharmart: 'Pharmart', medigo: 'Medigo' };
                    return (
                      <div key={src} style={{ background: '#f8fafc', borderRadius: 10, padding: 14, textAlign: 'center', border: isCheapest ? '2px solid #22c55e' : '1px solid #e8ecf1' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 6 }}>{labels[src]}</div>
                        <div style={{ color: isCheapest ? '#22c55e' : '#1e293b', fontSize: '1.1rem', fontWeight: 700 }}>{formatPrice(price)}</div>
                        {isCheapest && <div style={{ color: '#22c55e', fontSize: '0.7rem', marginTop: 4 }}>🏆 Rẻ nhất</div>}
                      </div>
                    );
                  })}
                </div>
                {cheapest && (
                  <div style={{ marginTop: 12, padding: '10px 16px', background: '#f0fdf4', borderRadius: 10, color: '#16a34a', fontSize: '0.9rem', border: '1px solid #bbf7d0' }}>
                    🏆 Rẻ nhất: <strong>{cheapest}</strong> — {formatPrice(m.prices?.[cheapest])}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {data && data.matches && data.matches.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
          <p>Không tìm thấy sản phẩm trùng khớp.</p>
        </div>
      )}
    </div>
  );
}

// ===== HISTORY PAGE =====
function HistoryPage({ token }: { token: string }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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

  const exportCSV = () => {
    window.open(`${API}/history/export?keyword=${search}`, '_blank');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: '#1e293b', fontSize: '1.4rem', margin: 0 }}>Lịch sử Tìm kiếm</h2>
        <button onClick={exportCSV} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', fontFamily: 'inherit' }}>📥 Export CSV</button>
      </div>
      <form onSubmit={e => { e.preventDefault(); setPage(1); fetchHistory(); }} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo keyword..." style={{ ...inp, flex: 1, background: '#fff', border: '1px solid #e2e8f0' }} />
        <button type="submit" style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1E5EFF', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', fontFamily: 'inherit' }}>Tìm</button>
      </form>
      {loading ? <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>Đang tải...</div> : (
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e8ecf1' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={th}>Thời gian</th><th style={th}>Keyword</th><th style={th}>Kết quả</th><th style={th}>Nguồn</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{new Date(h.created_at).toLocaleString('vi-VN')}</td>
                  <td style={td}>{h.keyword}</td>
                  <td style={td}>{h.total_results} sản phẩm</td>
                  <td style={td}>
                    {[h.thuocsi_ok && 'Thuốc Sĩ', h.longchau_ok && 'Long Châu', h.pharmart_ok && 'Pharmart', h.medigo_ok && 'Medigo'].filter(Boolean).join(', ') || '—'}
                  </td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtn}>←</button>
        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Trang {page} / {Math.ceil(total / limit) || 1}</span>
        <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} style={pageBtn}>→</button>
      </div>
    </div>
  );
}

// ===== SETTINGS PAGE =====
function SettingsPage({ token }: { token: string }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [msg, setMsg] = useState('');
  const [user, setUser] = useState<any>(null);

  const [appName, setAppName] = useState('DrugPrice Compare');
  const [currency, setCurrency] = useState('VND');
  const [language, setLanguage] = useState('vi');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [maxResults, setMaxResults] = useState('100');
  const [cacheDuration, setCacheDuration] = useState('30');
  const [sessionTimeout, setSessionTimeout] = useState('60');

  const [toggles, setToggles] = useState({
    twoFactor: false, emailNotif: true, activityNotif: true,
    apiAccess: false, maintenanceMode: false, publicApi: false,
    autoSync: true, priceHistory: true, duplicateDetection: true,
    autoBackup: true,
  });
  const toggle = (key: keyof typeof toggles) => setToggles(t => ({ ...t, [key]: !t[key] }));

  useEffect(() => {
    fetch(`${API}/sources`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setSources(d.sources || [])).catch(() => {});
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUser(d.user)).catch(() => {});
  }, [token]);

  const toggleSource = async (slug: string, isActive: boolean) => {
    await fetch(`${API}/sources/${slug}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: isActive }),
    });
    setSources(prev => prev.map(s => s.slug === slug ? { ...s, is_active: isActive } : s));
    setMsg(`Đã ${isActive ? 'bật' : 'tắt'} ${slug}`);
    setTimeout(() => setMsg(''), 3000);
  };

  const labels: Record<string, string> = { thuocsi: 'Thuốc Sĩ', longchau: 'Long Châu', pharmart: 'Pharmart', medigo: 'Medigo' };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 style={{ color: '#1e293b', fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>Cài đặt Hệ thống</h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Quản lý cấu hình hệ thống và bảo mật cho quản trị viên</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit' }}>📤 Export Settings</button>
          <button onClick={() => { setMsg('Đã lưu cài đặt!'); setTimeout(() => setMsg(''), 3000); }} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1E5EFF', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit' }}>💾 Lưu thay đổi</button>
        </div>
      </div>

      {msg && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: 12, borderRadius: 10, marginBottom: 20, fontSize: '0.9rem', border: '1px solid #bbf7d0' }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { icon: '💊', label: 'Tổng sản phẩm', value: sources.reduce((a, s) => a + s.total_products, 0).toLocaleString(), color: '#3b82f6', bg: '#eff6ff' },
          { icon: '📋', label: 'Yêu cầu tư vấn', value: '24', color: '#22c55e', bg: '#f0fdf4' },
          { icon: '🏪', label: 'Nhà thuốc', value: `${sources.filter(s => s.is_active).length}/4`, color: '#f59e0b', bg: '#fffbeb' },
          { icon: '⚠️', label: 'Báo cáo lỗi', value: '3', color: '#ef4444', bg: '#fef2f2' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #e8ecf1', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>{s.icon}</div>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{s.label}</span>
            </div>
            <div style={{ color: '#1e293b', fontSize: '1.6rem', fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card title="👤 Account Settings" desc="Quản lý thông tin tài khoản quản trị viên">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Administrator Full Name">
            <input value={user?.full_name || ''} onChange={() => {}} style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          </Field>
          <Field label="Administrator Email">
            <input value={user?.username ? `${user.username}@admin.com` : ''} onChange={() => {}} style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          </Field>
          <Field label="Role (Read Only)">
            <input value={user?.role || 'admin'} readOnly style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0', opacity: 0.6, cursor: 'not-allowed' }} />
          </Field>
          <Field label="Phone Number">
            <input value="" onChange={() => {}} placeholder="Nhập số điện thoại" style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}>🔑 Change Password</button>
          <button style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}>📷 Change Avatar</button>
        </div>
      </Card>

      <Card title="🔒 Security & Privacy" desc="Cấu hình bảo mật và quyền riêng tư">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {([
            { key: 'twoFactor' as const, title: 'Enable Two-Factor Authentication (2FA)', desc: 'Thêm lớp bảo mật bổ sung cho tài khoản' },
            { key: 'emailNotif' as const, title: 'Email Notifications', desc: 'Nhận thông báo qua email khi có sự kiện quan trọng' },
            { key: 'activityNotif' as const, title: 'System Activity Notifications', desc: 'Thông báo về hoạt động hệ thống và bảo mật' },
            { key: 'apiAccess' as const, title: 'API Access', desc: 'Cho phép truy cập API từ bên thứ ba' },
            { key: 'maintenanceMode' as const, title: 'Maintenance Mode', desc: 'Tạm thời đóng hệ thống để bảo trì' },
            { key: 'publicApi' as const, title: 'Allow Public API Access', desc: 'Cho phép truy cập API công khai không cần xác thực' },
          ]).map(item => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.9rem' }}>{item.title}</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>{item.desc}</div>
              </div>
              <ToggleSwitch checked={toggles[item.key]} onChange={() => toggle(item.key)} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="🛠️ System Configuration" desc="Cấu hình chung cho ứng dụng">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Application Name">
            <input value={appName} onChange={e => setAppName(e.target.value)} style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          </Field>
          <Field label="Default Currency">
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <option value="VND">VND - Việt Nam Đồng</option>
              <option value="USD">USD - US Dollar</option>
            </select>
          </Field>
          <Field label="Default Language">
            <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Time Zone">
            <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
              <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
            </select>
          </Field>
          <Field label="Date Format">
            <select value={dateFormat} onChange={e => setDateFormat(e.target.value)} style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </Field>
          <Field label="Maximum Search Results">
            <input type="number" value={maxResults} onChange={e => setMaxResults(e.target.value)} style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          </Field>
          <Field label="Cache Duration (minutes)">
            <input type="number" value={cacheDuration} onChange={e => setCacheDuration(e.target.value)} style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          </Field>
          <Field label="Session Timeout (minutes)">
            <input type="number" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
          </Field>
        </div>
      </Card>

      <Card title="🏪 Pharmacy Data Settings" desc="Cấu hình dữ liệu nhà thuốc và sản phẩm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {([
            { key: 'autoSync' as const, title: 'Automatic Price Synchronization', desc: 'Tự động đồng bộ giá từ các nhà thuốc' },
            { key: 'priceHistory' as const, title: 'Enable Price History', desc: 'Lưu lịch sử thay đổi giá sản phẩm' },
            { key: 'duplicateDetection' as const, title: 'Duplicate Product Detection', desc: 'Phát hiện và xử lý sản phẩm trùng lặp' },
          ]).map(item => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.9rem' }}>{item.title}</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>{item.desc}</div>
              </div>
              <ToggleSwitch checked={toggles[item.key]} onChange={() => toggle(item.key)} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
          <Field label="Synchronization Interval">
            <select style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <option value="15">Mỗi 15 phút</option>
              <option value="30">Mỗi 30 phút</option>
              <option value="60">Mỗi 1 giờ</option>
              <option value="360">Mỗi 6 giờ</option>
              <option value="1440">Mỗi 24 giờ</option>
            </select>
          </Field>
          <Field label="Product Matching Sensitivity">
            <select style={{ ...inp, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <option value="low">Thấp - nhanh hơn, ít chính xác</option>
              <option value="medium">Trung bình - cân bằng</option>
              <option value="high">Cao - chính xác hơn, chậm hơn</option>
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: 10 }}>Nguồn dữ liệu</div>
          {sources.map(s => (
            <div key={s.slug} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.9rem' }}>{labels[s.slug]}</span>
                <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: 10 }}>{s.total_products} sản phẩm</span>
              </div>
              <button onClick={() => toggleSource(s.slug, !s.is_active)}
                style={{ padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', background: s.is_active ? '#22c55e' : '#e2e8f0', color: s.is_active ? '#fff' : '#64748b' }}>
                {s.is_active ? '✓ On' : '✕ Off'}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="💾 Backup & Restore" desc="Sao lưu và khôi phục dữ liệu hệ thống">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <button style={{ padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
            <span style={{ color: '#3b82f6', fontSize: '1.2rem' }}>💾</span> Tạo Backup
          </button>
          <button style={{ padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
            <span style={{ color: '#22c55e', fontSize: '1.2rem' }}>📥</span> Download Backup
          </button>
          <button style={{ padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
            <span style={{ color: '#f59e0b', fontSize: '1.2rem' }}>🔄</span> Restore Backup
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.9rem' }}>Automatic Daily Backup</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>Tự động sao lưu hàng ngày lúc 02:00 AM</div>
          </div>
          <ToggleSwitch checked={toggles.autoBackup} onChange={() => toggle('autoBackup')} />
        </div>
      </Card>

      <Card title="📊 System Logs" desc="Trạng thái và nhật ký hệ thống">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Last Login', value: '21/07/2026 15:30', status: 'success' },
            { label: 'Last Backup', value: '21/07/2026 02:00', status: 'success' },
            { label: 'Last Data Sync', value: '21/07/2026 15:25', status: 'success' },
            { label: 'Database Status', value: 'PostgreSQL Connected', status: 'success' },
            { label: 'API Status', value: 'All Endpoints Healthy', status: 'success' },
            { label: 'Scraper Status', value: '3/4 Active', status: 'warning' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e8ecf1' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{item.label}</div>
                <div style={{ color: '#1e293b', fontSize: '0.88rem', fontWeight: 500, marginTop: 2 }}>{item.value}</div>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ===== SETTINGS COMPONENTS =====
function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', marginBottom: 20, border: '1px solid #e8ecf1' }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ color: '#1e293b', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{title}</h3>
        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0' }}>{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', color: '#475569', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{
      width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative',
      background: checked ? '#1E5EFF' : '#d1d5db', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
        left: checked ? 25 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    success: { bg: '#f0fdf4', text: '#16a34a', label: '✓ Success' },
    warning: { bg: '#fffbeb', text: '#d97706', label: '⚠ Warning' },
    error: { bg: '#fef2f2', text: '#dc2626', label: '✕ Error' },
  };
  const c = colors[status] || colors.success;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 6, background: c.bg, color: c.text, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.label}</span>
  );
}

// ===== STYLES =====
const inp: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' };
const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '0.8rem', fontWeight: 600 };
const td: React.CSSProperties = { padding: '12px 16px', color: '#1e293b', fontSize: '0.9rem' };
const pageBtn: React.CSSProperties = { padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', cursor: 'pointer', fontFamily: 'inherit' };
const cardBtn: React.CSSProperties = { padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' };
