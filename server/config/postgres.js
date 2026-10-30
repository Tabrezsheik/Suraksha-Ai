/**
 * SURAKSHA AI — Phase 8 PostgreSQL / PostGIS Connection Manager
 * 
 * PostgreSQL/PostGIS is authoritative ONLY for Phase 8 spatial evidence.
 * All application state, auth, users, and Phase 1–7 data remain in MongoDB.
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

function getPoolConfig() {
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || process.env.POSTGRES_DATABASE || 'suraksha_spatial',
    user: process.env.POSTGRES_USER || 'postgres',
    password: String(process.env.POSTGRES_PASSWORD || ''),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  };
}

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool(getPoolConfig());
    pool.on('error', (err) => {
      console.warn('[Postgres/PostGIS] Unexpected idle client error:', err.message);
    });
  }
  return pool;
}

/**
 * Checks PostGIS connectivity and spatial extension health.
 * @returns {Promise<{available: boolean, status: string, version?: string, error?: string}>}
 */
async function checkPostgisHealth() {
  try {
    const currentPool = getPool();
    const res = await currentPool.query('SELECT PostGIS_Version() AS postgis_version;');
    return {
      available: true,
      status: 'SPATIAL_ENGINE_AVAILABLE',
      version: res.rows[0]?.postgis_version || 'unknown'
    };
  } catch (err) {
    return {
      available: false,
      status: 'SPATIAL_ENGINE_UNAVAILABLE',
      error: err.message
    };
  }
}

/**
 * Execute parameterized query safely
 * @param {string} text - Parameterized SQL text ($1, $2, ...)
 * @param {Array} params - Parameter values
 */
async function query(text, params) {
  const currentPool = getPool();
  return currentPool.query(text, params);
}

/**
 * Graceful shutdown of PostgreSQL pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  query,
  checkPostgisHealth,
  closePool,
  getPoolConfig,
  get poolConfig() {
    return getPoolConfig();
  }
};
