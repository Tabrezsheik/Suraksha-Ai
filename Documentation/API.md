# API.md — SURAKSHA AI

## 1. API Overview

SURAKSHA AI exposes a REST API through **Node.js + Express.js** for authentication, users, Trusted Circle, emergencies, live tracking, Guardian Mode, risk assessments, safe routes, evidence and notifications.

**Socket.IO** is used alongside the REST API for real-time emergency events and live location updates.

The Python + FastAPI service provides the AI risk-analysis endpoints and is called internally by the Node.js backend.

```text
Mobile App / Next.js Dashboard
            │
            ├── REST API → Node.js + Express
            │                  │
            │                  ├── MongoDB
            │                  ├── Socket.IO
            │                  └── FastAPI AI Service
            │
            └── WebSocket → Socket.IO
```

---

## 2. Base URLs

### Development

```text
REST API:
http://localhost:5000/api

WebSocket:
ws://localhost:5000

AI Service:
http://localhost:8000
```

### Production

```text
REST API:
https://api.<domain>/api

WebSocket:
wss://api.<domain>

AI Service:
Internal/private service — not directly exposed to clients
```

The production domains are deployment-dependent and should be configured through environment variables.

---

## 3. Authentication

SURAKSHA AI uses JWT-based authentication.

### Header

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

Protected endpoints must verify the JWT before accessing user, emergency, location or evidence data.

### Authentication flow

```text
Login / Signup
      ↓
Node.js Auth API
      ↓
Validate credentials
      ↓
Generate JWT
      ↓
Mobile / Web Client
      ↓
Bearer Token
      ↓
Protected API
```

---

# 4. API Modules

| Module | Purpose |
|---|---|
| Auth | Registration and login |
| Users | Profile and account information |
| Trusted Circle | Emergency contacts |
| Emergency | Silent SOS lifecycle |
| Tracking | Live GPS updates |
| Guardian | Journey monitoring and anomalies |
| Risk | AI/rule-based risk assessment |
| Safe Route | Safer route calculation |
| Evidence | Emergency audio/evidence metadata |
| Notifications | Emergency notification history |
| Health | API/service health checks |

---

# 5. Authentication APIs

## 5.1 Register User

```http
POST /api/auth/register
```

### Request

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPassword123",
  "phone": "+919999999999"
}
```

### Response — `201 Created`

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "USER_ID",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "JWT_TOKEN"
  }
}
```

---

## 5.2 Login

```http
POST /api/auth/login
```

### Request

```json
{
  "email": "john@example.com",
  "password": "StrongPassword123"
}
```

### Response — `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "USER_ID",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "JWT_TOKEN"
  }
}
```

---

## 5.3 Get Current User

```http
GET /api/auth/me
```

**Auth:** Required

### Response

```json
{
  "success": true,
  "data": {
    "id": "USER_ID",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

## 5.4 Logout

```http
POST /api/auth/logout
```

**Auth:** Required

### Response — `200 OK`

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

# 6. User APIs

## 6.1 Get Profile

```http
GET /api/users/me
```

**Auth:** Required

### Response

```json
{
  "success": true,
  "data": {
    "id": "USER_ID",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919999999999",
    "ageGroup": "25-34",
    "gender": "Male",
    "profilePicture": "data:image/png;base64,..."
  }
}
```

---

## 6.2 Update Profile

```http
PATCH /api/users/me
```

**Auth:** Required

### Request

```json
{
  "name": "John Doe",
  "phone": "+919888888888",
  "ageGroup": "25-34",
  "gender": "Female",
  "profilePicture": "data:image/png;base64,..."
}
```

### Response

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "USER_ID",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919888888888",
    "ageGroup": "25-34",
    "gender": "Female",
    "profilePicture": "data:image/png;base64,..."
  }
}
```

---

# 7. Trusted Circle APIs

## 7.1 Get Trusted Contacts

```http
GET /api/contacts
```

**Auth:** Required

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "CONTACT_ID",
      "name": "Mother",
      "phone": "+919999999999",
      "relationship": "parent",
      "isActive": true
    }
  ]
}
```

---

## 7.2 Add Trusted Contact

```http
POST /api/contacts
```

**Auth:** Required

### Request

```json
{
  "name": "Mother",
  "phone": "+919999999999",
  "relationship": "parent"
}
```

### Response — `201 Created`

```json
{
  "success": true,
  "message": "Trusted contact added",
  "data": {
    "id": "CONTACT_ID",
    "name": "Mother"
  }
}
```

---

## 7.3 Update Trusted Contact

```http
PATCH /api/contacts/:contactId
```

**Auth:** Required

---

