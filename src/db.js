const { Pool } = require('pg');
require('dotenv').config();

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'DB_SPY',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 500) {
    console.log(`Slow query (${duration}ms):`, text.slice(0, 80));
  }
  return res;
}

async function getClient() {
  return pool.connect();
}

async function testConnection() {
  try {
    const res = await query('SELECT NOW()');
    console.log('PostgreSQL connected:', res.rows[0].now);
    return true;
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    return false;
  }
}

module.exports = { pool, query, getClient, testConnection };
