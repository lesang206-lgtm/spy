const express = require('express');
const { searchAll } = require('../scrapers');
const { searchProducts } = require('../products');
const { matchProducts } = require('../matcher');
const { saveSearchHistory } = require('../searchHistory');
const { pool } = require('../db');

const router = express.Router();

router.get('/search', async (req, res) => {
  const { q, mode } = req.query;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Vui lòng nhập tên thuốc' });
  }

  const keyword = q.trim();
  const startTime = Date.now();

  try {
    if (mode === 'db') {
      const thuocsi = await searchProducts(keyword, 'thuocsi.vn');
      const longchau = await searchProducts(keyword, 'nhathuoclongchau.com.vn');
      const pharmart = await searchProducts(keyword, 'pharmart.vn');
      const medigo = await searchProducts(keyword, 'medigoapp.com');
      const all = [...thuocsi, ...longchau, ...pharmart, ...medigo];
      let matches = [];
      if (all.length > 0) {
        matches = matchProducts(all, keyword);
      }
      return res.json(formatResponse(keyword, 'database', { thuocsi, longchau, pharmart, medigo }, matches, startTime));
    }

    const raw = await searchAll(keyword);
    const products = {
      thuocsi: raw.thuocsi,
      longchau: raw.longchau,
      pharmart: raw.pharmart,
      medigo: raw.medigo,
    };

    const response = formatResponse(keyword, 'scrape', products, raw.matches, startTime);
    saveSearchHistory(keyword, products.thuocsi.length, products.longchau.length, products.pharmart.length, products.medigo.length, raw.matches.length, response.responseTimeMs).catch(() => {});

    // Auto-save products to DB
    const sourceMap = { thuocsi: 'thuocsi', longchau: 'longchau', pharmart: 'pharmart', medigo: 'medigo' };
    function extractSku(p, src) {
      // First try scraper-provided SKU
      if (p.sku) return String(p.sku).trim();
      // Try extracting from URL
      const url = p.product_url || p.url || '';
      const urlMatch = url.match(/\/([^\/]+?)(?:\?.*)?$/);
      if (urlMatch && urlMatch[1]) return urlMatch[1].slice(0, 200);
      // Fallback: generate from normalized name + source
      const slug = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 150);
      return `${src}_${slug}`;
    }
    // Build a map: source+normalized_name -> sku (dedup by name within same source)
    const nameSkuMap = new Map();
    for (const [src, items] of Object.entries(products)) {
      for (const p of (items || [])) {
        const nameNorm = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 200);
        const dedupKey = `${sourceMap[src]}|${nameNorm}`;
        const sku = extractSku(p, src);
        if (!sku) continue;
        // If this normalized name was already seen for this source, skip
        if (nameSkuMap.has(dedupKey)) continue;
        nameSkuMap.set(dedupKey, sku);
        pool.query(
          `INSERT INTO products (name, source, price, product_url, image_url, sku)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (source, sku) DO UPDATE SET
             name = EXCLUDED.name, price = EXCLUDED.price,
             product_url = EXCLUDED.product_url, image_url = EXCLUDED.image_url,
             updated_at = NOW()`,
          [p.name, sourceMap[src], p.sale_price || p.price || 0, p.product_url || p.url || '', p.image_url || p.image || '', sku]
        ).catch(() => {});
      }
    }

    res.json(response);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Lỗi server: ' + err.message });
  }
});

function formatResponse(keyword, source, products, matches, startTime) {
  const warnings = [];
  if (!products.thuocsi?.length) warnings.push('Không tìm thấy trên thuocsi.vn');
  if (!products.longchau?.length) warnings.push('Không tìm thấy trên nhathuoclongchau.com.vn');
  if (!products.pharmart?.length) warnings.push('Không tìm thấy trên pharmart.vn');
  if (!products.medigo?.length) warnings.push('Không tìm thấy trên medigoapp.com');

  return {
    keyword,
    source,
    products: {
      thuocsi: products.thuocsi || [],
      longchau: products.longchau || [],
      pharmart: products.pharmart || [],
      medigo: products.medigo || [],
    },
    matches,
    responseTimeMs: Date.now() - startTime,
    status: {
      thuocsiOk: (products.thuocsi?.length || 0) > 0,
      longchauOk: (products.longchau?.length || 0) > 0,
      pharmartOk: (products.pharmart?.length || 0) > 0,
      medigoOk: (products.medigo?.length || 0) > 0,
    },
    warnings,
  };
}

module.exports = router;
