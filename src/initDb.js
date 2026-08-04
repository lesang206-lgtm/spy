const { query, testConnection } = require('./db');
const bcrypt = require('bcryptjs');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  name VARCHAR(500) NOT NULL,
  price NUMERIC(12, 2) DEFAULT 0,
  sale_price NUMERIC(12, 2) DEFAULT 0,
  image_url TEXT,
  product_url TEXT,
  brand VARCHAR(200),
  manufacturer VARCHAR(300),
  unit VARCHAR(100),
  active_ingredient VARCHAR(300),
  dosage_form VARCHAR(100),
  registration_number VARCHAR(100),
  sku VARCHAR(200),
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE TABLE IF NOT EXISTS product_matches (
  id SERIAL PRIMARY KEY,
  group_name VARCHAR(500) NOT NULL,
  search_keyword VARCHAR(200),
  cheapest_source VARCHAR(50),
  price_diff NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_keyword ON product_matches(search_keyword);

CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(200) NOT NULL,
  thuocsi_count INTEGER DEFAULT 0,
  longchau_count INTEGER DEFAULT 0,
  pharmart_count INTEGER DEFAULT 0,
  medigo_count INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_keyword ON search_history(keyword);

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  product_name VARCHAR(500) NOT NULL,
  source VARCHAR(50),
  price NUMERIC(12, 2) DEFAULT 0,
  sale_price NUMERIC(12, 2) DEFAULT 0,
  image_url TEXT,
  product_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_name)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(300) NOT NULL,
  email VARCHAR(200),
  full_name VARCHAR(200),
  role_id INTEGER REFERENCES roles(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  base_url TEXT,
  is_active BOOLEAN DEFAULT true,
  scrape_interval_minutes INTEGER DEFAULT 60,
  last_scraped_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scrape_logs (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES sources(id),
  status VARCHAR(20) DEFAULT 'pending',
  products_found INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
`;

const SEED_SQL = `
INSERT INTO roles (name, description) VALUES
  ('admin', 'Quản trị viên toàn quyền'),
  ('editor', 'Biên tập viên'),
  ('viewer', 'Người xem')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, description) VALUES
  ('products.read', 'Xem sản phẩm'),
  ('products.write', 'Thêm/sửa sản phẩm'),
  ('products.delete', 'Xóa sản phẩm'),
  ('sources.read', 'Xem nguồn'),
  ('sources.write', 'Sửa nguồn'),
  ('sources.scrape', 'Chạy scrape'),
  ('history.read', 'Xem lịch sử'),
  ('history.export', 'Xuất lịch sử'),
  ('users.manage', 'Quản lý người dùng'),
  ('settings.manage', 'Quản lý cài đặt')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO sources (name, slug, base_url, is_active) VALUES
  ('Thuốc Sĩ', 'thuocsi', 'https://thuocsi.vn', true),
  ('Nhà Thuốc Long Châu', 'longchau', 'https://nhathuoclongchau.com.vn', true),
  ('Pharmart', 'pharmart', 'https://www.pharmart.vn', true),
  ('Medigo', 'medigo', 'https://www.medigoapp.com', true)
ON CONFLICT (slug) DO NOTHING;
`;

async function initDatabase() {
  const ok = await testConnection();
  if (!ok) {
    console.error('Cannot connect to PostgreSQL. Check your .env config.');
    process.exit(1);
  }

  try {
    await query(SCHEMA_SQL);
    console.log('Database tables created');

    await query(SEED_SQL);
    console.log('Database seeded');

    const existing = await query('SELECT id FROM admin_users WHERE username = $1', ['admin']);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      const role = await query('SELECT id FROM roles WHERE name = $1', ['admin']);
      if (role.rows.length > 0) {
        await query(
          'INSERT INTO admin_users (username, password_hash, full_name, role_id, is_active) VALUES ($1, $2, $3, $4, true)',
          ['admin', hash, 'Administrator', role.rows[0].id]
        );
        console.log('Default admin user created: admin / admin123');
      }
    }

    return true;
  } catch (err) {
    console.error('Database init error:', err.message);
    return false;
  }
}

module.exports = { initDatabase };
