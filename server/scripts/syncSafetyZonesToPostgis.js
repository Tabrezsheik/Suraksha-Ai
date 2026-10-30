/**
 * SURAKSHA AI — Non-Destructive SafetyZone to PostGIS Synchronizer
 * 
 * Reads MongoDB SafetyZone documents and safely syncs them to PostgreSQL/PostGIS spatial_evidence table.
 * - MongoDB data is NEVER modified or deleted.
 * - Exact provenance is preserved (TEST/DEMO remains TEST_DEMO_DATA with 0 risk).
 * - Provenance is NEVER upgraded.
 * - Idempotent upsert on source_record_id.
 */

const mongoose = require('mongoose');
const SafetyZone = require('../models/SafetyZone');
const { query, checkPostgisHealth, closePool } = require('../config/postgres');
require('dotenv').config();

function mapProvenance(zone) {
  const nameStr = (zone.name || '').toUpperCase();
  const sourceStr = (zone.source || '').toUpperCase();
  const descStr = (zone.description || '').toUpperCase();

  // Strict check for test/demo data
  if (nameStr.includes('TEST') || nameStr.includes('DEMO') || 
      sourceStr.includes('TEST') || sourceStr.includes('DEMO') ||
      descStr.includes('TEST') || descStr.includes('DEMO')) {
    return {
      provenance_class: 'TEST_DEMO_DATA',
      tier: 'TIER_F',
      base_risk_weight: 0.0
    };
  }

  if (sourceStr.includes('NCRB')) {
    return {
      provenance_class: 'OFFICIAL_DATA',
      tier: 'TIER_A',
      spatial_precision: 'district',
      geographic_scope: 'district'
    };
  }

  if (sourceStr.includes('APSAC') || sourceStr.includes('APSDMA') || sourceStr.includes('AP_POLICE') || sourceStr.includes('AP_TRANSPORT')) {
    return {
      provenance_class: 'OFFICIAL_DATA',
      tier: 'TIER_A',
      spatial_precision: zone.geographicPrecision || 'exact'
    };
  }

  if (sourceStr.includes('OSM') || sourceStr.includes('OPENSTREETMAP')) {
    return {
      provenance_class: 'REAL_PUBLIC_DATA',
      tier: 'TIER_D',
      spatial_precision: zone.geographicPrecision || 'street'
    };
  }

  return {
    provenance_class: 'UNKNOWN',
    tier: 'TIER_E',
    spatial_precision: zone.geographicPrecision || 'neighborhood'
  };
}

function mapEvidenceFamily(zone) {
  const zType = zone.zoneType || 'monitored_area';
  if (['police', 'hospital', 'pharmacy', 'transit'].includes(zType)) {
    return 'infrastructure';
  }
  if (['crime_hotspot', 'recent_evidence'].includes(zType)) {
    return 'crime';
  }
  if (zType === 'accident_prone' || zType === 'blackspot') {
    return 'accident';
  }
  return 'safety_zone';
}

function getBaseRiskWeight(zone, isTest) {
  if (isTest) return 0.0;
  if (zone.riskLevel === 'high') return 30.0;
  if (zone.riskLevel === 'medium') return 15.0;
  return 0.0;
}

