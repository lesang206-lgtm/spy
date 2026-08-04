const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const crypto = require('crypto');
const config = require('../config');

puppeteer.use(StealthPlugin());

const DECRYPT_KEY = 'thu0c21.v4@2023?buym3d';

function transformKey(keyStr) {
  let hash = 0;
  const charCodes = keyStr.split('').map(c => c.charCodeAt(0));
  for (let i = 0; i < charCodes.length; i++) {
    hash += charCodes[i] << 10;
  }
  const hashStr = hash.toString(10);
  const bytes = Buffer.from(hashStr, 'ascii');
  if (bytes.length < 16) {
    const key = Buffer.alloc(16, 0x7F);
    bytes.copy(key);
    return key;
  }
  return bytes.slice(0, 16);
}

function decryptPrice(encryptedBase64) {
  if (!encryptedBase64) return 0;
  try {
    const key = transformKey(DECRYPT_KEY);
    const ct = Buffer.from(encryptedBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, key);
    decipher.setAutoPadding(false);
    let dec = decipher.update(ct);
    dec = Buffer.concat([dec]);
    const padByte = dec[dec.length - 1];
    if (padByte >= 1 && padByte <= 16) {
      dec = dec.slice(0, dec.length - padByte);
    }
    const decStr = dec.toString('utf8').trim();
    return parseFloat(decStr) || 0;
  } catch (e) {
    return 0;
  }
}

let browser = null;
let loggedInPage = null;
let isLoggedIn = false;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        ...config.puppeteer.args,
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });
  }
  return browser;
}

async function isLoggedInCheck(page) {
  try {
    const result = await page.evaluate(() => {
      const url = window.location.href;
      const hasAvatar = !!(
        document.querySelector('[class*="avatar"]') ||
        document.querySelector('[class*="userInfo"]') ||
        document.querySelector('[class*="user-info"]') ||
        document.querySelector('[class*="UserMenu"]') ||
        document.querySelector('[class*="user-menu"]') ||
        document.querySelector('[data-testid*="user"]') ||
        document.querySelector('a[href*="/dashboard"]')
      );
      const hasCookie = document.cookie.includes('ts_auth');
      const hasToken = localStorage.getItem('ts_auth_access_token_v2') !== null;
      return { hasAvatar, hasCookie, hasToken, url };
    });
    const loggedIn = result.hasAvatar || result.hasCookie || result.hasToken;
    if (!loggedIn) {
      console.log('Thuocsi isLoggedInCheck:', JSON.stringify(result));
    }
    return loggedIn;
  } catch (e) {
    return false;
  }
}

async function login(page) {
  if (isLoggedIn) return true;
  if (!config.thuocsi.email || !config.thuocsi.password) {
    console.log('Thuocsi: credentials not configured');
    return false;
  }

  try {
    await page.goto(config.thuocsi.baseUrl + '/products', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    }).catch(e => console.log('Thuocsi login nav error:', e.message));
    await new Promise(r => setTimeout(r, 3000));

    const alreadyIn = await isLoggedInCheck(page);
    if (alreadyIn) {
      console.log('Thuocsi: already logged in');
      isLoggedIn = true;
      return true;
    }

    console.log('Thuocsi: not logged in, attempting login...');

    const btnClicked = await page.evaluate(() => {
      const candidates = document.querySelectorAll(
        'button, a, [role="button"], span, div[onclick]'
      );
      for (const el of candidates) {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (text.includes('đăng nhập') || text === 'login' || text.includes('sign in')) {
          if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
            el.click();
            return 'clicked ' + el.tagName + ': "' + text.slice(0, 30) + '"';
          }
          const parent = el.closest('a, button, [role="button"]');
          if (parent) { parent.click(); return 'clicked parent ' + parent.tagName; }
        }
      }
      return 'not found';
    });
    console.log('Thuocsi login btn result:', btnClicked);

    await new Promise(r => setTimeout(r, 4000));

    let loginInput = null;
    let passInput = null;

    for (const sel of [
      'input[type="email"]',
      'input[type="text"]',
      'input[type="tel"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[name="phone"]',
      'input[autocomplete="email"]',
      'input[autocomplete="username"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="Email" i]',
      'input[placeholder*="tài khoản" i]',
      'input[placeholder*="số điện thoại" i]',
      'input[placeholder*="phone" i]',
    ]) {
      loginInput = await page.$(sel);
      if (loginInput) { console.log('Thuocsi: found login input via', sel); break; }
    }

    passInput = await page.$('input[type="password"]');

    if (!loginInput || !passInput) {
      console.log('Thuocsi: login fields not found');
      return false;
    }

    await loginInput.click({ clickCount: 3 });
    await loginInput.type(config.thuocsi.email, { delay: 50 });
    await new Promise(r => setTimeout(r, 300));

    await passInput.click({ clickCount: 3 });
    await passInput.type(config.thuocsi.password, { delay: 50 });
    await new Promise(r => setTimeout(r, 500));

    // Try multiple submit methods
    // Method 1: Press Enter
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 5000));

    let loggedIn = await isLoggedInCheck(page);
    if (loggedIn) { console.log('Thuocsi: login successful (Enter)'); isLoggedIn = true; return true; }

    // Method 2: Click submit button
    const submitted = await page.evaluate(() => {
      // Find the form and submit it
      const form = document.querySelector('form');
      if (form) { form.submit(); return 'form.submit()'; }
      // Find submit/login button
      const candidates = document.querySelectorAll('button[type="submit"], button, [role="button"]');
      for (const btn of candidates) {
        const text = (btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (text.includes('đăng nhập') || text === 'login' || text.includes('sign in') || text.includes('log in')) {
          btn.click();
          return 'clicked: "' + text.slice(0, 30) + '"';
        }
      }
      return 'not found';
    });
    console.log('Thuocsi submit result:', submitted);
    await new Promise(r => setTimeout(r, 5000));

    loggedIn = await isLoggedInCheck(page);
    if (loggedIn) { console.log('Thuocsi: login successful (button)'); isLoggedIn = true; return true; }

    // Method 3: Check for error messages
    const errorMsg = await page.evaluate(() => {
      const errEl = document.querySelector('[class*="error"], [class*="alert"], [class*="notification"], [class*="toast"]');
      return errEl?.textContent?.trim()?.slice(0, 100) || '';
    });
    if (errorMsg) console.log('Thuocsi: error on page:', errorMsg);

    // Take screenshot for debugging
    console.log('Thuocsi: login failed, current URL:', page.url());

    if (loggedIn) {
      console.log('Thuocsi: login successful');
      isLoggedIn = true;
      return true;
    }

    console.log('Thuocsi: login failed');
    return false;
  } catch (err) {
    console.error('Thuocsi login error:', err.message);
    return false;
  }
}