## 7.4 Delete Trusted Contact

```http
DELETE /api/contacts/:contactId
```

**Auth:** Required

---

## 7.5 Get Active Trusted Contacts

```http
GET /api/contacts/active
```

**Auth:** Required

### Response — `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "CONTACT_ID",
      "name": "Mother",
      "phone": "+919999999999",
      "relationship": "parent",
      "isActive": true
    }
  ]
}
```

---

# 8. Emergency / Silent SOS APIs

## 8.1 Activate SOS

```http
POST /api/emergency
```

**Auth:** Required

This is the main emergency endpoint.

### Request

```json
{
  "triggerType": "manual",
  "location": {
    "latitude": 14.6819,
    "longitude": 77.6006,
    "accuracy": 10
  }
}
```

For voice activation:

```json
{
  "triggerType": "voice",
  "location": {
    "latitude": 14.6819,
    "longitude": 77.6006,
    "accuracy": 10
  }
}
```

### Response — `201 Created`

```json
{
  "success": true,
  "message": "Emergency activated",
  "data": {
    "emergencyId": "EMERGENCY_ID",
    "status": "active",
    "riskScore": 30,
    "riskLevel": "low",
    "startedAt": "2026-08-16T10:42:00Z"
  }
}
```

### Backend actions

```text
Create EmergencyEvent
        ↓
Get / validate GPS
        ↓
Calculate initial risk
        ↓
Notify Trusted Circle
        ↓
Start Socket.IO emergency room
        ↓
Notify dashboard
        ↓
