const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { pool } = require('../db');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { JWT_SECRET } = require('../config_jwt');

const router = express.Router();

// POST /api/admin/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, full_name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tài khoản và mật khẩu' });
    }

    const exists = await pool.query('SELECT id FROM admin_users WHERE username = $1', [username]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Tài khoản đã tồn tại' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'viewer'");
    const role_id = roleResult.rows[0]?.id || 3;

    await pool.query(
      'INSERT INTO admin_users (username, password_hash, full_name, role_id, is_active) VALUES ($1, $2, $3, $4, true)',
      [username, password_hash, full_name || username, role_id]
    );

    res.json({ message: 'Đăng ký thành công' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============ AUTH ============

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tài khoản và mật khẩu' });
    }

    const result = await pool.query(
      `SELECT u.*, r.name AS role_name FROM admin_users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username = $1 AND u.is_active = true`, [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Sai mật khẩu' });
    }

    const permResult = await pool.query(
      `SELECT p.name FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1`, [user.role_id]
    );
    const permissions = permResult.rows.map(r => r.name);

    await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role_name, permissions },
      JWT_SECRET, { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role_name, permissions },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/admin/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.full_name, r.name AS role
       FROM admin_users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.is_active = true`, [req.user.id]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    const user = result.rows[0];
    res.json({ user: { ...user, permissions: req.user.permissions } });
  } catch (err) {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
});

// ============ DASHBOARD ============

router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const [products, sources, searches, matches] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM products'),
      pool.query('SELECT slug, total_products FROM sources WHERE is_active = true'),
      pool.query(`SELECT COUNT(*) FROM search_history WHERE created_at >= CURRENT_DATE`),
      pool.query('SELECT COUNT(*) FROM product_matches'),
    ]);

    const bySource = {};
    for (const s of sources.rows) bySource[s.slug] = s.total_products;

    res.json({
      totalProducts: parseInt(products.rows[0].count),
      activeSources: sources.rows.length,
      todaySearches: parseInt(searches.rows[0].count),
      totalMatches: parseInt(matches.rows[0].count),
      bySource,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PRODUCTS ============

router.get('/products', authMiddleware, requirePermission('products.read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', source = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = 'WHERE 1=1';
    const params = [];

    if (search) { params.push(`%${search}%`); where += ` AND name ILIKE $${params.length}`; }
    if (source) { params.push(source); where += ` AND source = $${params.length}`; }

    const countResult = await pool.query(`SELECT COUNT(*) FROM products ${where}`, params);
    params.push(Number(limit), offset);
    const result = await pool.query(
      `SELECT * FROM products ${where} ORDER BY id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params
    );

    res.json({ products: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products', authMiddleware, requirePermission('products.write'), async (req, res) => {
  try {
    const { name, source, price, product_url, image_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên sản phẩm là bắt buộc' });
    const result = await pool.query(
      'INSERT INTO products (name, source, price, product_url, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, source || 'thuocsi', price || 0, product_url || '', image_url || '']
    );
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/products/:id', authMiddleware, requirePermission('products.write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, source, price, product_url, image_url } = req.body;
    await pool.query(
      'UPDATE products SET name = COALESCE($1, name), source = COALESCE($2, source), price = COALESCE($3, price), product_url = COALESCE($4, product_url), image_url = COALESCE($5, image_url) WHERE id = $6',
      [name, source, price, product_url, image_url, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/products/:id', authMiddleware, requirePermission('products.delete'), async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SOURCES ============

router.get('/sources', authMiddleware, requirePermission('sources.read'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sources ORDER BY id');
    res.json({ sources: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/sources/:slug', authMiddleware, requirePermission('sources.write'), async (req, res) => {
  try {
    const { slug } = req.params;
    const { is_active, url } = req.body;
    await pool.query('UPDATE sources SET is_active = COALESCE($1, is_active), url = COALESCE($2, url) WHERE slug = $3', [is_active, url, slug]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sources/:slug/scrape', authMiddleware, requirePermission('sources.scrape'), async (req, res) => {
  try {
    const { slug } = req.params;
    const { keyword } = req.body;
    const kw = keyword || 'thuốc';
    let products = [];

    if (slug === 'thuocsi') {
      const { searchThuocsi } = require('../scrapers/thuocsi');
      products = await searchThuocsi(kw);
    } else if (slug === 'longchau') {
      const { searchLongchau } = require('../scrapers/longchau');
      products = await searchLongchau(kw);
    } else if (slug === 'pharmart') {
      const { searchPharmart } = require('../scrapers/pharmart');
      products = await searchPharmart(kw);
    } else if (slug === 'medigo') {
      const { searchMedigo } = require('../scrapers/medigo');
      products = await searchMedigo(kw);
    }

    function extractSku(p, src) {
      if (p.sku) return String(p.sku).trim();
      const url = p.product_url || p.url || '';
      const urlMatch = url.match(/\/([^\/]+?)(?:\?.*)?$/);
      if (urlMatch && urlMatch[1]) return urlMatch[1].slice(0, 200);
      const slug2 = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 150);
      return `${src}_${slug2}`;
    }
    // Dedup by source + normalized name
    const nameSkuMap = new Map();
    let saved = 0;
    for (const p of products) {
      try {
        const sku = extractSku(p, slug);
        if (!sku) continue;
        const nameNorm = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 200);
        const dedupKey = `${slug}|${nameNorm}`;
        if (nameSkuMap.has(dedupKey)) continue;
        nameSkuMap.set(dedupKey, sku);
        await pool.query(
          `INSERT INTO products (name, source, price, product_url, image_url, sku)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (source, sku) DO UPDATE SET
             name = EXCLUDED.name, price = EXCLUDED.price,
             product_url = EXCLUDED.product_url, image_url = EXCLUDED.image_url,
             updated_at = NOW()`,
          [p.name, slug, p.sale_price || p.price || 0, p.product_url || p.url || '', p.image_url || p.image || '', sku]
        );
        saved++;
      } catch {}
    }

    await pool.query('UPDATE sources SET last_scraped_at = NOW(), total_products = (SELECT COUNT(*) FROM products WHERE source = $1) WHERE slug = $1', [slug]);
    res.json({ ok: true, products_found: products.length, products_saved: saved });
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ HISTORY ============

router.get('/history', authMiddleware, requirePermission('history.read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) { params.push(`%${keyword}%`); where += ` AND keyword ILIKE $${params.length}`; }

    const countResult = await pool.query(`SELECT COUNT(*) FROM search_history ${where}`, params);
    params.push(Number(limit), offset);
    const result = await pool.query(
      `SELECT id, keyword, created_at,
       thuocsi_count, longchau_count, pharmart_count, medigo_count, matched_count,
       (thuocsi_count + longchau_count + pharmart_count + medigo_count) as total_results,
       (thuocsi_count > 0) as thuocsi_ok, (longchau_count > 0) as longchau_ok,
       (pharmart_count > 0) as pharmart_ok, (medigo_count > 0) as medigo_ok
       FROM search_history ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params
    );

    res.json({ history: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history/export', authMiddleware, requirePermission('history.export'), async (req, res) => {
  try {
    const { keyword = '' } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) { params.push(`%${keyword}%`); where += ` AND keyword ILIKE $${params.length}`; }
    const result = await pool.query(
      `SELECT keyword, created_at,
       (thuocsi_count + longchau_count + pharmart_count + medigo_count) as total_results,
       thuocsi_count, longchau_count, pharmart_count, medigo_count
       FROM search_history ${where} ORDER BY created_at DESC`, params
    );
    const csv = 'Thời gian,Keyword,Tổng kết quả,Thuốc Sĩ,Long Châu,Pharmart,Medigo\n' + result.rows.map(r =>
      `"${new Date(r.created_at).toLocaleString('vi-VN')}","${r.keyword}",${r.total_results},${r.thuocsi_count},${r.longchau_count},${r.pharmart_count},${r.medigo_count}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=history.csv');
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== FAVORITES =====

// GET /api/admin/favorites
router.get('/favorites', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM favorites WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({ favorites: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/favorites
router.post('/favorites', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_name, source, price, sale_price, image_url, product_url } = req.body;
    if (!product_name) return res.status(400).json({ error: 'Thiếu tên sản phẩm' });

    const result = await pool.query(
      `INSERT INTO favorites (user_id, product_name, source, price, sale_price, image_url, product_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, product_name) DO NOTHING
       RETURNING *`,
      [userId, product_name, source || '', price || 0, sale_price || 0, image_url || '', product_url || '']
    );
    res.json({ favorite: result.rows[0] || { product_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/favorites/:id
router.delete('/favorites/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await pool.query('DELETE FROM favorites WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
