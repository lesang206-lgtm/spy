const { searchThuocsi } = require('./thuocsi');
const { searchLongchau } = require('./longchau');
const { searchPharmart } = require('./pharmart');
const { searchMedigo } = require('./medigo');
const { upsertProducts } = require('../products');
const matcher = require('../matcher');

async function searchAll(keyword) {
  console.log(`Searching for: "${keyword}"`);
  const startTime = Date.now();

  const [thuocsiResults, longchauResults, pharmartResults, medigoResults] = await Promise.all([
    (async () => {
      try {
        const results = await searchThuocsi(keyword);
        console.log(`Thuocsi: ${results.length} products found`);
        return results;
      } catch (err) {
        console.error('Thuocsi error:', err.message);
        return [];
      }
    })(),
    (async () => {
      try {
        const results = await searchLongchau(keyword);
        console.log(`Longchau: ${results.length} products found`);
        return results;
      } catch (err) {
        console.error('Longchau error:', err.message);
        return [];
      }
    })(),
    (async () => {
      try {
        const results = await searchPharmart(keyword);
        console.log(`Pharmart: ${results.length} products found`);
        return results;
      } catch (err) {
        console.error('Pharmart error:', err.message);
        return [];
      }
    })(),
    (async () => {
      try {
        const results = await searchMedigo(keyword);
        console.log(`Medigo: ${results.length} products found`);
        return results;
      } catch (err) {
        console.error('Medigo error:', err.message);
        return [];
      }
    })(),
  ]);

  console.log(`Scraping done: Thuocsi=${thuocsiResults.length}, Longchau=${longchauResults.length}, Pharmart=${pharmartResults.length}, Medigo=${medigoResults.length}`);

  const allResults = [...thuocsiResults, ...longchauResults, ...pharmartResults, ...medigoResults];

  let saved = [];
  try {
    saved = await upsertProducts(allResults);
    console.log(`Products saved to DB: ${saved.length}`);
  } catch (err) {
    console.error('DB save error:', err.message);
  }

  const matches = matcher.matchProducts(saved, keyword);
  console.log(`Matches found: ${matches.length}`);

  const responseTimeMs = Date.now() - startTime;

  return {
    matches,
    thuocsi: thuocsiResults,
    longchau: longchauResults,
    pharmart: pharmartResults,
    medigo: medigoResults,
    thuocsiCount: thuocsiResults.length,
    longchauCount: longchauResults.length,
    pharmartCount: pharmartResults.length,
    medigoCount: medigoResults.length,
    matchCount: matches.length,
    responseTimeMs,
  };
}

module.exports = { searchAll };