Start emergency monitoring
```

---

## 8.2 Get Active Emergency

```http
GET /api/emergency/active
```

**Auth:** Required

### Response

```json
{
  "success": true,
  "data": {
    "emergencyId": "EMERGENCY_ID",
    "status": "active",
    "riskScore": 92,
    "riskLevel": "critical",
    "currentLocation": {
      "latitude": 14.6819,
      "longitude": 77.6006
    }
  }
}
```

---

## 8.3 Get Emergency Details

```http
GET /api/emergency/:emergencyId
```

**Auth:** Required

### Response

```json
{
  "success": true,
  "data": {
    "id": "EMERGENCY_ID",
    "triggerType": "voice",
    "status": "active",
    "riskScore": 92,
    "riskLevel": "critical",
    "startedAt": "2026-08-16T10:42:00Z",
    "currentLocation": {
      "latitude": 14.6819,
      "longitude": 77.6006
    }
  }
}
```

---

## 8.4 Resolve Emergency

```http
PATCH /api/emergency/:emergencyId/resolve
```

**Auth:** Required

### Request

```json
{
  "resolution": "User confirmed safe"
}
```

### Response

```json
{
  "success": true,
  "message": "Emergency resolved",
  "data": {
    "emergencyId": "EMERGENCY_ID",
    "status": "resolved",
    "endedAt": "2026-08-16T10:55:00Z"
  }
}
```

---

## 8.5 Cancel Emergency

```http
PATCH /api/emergency/:emergencyId/cancel
```

**Auth:** Required

Used when the user intentionally cancels a false alarm.

---

## 8.6 Update Initial Emergency Location

```http
PATCH /api/emergency/:emergencyId/location
```

**Auth:** Required

Used to update the initial location of an active emergency asynchronously after immediate SOS creation.

### Request

```json
{
  "location": {
    "latitude": 14.6819,
    "longitude": 77.6006,
    "accuracy": 10
  }
}
```

### Response — `200 OK`

```json
{
  "success": true,
  "message": "Initial location updated",
  "data": {
    "emergencyId": "EMERGENCY_ID",
    "currentLocation": {
      "latitude": 14.6819,
      "longitude": 77.6006,
      "accuracy": 10
    }
  }
}
```

---

## 8.7 Dispatch Periodic Emergency Update (#1 to #20)

```http
POST /api/emergency/:emergencyId/update
```

**Auth:** Required

Dispatches periodic emergency updates at controlled 60-second intervals for active emergencies. Enforces sequence number cap (`sequenceNumber <= 20`). Sequence number 21 returns HTTP 400 Bad Request (`MAX_UPDATES_EXCEEDED`). Backend identity `${emergencyId}_seq_${sequenceNumber}` prevents duplicate dispatches.

### Request

```json
{
  "sequenceNumber": 1,
  "currentLocation": {
    "latitude": 14.6819,
    "longitude": 77.6006,
    "accuracy": 15
  },
  "evidenceId": "EVIDENCE_ID"
}
```

### Response — `200 OK`

```json
{
  "success": true,
  "message": "Emergency update #1 dispatched",
  "data": {
    "emergencyId": "EMERGENCY_ID",
    "sequenceNumber": 1,
    "status": "active",
    "currentLocation": {
      "latitude": 14.6819,
      "longitude": 77.6006,
      "accuracy": 15
    },
    "riskScore": 30,
    "riskLevel": "low",
    "notifications": {
      "mobile": {
        "channel": "PUSH",
        "status": "MOBILE_NOTIFICATION_UNAVAILABLE"
      },
      "email": {
        "channel": "EMAIL",
        "status": "EMAIL_NOTIFICATION_UNAVAILABLE"
      }
    }
  }
}
```

```json
{
  "success": true,
  "message": "Initial location updated",
  "data": {
    "emergencyId": "EMERGENCY_ID",
    "status": "active",
    "currentLocation": {
      "latitude": 14.6819,
      "longitude": 77.6006,
      "accuracy": 10
    }
  }
}
```

---

# 9. Live Tracking APIs

## 9.1 Send Location Update

```http
POST /api/tracking/location
```

**Auth:** Required

### Request

```json
{
  "emergencyId": "EMERGENCY_ID",
  "latitude": 14.6821,
  "longitude": 77.6012,
  "accuracy": 8,
  "speed": 1.4,
  "heading": 90
}
```

### Response

```json
{
  "success": true,
  "message": "Location recorded",
  "data": {
    "timestamp": "2026-08-16T10:43:15Z"
  }
}
```

The backend also emits the update through Socket.IO.

---

## 9.2 Get Emergency Location History

```http
GET /api/tracking/:emergencyId
```

**Auth:** Required

### Response

```json
{
  "success": true,
  "data": [
    {
      "latitude": 14.6819,
      "longitude": 77.6006,
      "accuracy": 10,
      "recordedAt": "2026-08-16T10:42:00Z"
    },
    {
      "latitude": 14.6821,
      "longitude": 77.6012,
      "accuracy": 8,
      "recordedAt": "2026-08-16T10:43:15Z"
    }
  ]
}
```

---

# 10. Guardian Mode APIs (COMPLETE + VERIFIED ✅)

## 10.1 Start Guardian Mode

```http
POST /api/guardian/start
```

**Auth:** Required

**Geometry validation:** If the request body includes a `selectedRoute` object, the service validates it before creating the session:
- If `selectedRoute.isEstimatedGeometry === true` → HTTP 400, `code: "UNVERIFIED_ROUTE_GEOMETRY"`
- If `selectedRoute.coordinates` is missing or has fewer than 2 points → HTTP 400, `code: "MISSING_ROUTE_GEOMETRY"`
- If no `selectedRoute` is provided, the session starts without a pre-selected route (Guardian Mode without Safe Route).

### Request

```json
{
  "destination": {
    "latitude": 14.7000,
    "longitude": 77.6200,
    "name": "Workplace"
  }
}
```

### Response

```json
{
  "success": true,
  "message": "Guardian Mode activated",
  "data": {
    "sessionId": "GUARDIAN_SESSION_ID",
    "status": "active"
  }
}
```

---

## 10.2 Stop Guardian Mode

```http
PATCH /api/guardian/:sessionId/stop
```

**Auth:** Required

---

## 10.3 Report Guardian Location

```http
POST /api/guardian/:sessionId/location
```

**Auth:** Required

### Request

```json
{
  "latitude": 14.6821,
  "longitude": 77.6012,
  "speed": 1.2,
  "accuracy": 8
}
```

The backend checks:

```text
Current Location
       ↓
Route deviation?
       ↓
Risk zone?
       ↓
Suspicious stoppage?
       ↓
