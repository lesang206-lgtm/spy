const { pool } = require('./src/db');

async function migrate() {
  console.log('Adding unique constraint to products...');

  // Check if constraint exists
  const check = await pool.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'products'::regclass AND conname = 'products_source_sku_key'
  `);

  if (check.rows.length === 0) {
    // Remove duplicate rows first
    await pool.query(`
      DELETE FROM products a USING products b
      WHERE a.id < b.id AND a.source = b.source AND a.sku = b.sku
    `);
    await pool.query('ALTER TABLE products ADD CONSTRAINT products_source_sku_key UNIQUE (source, sku)');
    console.log('✓ Unique constraint added');
  } else {
    console.log('✓ Constraint already exists');
  }

  await pool.end();
}

migrate().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
