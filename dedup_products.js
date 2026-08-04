require('dotenv').config();
const { pool } = require('./src/db');

(async () => {
  // 1. Xóa products có SKU rỗng
  const r1 = await pool.query(`DELETE FROM products WHERE sku = '' OR sku IS NULL`);
  console.log(`Deleted ${r1.rowCount} products with empty SKU`);

  // 2. Xóa products trùng (cùng source + normalized name), giữ id thấp nhất
  const r2 = await pool.query(`
    DELETE FROM products WHERE id NOT IN (
      SELECT MIN(id) FROM products
      GROUP BY source, LOWER(name)
    )
  `);
  console.log(`Deleted ${r2.rowCount} duplicate products (same source+name)`);

  // 3. Tổng còn lại
  const r3 = await pool.query(`SELECT COUNT(*) FROM products`);
  console.log(`Remaining products: ${r3.rows[0].count}`);

  await pool.end();
  console.log('Done!');
})();