Guardian Event
```

---

## 10.4 Guardian Check-In

```http
POST /api/guardian/:eventId/check-in
```

**Auth:** Required

### Request

```json
{
  "status": "safe"
}
```

Possible values:

```text
safe
get_help
```

If `get_help` is selected, the backend creates an EmergencyEvent (`triggerType: "guardian"`).

---

## 10.5 Get Active Guardian Session

```http
GET /api/guardian/active
```

**Auth:** Required

### Response

```json
{
  "success": true,
  "data": {
    "sessionId": "GUARDIAN_SESSION_ID",
    "status": "active",
    "destination": {
      "latitude": 14.7000,
      "longitude": 77.6200,
      "name": "Workplace"
    },
    "startedAt": "2026-08-21T10:00:00Z"
  }
}
```

If `get_help` is selected, the backend can start the emergency workflow.

---

# 11. AI Risk APIs

These endpoints are primarily used by the Node.js backend to communicate with the FastAPI AI service.

The mobile app should **not call the internal AI service directly**.

---

## 11.1 Calculate Risk

### Internal FastAPI endpoint

```http
POST /risk/assess
```

### Request

```json
{
  "signals": [
    {
      "type": "distress_keyword",
      "value": true
    },
    {
      "type": "high_risk_location",
      "value": true
    },
    {
      "type": "route_deviation",
      "value": false
    }
  ]
}
```

### Response

```json
{
  "score": 50,
  "level": "medium",
  "signals": [
    {
      "type": "distress_keyword",
      "points": 30
    },
    {
      "type": "high_risk_location",
      "points": 20
    }
  ]
}
```

---

## 11.2 Node.js Risk Endpoint

```http
POST /api/risk/assess
```

**Auth:** Required

The Node.js API receives client/event information, validates it, calls FastAPI internally and stores the resulting `RiskAssessment`.

---

## 11.3 Get Risk History

```http
GET /api/risk/:emergencyId
```

**Auth:** Required

### Response

```json
{
  "success": true,
  "data": [
    {
      "score": 50,
      "level": "medium",
      "signals": [
        {
          "type": "distress_keyword",
          "points": 30
        }
      ],
      "createdAt": "2026-08-16T10:42:05Z"
    }
  ]
}
```

---

# 12. Safe Route APIs

## 12.1 Calculate Safe Routes

```http
POST /api/routes/safe
```

**Auth:** Required

### Request

```json
{
  "origin": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "destination": {
    "latitude": 28.5355,
    "longitude": 77.3910
  },
  "travelMode": "driving",
  "timeContext": "night",
  "travellerProfile": "solo_woman"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "recommendedRouteId": "route-0",
    "dataClassifications": {
      "policeHospitalData": "REAL PUBLIC DATA",
      "districtCrimeContext": "OFFICIAL DATA",
      "streetLevelCrime": "ESTIMATED / DATA GAP",
      "routingGeometry": "ACCURATE OSM / MAP DATA"
    },
    "dataCoverage": {
      "hasDistrictCrimeData": true,
      "historicalCrimeContext": 16,
      "crimeContextLabel": "Low Rate District (Official NCRB)",
      "confidence": "MEDIUM",
      "confidenceReason": "Official district baseline + live verified OSM infrastructure within coverage bounds"
    },
    "routes": [
      {
        "id": "route-0",
        "title": "Direct Route",
        "type": "safest",
        "distanceKm": "23.8",
        "durationMinutes": 71,
        "riskScore": 38,
        "riskLevel": "medium",
        "confidence": "MEDIUM",
        "isEstimatedGeometry": false,
        "calculationBreakdown": {
          "historicalCrimeContext": 16,
          "recentEvidenceScore": 0,
          "highRiskZoneExposure": 30,
          "mediumRiskZoneExposure": 0,
          "isolationPenalty": 0,
          "activityPenalty": 0,
          "infrastructureScore": 0,
          "policeCredits": 8,
          "hospitalCredits": 0,
          "combinedCreditsApplied": 8,
          "floorApplied": 16,
          "finalEstimatedRisk": 38
        },
        "safetyInfrastructureMarkers": [
          {
            "type": "police",
            "name": "Police Station Connaught Place",
            "latitude": 28.6315,
            "longitude": 77.2167
          }
        ],
        "safetyAdvantages": [
          "1 verified OpenStreetMap police station(s) within 1.0 km"
        ],
        "riskConsiderations": [
          "Route intersects 1 known elevated-risk area(s)"
        ],
        "coordinates": [
          [77.2090, 28.6139],
          [77.3910, 28.5355]
        ]
      }
    ]
  }
}
```

The Safe Route engine uses **OpenRouteService (ORS) Directions API v2** (`driving-car` profile) to obtain live road-following GeoJSON LineString geometry. It combines ORS route geometry with OpenStreetMap emergency infrastructure (police & hospitals) and NCRB 2023 district violent crime baselines queried through the **PostgreSQL + PostGIS spatial evidence engine**. Scoring follows strict evidence-based confidence rules with explicit data gap disclosures.

> **Routing provider:** OpenRouteService. Mapbox is NOT the active provider.
> **Geometry type:** GeoJSON LineString (from ORS validated endpoint).
> **Provenance field:** `routeSource: "OPENROUTESERVICE_API"`, `isEstimatedGeometry: false` when live ORS geometry is returned.
> **NCRB limitation:** NCRB 2023 provides district-level historical context only. Risk scores are estimates, not real-time crime detection.
> **Guardian Mode:** Starts automatically after a verified ORS route is selected. Estimated geometry routes return `UNVERIFIED_ROUTE_GEOMETRY`.

---

# 13. Safety Zone APIs

## 13.1 Get Nearby Safety Zones

```http
GET /api/safety-zones/nearby?latitude=14.6819&longitude=77.6006
```

**Auth:** Required

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "ZONE_ID",
      "name": "High Risk Zone",
      "riskLevel": "high",
      "radiusMeters": 500
    }
  ]
}
```

