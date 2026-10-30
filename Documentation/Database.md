# Database.md — SURAKSHA AI

## 1. Database Overview

SURAKSHA AI uses **MongoDB Atlas with Mongoose** for application and emergency metadata.

The database is designed around the **EmergencyEvent** as the central record connecting SOS activation, live location, risk assessment, trusted-contact notifications, Guardian Mode events and emergency evidence.

The MVP keeps the data model intentionally small and avoids storing large audio/video files directly in MongoDB. Evidence files are stored in external object storage, while MongoDB stores their metadata and secure references.

---

## 2. Database Technology

**Application State (Auth, Users, Contacts, SOS, Guardian Mode — Phases 1–8)**

| Component | Technology |
|---|---|
| Database | MongoDB |
| Hosting | MongoDB Atlas |
| ODM | Mongoose |
| Primary ID | MongoDB ObjectId |
| File Storage | Cloudinary / AWS S3 / Supabase Storage |
| Real-time State | Socket.IO |
| Cache | Redis — post-MVP |

**Spatial Evidence Layer (Phase 8 — COMPLETE + REAL-DATA VALIDATED)**

| Component | Technology |
|---|---|
| Database Engine | PostgreSQL 17.11 (`postgresql-x64-17`) |
| Spatial Extension | PostGIS 3.6.2 (`USE_GEOS=1 USE_PROJ=1 USE_STATS=1`) |
| Database Name | `suraksha_spatial` |
| Primary Table | `spatial_evidence` (SRID 4326, 22 columns) |
| Spatial Indexing | GiST (`idx_spatial_evidence_geom`) |
| Connection | Port 5432, managed via `server/config/postgres.js` |
| Synchronization | 18/18 SafetyZone records (0 duplicates, 0 skipped, 0 errors) |

> **Architecture note:** PostgreSQL + PostGIS is the dedicated spatial evidence layer. It does NOT replace MongoDB. MongoDB remains authoritative for all application/auth/emergency state.

---

## 3. Collections Overview

```text
users
trustedContacts
emergencyEvents
locationEvents
riskAssessments
guardianEvents
evidence
notifications
safetyZones
```

### Core relationships

```text
User
 │
 ├── TrustedContact
 │
 ├── EmergencyEvent
 │       │
 │       ├── LocationEvent
 │       ├── RiskAssessment
 │       ├── GuardianEvent
 │       ├── Evidence
 │       └── Notification
 │
 └── SafetyRoute / Guardian sessions
```

---

# 4. User

Stores the account and basic profile information.

```js
{
  _id: ObjectId,

  name: String,
  email: String,              // unique, indexed
  passwordHash: String,

  phone: String,              // optional normalized international number (+91...)
  ageGroup: String,           // optional; e.g. "18-24", "25-34"
  gender: String,             // optional enum: "Male" | "Female" | "Other" | "Prefer not to say"

  role: String,               // "user" | "dashboard_operator"

  profilePicture: String,     // optional storage URL / Data URL

  isActive: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```text
