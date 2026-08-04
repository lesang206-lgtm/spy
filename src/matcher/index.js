const stringSimilarity = require('string-similarity');

const SOURCES = ['thuocsi.vn', 'nhathuoclongchau.com.vn', 'pharmart.vn', 'medigoapp.com'];

const SOURCE_SHORT = {
  'thuocsi.vn': 'thuocsi',
  'nhathuoclongchau.com.vn': 'longchau',
  'pharmart.vn': 'pharmart',
  'medigoapp.com': 'medigo',
};

function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTokens(name) {
  const normalized = normalizeName(name);
  const tokens = normalized.split(' ').filter(t => t.length > 0);

  const stopwords = new Set([
    'thuoc', 'vien', 'nang', 'ong', 'goi', 'chai', 'lo', 'tube',
    'hop', 'tui', 'ml', 'mg', 'g', 'kg', 'hut', 'tablet', 'capsule',
    'dung', 'dich', 'kem', 'gel', 'xit', 'spray', 'cream', 'ointment',
    'dich', 'truyen', 'tiem', 'uong', 'nguoi', 'lon', 'nho',
    'bot', 'pha', 'ho', 'dang', 'dac', 'che',
    'pham', 'dung', 'cho', 'benh', 'nhan',
    'dang', 'ky', 'tham', 'khao', 'ban', 'le',
    'new', 'sale', 'hot', 'giam', 'gia',
    'hang', 'san', 'xuat', 'tpcn',
    'tpc', 'nsx', 'hsd', 'date',
    'thuocsi', 'longchau', 'chau', 'long', 'pharmart', 'medigo',
    'moi', 'phoi', 'nay', 'cach', 'dung',
  ]);

  return tokens.filter(t => t.length >= 2 && !stopwords.has(t));
}

function extractQuantity(name) {
  // Extract quantity info like "20 mieng", "102 vien", "H/20m", "hộp 20 miếng"
  const m = name.match(/(\d+)\s*(mieng|vien|ong|goi|chiec|tui|hop)/i);
  if (m) return { qty: parseInt(m[1], 10), unit: m[2].toLowerCase() };
  // Handle "H/20m" or "h/102m" format
  const m2 = name.match(/[Hh]\/(\d+)m/);
  if (m2) return { qty: parseInt(m2[1], 10), unit: 'mieng' };
  return null;
}

function extractDosageNumber(name) {
  const m = name.match(/(\d+\.?\d*)\s*(mg|mcg|g|ml|%)/i);
  return m ? parseFloat(m[1]) : null;
}

function extractDosageUnit(name) {
  const m = name.match(/(\d+\.?\d*)\s*(mg|mcg|g|ml|%)/i);
  return m ? m[2].toLowerCase() : '';
}

function extractForm(name) {
  const forms = [
    'vien nen', 'vien nang', 'vien sui', 'vien ngam', 'vien dat',
    'vien', 'nang cung', 'nang mem', 'nang',
    'dung dich', 'hon dich', 'siro', 'cao',
    'kem boi', 'thuoc mo', 'ointment', 'cream',
    'xit', 'spray', 'nho mat', 'nho mui', 'nho tai',
    'bot pha', 'com', 'hat',
    'ong', 'lo', 'chai', 'tui', 'goi',
    'mieng dan', 'patch',
  ];
  for (const f of forms) {
    if (name.includes(f)) return f;
  }
  return '';
}