Administrative creation/updating of safety zones is outside the basic user API and can be added to an authorized dashboard API later.

---

# 14. Evidence APIs

## 14.1 Upload Emergency Evidence

```http
POST /api/evidence
```

**Auth:** Required

### Content Type

```http
multipart/form-data
```

### Form fields

```text
emergencyId
type
file
capturedAt
```

### Supported MVP type

```text
audio
```

### Response

```json
{
  "success": true,
  "message": "Evidence uploaded",
  "data": {
    "evidenceId": "EVIDENCE_ID",
    "type": "audio",
    "capturedAt": "2026-08-16T10:42:10Z"
  }
}
```

The file is stored in external storage. MongoDB stores only metadata and the protected storage reference.

---

## 14.2 Get Emergency Evidence

```http
GET /api/evidence/emergency/:emergencyId
```

**Auth:** Required

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "EVIDENCE_ID",
      "type": "audio",
      "mimeType": "audio/webm",
      "durationSeconds": 12,
      "capturedAt": "2026-08-16T10:42:10Z"
    }
  ]
}
```

---

# 15. Notification APIs

## 15.1 Get Notifications

```http
GET /api/notifications
```

**Auth:** Required

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "NOTIFICATION_ID",
      "type": "emergency",
      "title": "SURAKSHA AI Emergency",
      "message": "An emergency has been activated.",
      "isRead": false,
      "createdAt": "2026-08-16T10:42:05Z"
    }
  ]
}
```

---

## 15.2 Mark Notification as Read

```http
PATCH /api/notifications/:notificationId/read
```

**Auth:** Required

---

## 15.3 Update Native SMS Delivery Status

```http
PATCH /api/notifications/:id/sms-status
```

**Auth:** Required (JWT)

### Request Body
```json
{
  "status": "SENT",
  "deliveryStatus": "UNKNOWN",
  "smsMessageId": "sim_tx_123456789",
  "errorCode": null,
  "errorMessage": null
}
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "6ab3d85f9ba72bd1fe1df933",
    "status": "SENT",
    "deliveryStatus": "UNKNOWN",
    "channel": "sms",
    "provider": "ANDROID_SIM",
    "smsMessageId": "sim_tx_123456789"
  }
}
```

---

# 16. Dashboard APIs

The PC dashboard uses the same authenticated backend API.

## 16.1 Dashboard Overview

```http
GET /api/dashboard/overview
```

**Auth:** Required  
**Role:** Dashboard operator / authorized user

### Response

```json
{
  "success": true,
  "data": {
    "activeEmergencies": 1,
    "todayEmergencies": 5,
    "highRiskEvents": 2,
    "resolvedEvents": 4
  }
}
```

---

## 16.2 Active Emergencies

```http
GET /api/dashboard/emergencies/active
```

**Auth:** Required

### Response

```json
{
  "success": true,
  "data": [
    {
      "emergencyId": "EMERGENCY_ID",
      "userId": "USER_ID",
      "riskScore": 92,
      "riskLevel": "critical",
      "status": "active",
      "currentLocation": {
        "latitude": 14.6819,
        "longitude": 77.6006
      }
    }
  ]
}
```

---

# 17. Health Check

```http
GET /api/health
```

### Response

```json
{
  "success": true,
  "service": "suraksha-api",
  "status": "healthy"
}
```

The health endpoint should not expose secrets, database credentials or internal configuration.

---

# 18. Socket.IO API

REST handles persistent operations. Socket.IO handles real-time events.

## Client connection

```text
Socket.IO → /socket.io
```

After authentication, the client joins authorized rooms.

### Example rooms

```text
user:<userId>
emergency:<emergencyId>
dashboard:alerts
```

---

## 18.1 Client → Server Events

### Join Emergency

```text
join_emergency
```

Payload:

```json
{
  "emergencyId": "EMERGENCY_ID"
}
```

### Location Update

```text
location_update
```

Payload:

```json
{
  "emergencyId": "EMERGENCY_ID",
  "latitude": 14.6821,
  "longitude": 77.6012
}
```

### Guardian Status

```text
guardian_status
```

Payload:

```json
{
  "sessionId": "SESSION_ID",
  "status": "active"
}
```

---

## 18.2 Server → Client Events

### Emergency Created

```text
emergency_created
```

