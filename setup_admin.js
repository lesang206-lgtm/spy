const { pool } = require('./src/db');
const bcrypt = require('bcryptjs');

async function run() {
  console.log('Creating tables...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      full_name VARCHAR(255),
      role_id INT REFERENCES roles(id) DEFAULT 3,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      last_login TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INT REFERENCES roles(id) ON DELETE CASCADE,
      permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS sources (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      url VARCHAR(500) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      scraper_type VARCHAR(50),
      last_scraped_at TIMESTAMP,
      total_products INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS scrape_logs (
      id SERIAL PRIMARY KEY,
      source_slug VARCHAR(50) REFERENCES sources(slug),
      keyword VARCHAR(255),
      products_found INTEGER DEFAULT 0,
      products_saved INTEGER DEFAULT 0,
      duration_ms INTEGER,
      error_message TEXT,
      created_by INT REFERENCES admin_users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT,
      description TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('✓ Tables created');

  // Roles
  await pool.query(`
    INSERT INTO roles (name, description) VALUES
    ('admin', 'Toàn quyền'),
    ('editor', 'Sửa sản phẩm, trigger scrape'),
    ('viewer', 'Chỉ xem')
    ON CONFLICT (name) DO NOTHING;
  `);
  console.log('✓ Roles');

  // Permissions
  await pool.query(`
    INSERT INTO permissions (name, description) VALUES
    ('dashboard.read', 'Xem dashboard'),
    ('products.read', 'Xem sản phẩm'),
    ('products.write', 'Sửa sản phẩm'),
    ('products.delete', 'Xóa sản phẩm'),
    ('sources.read', 'Xem nguồn'),
    ('sources.write', 'Quản lý nguồn'),
    ('sources.scrape', 'Trigger scrape'),
    ('matches.read', 'Xem đối sánh'),
    ('matches.write', 'Tách/gộp nhóm'),
    ('history.read', 'Xem lịch sử'),
    ('history.export', 'Export CSV'),
    ('settings.read', 'Xem cài đặt'),
    ('settings.write', 'Sửa cài đặt')
    ON CONFLICT (name) DO NOTHING;
  `);
  console.log('✓ Permissions');

  // Role permissions
  await pool.query(`DELETE FROM role_permissions`);

  // Admin: all permissions
  await pool.query(`INSERT INTO role_permissions (role_id, permission_id) SELECT 1, id FROM permissions`);
  // Editor
  await pool.query(`INSERT INTO role_permissions (role_id, permission_id) SELECT 2, id FROM permissions WHERE name IN ('dashboard.read','products.read','products.write','sources.read','sources.scrape','matches.read','history.read','history.export')`);
  // Viewer
  await pool.query(`INSERT INTO role_permissions (role_id, permission_id) SELECT 3, id FROM permissions WHERE name IN ('dashboard.read','products.read','sources.read','matches.read','history.read')`);
  console.log('✓ Role permissions');

  // Admin user
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(`
    INSERT INTO admin_users (username, password_hash, email, full_name, role_id)
    VALUES ('admin', $1, 'admin@example.com', 'Quản trị viên', 1)
    ON CONFLICT (username) DO UPDATE SET password_hash = $1
  `, [hash]);
  console.log('✓ Admin user: admin / admin123');

  // Sources
  await pool.query(`
    INSERT INTO sources (slug, name, url, scraper_type) VALUES
    ('thuocsi', 'Thuốc Sĩ', 'https://thuocsi.vn', 'puppeteer'),
    ('longchau', 'Nhà Thuốc Long Châu', 'https://nhathuoclongchau.com.vn', 'axios'),
    ('pharmart', 'Pharmart', 'https://pharmart.vn', 'axios'),
    ('medigo', 'Medigo', 'https://medigoapp.com', 'puppeteer')
    ON CONFLICT (slug) DO NOTHING;
  `);
  console.log('✓ Sources');

  // Settings
  await pool.query(`
    INSERT INTO settings (key, value, description) VALUES
    ('scraper_timeout', '30000', 'Timeout scrape (ms)'),
    ('scraper_delay', '500', 'Delay giữa request (ms)'),
    ('matcher_min_score', '0.15', 'Điểm tối thiểu match')
    ON CONFLICT (key) DO NOTHING;
  `);
  console.log('✓ Settings');

  console.log('\nDone! Login: admin / admin123');
  await pool.end();
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
