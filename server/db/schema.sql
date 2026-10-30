-- SURAKSHA AI — Phase 8 Spatial Evidence Schema
-- PostgreSQL + PostGIS Schema
-- This schema stores ONLY Phase 8 spatial evidence and spatial analysis data.
-- Application state and Phase 1-7 remain in MongoDB.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS spatial_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_family VARCHAR(50) NOT NULL CHECK (evidence_family IN ('crime', 'accident', 'infrastructure', 'hazard', 'safety_zone')),
    evidence_type VARCHAR(100) NOT NULL,
    tier VARCHAR(10) NOT NULL CHECK (tier IN ('TIER_A', 'TIER_B', 'TIER_C', 'TIER_D', 'TIER_E', 'TIER_F')),
    source_name VARCHAR(150) NOT NULL,
    source_publisher VARCHAR(150) NOT NULL,
    source_url TEXT,
    provenance_class VARCHAR(50) NOT NULL CHECK (provenance_class IN ('OFFICIAL_DATA', 'REAL_PUBLIC_DATA', 'DERIVED_ESTIMATED', 'TEST_DEMO_DATA', 'UNKNOWN')),
    event_date TIMESTAMPTZ,
    reference_period VARCHAR(50),
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    geom GEOMETRY(Geometry, 4326) NOT NULL,
    spatial_precision VARCHAR(50) NOT NULL CHECK (spatial_precision IN ('exact', 'street', 'neighborhood', 'district', 'state')),
    geographic_scope VARCHAR(50) NOT NULL CHECK (geographic_scope IN ('point', 'segment', 'polygon', 'district', 'regional')),
    confidence_level VARCHAR(20) NOT NULL CHECK (confidence_level IN ('HIGH', 'MEDIUM', 'LOW')),
    base_risk_weight NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (base_risk_weight >= 0 AND base_risk_weight <= 100),
    source_record_id VARCHAR(100) UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial GiST index for fast spatial queries (ST_DWithin, ST_Intersects)
CREATE INDEX IF NOT EXISTS idx_spatial_evidence_geom ON spatial_evidence USING GIST (geom);

-- Attribute indexes for optimized filtering
CREATE INDEX IF NOT EXISTS idx_spatial_evidence_family ON spatial_evidence (evidence_family, is_active);
CREATE INDEX IF NOT EXISTS idx_spatial_evidence_provenance ON spatial_evidence (provenance_class);
CREATE INDEX IF NOT EXISTS idx_spatial_evidence_temporal ON spatial_evidence (effective_from, effective_to);
