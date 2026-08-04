const { query, testConnection } = require('./db');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  name VARCHAR(500) NOT NULL,
  price NUMERIC(12, 2) DEFAULT 0,
  sale_price NUMERIC(12, 2) DEFAULT 0,
  image_url TEXT,
  product_url TEXT,
  brand VARCHAR(200),
  manufacturer VARCHAR(300),
  unit VARCHAR(100),
  active_ingredient VARCHAR(300),
  dosage_form VARCHAR(100),
  registration_number VARCHAR(100),
  sku VARCHAR(200),
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE TABLE IF NOT EXISTS product_matches (
  id SERIAL PRIMARY KEY,
  group_name VARCHAR(500) NOT NULL,
  search_keyword VARCHAR(200),
  cheapest_source VARCHAR(50),
  price_diff NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_keyword ON product_matches(search_keyword);

CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(200) NOT NULL,
  thuocsi_count INTEGER DEFAULT 0,
  longchau_count INTEGER DEFAULT 0,
  pharmart_count INTEGER DEFAULT 0,
  medigo_count INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_keyword ON search_history(keyword);

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  product_name VARCHAR(500) NOT NULL,
  source VARCHAR(50),
  price NUMERIC(12, 2) DEFAULT 0,
  sale_price NUMERIC(12, 2) DEFAULT 0,
  image_url TEXT,
  product_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_name)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
`;

async function initDatabase() {
  const ok = await testConnection();
  if (!ok) {
    console.error('Cannot connect to PostgreSQL. Check your .env config.');
    process.exit(1);
  }

  try {
    await query(SCHEMA_SQL);
    console.log('Database ready');
    return true;
  } catch (err) {
    console.error('Database init error:', err.message);
    return false;
  }
}

module.exports = { initDatabase };