async function syncSafetyZonesToPostgis() {
  console.log('--- Starting Non-Destructive SafetyZone to PostGIS Synchronization ---');

  // Check PostGIS connectivity
  const pgHealth = await checkPostgisHealth();
  if (!pgHealth.available) {
    console.error(`❌ PostGIS Unavailable: ${pgHealth.error}. Synchronization aborted without affecting MongoDB.`);
    return { success: false, status: pgHealth.status, error: pgHealth.error };
  }

  // Connect to MongoDB if not connected
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/suraksha-ai';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas for reading SafetyZones');
  }

  const zones = await SafetyZone.find({}).lean();
  console.log(`Found ${zones.length} SafetyZone records in MongoDB to synchronize.`);

  let syncedCount = 0;

  for (const zone of zones) {
    const prov = mapProvenance(zone);
    const evidenceFamily = mapEvidenceFamily(zone);
    const isTest = prov.provenance_class === 'TEST_DEMO_DATA';
    const riskWeight = prov.base_risk_weight !== undefined ? prov.base_risk_weight : getBaseRiskWeight(zone, isTest);
    const spatialPrecision = prov.spatial_precision || zone.geographicPrecision || 'neighborhood';
    const geographicScope = prov.geographic_scope || (zone.radiusMeters > 0 ? 'polygon' : 'point');
    const confidenceLevel = prov.provenance_class === 'UNKNOWN' ? 'LOW' : (zone.confidence || 'MEDIUM');

    const lat = zone.center?.latitude;
    const lon = zone.center?.longitude;

    if (lat === undefined || lon === undefined) {
      console.warn(`Skipping zone ${zone._id}: missing latitude/longitude`);
      continue;
    }

    const radius = zone.radiusMeters || 500;

    // Use ST_Buffer for polygon or ST_SetSRID for point
    const geomSql = radius > 0
      ? `ST_Buffer(ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography, ${radius})::geometry`
      : `ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)`;

    const upsertSql = `
      INSERT INTO spatial_evidence (
        evidence_family,
        evidence_type,
        tier,
        source_name,
        source_publisher,
        source_url,
        provenance_class,
        event_date,
        reference_period,
        effective_from,
        effective_to,
        geom,
        spatial_precision,
        geographic_scope,
        confidence_level,
        base_risk_weight,
        source_record_id,
        metadata,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        ${geomSql},
        $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
      )
      ON CONFLICT (source_record_id) DO UPDATE SET
        evidence_family = EXCLUDED.evidence_family,
        evidence_type = EXCLUDED.evidence_type,
        tier = EXCLUDED.tier,
        source_name = EXCLUDED.source_name,
        source_publisher = EXCLUDED.source_publisher,
        source_url = EXCLUDED.source_url,
        provenance_class = EXCLUDED.provenance_class,
        event_date = EXCLUDED.event_date,
        reference_period = EXCLUDED.reference_period,
        effective_from = EXCLUDED.effective_from,
        effective_to = EXCLUDED.effective_to,
        geom = EXCLUDED.geom,
        spatial_precision = EXCLUDED.spatial_precision,
        geographic_scope = EXCLUDED.geographic_scope,
        confidence_level = EXCLUDED.confidence_level,
        base_risk_weight = EXCLUDED.base_risk_weight,
        metadata = EXCLUDED.metadata,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    `;

    const params = [
      evidenceFamily,
      zone.zoneType || 'monitored_area',
      prov.tier,
      zone.source || 'MongoDB SafetyZone Import',
      zone.source === 'osm' ? 'OpenStreetMap' : (zone.source === 'ncrb' ? 'NCRB' : 'Internal / Verified Registry'),
      zone.source === 'osm' ? 'https://www.openstreetmap.org' : (zone.source === 'ncrb' ? 'https://ncrb.gov.in' : null),
      prov.provenance_class,
      zone.incidentDate || null,
      zone.coveragePeriod || (zone.source === 'ncrb' ? '2023' : null),
      zone.sourceDate || zone.publishedDate || new Date(),
      null, // effective_to
      spatialPrecision,
      geographicScope,
      confidenceLevel,
      riskWeight,
      zone._id.toString(),
      JSON.stringify({
        mongoId: zone._id.toString(),
        name: zone.name,
        description: zone.description,
        crimeCategory: zone.crimeCategory,
        center: zone.center,
        radiusMeters: zone.radiusMeters
      }),
      zone.active !== false
    ];

    await query(upsertSql, params);
    syncedCount++;
  }

  console.log(`✅ Successfully synced ${syncedCount} records to PostGIS spatial_evidence table.`);
  return { success: true, count: syncedCount };
}

if (require.main === module) {
  syncSafetyZonesToPostgis()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
}

module.exports = { syncSafetyZonesToPostgis, mapProvenance };
