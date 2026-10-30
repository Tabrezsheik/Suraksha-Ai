/**
 * SURAKSHA AI — Initialize PostGIS Database Schema
 * Executes schema.sql to configure PostGIS extension, spatial_evidence table, and GiST indexes.
 */

const fs = require('fs');
const path = require('path');
const { query, checkPostgisHealth, closePool } = require('../config/postgres');

async function initPostgis() {
  console.log('--- Initializing PostGIS Spatial Database ---');
  const health = await checkPostgisHealth();
  
  if (!health.available) {
    console.error(`❌ PostGIS Connection Failed: ${health.error}`);
    console.error(`Status: ${health.status}`);
    return { success: false, status: health.status, error: health.error };
  }

  console.log(`✅ PostGIS Connected! Version: ${health.version}`);

  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await query(schemaSql);
    console.log('✅ PostGIS Schema and GiST spatial indexes initialized successfully.');
    return { success: true, status: 'SPATIAL_ENGINE_AVAILABLE', version: health.version };
  } catch (err) {
    console.error('❌ Failed to execute schema.sql:', err.message);
    return { success: false, status: 'SCHEMA_INIT_FAILED', error: err.message };
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  initPostgis()
    .then((res) => {
      if (!res.success) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { initPostgis };