function charNgramSimilarity(a, b, n) {
  if (!a || !b || a.length < n || b.length < n) return 0;
  const gramsA = new Set();
  const gramsB = new Set();
  for (let i = 0; i <= a.length - n; i++) gramsA.add(a.substring(i, i + n));
  for (let i = 0; i <= b.length - n; i++) gramsB.add(b.substring(i, i + n));
  const intersection = new Set([...gramsA].filter(x => gramsB.has(x)));
  const union = new Set([...gramsA, ...gramsB]);
  return intersection.size / union.size;
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function substringScore(a, b) {
  if (a.length < 3 || b.length < 3) return 0;
  const short = a.length <= b.length ? a : b;
  const long = a.length > b.length ? a : b;
  if (long.includes(short)) return 1;
  const shortWords = short.split(' ');
  const longWords = long.split(' ');
  let contained = 0;
  for (const sw of shortWords) {
    if (sw.length < 2) continue;
    for (const lw of longWords) {
      if (lw.includes(sw) || sw.includes(lw)) { contained++; break; }
    }
  }
  return shortWords.filter(w => w.length >= 2).length > 0
    ? contained / shortWords.filter(w => w.length >= 2).length * 0.8
    : 0;
}

function computeScore(nameA, nameB) {
  const aNorm = normalizeName(nameA);
  const bNorm = normalizeName(nameB);
  const aTokens = extractTokens(nameA);
  const bTokens = extractTokens(nameB);
  const aJoined = aTokens.join(' ');
  const bJoined = bTokens.join(' ');
  if (!aJoined || !bJoined) return 0;

  // Penalize different variants (it ngot/ngot, different ml/mg/vien counts)
  const variantKeywords = ['it ngot', 'ngot', 'khong duong', 'trai cay', 'vanila', 'chocolate', 'dau'];
  const aVariant = variantKeywords.find(v => aNorm.includes(v));
  const bVariant = variantKeywords.find(v => bNorm.includes(v));
  if (aVariant && bVariant && aVariant !== bVariant) return 0;

  // Penalize different dosage/volume
  const dosageA = extractDosageNumber(nameA);
  const dosageB = extractDosageNumber(nameB);
  if (dosageA !== null && dosageB !== null && dosageA !== dosageB) {
    const unitA = extractDosageUnit(nameA);
    const unitB = extractDosageUnit(nameB);
    if (unitA === unitB) return 0; // Same unit but different number = different product
  }

  const sim = stringSimilarity.compareTwoStrings(aJoined, bJoined);
  const jaccard = jaccardSimilarity(new Set(aTokens), new Set(bTokens));
  const substr = substringScore(aNorm, bNorm);
  const bigram = charNgramSimilarity(aNorm, bNorm, 2);
  const trigram = charNgramSimilarity(aNorm, bNorm, 3);
  const ngramScore = bigram * 0.4 + trigram * 0.6;

  const aDosageNum = extractDosageNumber(nameA);
  const bDosageNum = extractDosageNumber(nameB);
  const aUnit = extractDosageUnit(nameA);
  const bUnit = extractDosageUnit(nameB);
  let dosageScore = 0;
  if (aDosageNum !== null && bDosageNum !== null) {
    if (aDosageNum === bDosageNum) {
      dosageScore = (aUnit && bUnit && aUnit === bUnit) ? 0.15 : 0.10;
    }
  }

  const aForm = extractForm(aNorm);
  const bForm = extractForm(bNorm);
  const formScore = (aForm && bForm && aForm === bForm) ? 0.08 : 0;

  // Quantity matching: if both have quantity, reward matching quantities
  const aQty = extractQuantity(nameA);
  const bQty = extractQuantity(nameB);
  let qtyScore = 0;
  if (aQty && bQty) {
    if (aQty.qty === bQty.qty) {
      qtyScore = 0.15; // Exact quantity match
    } else {
      qtyScore = -0.10; // Different quantity = penalty
    }
  }

  const score = sim * 0.15 + jaccard * 0.10 + substr * 0.10 + ngramScore * 0.25 + dosageScore + formScore + qtyScore;
  return Math.round(score * 100) / 100;
}

function groupBySimilarName(products, keyword = '') {
  const groups = [];
  const used = new Set();

  // Sort products by keyword match score (products matching keyword get priority)
  const keywordLower = keyword.toLowerCase();
  const productsWithScore = products.map(p => {
    const nameLower = (p.name || '').toLowerCase();
    let kwScore = 0;
    if (keywordLower) {
      const words = keywordLower.split(/\s+/).filter(w => w.length >= 2);
      for (const w of words) {
        if (nameLower.includes(w)) kwScore++;
      }
    }
    return { ...p, kwScore };
  });
  productsWithScore.sort((a, b) => b.kwScore - a.kwScore);

  for (let i = 0; i < productsWithScore.length; i++) {
    if (used.has(i)) continue;

    const group = { products: [productsWithScore[i]], sourceSet: new Set([productsWithScore[i].source]) };
    used.add(i);

    for (let j = i + 1; j < productsWithScore.length; j++) {
      if (used.has(j)) continue;
      if (group.sourceSet.has(productsWithScore[j].source)) continue;

      const score = computeScore(productsWithScore[i].name, productsWithScore[j].name);
      if (score >= 0.20) {
        group.products.push(productsWithScore[j]);
        group.sourceSet.add(productsWithScore[j].source);
        used.add(j);
      }
    }

    groups.push(group);
  }

  return groups;
}

function matchProducts(allProducts, keyword = '') {
  const groups = groupBySimilarName(allProducts, keyword);
  const results = [];

  for (const group of groups) {
    // Pick best product per source (highest computeScore)
    const bySource = {};
    for (const p of group.products) {
      const shortName = SOURCE_SHORT[p.source] || p.source;
      const existing = bySource[shortName];
      if (!existing) {
        bySource[shortName] = p;
      } else {
        const existingScore = computeScore(keyword, existing.name);
        const newScore = computeScore(keyword, p.name);
        if (newScore > existingScore) {
          bySource[shortName] = p;
        }
      }
    }

    const shortSources = SOURCES.map(s => SOURCE_SHORT[s] || s);
    const prices = {};
    for (const short of shortSources) {
      const p = bySource[short];
      prices[short] = p ? (p.salePrice || p.price || 0) : 0;
    }

    const validPrices = shortSources.filter(s => prices[s] > 0);
    let cheapest = 'unknown';
    let priceDiff = null;
    if (validPrices.length >= 2) {
      const minPrice = Math.min(...validPrices.map(s => prices[s]));
      const maxPrice = Math.max(...validPrices.map(s => prices[s]));
      cheapest = validPrices.find(s => prices[s] === minPrice) || 'unknown';
      priceDiff = maxPrice - minPrice;
    } else if (validPrices.length === 1) {
      cheapest = validPrices[0];
    }

    const displayName = group.products[0].name;

    results.push({
      name: displayName,
      products: bySource,
      prices,
      cheapest,
      priceDiff,
      sourceCount: group.sourceSet.size,
    });
  }

  results.sort((a, b) => b.sourceCount - a.sourceCount || (b.priceDiff || 0) - (a.priceDiff || 0));

  return results;
}

module.exports = { matchProducts, normalizeName, extractTokens, computeScore, SOURCES };