email — unique
role
```

### Notes

- Passwords are never stored in plain text.
- `passwordHash` is generated server-side.
- Exact home address should not be stored unless required.
- Live location belongs to emergency/location records, not the permanent User document.

---

# 5. TrustedContact

Stores people selected by the user to receive emergency alerts.

```js
{
  _id: ObjectId,

  user: ObjectId,             // ref: User

  name: String,
  phone: String,
  email: String,              // optional

  relationship: String,       // "parent" | "friend" | "relative" | "other"

  isActive: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```text
user
{ user: 1, isActive: 1 }
```

### Relationship

```text
User 1 ─────────── N TrustedContact
```

A user can maintain a small Trusted Circle. Complex permission tiers are intentionally outside the MVP.

---

# 6. EmergencyEvent

**EmergencyEvent is the central collection of SURAKSHA AI.**

It represents one emergency session from activation until resolution.

```js
{
  _id: ObjectId,

  user: ObjectId,                 // ref: User

  triggerType: String,            // "manual" | "voice" | "guardian"
  status: String,                 // "active" | "resolved" | "cancelled"

  startedAt: Date,
  endedAt: Date,

  initialRiskScore: Number,       // 0–100
  currentRiskScore: Number,       // 0–100
  riskLevel: String,              // "low" | "medium" | "high" | "critical"

  currentLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    timestamp: Date
  },

  trustedContactsNotified: Boolean,

  evidenceIds: [ObjectId],        // refs: Evidence

  timeline: [
    {
      type: String,               // "sos" | "risk_update" | "location" | "alert" | "evidence" | "resolved"
      message: String,
      timestamp: Date
    }
  ],

  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```text
user
status
startedAt
riskLevel
{ user: 1, startedAt: -1 }
{ status: 1, startedAt: -1 }
```

### Why this is the central entity

```text
EmergencyEvent
     │
     ├── Live Location
     ├── Risk Assessment
     ├── Guardian Events
     ├── Evidence
     ├── Notifications
     └── Dashboard Timeline
```

This keeps the complete emergency journey connected to one record.

---

# 7. LocationEvent

Stores location updates during Guardian Mode or an active emergency.

```js
{
  _id: ObjectId,

  user: ObjectId,                  // ref: User
  emergencyEvent: ObjectId,        // ref: EmergencyEvent, optional

  latitude: Number,
  longitude: Number,

  accuracy: Number,
  speed: Number,
  heading: Number,

  source: String,                  // "guardian" | "emergency"

  recordedAt: Date
}
```

### Indexes

```text
{ user: 1, recordedAt: -1 }
{ emergencyEvent: 1, recordedAt: -1 }
```

### Important

Location history can grow quickly, so the application should define retention limits rather than storing unlimited historical points.

---

# 8. RiskAssessment

Stores individual AI/rule-engine risk calculations.

```js
{
  _id: ObjectId,

  user: ObjectId,                 // ref: User
  emergencyEvent: ObjectId,       // ref: EmergencyEvent, optional

  score: Number,                  // 0–100
  level: String,                  // "low" | "medium" | "high" | "critical"

  signals: [
    {
      type: String,               // "distress_keyword" | "voice_stress"
                                  // "high_risk_location" | "route_deviation"
                                  // "suspicious_stoppage"
      points: Number,
      description: String
    }
  ],

  source: String,                 // "rule_engine" | "future_ml"

  createdAt: Date
}
```

### MVP scoring example

```text
Distress keyword       +30
Voice stress           +25
High-risk location     +20
Route deviation        +15
Suspicious stoppage    +10
                         ────
Maximum                 100
```

### Risk bands

```text
0–30      LOW
31–60     MEDIUM
61–80     HIGH
81–100    CRITICAL
```

The MVP intentionally uses a transparent rule-based engine rather than a black-box predictive ML model.

---

# 9. GuardianSession & GuardianEvent (COMPLETE + VERIFIED ✅)

## 9.1 GuardianSession
Stores active and historic Guardian Mode journey protection sessions.

```js
{
  _id: ObjectId,
  user: ObjectId,                  // ref: User, indexed
  destination: {
    latitude: Number,
    longitude: Number,
    name: String
  },
  status: String,                  // "active" | "completed" | "stopped" | "escalated"
  startedAt: Date,
  endedAt: Date,
  lastLocation: {
    latitude: Number,
    longitude: Number,
    recordedAt: Date
  },
  createdAt: Date
}
```

## 9.2 GuardianEvent
Stores unusual activity detected while Guardian Mode is active.

```js
{
  _id: ObjectId,

  user: ObjectId,                  // ref: User, indexed
  guardianSession: ObjectId,       // ref: GuardianSession, indexed
  emergencyEvent: ObjectId,        // ref: EmergencyEvent, optional

  type: String,                    // "route_deviation" | "suspicious_stoppage"

  riskScore: Number,
  status: String,                  // "detected" | "check_in" | "safe" | "escalated"

  location: {
    latitude: Number,
    longitude: Number,
    timestamp: Date
  },

  detectedAt: Date,
  resolvedAt: Date,

  createdAt: Date
}
```

### Guardian flow

```text
Guardian Mode
      ↓
Location Updates
      ↓
Anomaly Detected
      ↓
GuardianEvent
      ↓
User Check-in
   ↙         ↘
Safe       Get Help
              ↓
         EmergencyEvent
```

Every route deviation should not automatically become an emergency. The MVP uses a check-in step before escalation.

---

# 10. Evidence

Stores metadata for emergency evidence.

```js
{
  _id: ObjectId,

  user: ObjectId,                  // ref: User
  emergencyEvent: ObjectId,        // ref: EmergencyEvent

  type: String,                    // "audio"

  storageUrl: String,              // Cloudinary/S3/Supabase URL
  storageProvider: String,         // "cloudinary" | "s3" | "supabase"

  mimeType: String,
  sizeBytes: Number,
  durationSeconds: Number,

  capturedAt: Date,

  createdAt: Date
}
```

### Storage architecture

```text
Mobile
  │
  │ Audio
  ↓
Cloud Storage
  │
  │ secure reference
  ↓
MongoDB
  │
  └── Evidence metadata
```

Large binary files should **not** be stored directly inside MongoDB.

### MVP scope

```text
✓ Audio
✓ Location metadata
✓ Timestamp / timeline

✗ Continuous video processing
```

---

# 11. Notification

Stores notification records and delivery state.

```js
{
  _id: ObjectId,

  user: ObjectId,                 // recipient User
  emergencyEvent: ObjectId,       // ref: EmergencyEvent, optional

  type: String,                   // "emergency" | "guardian_warning"
                                  // "risk_update" | "system"

  title: String,
  message: String,

  channel: String,                // "push" | "dashboard"

  isRead: Boolean,

  sentAt: Date,
  readAt: Date,

  createdAt: Date
}
```

### Indexes

```text
{ user: 1, isRead: 1 }
{ emergencyEvent: 1, createdAt: -1 }
```

### Notification flow

```text
EmergencyEvent
      ↓
Node.js Notification Service
      ↓
Firebase FCM
      ↓
Trusted Circle
```

SMS, WhatsApp and voice-call escalation are post-MVP enhancements.

---

# 12. SafetyZone

Stores safety and risk infrastructure data used by Safe Route and Guardian Mode with verifiable public attribution.

```js
{
  _id: ObjectId,

  name: String,

  center: {
    latitude: Number,
    longitude: Number
  },

  radiusMeters: Number,

  riskLevel: String,              // "low" | "medium" | "high"

  zoneType: String,               // "police" | "hospital" | "pharmacy" | "transit"
                                  // "crime_hotspot" | "recent_evidence" | "monitored_area" | "district_context"

  source: String,                 // "OpenStreetMap" | "NCRB 2023" | "dataset" | "admin"

  incidentDate: Date,             // optional
  publishedDate: Date,            // optional
  sourceDate: Date,               // optional
  retrievedAt: Date,

  crimeCategory: String,          // "crimes_against_women" | "robbery" | "theft" | "assault" | "stalking" | "general"
  geographicPrecision: String,    // "exact" | "street" | "neighborhood" | "district"
  confidence: String,             // "HIGH" | "MEDIUM" | "LOW"
  coveragePeriod: String,         // e.g. "2022 Annual"

  description: String,

  active: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```text
{ riskLevel: 1, active: 1 }
{ zoneType: 1, active: 1 }
{ source: 1 }
```

For the MVP, use a small safety dataset instead of a large multi-city crime-data pipeline.

---

# 12.1 Phase 8 PostgreSQL + PostGIS Spatial Evidence Schema

In Phase 8, SURAKSHA AI introduces a **Dual-Database Architecture**:
- **MongoDB Atlas**: Authoritative for all application state, authentication, users, trusted contacts, emergency SOS, live tracking, and Phase 7 Guardian Mode (`SafetyZone` Mongoose model preserved).
- **PostgreSQL + PostGIS**: Dedicated storage, GiST spatial indexing, and spatial query engine for Phase 8 spatial evidence analysis.

### Table: `spatial_evidence` (PostgreSQL / PostGIS SRID 4326)

```sql
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

-- Spatial GiST Index
CREATE INDEX IF NOT EXISTS idx_spatial_evidence_geom ON spatial_evidence USING GIST (geom);

-- Attribute Indexes
CREATE INDEX IF NOT EXISTS idx_spatial_evidence_family ON spatial_evidence (evidence_family, is_active);
CREATE INDEX IF NOT EXISTS idx_spatial_evidence_provenance ON spatial_evidence (provenance_class);
CREATE INDEX IF NOT EXISTS idx_spatial_evidence_temporal ON spatial_evidence (effective_from, effective_to);
```

### Live Deployment & Synchronization Status (Verified)
- **Database Engine:** PostgreSQL 17.11 (`postgresql-x64-17`) on port 5432
- **Spatial Extension:** PostGIS 3.6.2 (`3.6 USE_GEOS=1 USE_PROJ=1 USE_STATS=1`)
- **Database Name:** `suraksha_spatial`
- **Total Synchronized SafetyZones:** 18 records (0 duplicates, 0 skipped, 0 errors)
  - `REAL_PUBLIC_DATA` (TIER_D): 12 records (OSM infrastructure)
  - `OFFICIAL_DATA` (TIER_A): 4 records (NCRB 2023 district context, spatial_precision: district)
  - `TEST_DEMO_DATA` (TIER_F): 2 records (`base_risk_weight = 0.00`, 0 risk points)
- **Geographic Isolation:** PostGIS `ST_DWithin` / `ST_Intersects` strictly prevents cross-city contamination (Delhi/Noida/Gurugram data isolated from Anantapur routes).
- **Outage Fallback Behavior:** When PostGIS is unreachable, explicit `SPATIAL_ENGINE_UNAVAILABLE` and `EVIDENCE_UNAVAILABLE` statuses are returned with zero silent fallback to secondary MongoDB JS calculations.


---

# 13. Relationships Overview

```text
User
 │
 ├───────────────┬───────────────────┐
 │               │                   │
 ▼               ▼                   ▼
Trusted       Emergency          Guardian
Contacts      Events             Events
                 │
       ┌─────────┼───────────┐
       │         │           │
       ▼         ▼           ▼
 Location     Risk        Evidence
 Events       Assessments
       │         │
       └─────────┼───────────┘
                 ▼
            Notifications

SafetyZone
    │
    ├── Guardian Mode
    └── AI Safe Route
```

### Cardinality

```text
User 1 ─── N TrustedContact
User 1 ─── N EmergencyEvent
User 1 ─── N LocationEvent
User 1 ─── N RiskAssessment
User 1 ─── N GuardianEvent
User 1 ─── N Evidence
User 1 ─── N Notification

EmergencyEvent 1 ─── N LocationEvent
EmergencyEvent 1 ─── N RiskAssessment
EmergencyEvent 1 ─── N GuardianEvent
EmergencyEvent 1 ─── N Evidence
EmergencyEvent 1 ─── N Notification

SafetyZone ─── used by ─── Guardian Mode / Safe Route
```

---

# 14. Data Ownership Rules

Sensitive data should follow clear ownership rules.

### User-owned data

```text
TrustedContact
Location history
Guardian sessions
Emergency history
Evidence
Notifications
```

A user must only be able to access their own records unless an authorized dashboard role is explicitly permitted.

### Dashboard access

The dashboard can access only the emergency/location information required for its operational role.

Live location and evidence must never be exposed through public endpoints.

---

# 15. Auto-Calculated Fields

The following fields should be generated by the backend rather than trusted from client requests:

```text
EmergencyEvent.currentRiskScore
EmergencyEvent.riskLevel
RiskAssessment.score
RiskAssessment.level
Notification.sentAt
Evidence.createdAt
```

The client can submit signals or events, but the server/AI service calculates the resulting risk score.

---

# 16. Data Validation

Mongoose schemas and API validation should enforce:

- Required fields
- Valid email format
- Valid phone format
- Latitude: `-90 to 90`
- Longitude: `-180 to 180`
- Risk score: `0 to 100`
- Evidence file size limits
- Allowed evidence MIME types
- Valid enum values for status/type fields
- Maximum timeline message length

Invalid input should be rejected before reaching business logic.

---

# 17. Security & Privacy

SURAKSHA AI stores sensitive safety information.

### Required controls

- Hash passwords with bcrypt or an equivalent password-hashing algorithm.
- Never store plain-text passwords.
- Store JWT secrets and API keys in environment variables.
- Never commit secrets to Git.
- Protect emergency and location endpoints with authentication.
- Enforce authorization using the authenticated user's identity.
- Do not trust a client-supplied `userId` for protected operations.
- Do not expose live location through public URLs.
- Restrict evidence access to authorized users.
- Validate uploaded evidence type and size.
- Use HTTPS in production.
- Apply rate limiting to authentication and sensitive endpoints.
- Minimize stored sensitive information.
- Define data retention/deletion policies.

---

# 18. Indexing Strategy

The MVP should index the most common query paths.

| Collection | Index |
|---|---|
| users | `email` unique |
| trustedContacts | `user` |
| emergencyEvents | `user + startedAt` |
| emergencyEvents | `status + startedAt` |
| emergencyEvents | `riskLevel` |
| locationEvents | `emergencyEvent + recordedAt` |
| locationEvents | `user + recordedAt` |
| riskAssessments | `emergencyEvent + createdAt` |
| guardianEvents | `user + detectedAt` |
| evidence | `emergencyEvent + capturedAt` |
| notifications | `user + isRead` |
| notifications | `emergencyEvent + createdAt` |
| safetyZones | `riskLevel + active` |

Indexes should support actual application queries rather than being added indiscriminately.

---

# 19. Data Retention

Because location and evidence can become sensitive and large, the MVP should not retain everything forever.

Suggested approach:

```text
Active Emergency
      ↓
Full operational data
      ↓
Emergency Resolved
      ↓
Retention period
      ↓
Delete / anonymize according to policy
```

For a real production deployment, the exact retention period should be defined with legal, privacy and safety requirements.

---

# 20. Scalability Notes

The MVP database is intentionally simple.

### Current approach

```text
MongoDB Atlas
      ↓
Mongoose
      ↓
Node.js API
```

### Later improvements

```text
MongoDB
  +
Indexes
  +
Redis
  +
Background workers
  +
Data archival
```

Redis can later support:

- Temporary emergency state
- Rate limiting
- Caching
- Distributed Socket.IO coordination

It is **not required for the first MVP**.

---

# 21. Database and Architecture Mapping

| Architecture Component | Database Collection |
|---|---|
| Authentication | `users` |
| Trusted Circle | `trustedContacts` |
| Silent SOS | `emergencyEvents` |
| Live GPS | `locationEvents` |
| AI Risk Score | `riskAssessments` |
| Guardian Mode | `guardianEvents` |
| Emergency Evidence | `evidence` |
| Alerts | `notifications` |
| Safe Route / Risk Zones | `safetyZones` |

This mapping keeps the database aligned with the architecture rather than creating collections for features that are outside the MVP.

---

# 22. Emergency Data Flow

```text
                    USER
                     │
              Manual / Voice SOS
                     │
                     ▼
              EmergencyEvent
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
   Location       AI Risk       Trusted
    Events       Assessment      Circle
       │             │             │
       └─────────────┼─────────────┘
                     ▼
                  Evidence
                     │
                     ▼
               Notification
                     │
                     ▼
              PC Dashboard
```

---

# 23. Final Database Summary

```text
🛡️ SURAKSHA AI DATABASE

users
  │
  ├── trustedContacts
  │
  ├── emergencyEvents
  │       ├── locationEvents
  │       ├── riskAssessments
  │       ├── guardianEvents
  │       ├── evidence
  │       └── notifications
  │
  └── safety-related sessions

safetyZones
  └── Guardian Mode + Safe Route
```

### Core principle

> **EmergencyEvent is the central entity. MongoDB stores the application and emergency metadata, while external storage holds large evidence files. Location, risk, Guardian Mode, evidence and notifications reference the relevant emergency event so the entire emergency lifecycle can be reconstructed and displayed on the real-time dashboard.**

This database design is intentionally aligned with the SURAKSHA AI PRD and Architecture: **Next.js + React Native → Node.js/Express → MongoDB**, with Socket.IO for real-time events, FastAPI for the AI risk layer, Mapbox for routes, FCM for notifications and external storage for evidence.
