const { pool } = require('./src/db');

async function migrate() {
  console.log('Migrating products table...');
  
  // Drop old CHECK constraint and recreate table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products_new (
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
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Copy data if old table exists
  await pool.query(`
    INSERT INTO products_new (source, name, price, sale_price, image_url, product_url, brand, manufacturer, unit, active_ingredient, dosage_form, registration_number, sku, raw_data, created_at, updated_at)
    SELECT source, name, price, sale_price, image_url, product_url, brand, manufacturer, unit, active_ingredient, dosage_form, registration_number, sku, raw_data, created_at, updated_at
    FROM products
    ON CONFLICT DO NOTHING
  `).catch(() => {});

  await pool.query('DROP TABLE IF EXISTS products CASCADE');
  await pool.query('ALTER TABLE products_new RENAME TO products');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_products_source ON products(source)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector(\'simple\', name))');
  
  console.log('✓ Migration done');
  await pool.end();
}

migrate().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
