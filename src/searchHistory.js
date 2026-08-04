const { query } = require('./db');

async function saveSearchHistory(keyword, thuocsiCount, longchauCount, pharmartCount, medigoCount, matchedCount, responseTimeMs) {
  const sql = `
    INSERT INTO search_history (keyword, thuocsi_count, longchau_count, pharmart_count, medigo_count, matched_count, response_time_ms)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id;
  `;
  const res = await query(sql, [keyword, thuocsiCount, longchauCount, pharmartCount, medigoCount, matchedCount, responseTimeMs]);
  return res.rows[0];
}

async function getSearchHistory(limit = 20) {
  const sql = `
    SELECT * FROM search_history
    ORDER BY created_at DESC
    LIMIT $1
  `;
  const res = await query(sql, [limit]);
  return res.rows;
}

async function getPopularKeywords(limit = 10) {
  const sql = `
    SELECT keyword, COUNT(*) as search_count
    FROM search_history
    GROUP BY keyword
    ORDER BY search_count DESC
    LIMIT $1
  `;
  const res = await query(sql, [limit]);
  return res.rows;
}

module.exports = { saveSearchHistory, getSearchHistory, getPopularKeywords };
