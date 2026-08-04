const config = require('../config');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function searchPharmart(keyword) {
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

    const products = [];

    // Try full keyword, then shorter
    const keywords = [keyword];
    const words = keyword.split(/\s+/);
    if (words.length > 3) keywords.push(words.slice(0, 3).join(' '));
    if (words.length > 2) keywords.push(words.slice(0, 2).join(' '));

    for (const kw of keywords) {
      if (products.length > 0) break;
      const searchUrl = `${config.pharmart.baseUrl}/tim-kiem.html?q=${encodeURIComponent(kw)}`;
      console.log(`Pharmart URL: ${searchUrl}`);

      // Try axios first (faster, no browser needed)
      try {
        const axios = require('axios');
        const cheerio = require('cheerio');
        const res = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'vi-VN,vi;q=0.9',
            'Accept': 'text/html,application/xhtml+xml',
          },
          timeout: 15000,
        });
        const $ = cheerio.load(res.data);
        // Directly iterate product cards (each has data-id)
        $('[data-id]').each((_, el) => {
          const name = $(el).attr('data-name') || $(el).find('h3').text().trim();
          if (!name || name.length < 5) return;
          const link = $(el).find('a').first().attr('href') || '';
          const url = link.startsWith('http') ? link : config.pharmart.baseUrl + '/' + link.replace(/^\//, '');
          // Image: img is direct child of this card div
          let image = '';
          const img = $(el).children('img').first();
          if (img.length) {
            image = img.attr('data-src') || img.attr('data-lazy-src') || img.attr('src') || '';
          }
          // Fallback: find any img inside
          if (!image) {
            const img2 = $(el).find('img').first();
            image = img2.attr('data-src') || img2.attr('data-lazy-src') || img2.attr('src') || '';
          }
          products.push({ name, price: 0, image, url });
        });
        if (products.length > 0) {
          console.log(`Pharmart: ${products.length} products from axios HTML`);
        }
      } catch (e) {
        console.log(`Pharmart axios failed: ${e.message}`);
      }

      // If axios found nothing, try Puppeteer
      if (products.length === 0) {
        try {
          let navOk = false;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
              navOk = true;
              break;
            } catch (e) {
              console.log(`Pharmart Puppeteer nav attempt ${attempt + 1} failed: ${e.message}`);
              await sleep(2000);
            }
          }
          await sleep(5000);

          // Scroll
          await page.evaluate(async () => {
            for (let i = 0; i < 5; i++) { window.scrollBy(0, 400); await new Promise(r => setTimeout(r, 300)); }
            window.scrollTo(0, 0);
          });
          await sleep(2000);

          const pageProducts = await page.evaluate(() => {
            const results = [];
            const seen = new Set();
            document.querySelectorAll('[data-id]').forEach(el => {
              const name = el.getAttribute('data-name') || el.querySelector('h3')?.textContent?.trim() || '';
              if (!name || name.length < 5 || seen.has(name)) return;
              seen.add(name);
              const link = el.querySelector('a')?.href || '';
              let image = '';
              // img is direct child of the card
              const img = el.querySelector(':scope > img');
              if (img) {
                image = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.src || '';
              }
              // Fallback: any img inside
              if (!image) {
                const img2 = el.querySelector('img');
                if (img2) image = img2.getAttribute('data-src') || img2.getAttribute('data-lazy-src') || img2.src || '';
              }
              if (name) results.push({ name, price: 0, image, url: link });
            });
            return results;
          });
          if (pageProducts.length > 0) {
            products.push(...pageProducts);
            console.log(`Pharmart: ${pageProducts.length} products from Puppeteer`);
          }
        } catch (e) {
          console.log(`Pharmart Puppeteer failed: ${e.message}`);
        }
      }
      await sleep(500);
    }

    // Match
    const keywordLower = keyword.toLowerCase();
    const searchWords = keywordLower.split(/[\s/,]+/).filter(w => w.length >= 2);
    let scored = products.map(p => {
      const nameLower = (p.name || '').toLowerCase();
      let matchCount = 0;
      for (const word of searchWords) { if (nameLower.includes(word)) matchCount++; }
      return { ...p, matchCount };
    }).filter(p => p.matchCount >= searchWords.length);
    if (scored.length === 0) {
      scored = products.map(p => {
        const nameLower = (p.name || '').toLowerCase();
        let matchCount = 0;
        for (const word of searchWords) { if (nameLower.includes(word)) matchCount++; }
        return { ...p, matchCount };
      }).filter(p => p.matchCount > 0);
    }
    scored.sort((a, b) => b.matchCount - a.matchCount);
    console.log(`Pharmart matched: ${scored.length} products`);

    const topProducts = scored.slice(0, 1);

    // Fetch price from detail page
    for (const p of topProducts) {
      if (p.url && p.price === 0) {
        console.log(`  Fetching detail: ${p.name.slice(0, 50)} → ${p.url}`);
        try {
          await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await sleep(3000);
          const detailResult = await page.evaluate(() => {
            let price = 0;
            let quantity = 1;

            // Get price from JSON-LD
            document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
              try {
                const j = JSON.parse(s.textContent || '');
                if (j['@type'] === 'Product' && j.offers?.price) {
                  price = parseFloat(j.offers.price) || 0;
                }
              } catch {}
            });

            // Fallback: meta tag
            if (price === 0) {
              const m = document.querySelector('meta[property="product:price:amount"]');
              if (m) price = parseInt((m.getAttribute('content') || '').replace(/[^\d]/g, ''), 10) || 0;
            }

            // Fallback: hidden input
            if (price === 0) {
              const el = document.querySelector('#p_price');
              if (el) price = parseInt((el.getAttribute('value') || '').replace(/[^\d]/g, ''), 10) || 0;
            }

            // Get quantity from "Quy cách" section
            const allText = document.body.innerText || '';
            const quyCachMatch = allText.match(/Quy cách:\s*Hộp\s+(\d+)\s+miếng/i);
            if (quyCachMatch) {
              quantity = parseInt(quyCachMatch[1], 10);
            } else {
              // Try other patterns
              const altMatch = allText.match(/Quy cách:\s*(\d+)\s+(miếng|viên|ống)/i);
              if (altMatch) quantity = parseInt(altMatch[1], 10);
            }

            // If price is per-unit and we have quantity, multiply
            if (price > 0 && quantity > 1) {
              price = price * quantity;
            }

            return { price, quantity };
          });

          if (detailResult.price > 0) {
            p.price = detailResult.price;
            console.log(`  → Price: ${detailResult.price}đ (×${detailResult.quantity})`);
          }
        } catch (e) { console.log(`  → Detail failed: ${e.message}`); }
        await sleep(300);
      }
    }

    for (const p of topProducts) {
      console.log(`  - [${p.matchCount}] ${p.name.slice(0, 60)} → ${p.price}đ`);
    }

    return topProducts.map(p => ({
      source: 'pharmart.vn', name: p.name, price: p.price, salePrice: p.price,
      image: p.image, url: p.url, brand: '', manufacturer: '', unit: '',
      activeIngredient: '', dosageForm: '', registrationNumber: '',
      sku: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 200),
    }));
  } catch (err) {
    console.error('Pharmart error:', err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { searchPharmart };
