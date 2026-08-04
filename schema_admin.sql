-- ============================================
-- DATABASE: Admin Quản lý Sản phẩm Thuốc
-- ============================================

-- 1. Bảng quyền (roles)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,        -- 'admin', 'editor', 'viewer'
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
('admin', 'Toàn quyền: CRUD, xóa, quản lý nguồn, cài đặt'),
('editor', 'Sửa sản phẩm, trigger scrape, xem log'),
('viewer', 'Chỉ xem: dashboard, sản phẩm, lịch sử');

-- 2. Bảng tài khoản admin
CREATE TABLE admin_users (
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

-- Tài khoản mặc định: admin / admin123
INSERT INTO admin_users (username, password_hash, email, full_name, role_id)
VALUES ('admin', '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ123456', 'admin@example.com', 'Quản trị viên', 1);

-- 3. Bảng quyền chi tiết (permissions)
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,       -- 'products.read', 'products.write', ...
    description TEXT
);

INSERT INTO permissions (name, description) VALUES
('dashboard.read', 'Xem dashboard'),
('products.read', 'Xem danh sách sản phẩm'),
('products.write', 'Sửa sản phẩm'),
('products.delete', 'Xóa sản phẩm'),
('sources.read', 'Xem danh sách nguồn'),
('sources.write', 'Quản lý nguồn (bật/tắt, sửa)'),
('sources.scrape', 'Trigger scrape'),
('matches.read', 'Xem nhóm đối sánh'),
('matches.write', 'Tách/gộp nhóm'),
('history.read', 'Xem lịch sử tìm kiếm'),
('history.export', 'Export CSV'),
('settings.read', 'Xem cài đặt'),
('settings.write', 'Thay đổi cài đặt');

-- 4. Bảng phân quyền的角色-权限 (role_permissions)
CREATE TABLE role_permissions (
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Admin: toàn quyền
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Editor: xem + sửa SP, xem nguồn, trigger scrape, xem matches, lịch sử
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE name IN (
    'dashboard.read', 'products.read', 'products.write',
    'sources.read', 'sources.scrape',
    'matches.read', 'history.read', 'history.export'
);

-- Viewer: chỉ xem
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE name IN (
    'dashboard.read', 'products.read',
    'sources.read', 'matches.read', 'history.read'
);

-- 5. Bảng nguồn scraping
CREATE TABLE sources (
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

INSERT INTO sources (slug, name, url, scraper_type) VALUES
('thuocsi', 'Thuốc Sĩ', 'https://thuocsi.vn', 'puppeteer'),
('longchau', 'Nhà Thuốc Long Châu', 'https://nhathuoclongchau.com.vn', 'axios'),
('pharmart', 'Pharmart', 'https://pharmart.vn', 'axios'),
('medigo', 'Medigo', 'https://medigoapp.com', 'puppeteer');

-- 6. Bảng log scrape
CREATE TABLE scrape_logs (
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

-- 7. Bảng cài đặt
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO settings (key, value, description) VALUES
('scraper_timeout', '30000', 'Timeout scrape (ms)'),
('scraper_delay', '500', 'Delay giữa các request (ms)'),
('matcher_min_score', '0.15', 'Điểm tối thiểu để match'),
('auto_cleanup_days', '90', 'Xóa SP sau N ngày');

-- ============================================
-- VIEW: Kiểm tra quyền
-- ============================================
CREATE OR REPLACE VIEW v_user_permissions AS
SELECT
    u.id AS user_id,
    u.username,
    r.name AS role_name,
    p.name AS permission_name
FROM admin_users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.is_active = true;

-- ============================================
-- FUNCTION: Kiểm tra user có quyền không
-- ============================================
CREATE OR REPLACE FUNCTION check_permission(
    p_username VARCHAR,
    p_permission VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM v_user_permissions
        WHERE username = p_username AND permission_name = p_permission
    ) INTO has_perm;
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- QUERY THAM KHẢO
-- ============================================

-- Xem quyền của user 'admin'
SELECT * FROM v_user_permissions WHERE username = 'admin';

-- Kiểm tra admin có quyền xóa SP không
SELECT check_permission('admin', 'products.delete');  -- true

-- Kiểm tra editor có quyền xóa SP không
SELECT check_permission('editor', 'products.delete'); -- false

-- Xem tất cả SP có phân trang
-- SELECT * FROM products ORDER BY id LIMIT 20 OFFSET 0;

-- Xem log scrape theo nguồn
-- SELECT * FROM scrape_logs WHERE source_slug = 'thuocsi' ORDER BY created_at DESC LIMIT 10;
