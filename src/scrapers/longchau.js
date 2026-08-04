const axios = require('axios');
const config = require('../config');

async function searchLongchau(keyword) {
  let allProducts = [];

  try {
    const viaHtml = await searchViaHtml(keyword);
    if (viaHtml.length > 0) {
      console.log(`Long Chau HTML: ${viaHtml.length} products`);
      allProducts = viaHtml;
    }
  } catch (e) {
    console.log('Long Chau HTML error:', e.message.slice(0, 80));
  }

  if (allProducts.length === 0) {
    try {
      const viaApi = await searchViaApiV2(keyword);
      if (viaApi.length > 0) {
        console.log(`Long Chau API v2: ${viaApi.length} products`);
        allProducts = viaApi;
      }
    } catch (e) {
      console.log('Long Chau API v2 error:', e.message.slice(0, 80));
    }
  }

  const keywordLower = keyword.toLowerCase();
  const searchWords = keywordLower.split(/[\s/,]+/).filter(w => w.length >= 2);

  let scored = allProducts.map(p => {
    const nameLower = (p.name || '').toLowerCase();
    let matchCount = 0;
    for (const word of searchWords) {
      if (nameLower.includes(word)) matchCount++;
    }
    return { ...p, matchCount };
  }).filter(p => p.matchCount >= searchWords.length);

  // Fallback: if no all-words match, try partial matches
  if (scored.length === 0) {
    scored = allProducts.map(p => {
      const nameLower = (p.name || '').toLowerCase();
      let matchCount = 0;
      for (const word of searchWords) {
        if (nameLower.includes(word)) matchCount++;
      }
      return { ...p, matchCount };
    }).filter(p => p.matchCount > 0);
  }

  scored.sort((a, b) => b.matchCount - a.matchCount);
  console.log(`Long Chau matched: ${scored.length} products`);
  for (const p of scored.slice(0, 3)) {
    console.log(`  - [${p.matchCount}] ${p.name}`);
  }

  return scored.slice(0, 1);
}

async function searchViaHtml(keyword) {
  const searchUrl = `https://nhathuoclongchau.com.vn/tim-kiem?s=${encodeURIComponent(keyword)}`;
  const res = await axios.get(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'vi-VN,vi;q=0.9',
    },
    timeout: 15000,
  });

  const html = res.data;
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nextDataMatch) {
    console.log('Long Chau: no __NEXT_DATA__ in HTML');
    return [];
  }

  const nextData = JSON.parse(nextDataMatch[1]);
  const pp = nextData.props?.pageProps;
  if (!pp) {
    console.log('Long Chau: no pageProps');
    return [];
  }

  const initProducts = pp.initProducts;
  if (!initProducts) {
    console.log('Long Chau: no initProducts, keys:', Object.keys(pp));
    return [];
  }

  const products = initProducts.products || [];
  const totalCount = initProducts.totalCount || 0;
  console.log(`Long Chau __NEXT_DATA__: ${products.length} products, total: ${totalCount}`);

  if (products.length === 0) return [];

  if (products[0]) {
    const p0 = products[0];
    console.log('Long Chau sample:', p0.name, '→ default unit:', p0.price?.measureUnitName, '→ price:', p0.price?.discount?.finalPrice);
    const pArr = p0.prices || [];
    if (pArr.length > 1) {
      console.log('Long Chau units:', pArr.map(px => `${px.measureUnitName}:${px.discount?.finalPrice}`).join(', '));
    }
  }

  return products.map(p => {
    const name = (p.name || p.webName || '').trim().slice(0, 500);

    let priceObj = p.price || {};
    let discountObj = priceObj.discount || {};
    let selectedUnit = (priceObj.measureUnitName || '').toLowerCase().trim();

    // If default unit is "thùng" (carton), try to find "chai" for single-unit price
    if (selectedUnit === 'thùng') {
      const prices = p.prices || [];
      // Priority: chai > hộp > lốc
      const smaller = prices.find(px => (px.measureUnitName || '').toLowerCase().trim() === 'chai')
        || prices.find(px => (px.measureUnitName || '').toLowerCase().trim() === 'hộp')
        || prices.find(px => (px.measureUnitName || '').toLowerCase().trim() === 'lốc');
      if (smaller) {
        priceObj = smaller;
        discountObj = priceObj.discount || {};
        selectedUnit = (priceObj.measureUnitName || '').toLowerCase().trim();
      }
    }

    let price = discountObj.finalPrice || priceObj.price || 0;

    // If unit is "viên" (per tablet), multiply by quantity from product name
    if (selectedUnit.includes('viên') && price > 0) {
      const qtyMatch = name.match(/(\d+)\s*vỉ\s*[x×]\s*(\d+)\s*viên/i)
        || name.match(/(\d+)\s*viên/i);
      if (qtyMatch) {
        const totalTablets = qtyMatch[2] ? parseInt(qtyMatch[1]) * parseInt(qtyMatch[2]) : parseInt(qtyMatch[1]);
        if (totalTablets > 1) {
          price = price * totalTablets;
          console.log(`  Long Chau qty: "${name.slice(0, 60)}" → ${totalTablets} viên × ${discountObj.finalPrice}đ = ${price}đ`);
        }
      }
    }

    return {
      source: 'nhathuoclongchau.com.vn',
      name,
      price,
      salePrice: price,
      image: p.image || '',
      url: config.longchau.baseUrl + '/' + (p.slug || ''),
      brand: (p.brand || '').slice(0, 200),
      manufacturer: '',
      unit: selectedUnit,
      activeIngredient: (p.ingredients || '').slice(0, 300),
      dosageForm: (p.dosageForm || '').slice(0, 100),
      registrationNumber: '',
      sku: String(p.sku || '').slice(0, 200),
    };
  }).filter(p => p.name && p.price > 0);
}

