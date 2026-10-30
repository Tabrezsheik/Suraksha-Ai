/**
 * NCRB / Government Data (data.gov.in) & Local Evidence Service
 * (Phase 8 Final Real-Data Credibility Hardening)
 *
 * DATA PROVENANCE DECLARATION:
 *
 * GOVERNMENT_NCRB_DISTRICT_DATA:
 *   Type: OFFICIAL_PUBLIC_REFERENCE
 *   Source: Derived from published NCRB Crime in India 2023 Report (Table 1A.1 IPC Offences by District)
 *   Coverage: District-level aggregate violent crime statistics
 *   Precision: district (NOT street-level, NOT real-time)
 *   Availability: NCRB publishes district-level annual totals. Street-level data is NOT available publicly.
 *   Baseline Mapping: 16 (low), 20 (medium), 24 (high) are SURAKSHA Phase 8 derived baseline classifications
 *                    based on published NCRB 2023 statistics, NOT raw values supplied by NCRB.
 *   Disclaimer: These values represent district historical context based on published NCRB 2023 aggregate
 *               data patterns. They are NOT real-time or live crime feeds.
 *
 * RECENT_LOCAL_EVIDENCE_DATA:
 *   Type: SUPPLEMENTARY_ILLUSTRATIVE_DATA (NOT verified incident database)
 *   Source: Illustrative records for demonstration/testing purposes
 *   Numeric Contribution to Production Risk: EXACTLY ZERO (0 pts)
 *   Disclaimer: These records do NOT come from a verified crime incident API.
 *               They are demonstration/supplementary context only and contribute 0 risk points.
 */

const SafetyZone = require('../models/SafetyZone');

/**
 * NCRB District Reference Data (Crime in India 2023)
 *
 * DATA TYPE: OFFICIAL_PUBLIC_REFERENCE — derived from NCRB Crime in India 2023 report structure.
 * COVERAGE: District-level historical aggregate (2023). NOT street-level. NOT live.
 * PUBLICATION: NCRB 2023 (released by Ministry of Home Affairs / NCRB).
 *
 * SURAKSHA Phase 8 baseline classification derived from official stats:
 *   high (24 pts):   district IPC violent crime rate significantly above national average
 *   medium (20 pts): district IPC violent crime rate near national average
 *   low (16 pts):    district IPC violent crime rate below national average
 *
 * NOTE: Anantapuramu (Andhra Pradesh) district data reflects AP district-level statistics.
 *       No street-level crime data for Anantapuramu is publicly available.
 */
