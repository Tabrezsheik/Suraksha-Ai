/**
 * SURAKSHA AI — Phase 8 Spatial Evidence Service (PostgreSQL + PostGIS)
 * 
 * Exclusively responsible for Phase 8 spatial evidence queries, spatial indexing,
 * buffer intersections, provenance enforcement, and categorical temporal validation.
 * 
 * Application state and Phase 1-7 remain in MongoDB.
 */

const { query, checkPostgisHealth } = require('../config/postgres');

/**
 * Categorical Temporal and Active Filter SQL Clause
 */
function getTemporalFilterSql() {
  return `
    AND is_active = true
    AND (
      -- Historical statistics: valid by reference period, not current timestamp
      reference_period IS NOT NULL
      OR
      -- Infrastructure: permanent unless explicitly expired
      (evidence_family = 'infrastructure' AND (effective_to IS NULL OR effective_to >= NOW()))
      OR
      -- Temporary hazards and road closures: strictly bounded time window
      (evidence_family IN ('hazard', 'accident', 'safety_zone') AND (effective_to IS NULL OR effective_to >= NOW()) AND effective_from <= NOW())
      OR
      -- Crime incidents: verified past events
      (evidence_family = 'crime' AND (effective_to IS NULL OR effective_to >= NOW()))
    )
  `;
}

/**
 * Retrieve spatial evidence matching a route LineString geometry via PostGIS
 * 
 * @param {Object} routeGeoJson - GeoJSON LineString object or geometry object
 * @param {Object} options - Search options (bufferMeters, district, etc.)
 * @returns {Promise<{status: string, evidence: Array, evidence_status: string, metadata: Object}>}
 */
async function getSpatialEvidenceForRoute(routeGeoJson, options = {}) {
  const health = await checkPostgisHealth();

  // STRICTURE: If PostGIS is unavailable, return explicit SPATIAL_ENGINE_UNAVAILABLE
  // DO NOT silently fall back to MongoDB JavaScript calculations
  if (!health.available) {
    return {
      status: 'SPATIAL_ENGINE_UNAVAILABLE',
      evidence_status: 'EVIDENCE_UNAVAILABLE',
      evidence: [],
      error: health.error,
      metadata: {
        spatialEngine: 'PostgreSQL/PostGIS',
        status: 'SPATIAL_ENGINE_UNAVAILABLE'
      }
    };
  }

  const bufferMeters = options.bufferMeters || 500;
  const geoJsonStr = JSON.stringify(routeGeoJson);

  try {
    const temporalClause = getTemporalFilterSql();

    // Query 1: Spatial Evidence within buffer or intersecting route LineString
    const spatialSql = `
      SELECT 
        id,
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
        spatial_precision,
        geographic_scope,
        confidence_level,
        base_risk_weight,
        source_record_id,
        metadata,
        ST_AsGeoJSON(geom) AS geometry_geojson,
        ST_Distance(geom::geography, ST_GeomFromGeoJSON($1)::geography) AS distance_meters,
        ST_Intersects(geom, ST_GeomFromGeoJSON($1)) AS is_intersecting
      FROM spatial_evidence
      WHERE 
        (
          -- Point/Infrastructure/Incident matching within spatial buffer
          (geographic_scope IN ('point', 'segment') AND ST_DWithin(geom::geography, ST_GeomFromGeoJSON($1)::geography, $2))
          OR
          -- Polygon/Zone matching via spatial intersection
          (geographic_scope = 'polygon' AND (ST_Intersects(geom, ST_GeomFromGeoJSON($1)) OR ST_DWithin(geom::geography, ST_GeomFromGeoJSON($1)::geography, $2)))
        )
        ${temporalClause}
      ORDER BY distance_meters ASC;
    `;

    const res = await query(spatialSql, [geoJsonStr, bufferMeters]);

    // Format and categorize results with strict provenance and evidence integrity rules
    const formattedEvidence = res.rows.map((row) => {
      const isTestOrDemo = row.provenance_class === 'TEST_DEMO_DATA' || row.tier === 'TIER_F';
      
      // Strict rule: TEST / DEMO contributes exactly 0 risk
      const riskContribution = isTestOrDemo ? 0.0 : parseFloat(row.base_risk_weight || 0);

      // Strict rule: UNKNOWN provenance must never be marked high confidence
      const confidence = row.provenance_class === 'UNKNOWN' ? 'LOW' : row.confidence_level;

      let geomParsed = null;
      try {
        geomParsed = JSON.parse(row.geometry_geojson);
      } catch (_) {
        geomParsed = null;
      }

      return {
        id: row.id,
        evidenceFamily: row.evidence_family,
        evidenceType: row.evidence_type,
        tier: row.tier,
        sourceName: row.source_name,
        sourcePublisher: row.source_publisher,
        sourceUrl: row.source_url,
        provenanceClass: row.provenance_class,
        eventDate: row.event_date,
        referencePeriod: row.reference_period,
        spatialPrecision: row.spatial_precision,
        geographicScope: row.geographic_scope,
        confidenceLevel: confidence,
        riskContribution: riskContribution,
        distanceMeters: Math.round(parseFloat(row.distance_meters || 0)),
        isIntersecting: Boolean(row.is_intersecting),
        sourceRecordId: row.source_record_id,
        metadata: row.metadata,
        geometry: geomParsed
      };
    });

    const evidenceStatus = formattedEvidence.length > 0 ? 'EVIDENCE_AVAILABLE' : 'EVIDENCE_INSUFFICIENT';

    return {
      status: 'SPATIAL_ENGINE_AVAILABLE',
      evidence_status: evidenceStatus,
      evidence: formattedEvidence,
      metadata: {
        spatialEngine: 'PostgreSQL/PostGIS',
        version: health.version,
        bufferMeters,
        totalMatched: formattedEvidence.length
      }
    };
  } catch (err) {
    console.error('[spatialEvidenceService] PostGIS Query Error:', err.message);
    return {
      status: 'SPATIAL_ENGINE_UNAVAILABLE',
      evidence_status: 'EVIDENCE_UNAVAILABLE',
      evidence: [],
      error: err.message,
      metadata: {
        spatialEngine: 'PostgreSQL/PostGIS',
        status: 'SPATIAL_ENGINE_UNAVAILABLE'
      }
    };
  }
}