```json
{
  "emergencyId": "EMERGENCY_ID",
  "riskScore": 92,
  "riskLevel": "critical"
}
```

### Location Updated

```text
location_updated
```

```json
{
  "emergencyId": "EMERGENCY_ID",
  "latitude": 14.6821,
  "longitude": 77.6012,
  "accuracy": 8,
  "speed": 1.4,
  "heading": 90,
  "timestamp": "2026-08-16T10:43:15Z",
  "timeline": [
    {
      "type": "location",
      "message": "GPS tracking started: Current location received",
      "timestamp": "2026-08-16T10:43:15Z"
    }
  ]
}
```

### Risk Updated

```text
risk_updated
```

```json
{
  "emergencyId": "EMERGENCY_ID",
  "score": 92,
  "level": "critical"
}
```

### Guardian Warning

```text
guardian_warning
```

```json
{
  "eventId": "GUARDIAN_EVENT_ID",
  "type": "suspicious_stoppage",
  "message": "Unusual activity detected",
  "requiresCheckIn": true
}
```

### Emergency Resolved

```text
emergency_resolved
```

```json
{
  "emergencyId": "EMERGENCY_ID",
  "status": "resolved"
}
```

---

# 19. Common Response Format

Successful responses use:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

Error responses use:

```json
{
  "success": false,
  "message": "Something went wrong",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

---

# 20. HTTP Status Codes

| Status | Meaning |
|---|---|
| 200 | Successful request |
| 201 | Resource created |
| 400 | Invalid request |
| 401 | Authentication required / invalid token |
| 403 | Insufficient permission |
| 404 | Resource not found |
| 409 | Resource conflict |
| 413 | Evidence/file too large |
| 422 | Validation error |
| 429 | Too many requests |
| 500 | Internal server error |
| 503 | Service temporarily unavailable |

---

# 21. Important Error Codes

```text
AUTH_REQUIRED
INVALID_TOKEN
INVALID_CREDENTIALS
USER_NOT_FOUND
CONTACT_NOT_FOUND
EMERGENCY_NOT_FOUND
EMERGENCY_ALREADY_ACTIVE
EMERGENCY_NOT_ACTIVE
INVALID_LOCATION
RISK_ASSESSMENT_FAILED
GUARDIAN_SESSION_NOT_FOUND
UNVERIFIED_ROUTE_GEOMETRY    # Guardian start: selectedRoute.isEstimatedGeometry === true
MISSING_ROUTE_GEOMETRY       # Guardian start: coordinates missing or fewer than 2 points
SPATIAL_ENGINE_UNAVAILABLE   # PostGIS is unreachable; spatial evidence cannot be queried
EVIDENCE_UNAVAILABLE         # PostGIS is reachable but spatial evidence query returned no usable records
EVIDENCE_NOT_ALLOWED
EVIDENCE_TOO_LARGE
NOTIFICATION_FAILED
AI_SERVICE_UNAVAILABLE
RATE_LIMIT_EXCEEDED
```

---

# 22. Emergency API Flow

The main emergency workflow combines several APIs and real-time events.

```text
                📱 Mobile
                   │
             POST /emergency
                   │
                   ▼
          Node.js Emergency API
                   │
          ┌────────┼─────────┐
          ▼        ▼         ▼
       MongoDB   FastAPI   FCM
          │        │         │
          │     Risk Score   │
          │        │         │
          └────────┼─────────┘
                   ▼
               Socket.IO
              ↙          ↘
       PC Dashboard    Trusted Circle
              │
              ▼
          Live GPS
              │
       POST /tracking/location
              │
              ▼
        Risk Reassessment
              │
              ▼
         Emergency Update
```

---

# 23. Guardian Mode API Flow

```text
POST /guardian/start
          ↓
Guardian Session
          ↓
Location updates
          ↓
POST /guardian/:id/location
          ↓
Anomaly Detection
          ↓
┌─────────┴─────────┐
│                   │
Normal          Anomaly
│                   │
Continue        Guardian Warning
                    ↓
                Check-in
                ↙      ↘
             Safe     Get Help
                        ↓
                   POST /emergency