const GOVERNMENT_NCRB_DISTRICT_DATA = [
  {
    name: 'Delhi NCT District (NCRB / data.gov.in)',
    center: { latitude: 28.6139, longitude: 77.2090 },
    radiusMeters: 35000,
    riskLevel: 'high',
    zoneType: 'district_context',
    source: 'data.gov.in / NCRB',
    datasetName: 'Crime in India 2023 — Table 1A.1 IPC Offences by District',
    sourceType: 'OFFICIAL_PUBLIC_REFERENCE',
    publicationYear: 2024,
    coverageYear: 2023,
    district: 'Delhi NCT',
    crimeCategory: 'IPC_Violent_Crime_Rate',
    dataQuality: 'DISTRICT_LEVEL_ONLY',
    sourceDate: new Date('2024-12-01'),
    coveragePeriod: '2023 Annual Report',
    confidence: 'MEDIUM',
    geographicPrecision: 'district',
    description: 'District-level historical IPC violent crime context (2023). NOT street-level. Baseline score (24 pts) derived via SURAKSHA Phase 8 classification. Source: NCRB Crime in India 2023.'
  },
  {
    name: 'Gautam Buddha Nagar District (NCRB / data.gov.in)',
    center: { latitude: 28.5355, longitude: 77.3910 },
    radiusMeters: 30000,
    riskLevel: 'medium',
    zoneType: 'district_context',
    source: 'data.gov.in / NCRB',
    datasetName: 'Crime in India 2023 — Table 1A.1 IPC Offences by District',
    sourceType: 'OFFICIAL_PUBLIC_REFERENCE',
    publicationYear: 2024,
    coverageYear: 2023,
    district: 'Gautam Buddha Nagar (Noida)',
    crimeCategory: 'IPC_Violent_Crime_Rate',
    dataQuality: 'DISTRICT_LEVEL_ONLY',
    sourceDate: new Date('2024-12-01'),
    coveragePeriod: '2023 Annual Report',
    confidence: 'MEDIUM',
    geographicPrecision: 'district',
    description: 'District-level historical IPC violent crime context (2023). NOT street-level. Baseline score (20 pts) derived via SURAKSHA Phase 8 classification. Source: NCRB Crime in India 2023.'
  },
  {
    name: 'Gurugram District (NCRB / data.gov.in)',
    center: { latitude: 28.4950, longitude: 77.0895 },
    radiusMeters: 30000,
    riskLevel: 'low',
    zoneType: 'district_context',
    source: 'data.gov.in / NCRB',
    datasetName: 'Crime in India 2023 — Table 1A.1 IPC Offences by District',
    sourceType: 'OFFICIAL_PUBLIC_REFERENCE',
    publicationYear: 2024,
    coverageYear: 2023,
    district: 'Gurugram',
    crimeCategory: 'IPC_Violent_Crime_Rate',
    dataQuality: 'DISTRICT_LEVEL_ONLY',
    sourceDate: new Date('2024-12-01'),
    coveragePeriod: '2023 Annual Report',
    confidence: 'MEDIUM',
    geographicPrecision: 'district',
    description: 'District-level historical IPC violent crime context (2023). NOT street-level. Baseline score (16 pts) derived via SURAKSHA Phase 8 classification. Source: NCRB Crime in India 2023.'
  },
  {
    name: 'Anantapuramu District (NCRB / data.gov.in)',
    center: { latitude: 14.6819, longitude: 77.6006 },
    radiusMeters: 50000,
    riskLevel: 'medium',
    zoneType: 'district_context',
    source: 'data.gov.in / NCRB',
    datasetName: 'Crime in India 2023 — Table 1A.1 IPC Offences by District (Andhra Pradesh)',
    sourceType: 'OFFICIAL_PUBLIC_REFERENCE',
    publicationYear: 2024,
    coverageYear: 2023,
    district: 'Anantapuramu (Andhra Pradesh)',
    crimeCategory: 'IPC_Violent_Crime_Rate',
    dataQuality: 'DISTRICT_LEVEL_ONLY',
    sourceDate: new Date('2024-12-01'),
    coveragePeriod: '2023 Annual Report',
    confidence: 'MEDIUM',
    geographicPrecision: 'district',
    description: 'District-level historical IPC violent crime context for Anantapuramu (2023). Street-level data NOT available. Baseline score (20 pts) derived via SURAKSHA Phase 8 classification. Source: NCRB Crime in India 2023.'
  }
];

/**
 * SUPPLEMENTARY LOCAL EVIDENCE (Illustrative / Demo Only)
 *
 * DATA TYPE: SUPPLEMENTARY_ILLUSTRATIVE_DATA
 * SOURCE: Illustrative records for demonstration/development purposes only
 * NUMERIC RISK CONTRIBUTION: EXACTLY ZERO (0 pts)
 * CONFIDENCE: LOW
 * DATA QUALITY: NOT_VERIFIED
 *
 * CRITICAL DISCLAIMER:
 *   These records do NOT come from a verified crime incident database or real-time API.
 *   They are provided as illustrative supplementary context for demonstration only.
 *   Per SURAKSHA credibility rules, TEST/DEMO records contribute ZERO numeric points to production risk.
 */
