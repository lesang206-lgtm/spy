const { query } = require('./db');

async function saveMatch(match) {
  const sql = `
    INSERT INTO product_matches (group_name, search_keyword, cheapest_source, price_diff)
    VALUES ($1, $2, $3, $4)
    RETURNING id;
  `;
  const res = await query(sql, [
    match.name,
    match.keyword || '',
    match.cheapest || 'unknown',
    match.priceDiff || 0,
  ]);
  return res.rows[0];
}

async function saveMatches(matches) {
  const results = [];
  for (const m of matches) {
    try {
      const row = await saveMatch(m);
      results.push(row);
    } catch (err) {
      console.error('Save match error:', err.message);
    }
  }
  return results;
}

async function getMatchesByKeyword(keyword) {
  const sql = `
    SELECT * FROM product_matches
    WHERE search_keyword = $1
    ORDER BY created_at DESC
    LIMIT 50
  `;
  const res = await query(sql, [keyword]);
  return res.rows;
}

async function getMatchStats() {
  const res = await query(`
    SELECT
      COUNT(*) as total_matches,
      COUNT(DISTINCT search_keyword) as unique_keywords,
      COUNT(*) FILTER (WHERE cheapest_source = 'thuocsi.vn') as thuocsi_cheaper,
      COUNT(*) FILTER (WHERE cheapest_source = 'nhathuoclongchau.com.vn') as longchau_cheaper,
      COUNT(*) FILTER (WHERE cheapest_source = 'pharmart.vn') as pharmart_cheaper,
      COUNT(*) FILTER (WHERE cheapest_source = 'medigoapp.com') as medigo_cheaper
    FROM product_matches
  `);
  return res.rows[0];
}

module.exports = { saveMatch, saveMatches, getMatchesByKeyword, getMatchStats };