/**
 * Retrieve verified district-level historical context (e.g. NCRB 2023)
 * @param {string} districtName 
 */
async function getDistrictContext(districtName) {
  const health = await checkPostgisHealth();
  if (!health.available) return null;

  try {
    const sql = `
      SELECT 
        source_name, source_publisher, reference_period, spatial_precision,
        provenance_class, confidence_level, base_risk_weight, metadata
      FROM spatial_evidence
      WHERE 
        geographic_scope = 'district'
        AND (metadata->>'district' ILIKE $1 OR source_name ILIKE $1)
        AND is_active = true
      LIMIT 1;
    `;
    const res = await query(sql, [`%${districtName}%`]);
    return res.rows[0] || null;
  } catch (_) {
    return null;
  }
}

/**
 * Insert or upsert verified spatial evidence record into PostGIS
 * @param {Object} record 
 */
async function insertSpatialEvidenceRecord(record) {
  const geomSql = record.geometryGeoJson 
    ? `ST_SetSRID(ST_GeomFromGeoJSON($11), 4326)`
    : (record.longitude && record.latitude 
        ? `ST_SetSRID(ST_MakePoint(${record.longitude}, ${record.latitude}), 4326)`
        : null);

  if (!geomSql) {
    throw new Error('Spatial evidence record must contain valid coordinates or GeoJSON geometry.');
  }

  const isTest = record.provenanceClass === 'TEST_DEMO_DATA' || record.tier === 'TIER_F';
  const riskWeight = isTest ? 0.0 : (record.baseRiskWeight || 0.0);

  const sql = `
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
      updated_at = NOW()
    RETURNING id;
  `;

  const params = [
    record.evidenceFamily || 'safety_zone',
    record.evidenceType || 'monitored_area',
    record.tier || 'TIER_D',
    record.sourceName || 'Unknown Source',
    record.sourcePublisher || 'Unknown Publisher',
    record.sourceUrl || null,
    record.provenanceClass || 'UNKNOWN',
    record.eventDate || null,
    record.referencePeriod || null,
    record.effectiveFrom || new Date(),
    record.effectiveTo || null,
    record.spatialPrecision || 'neighborhood',
    record.geographicScope || 'point',
    record.confidenceLevel || 'MEDIUM',
    riskWeight,
    record.sourceRecordId || null,
    JSON.stringify(record.metadata || {}),
    record.isActive !== false
  ];

  return query(sql, params);
}

module.exports = {
  getSpatialEvidenceForRoute,
  getDistrictContext,
  insertSpatialEvidenceRecord,
  getTemporalFilterSql
};