```

---

# 24. API Security Rules

Because SURAKSHA AI handles sensitive domestic-violence, location and evidence data:

- All protected APIs require authentication.
- Authorization must be checked server-side.
- Users must only access their own emergencies, locations, contacts and evidence.
- Dashboard endpoints require the appropriate role/permission.
- Do not accept arbitrary `userId` values from clients for ownership decisions.
- Validate latitude and longitude.
- Validate uploaded evidence type and size.
- Rate-limit login, SOS and sensitive endpoints.
- Use HTTPS in production.
- Keep API keys and JWT secrets in environment variables.
- Do not log passwords, tokens or raw evidence.
- Do not expose public live-location endpoints.
- Keep the internal FastAPI AI service inaccessible to public clients.
- Return generic authentication errors where appropriate to avoid account enumeration.

---

# 25. API-to-Database Mapping

| API Module | Main Collection |
|---|---|
| Auth | `users` |
| Users | `users` |
| Trusted Circle | `trustedContacts` |
| Emergency | `emergencyEvents` |
| Tracking | `locationEvents` |
| Risk | `riskAssessments` |
| Guardian | `guardianEvents` |
| Evidence | `evidence` |
| Notifications | `notifications` |
| Safe Route | `safetyZones` |
| Dashboard | `emergencyEvents`, `riskAssessments`, `locationEvents` |

---

# 26. MVP API Priority

### Priority 1 — Required

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/contacts
POST   /api/contacts
PATCH  /api/contacts/:contactId
DELETE /api/contacts/:contactId

POST   /api/emergency
GET    /api/emergency/active
GET    /api/emergency/:emergencyId
PATCH  /api/emergency/:emergencyId/resolve

POST   /api/tracking/location
GET    /api/tracking/:emergencyId

GET    /api/dashboard/overview
GET    /api/dashboard/emergencies/active

GET    /api/health
```

### Priority 2

```text
POST   /api/risk/assess
GET    /api/risk/:emergencyId

POST   /api/guardian/start
GET    /api/guardian/active
PATCH  /api/guardian/:sessionId/stop
POST   /api/guardian/:sessionId/location
POST   /api/guardian/:eventId/check-in

POST   /api/routes/safe

GET    /api/safety-zones/nearby
```

### Priority 3

```text
POST   /api/evidence
GET    /api/evidence/emergency/:emergencyId

GET    /api/notifications
PATCH  /api/notifications/:notificationId/read
```

---

# 27. Future API Scope

These APIs are intentionally **not part of the MVP**:

```text
Police / emergency-services integration
NGO / support-organization APIs
Wearable / smartwatch APIs
Advanced facial-recognition APIs
Large-scale crime-data APIs
Community/social APIs
Continuous video-processing APIs
Predictive ML APIs
Provider-independent SMS / WhatsApp / voice-call escalation
```

They can be introduced after the core emergency workflow has been validated.

---

# 28. Final API Architecture

```text
                    SURAKSHA AI API

             ┌──────────────────────┐
             │  Mobile / Next.js    │
             └──────────┬───────────┘
                        │
                REST + WebSocket
                        │
              ┌─────────▼─────────┐
              │ Node.js + Express  │
              │     REST API       │
              └─────────┬─────────┘
                        │
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
    MongoDB          Socket.IO       FastAPI
    Database         Real-time       AI Engine
       │                │                │
       ▼                ▼                ▼
 Emergency data     Live alerts      Risk score
 Locations          Live GPS         Anomaly detection
 Evidence           Dashboard        Risk assessment
 Contacts
```

### Core API principle

> **REST APIs handle authentication, persistent data and emergency actions; Socket.IO handles real-time safety events and GPS updates; FastAPI handles the AI risk layer internally.**

This API design is aligned with the SURAKSHA AI PRD and Architecture: **Prevent → Detect → Respond**, with Silent SOS, Live GPS, Trusted Circle, AI Risk Score, Guardian Mode, Safe Route, Emergency Evidence and the real-time PC dashboard as the MVP core.

---

## 29. Phase 9 AI Assistant & Legal Intelligence RAG APIs

### 29.1 Safety Assistant Chat Endpoint

```http
POST /api/assistant/chat
```

**Auth:** Optional (Uses Bearer Token if logged in)

#### Request

```json
{
  "message": "What is sexual harassment?"
}
```

#### Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "messageId": "asst_1789884500000",
    "intent": "LEGAL",
    "questionType": "DEFINITION",
    "legalExplanation": "Sexual harassment means unwanted sexual conduct, unwelcome physical contact, sexually colored remarks, demands for sexual favors...",
    "structuredLegal": {
      "actName": "Bharatiya Nyaya Sanhita, 2023 (BNS) & POSH Framework",
      "sectionNumber": "Sexual Harassment Definition",
      "simpleAnswer": "Sexual harassment means unwanted sexual conduct, unwelcome physical contact, sexually colored remarks...",
      "whatItMeans": "Under Indian criminal law (including BNS Section 75/78) and civil/workplace safety legislation (POSH Act, 2013)...",
      "practicalTerms": "For instance, if an individual is subjected to inappropriate touching, persistent unwelcome messages...",
      "importantConditions": "1. Intent or effect of creating an intimidating, hostile, or offensive environment.",
      "whatYouCanDo": [
        "Lodge a police complaint under BNS Section 75/78.",
        "File a complaint with the Internal Complaints Committee (ICC)."
      ]
    },
    "legalRagResult": {
      "status": "SUCCESS",
      "category": "sexual_violence",
      "datasetSource": "vanga/indian-high-court-judgments",
      "court": "High Court of Andhra Pradesh",
      "courtCode": "28~2",
      "years": [2025, 2026],
      "judgments": [
        {
          "id": "JUDGMENT_ID",
          "title": "Dr. A. Sunitha vs State of Andhra Pradesh & Anr.",
          "cnr": "APHC010065432025",
          "caseIdentifier": "W.P. No. 6543/2025",
          "court": "High Court of Andhra Pradesh",
          "decisionYear": 2025,
          "decisionDate": "2025-07-11",
          "judge": "Hon’ble High Court of Andhra Pradesh",
          "summary": "The High Court held that workplace and public sexual harassment complaints require strict adherence...",
          "keyLegalPoints": "Sexual harassment compromises bodily autonomy and dignity under Article 21...",
          "provenanceTag": "[OFFICIAL / COURT SOURCE]",
          "sourceRepository": "vanga/indian-high-court-judgments",
          "repositoryUrl": "https://github.com/vanga/indian-high-court-judgments",
          "sourceUrl": "https://github.com/vanga/indian-high-court-judgments/raw/main/28~2/2025/APHC010065432025.pdf"
        }
      ]
    },
    "emergencyDetected": false,
    "disclaimer": "This provides legal information based on retrieved court decisions and is not a substitute for advice from a qualified lawyer."
  }
}
```

#### No Relevant Case Found Response

If no relevant case exists in the configured 2025–2026 AP High Court corpus for the specific question:

```json
{
  "legalRagResult": {
    "status": "NO_RELEVANT_CASE_FOUND",
    "message": "I couldn't find a sufficiently relevant Andhra Pradesh High Court judgment in the configured 2025–2026 corpus for this question.",
    "judgments": []
  }
}
```

### 29.2 Case Explorer Taxonomy Endpoint

```http
GET /api/assistant/case-explorer/taxonomy
```

**Auth:** Optional

#### Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "crime_against_women",
        "title": "Crime Against Women & Offenses",
        "acts": [
          {
            "act": "Bharatiya Nyaya Sanhita, 2023 (BNS)",
            "sections": [
              { "section": "Section 74", "title": "Assault or criminal force to woman with intent to outrage her modesty" },
              { "section": "Section 75", "title": "Sexual harassment" },
              { "section": "Section 85", "title": "Cruelty by husband or relatives of husband" }
            ]
          }
        ]
      },
      {
        "id": "police_procedure",
        "title": "Police Procedure & Mandatory FIR",
        "acts": [
          {
            "act": "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)",
            "sections": [
              { "section": "Section 173", "title": "Information in cognizable cases (Mandatory FIR)" }
            ]
          }
        ]
      }
    ]
  }
}
```

### 29.3 Case Explorer Query Endpoint

```http
GET /api/assistant/case-explorer/cases?category=police_procedure&act=Bharatiya%20Nagarik%20Suraksha%20Sanhita%2C%202023%20(BNSS)&section=Section%20173
```

**Auth:** Optional

#### Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "category": "police_procedure",
    "act": "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)",
    "section": "Section 173",
    "totalCount": 1,
    "cases": [
      {
        "id": "6789abc...",
        "title": "P. Vasundhara vs State of Andhra Pradesh & Ors.",
        "cnr": "APHC010012342026",
        "caseIdentifier": "W.P. No. 1234/2026",
        "court": "High Court of Andhra Pradesh",
        "decisionYear": 2026,
        "decisionDate": "2026-02-14",
        "judge": "Hon'ble High Court of Andhra Pradesh",
        "act": "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)",
        "sections": ["Section 173"],
        "background": "Petition challenging failure of station house officer to register FIR upon receiving information...",
        "issues": ["Whether preliminary inquiry is mandatory before registering FIR under BNSS Section 173..."],
        "decision": "The High Court directed immediate registration of FIR...",
        "ratio": "When information discloses commission of a cognizable offense, registration of FIR under Section 173 is mandatory...",
        "provenance": "DATASET_COPY",
        "provenanceLabel": "[DATASET SOURCE]",
        "repositoryUrl": "https://github.com/vanga/indian-high-court-judgments",
        "sourceUrl": null
      }
    ]
  }
}
```