async function searchThuocsi(keyword) {
  if (!config.thuocsi.email || !config.thuocsi.password) {
    console.log('Thuocsi credentials not configured - skipping');
    return [];
  }

  const b = await getBrowser();

  // Reuse logged-in page, or create new one
  let page;
  if (loggedInPage && isLoggedIn) {
    try {
      await loggedInPage.url(); // check if page is still alive
      page = loggedInPage;
    } catch {
      loggedInPage = null;
      isLoggedIn = false;
    }
  }
  if (!page) {
    page = await b.newPage();
  }

  try {
    await page.setViewport({ width: 1366, height: 768 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    });

    if (!isLoggedIn) {
      const ok = await login(page);
      if (!ok) {
        console.log('Thuocsi: cannot search - login failed');
        return [];
      }
      loggedInPage = page; // save for reuse
    }

    const loggedInNow = await isLoggedInCheck(page);
    if (!loggedInNow) {
      console.log('Thuocsi: session expired, re-login needed');
      isLoggedIn = false;
      const relogin = await login(page);
      if (!relogin) {
        console.log('Thuocsi: re-login failed');
        return [];
      }
    }

    console.log('Thuocsi: logged in, navigating to search page...');

    const capturedProducts = [];
    page.removeAllListeners('response');
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/product/list') || url.includes('/search') || url.includes('/product/search')) {
        try {
          const data = await response.json();
          const products = Array.isArray(data?.data) ? data.data : [];
          if (products.length > 0 && products[0].priceEncrypted) {
            capturedProducts.push(...products);
            console.log(`Thuocsi: intercepted API response with ${products.length} products`);
          }
        } catch (e) {}
      }
    });

    const searchUrl = config.thuocsi.baseUrl + '/products?q=' + encodeURIComponent(keyword);
    console.log('Thuocsi: navigating to', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('Thuocsi nav error:', e.message));
    await new Promise(r => setTimeout(r, 5000));

    let apiProducts = capturedProducts;
    console.log('Thuocsi: captured', apiProducts.length, 'products via interception');

    if (apiProducts.length === 0) {
      const altUrls = [
        config.thuocsi.baseUrl + '/products/search?q=' + encodeURIComponent(keyword),
        config.thuocsi.baseUrl + '/tim-kiem?q=' + encodeURIComponent(keyword),
        config.thuocsi.baseUrl + '/search?q=' + encodeURIComponent(keyword),
      ];
      for (const altUrl of altUrls) {
        if (capturedProducts.length > 0) break;
        console.log('Thuocsi: trying', altUrl);
        await page.goto(altUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => console.log('Thuocsi alt nav error:', e.message));
        await new Promise(r => setTimeout(r, 3000));
      }
      apiProducts = capturedProducts;
    }

    if (apiProducts.length === 0) {
      console.log('Thuocsi: trying search bar approach...');
      await page.goto(config.thuocsi.baseUrl + '/products', {
        waitUntil: 'domcontentloaded', timeout: 30000
      }).catch(e => console.log('Thuocsi search bar nav error:', e.message));
      await new Promise(r => setTimeout(r, 3000));

      const searchInput = await page.$('input[type="search"], input[placeholder*="tìm" i], input[placeholder*="search" i], input[name="q"], input[name="search"]');
      if (searchInput) {
        await searchInput.click({ clickCount: 3 });
        await searchInput.type(keyword, { delay: 30 });
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 5000));
        apiProducts = capturedProducts;
      }
    }

    if (apiProducts.length === 0) {
      console.log('Thuocsi: falling back to API with token...');
      const token = await page.evaluate(() => {
        const match = document.cookie.match(/ts_auth_access_token_v2=([^;]+)/);
        return match ? match[1] : null;
      });

      if (token) {
        const allProducts = await page.evaluate(async (baseUrl, authToken) => {
          try {
            const resp = await fetch(baseUrl + '/backend/marketplace/frontend-apis/v2/screen/product/list', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken,
              },
              body: JSON.stringify({
                screenId: 'DAT',
                pageSize: 100,
                page: 1,
                sortOptions: { field: 'SCORE', order: 'DESC' },
                filterOptions: { manufactureIds: [], regionIds: [], countryIds: [], priceRanges: [] },
                search: '',
              }),
            });
            const data = await resp.json();
            return Array.isArray(data?.data) ? data.data : [];
          } catch (e) {
            return [];
          }
        }, config.thuocsi.baseUrl, token);
        apiProducts = allProducts;
        console.log('Thuocsi: got', apiProducts.length, 'products from catalog API');
      }
    }

    if (apiProducts.length === 0) {
      console.log('Thuocsi: no products found');
      return [];
    }

    const seen = new Set();
    const uniqueProducts = [];
    for (const p of apiProducts) {
      const slug = p.slug || '';
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        uniqueProducts.push(p);
      }
    }

    const results = [];
    for (const p of uniqueProducts) {
      const name = p.productName || '';
      const slug = p.slug || '';
      if (!name || !slug) continue;

      const originalPrice = decryptPrice(p.priceEncrypted);
      const discountPrice = decryptPrice(p.discountPriceEncrypted);
      const price = discountPrice || originalPrice;

      // Use productUrl if available, otherwise construct from slug
      const url = p.productUrl || (config.thuocsi.baseUrl + '/product/' + slug);

      results.push({
        source: 'thuocsi.vn',
        name,
        price,
        salePrice: price,
        image: p.imageUrl || '',
        url,
        brand: '', manufacturer: '', unit: '', activeIngredient: '',
        dosageForm: '', registrationNumber: '', sku: p.skuCode || '',
      });
    }

    console.log('Thuocsi decrypted:', results.filter(r => r.price > 0).length, 'products with prices');

    const keywordLower = keyword.toLowerCase();
    const searchWords = keywordLower.split(/[\s/,]+/).filter(w => w.length >= 2);

    // Use computeScore from matcher for better matching
    const { computeScore } = require('../matcher/index.js');

    let scored = results.map(p => {
      const nameLower = (p.name || '').toLowerCase();
      let matchCount = 0;
      for (const word of searchWords) {
        if (nameLower.includes(word)) matchCount++;
      }
      // Use computeScore for better similarity ranking
      const score = computeScore(keyword, p.name);
      return { ...p, matchCount, score };
    }).filter(p => p.matchCount >= searchWords.length);

    // Fallback: if no all-words match, try partial matches
    if (scored.length === 0) {
      scored = results.map(p => {
        const nameLower = (p.name || '').toLowerCase();
        let matchCount = 0;
        for (const word of searchWords) {
          if (nameLower.includes(word)) matchCount++;
        }
        const score = computeScore(keyword, p.name);
        return { ...p, matchCount, score };
      }).filter(p => p.matchCount > 0);
    }

    // Sort by score first, then by matchCount as tiebreaker
    scored.sort((a, b) => b.score - a.score || b.matchCount - a.matchCount);
    console.log('Thuocsi matched:', scored.length, 'products');
    for (const p of scored.slice(0, 5)) {
      console.log(`  - [${p.matchCount}] ${p.name} = ${p.price}đ → ${p.url}`);
    }

    return scored.slice(0, 1);
  } catch (err) {
    console.error('Thuocsi error:', err.message);
    return [];
  } finally {
    if (page !== loggedInPage) {
      await page.close();
    }
  }
}

async function close() {
  if (loggedInPage) { try { await loggedInPage.close(); } catch {} loggedInPage = null; }
  if (browser) {
    await browser.close();
    browser = null;
    isLoggedIn = false;
  }
}

module.exports = { searchThuocsi, close, decryptPrice };