async function searchViaApiV2(keyword) {
  const ecomProdUrl = 'https://api.nhathuoclongchau.com.vn/lccus/ecom-prod/store-front';
  const endpoints = [
    { url: ecomProdUrl + '/product/search', body: { keyword, page: 0, size: 20 } },
    { url: ecomProdUrl + '/product/list', body: { keyword, page: 0, size: 20 } },
    { url: ecomProdUrl + '/search', body: { keyword, page: 0, size: 20 } },
  ];

  for (const ep of endpoints) {
    try {
      console.log('Long Chau API v2:', ep.url.split('.vn')[1]);
      const res = await axios.post(ep.url, ep.body, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: 'https://nhathuoclongchau.com.vn',
          Referer: 'https://nhathuoclongchau.com.vn/',
        },
        timeout: 8000,
      });
      const items = extractFromApi(res.data);
      if (items.length > 0) return items;
    } catch (e) {
      console.log('Long Chau API v2 fail:', e.message.slice(0, 60));
    }
  }
  return [];
}

function isNoise(name) {
  const noisePhrases = [
    'thông báo', 'khuyến mại', 'quyền lợi', 'đăng ký', 'nhận tin',
    'đặt hàng', 'giao hàng', 'hotline', 'liên hệ', 'hỗ trợ',
    'chính sách', 'bảo hành', 'đổi trả', 'miễn phí', 'tuyển dụng',
    'sitemap', 'footer', 'copyright', 'đăng nhập',
  ];
  const lower = name.toLowerCase();
  for (const p of noisePhrases) {
    if (lower.includes(p)) return true;
  }
  return lower.length < 5 || lower.length > 150;
}

function extractFromApi(data) {
  if (!data) return [];
  const content =
    data.data?.content ||
    data.content ||
    data.data?.items ||
    data.items ||
    data.data?.products ||
    data.products ||
    data.data?.data ||
    [];
  const arr = Array.isArray(content) ? content : Array.isArray(data) ? data : null;
  if (!arr || arr.length === 0) return [];

  return arr
    .map((item) => {
      const p = item.product || item;
      const name = (p.productName || p.name || p.title || '').trim();
      const raw = p.originalPrice ?? p.price ?? 0;
      const price = typeof raw === 'string' ? (parseFloat(raw.replace(/[^\d]/g, '')) || 0) : (parseFloat(raw) || 0);
      if (!name || isNoise(name) || price === 0) return null;
      return {
        source: 'nhathuoclongchau.com.vn',
        name,
        price,
        salePrice: parseFloat(p.sellPrice || p.promotionPrice || p.price || 0),
        image: p.imageUrl || p.image || p.thumbnail || '',
        url: config.longchau.baseUrl + '/san-pham/' + (p.productAlias || p.alias || p.productId || p.id || ''),
        brand: p.brandName || p.brand || '',
        manufacturer: p.manufacturer || '',
        unit: p.packingUnit || p.unit || '',
        activeIngredient: p.activeIngredient || p.ingredientName || '',
        dosageForm: p.dosageForm || p.medicineForm || '',
        registrationNumber: p.registrationNumber || '',
        sku: String(p.sku || p.productId || p.id || '').slice(0, 200),
      };
    })
    .filter(Boolean);
}

module.exports = { searchLongchau };