const SUPPLEMENTARY_ILLUSTRATIVE_DATA = [
  {
    name: 'Anantapur Bypass Area — Illustrative Night Safety Context',
    center: { latitude: 14.6700, longitude: 77.6150 },
    radiusMeters: 800,
    riskLevel: 'medium',
    zoneType: 'illustrative_context',
    source: 'Supplementary Illustrative Data (Demo — 0 pts contribution)',
    sourceType: 'SUPPLEMENTARY_ILLUSTRATIVE_DATA',
    incidentDate: null,
    publishedDate: null,
    crimeCategory: 'night_isolation_context',
    severity: 'illustrative',
    jurisdiction: 'Anantapuramu',
    confidence: 'LOW',
    dataQuality: 'NOT_VERIFIED',
    geographicPrecision: 'neighborhood',
    description: 'Illustrative record: Bypass area has low activity and limited lighting at night. Contributes 0 numeric points to risk score. Demo context only.'
  },
  {
    name: 'SK University Outskirts — Illustrative Remoteness Context',
    center: { latitude: 14.6400, longitude: 77.6300 },
    radiusMeters: 900,
    riskLevel: 'medium',
    zoneType: 'illustrative_context',
    source: 'Supplementary Illustrative Data (Demo — 0 pts contribution)',
    sourceType: 'SUPPLEMENTARY_ILLUSTRATIVE_DATA',
    incidentDate: null,
    publishedDate: null,
    crimeCategory: 'isolation_context',
    severity: 'illustrative',
    jurisdiction: 'Anantapuramu',
    confidence: 'LOW',
    dataQuality: 'NOT_VERIFIED',
    geographicPrecision: 'neighborhood',
    description: 'Illustrative record: University outskirts area has low commercial activity and limited transit. Contributes 0 numeric points to risk score. Demo context only.'
  }
];

/**
 * Ingests NCRB historical district reference data & supplementary illustrative context into SafetyZone model
 */
const ingestNCRBData = async () => {
  const now = new Date();
  const ingested = [];

  // Ingest NCRB District Baseline Reference Records
  for (const item of GOVERNMENT_NCRB_DISTRICT_DATA) {
    const record = await SafetyZone.findOneAndUpdate(
      { name: item.name },
      {
        $set: {
          center: item.center,
          radiusMeters: item.radiusMeters,
          riskLevel: item.riskLevel,
          zoneType: item.zoneType,
          source: item.source,
          sourceDate: item.sourceDate,
          coveragePeriod: item.coveragePeriod,
          confidence: item.confidence,
          geographicPrecision: item.geographicPrecision,
          description: item.description,
          dataQuality: item.dataQuality || 'DISTRICT_LEVEL_ONLY',
          sourceType: item.sourceType || 'OFFICIAL_PUBLIC_REFERENCE',
          retrievedAt: now,
          active: true
        }
      },
      { upsert: true, new: true }
    );
    ingested.push(record);
  }

  // Ingest Supplementary Illustrative Context Records (NOT verified incidents)
  for (const item of SUPPLEMENTARY_ILLUSTRATIVE_DATA) {
    const record = await SafetyZone.findOneAndUpdate(
      { name: item.name },
      {
        $set: {
          center: item.center,
          radiusMeters: item.radiusMeters,
          riskLevel: item.riskLevel,
          zoneType: item.zoneType,
          source: item.source,
          incidentDate: item.incidentDate,
          publishedDate: item.publishedDate,
          crimeCategory: item.crimeCategory,
          confidence: item.confidence,
          geographicPrecision: item.geographicPrecision,
          description: item.description,
          dataQuality: item.dataQuality || 'NOT_VERIFIED',
          sourceType: item.sourceType || 'SUPPLEMENTARY_ILLUSTRATIVE_DATA',
          retrievedAt: now,
          active: true
        }
      },
      { upsert: true, new: true }
    );
    ingested.push(record);
  }

  return ingested;
};

module.exports = {
  ingestNCRBData,
  GOVERNMENT_NCRB_DISTRICT_DATA,
  SUPPLEMENTARY_ILLUSTRATIVE_DATA,
  // Legacy alias for existing imports
  RECENT_LOCAL_EVIDENCE_DATA: SUPPLEMENTARY_ILLUSTRATIVE_DATA
};
