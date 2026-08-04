const { query } = require('./db');

const UPSERT_PRODUCT = `
INSERT INTO products (source, name, price, sale_price, image_url, product_url, brand, manufacturer, unit, active_ingredient, dosage_form, registration_number, sku, raw_data)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
ON CONFLICT (source, sku) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  sale_price = EXCLUDED.sale_price,
  image_url = EXCLUDED.image_url,
  product_url = EXCLUDED.product_url,
  brand = EXCLUDED.brand,
  manufacturer = EXCLUDED.manufacturer,
  unit = EXCLUDED.unit,
  active_ingredient = EXCLUDED.active_ingredient,
  dosage_form = EXCLUDED.dosage_form,
  registration_number = EXCLUDED.registration_number,
  raw_data = EXCLUDED.raw_data,
  updated_at = NOW()
RETURNING id, source, name, price, sale_price, sku, image_url, product_url;
`;

async function upsertProduct(p) {
  const sku = p.sku || extractSku(p.url || '');
  const res = await query(UPSERT_PRODUCT, [
    p.source,
    p.name,
    p.price || 0,
    p.salePrice || p.price || 0,
    p.image || '',
    p.url || '',
    p.brand || '',
    p.manufacturer || '',
    p.unit || '',
    p.activeIngredient || '',
    p.dosageForm || '',
    p.registrationNumber || '',
    sku,
    p.rawData ? JSON.stringify(p.rawData) : null,
  ]);
  return res.rows[0];
}

async function upsertProducts(products) {
  const results = [];
  for (const p of products) {
    try {
      const row = await upsertProduct(p);
      results.push(row);
    } catch (err) {
      console.error('Upsert error for', p.name?.slice(0, 40), ':', err.message);
    }
  }
  return results;
}

async function searchProducts(keyword, source = null) {
  const conditions = [];
  const params = [];

  if (keyword) {
    params.push(keyword);
    const idx = params.length;
    conditions.push(`(
      to_tsvector('simple', name) @@ plainto_tsquery('simple', $${idx})
      OR name ILIKE '%' || $${idx} || '%'
    )`);
  }

  if (source) {
    params.push(source);
    conditions.push(`source = $${params.length}`);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const sql = `
    SELECT id, source, name, price, sale_price, image_url, product_url,
           brand, manufacturer, unit, active_ingredient, dosage_form,
           sku, updated_at
    FROM products ${where}
    ORDER BY
      CASE WHEN price > 0 THEN 0 ELSE 1 END,
      ts_rank(to_tsvector('simple', name), plainto_tsquery('simple', $1)) DESC
    LIMIT 100
  `;
  const res = await query(sql, params);
  return res.rows;
}

async function getProductById(id) {
  const res = await query('SELECT * FROM products WHERE id = $1', [id]);
  return res.rows[0] || null;
}

async function getProductStats() {
  const res = await query(`
    SELECT
      source,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE price > 0) as with_price,
      COUNT(*) FILTER (WHERE price = 0) as no_price,
      MAX(updated_at) as last_updated
    FROM products
    GROUP BY source
  `);
  return res.rows;
}

function extractSku(url) {
  if (!url) return '';
  const match = url.match(/\/([^\/]+?)(?:\?|$)/);
  return match ? match[1].slice(0, 200) : '';
}

module.exports = { upsertProduct, upsertProducts, searchProducts, getProductById, getProductStats };
