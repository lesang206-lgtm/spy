const config = require('../config');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function isNoiseName(name) {
  if (!name || name.length < 5 || name.length > 200) return true;
  const lower = name.toLowerCase();
  const noise = [
    'lọc sản phẩm', 'sắp xếp', 'bán chạy', 'giá thấp', 'giá cao',
    'đăng nhập', 'đăng ký', 'giỏ hàng', 'tài khoản', 'đơn hàng',
    'tìm nhà thuốc', 'bạn muốn', 'sản phẩm vừa xem', 'xem thêm',
    'danh mục', 'hỗ trợ', 'chính sách', 'liên hệ', 'giới thiệu',
    'footer', 'header', 'menu', 'navigation', 'logo',
    'khuyến mãi', 'ưu đãi', 'combo', 'set quà',
  ];
  for (const n of noise) {
    if (lower === n || lower.startsWith(n + ' ')) return true;
  }
  return false;
}

async function searchMedigo(keyword) {
  let browser;
  try {
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: 'new',
      args: config.puppeteer.args,
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'vi-VN,vi;q=0.9' });

    const searchUrl = `${config.medigo.baseUrl}/tim-kiem?q=${encodeURIComponent(keyword)}`;
    console.log('Medigo URL:', searchUrl);

    // Intercept ALL API responses to find product data
    const capturedProducts = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.js') || url.includes('.css') || url.includes('.png') || url.includes('.jpg') || url.includes('google') || url.includes('facebook') || url.includes('clarity') || url.includes('tiktok') || url.includes('analytics')) return;
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('json')) {
          const data = await response.json();
          const items = extractProductsFromApi(data);
          if (items.length > 0) {
            capturedProducts.push(...items);
            console.log(`Medigo: API intercepted ${items.length} products from ${url.split('?')[0]}`);
          }
        }
      } catch (e) {}
    });

    let navOk = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        navOk = true;
        break;
      } catch (e) {
        console.log(`Medigo nav attempt ${attempt + 1} failed: ${e.message}`);
        await sleep(2000);
      }
    }
    if (!navOk) {
      console.log('Medigo: all navigation attempts failed, trying DOM anyway');
    }
    await sleep(5000);

    // Scroll to trigger lazy loading of images
    await page.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        window.scrollBy(0, 500);
        await new Promise(r => setTimeout(r, 500));
      }
      window.scrollTo(0, 0);
    });
    await sleep(5000);

    let products = capturedProducts;
    console.log(`Medigo: captured ${products.length} products via API interception`);

    // If no API products, try DOM scraping
    if (products.length === 0) {
      products = await page.evaluate(() => {
        const results = [];
        const seen = new Set();

        document.querySelectorAll('a[href]').forEach(link => {
          const href = link.href || '';
          if (!href.includes('/product/') && !href.includes('/san-pham/')) return;
          if (seen.has(href)) return;
          seen.add(href);

          const linkText = link.textContent.trim();
          const imgEl = link.querySelector('img');
          const hasImage = !!imgEl;

          // Skip pure CTA links like "Xem Sản Phẩm"
          if (linkText.match(/^(xem|thêm|mua|chi tiết|add|cart)/i) && !hasImage) return;
          // Skip empty links with no image and short text
          if (linkText.length < 3 && !hasImage) return;

          // Extract name from various sources
          let name = '';

          // Source 1: heading inside the link
          const heading = link.querySelector('h1, h2, h3, h4, h5, h6');
          if (heading) name = heading.textContent.trim();

          // Source 2: if link text IS the product name (not just "Xem...")
          if (!name && linkText.length > 10 && !linkText.match(/^xem/i)) {
            name = linkText;
          }

          // Source 3: walk up parent to find heading near this link
          if (!name) {
            let parent = link.parentElement;
            for (let i = 0; i < 5 && parent; i++) {
              const h = parent.querySelector('h1, h2, h3, h4, h5, h6, [class*="name" i], [class*="title" i]');
              if (h && h.textContent.trim().length > 5) {
                name = h.textContent.trim();
                break;
              }
              parent = parent.parentElement;
            }
          }

          // Source 4: use img alt text
          if (!name && imgEl) {
            name = imgEl.alt?.trim() || '';
          }

          if (!name || name.length < 5) return;

          // Find image - try multiple sources
          let image = '';
          if (imgEl) {
            // Try data-src, srcset, src in order
            image = imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy-src') || imgEl.getAttribute('data-original') || '';
            // Try srcset (get first URL)
            if (!image && imgEl.srcset) {
              const srcsetParts = imgEl.srcset.split(',');
              if (srcsetParts.length > 0) {
                const firstSrc = srcsetParts[0].trim().split(/\s+/)[0];
                if (firstSrc && !firstSrc.startsWith('data:')) image = firstSrc;
              }
            }
            // Try src (skip placeholders)
            if (!image && imgEl.src && !imgEl.src.startsWith('data:')) {
              image = imgEl.src;
            }
          }
          // Also check noscript fallback
          if (!image) {
            const noscript = link.querySelector('noscript img');
            if (noscript && noscript.src && !noscript.src.startsWith('data:')) {
              image = noscript.src;
            }
          }
          // Check all img elements in the link
          if (!image) {
            const allImgs = link.querySelectorAll('img');
            for (const img of allImgs) {
              const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
              if (src && !src.startsWith('data:')) { image = src; break; }
              if (img.srcset) {
                const parts = img.srcset.split(',');
                if (parts.length > 0) {
                  const url = parts[0].trim().split(/\s+/)[0];
                  if (url && !url.startsWith('data:')) { image = url; break; }
                }
              }
              if (img.src && !img.src.startsWith('data:')) { image = img.src; break; }
            }
          }
          // Normalize: convert /images/proxy?url=... to actual CDN url
          if (image.includes('/images/proxy?url=')) {
            try { image = decodeURIComponent(image.split('/images/proxy?url=')[1]); } catch(e) {}
          }
          // Ensure https
          if (image.startsWith('http://')) image = image.replace('http://', 'https://');

          // Find quantity from product name (e.g. "hộp 102 miếng", "10 vỉ x 10 viên")
          let quantity = 1;
          const nameMatch = name.match(/(\d+)\s*(miếng|viên|ống|gói|chiếc|túi)/i);
          if (nameMatch) quantity = parseInt(nameMatch[1], 10);

          // Find price - walk up to find price container
          let price = 0;
          let container = link.parentElement;
          for (let i = 0; i < 6 && container; i++) {
            const priceEls = container.querySelectorAll('[class*="price" i], [class*="gia" i], span, p');
            for (const el of priceEls) {
              const t = el.textContent.trim();
              if (t.match(/\d[\d.,]*\s*(₫|đ|VND)/i)) {
                price = parseInt(t.replace(/[^\d]/g, ''), 10) || 0;
                if (price > 0) break;
              }
            }
            if (price > 0) break;
            container = container.parentElement;
          }

          // Multiply price by quantity if price is per-unit
          if (price > 0 && quantity > 1) {
            price = price * quantity;
          }

          results.push({ name, price, image, url: href, quantity });
        });

        return results;
      });
      console.log(`Medigo: DOM scraping found ${products.length} products`);
    }

    console.log(`Medigo: ${products.length} products total`);

    // Keyword filter — require ALL search words to match
    const keywordLower = keyword.toLowerCase();
    const searchWords = keywordLower.split(/[\s/,]+/).filter(w => w.length >= 2);

    const scored = products.map(p => {
      const nameLower = (p.name || '').toLowerCase();
      let matchCount = 0;
      for (const word of searchWords) {
        if (nameLower.includes(word)) matchCount++;
      }
      return { ...p, matchCount };
    }).filter(p => p.matchCount >= searchWords.length && !isNoiseName(p.name));

    // Fallback: if no all-words match, try products with at least 1 word match (best effort)
    let scoredFinal = scored;
    if (scoredFinal.length === 0) {
      scoredFinal = products.map(p => {
        const nameLower = (p.name || '').toLowerCase();
        let matchCount = 0;
        for (const word of searchWords) {
          if (nameLower.includes(word)) matchCount++;
        }
        return { ...p, matchCount };
      }).filter(p => p.matchCount > 0 && !isNoiseName(p.name));
    }

    scoredFinal.sort((a, b) => b.matchCount - a.matchCount);
    console.log(`Medigo matched: ${scoredFinal.length} products`);
    for (const p of scoredFinal.slice(0, 3)) {
      console.log(`  - [${p.matchCount}] ${p.name.slice(0, 60)} → ${p.price}đ`);
    }

    const topProducts = (scoredFinal.length > 0 ? scoredFinal.slice(0, 1) : products.filter(p => !isNoiseName(p.name) && p.price > 0).slice(0, 1)).map(p => {
      // Extract quantity from product name for price multiplication
      let qty = 1;
      const qtyMatch = p.name.match(/(\d+)\s*(miếng|viên|ống|gói|chiếc|túi)/i);
      if (qtyMatch) qty = parseInt(qtyMatch[1], 10);
      const finalPrice = p.price > 0 && qty > 1 ? p.price * qty : p.price;

      return {
        source: 'medigoapp.com',
        name: p.name,
        price: finalPrice,
        salePrice: finalPrice,
        image: p.image,
        url: p.url,
        brand: '',
        manufacturer: '',
        unit: '',
        activeIngredient: '',
        dosageForm: '',
        registrationNumber: '',
        sku: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 200),
      };
    });

    // Fetch detail pages for products with no price or no image
    for (const p of topProducts) {
      if ((p.price === 0 || !p.image) && p.url) {
        console.log(`  Fetching detail: ${p.name.slice(0, 50)} → ${p.url}`);
        try {
          await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
          await sleep(3000);
          const detailResult = await page.evaluate(() => {
            let price = 0;
            let unit = '';
            let image = '';

            // Look for price elements
            const priceEls = document.querySelectorAll('[class*="price" i], [class*="gia" i], span, p, div');
            for (const el of priceEls) {
              const text = el.textContent.trim();
              if (text.match(/\d[\d.,]*\s*(₫|đ|VND)/i)) {
                const p = parseInt(text.replace(/[^\d]/g, ''), 10);
                if (p > 0 && p < 100000000) {
                  price = p;
                  break;
                }
              }
            }

            // Look for unit info (e.g., "800đ/miếng", "Hộp 102 miếng")
            const unitEls = document.querySelectorAll('select, [class*="unit" i], [class*="donvi" i], button, span');
            for (const el of unitEls) {
              const text = el.textContent.trim();
              if (text.match(/(miếng|viên|ống|hộp|vỉ|chai|lọ)/i) && text.length < 50) {
                unit = text;
                break;
              }
            }

            // Extract image from product detail page
            const ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage) image = ogImage.getAttribute('content') || '';
            if (!image) {
              const mainImg = document.querySelector('img[alt*="product" i], img[class*="product" i], .product img, [class*="gallery"] img, [class*="slider"] img');
              if (mainImg) {
                image = mainImg.getAttribute('data-src') || mainImg.getAttribute('data-lazy-src') || mainImg.src || '';
                if (image.startsWith('data:')) image = '';
              }
            }
            if (image && image.startsWith('http://')) image = image.replace('http://', 'https://');

            return { price, unit, image };
          });

          if (detailResult.price > 0) {
            // Get quantity from product name
            let qty = 1;
            const qtyMatch = p.name.match(/(\d+)\s*(miếng|viên|ống|gói|chiếc|túi)/i);
            if (qtyMatch) qty = parseInt(qtyMatch[1], 10);
            const finalPrice = qty > 1 ? detailResult.price * qty : detailResult.price;
            p.price = finalPrice;
            p.salePrice = finalPrice;
            p.unit = detailResult.unit;
            console.log(`  → Price: ${detailResult.price}đ x ${qty} = ${finalPrice}đ, unit: ${detailResult.unit}`);
          }
          // Use image from detail page if product has no image
          if (!p.image && detailResult.image) {
            p.image = detailResult.image;
            console.log(`  → Image: ${detailResult.image}`);
          }
        } catch (e) {
          console.log(`  → Detail fetch failed: ${e.message}`);
        }
        await sleep(300);
      }
    }

    // Second pass: fetch images for products still missing images
    for (const p of topProducts) {
      if (!p.image && p.url) {
        try {
          await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
          await sleep(2000);
          const imgResult = await page.evaluate(() => {
            let image = '';
            const ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage) image = ogImage.getAttribute('content') || '';
            if (!image) {
              const imgs = document.querySelectorAll('img');
              for (const img of imgs) {
                const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
                if (src && !src.startsWith('data:') && (src.includes('cdn.medigoapp') || src.includes('image-proxy'))) {
                  image = src; break;
                }
                if (img.src && !img.src.startsWith('data:') && (img.src.includes('cdn.medigoapp') || img.src.includes('image-proxy'))) {
                  image = img.src; break;
                }
              }
            }
            if (image.startsWith('http://')) image = image.replace('http://', 'https://');
            return image;
          });
          if (imgResult) {
            p.image = imgResult;
            console.log(`  → Image found: ${imgResult.slice(0, 80)}`);
          }
        } catch (e) {}
        await sleep(300);
      }
    }

    for (const p of topProducts) {
      console.log(`  - [${p.matchCount || 0}] ${p.name.slice(0, 60)} → ${p.price}đ, img: ${p.image ? 'yes' : 'no'}`);
    }

    return topProducts;
  } catch (err) {
    console.error('Medigo scrape error:', err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

function extractProductsFromApi(data) {
  if (!data) return [];
  const items = [];

  function tryExtract(arr) {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const p = item.product || item.item || item;
      const name = p.productName || p.name || p.title || p.webName || '';
      const price = parseFloat(p.price || p.sellPrice || p.originalPrice || p.finalPrice || p.discountPrice || 0);
      if (name && name.length > 3 && price > 0) {
        items.push({
          name: name.trim(),
          price,
          image: p.imageUrl || p.image || p.thumbnail || p.img || '',
          url: p.url || p.productUrl || p.link || '',
        });
      }
    }
  }

  // Deep search for arrays of product-like objects
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (Array.isArray(val) && val.length > 0 && val[0] && typeof val[0] === 'object') {
        tryExtract(val);
      }
      if (val && typeof val === 'object') {
        for (const k2 of Object.keys(val)) {
          const v2 = val[k2];
          if (Array.isArray(v2) && v2.length > 0 && v2[0] && typeof v2[0] === 'object') {
            tryExtract(v2);
          }
          if (v2 && typeof v2 === 'object') {
            for (const k3 of Object.keys(v2)) {
              const v3 = v2[k3];
              if (Array.isArray(v3) && v3.length > 0 && v3[0] && typeof v3[0] === 'object') {
                tryExtract(v3);
              }
            }
          }
        }
      }
    }
  }

  return items;
}

module.exports = { searchMedigo };
