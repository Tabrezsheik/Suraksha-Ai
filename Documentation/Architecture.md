# Architecture.md — SURAKSHA AI

## 1. High-Level Architecture

SURAKSHA AI uses a **decoupled multi-client architecture** with one main Node.js/Express backend, MongoDB for application data, Socket.IO for real-time communication, and a lightweight Python/FastAPI AI service.

The architecture is intentionally simple for the MVP: the backend remains a modular monolith rather than using microservices, while AI processing is separated into its own service because Python is better suited to the AI/risk-analysis layer.

```text
                         ┌─────────────────────────────┐
                         │        SURAKSHA AI           │
                         │  Prevent → Detect → Respond  │
                         └──────────────┬──────────────┘
                                        │
                    ┌───────────────────┴──────────────────┐
                    │                                      │
            ┌───────▼────────┐                    ┌────────▼────────┐
            │  Mobile App    │                    │  PC/Web App     │
            │ React Native   │                    │ Next.js         │
            │ + Expo         │                    │ + Tailwind CSS  │
            └───────┬────────┘                    └────────┬────────┘
                    │                                      │
                    └──────────────┬───────────────────────┘
                                   │ HTTPS / REST
                                   │ WebSocket
                         ┌─────────▼──────────┐
                         │ Node.js + Express  │
                         │   Backend API      │
                         └───────┬─────┬──────┘
                                 │     │
                    ┌────────────┘     └────────────────┐
                    ▼                                   ▼
             ┌──────────────┐                   ┌───────────────┐
             │   MongoDB    │                   │   Socket.IO   │
             │ Application  │                   │ Real-time     │
             │ Data         │                   │ Events        │
             └──────────────┘                   └───────┬───────┘
                                                        │
                                                        ▼
                                             Live alerts / GPS /
                                             dashboard updates

                         ┌──────────────────────────┐
                         │ Python + FastAPI         │
                         │ AI Safety Engine         │
                         └────────────┬─────────────┘
                                      │
                              Risk / anomaly results
                                      │
                                      ▼
                              Node.js Backend
```

---

## 2. Architecture Principles

- **Simplicity over premature complexity** — use a modular monolith for the MVP instead of multiple backend microservices.
- **Thin routes, service-based logic** — controllers handle HTTP concerns while risk scoring, emergency orchestration, notifications and Guardian Mode logic live in services.
- **Real-time where it matters** — Socket.IO is used for active emergencies, live location and dashboard updates.
- **AI as an assistive layer** — the MVP uses a transparent rule-based risk engine rather than depending on a black-box predictive model.
- **Fail safely** — if the AI service is unavailable, manual SOS, GPS and trusted-contact alerting must still work.
- **Minimal evidence collection** — capture audio, location and timeline metadata; avoid continuous video processing in the MVP.
- **Least privilege** — sensitive location, emergency and evidence data should only be accessible to authorized users.
- **Build the end-to-end emergency flow first** — correctness and reliability are more important than premature optimization.

---

## 3. Client Applications

SURAKSHA AI has two primary client applications:

1. **Mobile App** — used by the person being protected.
2. **PC/Web Safety Dashboard** — used to monitor active emergencies and safety events.

The marketing website can use the same Next.js application as the web dashboard while keeping public pages and authenticated dashboard routes separated.

---

## 4. Mobile App — React Native + Expo

The mobile app is the primary safety interface.

```text
mobile/
├── app/
│   ├── (auth)/
│   │   ├── login
│   │   └── signup
│   ├── (tabs)/
│   │   ├── home
│   │   ├── guardian
│   │   ├── alerts
│   │   └── profile
│   ├── emergency/
│   ├── tracking/
│   ├── trusted-circle/
│   ├── safe-route/
│   └── evidence/
│
├── components/
│   ├── sos/
│   ├── guardian/
│   ├── maps/
│   ├── contacts/
│   ├── alerts/
│   └── common/
│
├── services/
│   ├── api/
│   ├── locationService
│   ├── notificationService
│   └── socketService
│
├── context/
│   ├── AuthContext
│   ├── EmergencyContext
│   └── SocketContext
│
├── hooks/
├── utils/
└── assets/
```

### Mobile responsibilities

- Manual Silent SOS
- Voice trigger
- Live GPS collection
- Guardian Mode
- Safe Route
- Trusted Circle
- Emergency evidence capture
- Push notification handling
- Emergency status display
- Real-time Socket.IO connection

The mobile client should remain simple during an emergency. Emergency actions must not be hidden behind deep navigation.

---

## 5. Web / PC Dashboard — Next.js

The PC dashboard is the **Safety Command Center**.

```text
web/
├── app/
│   ├── page.js                       # Public Landing / Hero Page
│   ├── login/
│   │   └── page.js                   # Public Login Page
│   ├── signup/
│   │   └── page.js                   # Public Signup Page
│   └── dashboard/
│       ├── page.js                   # Authenticated Application Dashboard
│       ├── profile/
│       │   └── page.js               # Authenticated User Profile
│       └── trusted-circle/
│           └── page.js               # Authenticated Trusted Circle
│
├── components/
│   ├── Navbar.js                     # Auth-aware dynamic navigation header
│   ├── ShieldLogo.js                 # Official 16-bar waveform & vector shield
│   └── SplashScreen.js               # Intro animation & single-play lifecycle
```

### Navigation & Routing Rules

- **Authenticated Home:** `/dashboard` is treated as the user's primary home once logged in.
- **Subpage Back Navigation:** Authenticated subpages (`/dashboard/trusted-circle`, `/dashboard/profile`) feature "Back to Home" controls that route directly to `/dashboard`.
- **Navbar Brand Routing:** `Navbar.js` brand logo dynamically links to `/dashboard` for authenticated users and `/` for unauthenticated visitors.
- **Public Landing Page Protection:** Unauthenticated visitors accessing `/` see the public marketing hero page. Authenticated users navigating within the dashboard area remain inside `/dashboard`.
- **Root Layout & Startup Splash Lifecycle:** Root layout (`RootLayout` in `layout.js`) enforces explicit `color-scheme: light` and `#F8FAFC` background on `html` and `body` elements on frame 0 to prevent dark-mode unstyled background flashes. `SplashScreen.js` coordinates with `page.js` to play the startup logo animation on fresh session visits, maintaining 100% hydration tree matching between server and client while preserving smooth transition into the landing page.

### Dashboard displays

- Active emergency count
- User identity
- Live location
- AI risk score
- Emergency timeline
- Trusted Circle status
- Evidence log
- Guardian Mode events
- Safety analytics

The dashboard receives live updates through Socket.IO without requiring manual refresh.

---

## 6. Backend — Node.js + Express

The backend is a **modular monolith**.

```text
server/
├── config/
│   ├── database.js            # MongoDB Mongoose connection (Application State)
│   ├── postgres.js            # PostgreSQL / PostGIS pool (Phase 8 Spatial Evidence)
│   ├── env.js
│   └── mapbox.js
│
├── db/
│   └── schema.sql             # PostgreSQL / PostGIS spatial_evidence table & GiST indexes
│
├── models/
│   ├── User.js
│   ├── TrustedContact.js
│   ├── EmergencyEvent.js
│   ├── LocationEvent.js
│   ├── RiskAssessment.js
│   ├── GuardianEvent.js
│   ├── Evidence.js
│   ├── Notification.js
│   └── SafetyZone.js
│
├── routes/
│   ├── auth.routes.js
│   ├── users.routes.js
│   ├── emergency.routes.js
│   ├── tracking.routes.js
│   ├── guardian.routes.js
│   ├── risk.routes.js
│   ├── routes.routes.js
│   ├── contacts.routes.js
│   ├── evidence.routes.js
│   └── notifications.routes.js
│
├── controllers/
│   ├── auth.controller.js
│   ├── emergency.controller.js
│   ├── tracking.controller.js
│   ├── guardian.controller.js
│   ├── risk.controller.js
│   ├── contacts.controller.js
│   └── evidence.controller.js
│
├── services/
│   ├── emergencyService.js
│   ├── riskService.js
│   ├── guardianService.js
│   ├── locationService.js
│   ├── notificationService.js
│   ├── evidenceService.js
│   ├── aiService.js
│   ├── routeService.js        # Phase 8 — Safe Route scoring & data orchestration
│   ├── spatialEvidenceService.js # Phase 8 — PostgreSQL/PostGIS spatial query engine
│   ├── osmService.js          # Phase 8 — OpenStreetMap / Overpass API integration
│   └── ncrbService.js         # Phase 8 — NCRB 2023 district crime baseline lookup
│
├── middleware/
│   ├── authMiddleware.js
│   ├── validateRequest.js
│   ├── errorHandler.js
│   └── rateLimiter.js
│
├── sockets/
│   ├── socketHandler.js
│   ├── emergencySocket.js
│   └── trackingSocket.js
│
└── server.js
```

### Layering rule

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Model / External Service
```

Routes should remain thin. Emergency orchestration, risk scoring, Guardian Mode and notification logic belong in service modules so they can be tested independently of HTTP.

---

## 7. Database — MongoDB

MongoDB stores application and emergency metadata.

### Main collections

```text
users
trustedContacts
emergencyEvents
locationEvents
riskAssessments
evidence
notifications
safetyZones
```

### Emergency Event

The **EmergencyEvent** is the central object connecting the response workflow.

```text
EmergencyEvent
├── eventId
├── userId
├── triggerType
│   ├── manual
│   └── voice
├── startedAt
├── status
├── riskScore
├── riskLevel
├── currentLocation
├── trustedContactsNotified
├── evidenceIds
└── timeline
```

This allows GPS, alerts, evidence, risk assessments and the dashboard to reference the same emergency.

---

## 8. AI Safety Engine — Python + FastAPI

The AI service is intentionally small for the MVP.

```text
ai-service/
├── app/
│   ├── main.py
│   ├── routes/
│   │   ├── risk.py
│   │   ├── distress.py
│   │   └── anomaly.py
│   │
│   ├── services/
│   │   ├── risk_engine.py
│   │   ├── distress_service.py
│   │   └── anomaly_service.py
│   │
│   ├── models/
│   └── utils/
└── requirements.txt
```

### MVP AI flow

```text
Signal
  ↓
AI / Rule Analysis
  ↓
Risk Points
  ↓
Risk Score
  ↓
Risk Level
  ↓
Node.js Backend
```

### Example

```text
Distress keyword       +30
Voice stress           +25
High-risk location     +20
Route deviation        +15
Suspicious stoppage    +10
                         ────
Maximum                 100
```

Risk bands:

```text
0–30     LOW
31–60    MEDIUM
61–80    HIGH
81–100   CRITICAL
```

The AI engine is an **assistive risk layer**, not the sole authority for emergency response.

---

## 9. Real-Time Layer — Socket.IO

Socket.IO runs on the Node.js/Express server.

It is responsible for:

- Emergency creation events
- Live GPS updates
- Risk score updates
- Guardian Mode warnings
- Trusted Circle notification status
- Dashboard synchronization

### Example rooms

```text
emergency:<emergencyId>
user:<userId>
dashboard:alerts
```

A user's live emergency should be isolated to the relevant authorized clients rather than broadcasting sensitive information globally.

---

## 10. Key Flow — Silent SOS

```text
User
 ↓
Manual SOS / Voice Trigger
 ↓
Mobile App
 ↓
POST /emergency
 ↓
Emergency Controller
 ↓
Emergency Service
 ↓
Create EmergencyEvent
 ↓
Get Current GPS
 ↓
Calculate Initial Risk
 ↓
Notify Trusted Circle
 ↓
Emit Socket.IO Event
 ├───────────────┐
 ↓               ↓
PC Dashboard     Trusted Circle
 ↓
Live Emergency View
 ↓
Continuous Location / Risk Updates
```

---

## 11. Key Flow — Guardian Mode

```text
Guardian Mode ON
       ↓
Collect location updates
       ↓
Compare current route
       ↓
Check safety-zone risk
       ↓
Detect unusual stoppage / deviation
       ↓
Risk Engine
       ↓
Normal? ───────────────→ Continue monitoring
       │
       ↓
Potential anomaly
       ↓
Check-in prompt
       │
   ┌───┴────────┐
   ↓            ↓
I'm Safe     Get Help
   ↓            ↓
Continue      SOS Flow
```

Guardian Mode should not automatically assume that every deviation is an emergency. It first provides a user confirmation step.

---

## 12. Key Flow — AI Safe Route (Phase 8 — COMPLETE + REAL-DATA VALIDATED)

```text
User selects origin + destination
        ↓
OpenRouteService Directions API v2 (driving-car)
→ Live GeoJSON LineString geometry
→ Up to 3 genuine road-following route alternatives
        ↓
Route Safety Analysis
 (NCRB 2023 district baseline + OSM infrastructure + PostGIS spatial evidence)
        ↓
Rule-based route risk scoring
┌────────────────────────────────────┐
│ Route 1 — Via Anantapur Main Road  │
│ Route 2 — Via Court Road           │
│ Route 3 — Via raju road            │
└────────────────────────────────────┘
        ↓
User selects route
        ↓
Geometry safety check
  isEstimatedGeometry === true ──→ Guardian Mode BLOCKED
  (UI: button disabled + warning message shown)
  (Server: HTTP 400 UNVERIFIED_ROUTE_GEOMETRY)
        │
  verified ORS geometry (isEstimatedGeometry === false,
  coordinates.length ≥ 2)
        ↓
Guardian Mode automatically starts
(integrated into Safe Route page — no separate Guardian page)
```

The validated implementation uses OpenRouteService for genuine road-following routing and PostGIS for spatial safety evidence. Mapbox is not active in the validated Phase 8 implementation. Risk scores are estimates; no safety guarantees are claimed.


---

## 13. Key Flow — Emergency Evidence

```text
SOS Activated
     ↓
Create EmergencyEvent
     ↓
Capture:
 ├── GPS location
 ├── Audio
 └── Timestamp / timeline
     ↓
Evidence Storage
     ↓
Evidence metadata → MongoDB
     ↓
Evidence log → Dashboard
```

No continuous video processing is required for the MVP.

---

## 14. Notification Architecture

The primary emergency SMS transport uses direct Android SIM cellular messaging via `android.telephony.SmsManager` and `android.permission.SEND_SMS` (no third-party gateways like MSG91 or Twilio).

```text
SURAKSHA AI Mobile
      ↓
EmergencyEvent (ACTIVE)
      ↓
Notification Orchestrator
      ↓
Trusted Circle (Max 5 Contacts)
      ↓
Native Android SIM SMS Module (SurakshaSmsModule)
      ↓
Android SmsManager
      ↓
Physical Device SIM
      ↓
Cellular Mobile Network
      ↓
Trusted Circle Recipient
```

### Direct SIM SMS Transport Highlights:
- **Dev/Test Configuration**: `SURAKSHA_SMS_TRANSPORT=ANDROID_SIM` and `SURAKSHA_TEST_SIM_NUMBER=+919392075827` (stored in configuration, not hardcoded into Java/Kotlin transport logic).
- **Runtime SIM Verification**: On-device verification of active subscription via `SubscriptionManager`.
- **Truthful Delivery State Machine**:
  - Android accepted SMS request → `SENT`
  - Confirmed recipient network delivery → `DELIVERED`
  - Unconfirmed / delivery confirmation unavailable → `SENT` with `deliveryStatus: UNKNOWN`
  - Android native rejection / error → `FAILED`
  - SMS permission or physical SIM unavailable → `UNAVAILABLE`
- **Correlation ID**: `smsMessageId` represents an internal Android SMS correlation/transaction ID.
- **Google Play Compliance**: `SEND_SMS` is subject to Google Play's restricted-permission policy and review. The current policy lists physical safety/emergency alerts as an eligible exception, but approval is not automatic.

---

## 15. External Services

| Service | Purpose |
|---|---|
| OpenRouteService (ORS) | Live road-following route geometry (active validated provider) |
| OpenStreetMap (via Leaflet) | Roadmap raster tiles for Safe Route map & Real-Time Emergency Location map |
| Esri World Imagery | Satellite and Hybrid map tiles for Safe Route map & Real-Time Emergency Location map |
| Firebase Cloud Messaging | Push notifications |
| Cloudinary / S3 / Supabase Storage | Audio/evidence storage |
| MongoDB Atlas | Application/auth/state database hosting |
| PostgreSQL 17.11 + PostGIS 3.6.2 | Spatial evidence storage and querying (Phase 8) |
| Vercel | Next.js deployment |
| Render / Railway / similar | Node.js and FastAPI deployment |

> **Note:** Mapbox is listed in earlier design documents as a planned provider but is NOT active in the validated Phase 8 implementation. OpenRouteService is the confirmed routing provider. Leaflet with OpenStreetMap and Esri tiles powers both Safe Route (`SafeRouteMap.js`) and Emergency Location Tracking (`LiveMap.js`).

Heavy file storage is kept outside MongoDB. MongoDB stores metadata and references.

---

## 16. Authentication & Authorization

Use JWT-based authentication.

```text
Login
 ↓
Express Auth API
 ↓
Verify credentials
 ↓
Issue JWT
 ↓
Client
 ↓
Authorization: Bearer <token>
 ↓
Auth Middleware
 ↓
Protected Resource
```

Roles can remain simple for MVP:

```text
USER
DASHBOARD_OPERATOR
```

Every protected emergency/location request must derive the user identity from the verified token rather than trusting a client-supplied user ID.

---

## 17. Security & Privacy

SURAKSHA AI handles sensitive location, emergency and evidence information, so security is a core architectural requirement.

- Passwords must be hashed with bcrypt or an equivalent password-hashing mechanism.
- JWT secrets and API keys must be stored in environment variables.
- Never commit secrets to Git.
- Validate all user input.
- Restrict CORS to trusted frontend origins.
- Rate-limit authentication and sensitive emergency endpoints.
- Validate evidence file type and size before storage.
- Protect emergency/location APIs with authentication and authorization.
- Do not expose live location through public URLs.
- Restrict evidence access to authorized users.
- Use HTTPS in production.
- Minimize stored sensitive data and define retention/deletion rules.
- Log security-relevant events without logging passwords, tokens or unnecessary sensitive content.

---

## 18. Scalability Notes

The MVP does not require microservices.

The architecture can scale later because:

- REST APIs are largely stateless.
- Socket.IO rooms limit real-time event fan-out.
- MongoDB can add indexes for user and emergency queries.
- Evidence is stored externally rather than on the API server.
- AI processing is isolated behind FastAPI.
- Redis can be added later for caching, rate limiting and distributed real-time coordination.
- Additional workers can process non-critical background tasks later.

For the MVP, reliability of the emergency flow is more important than premature horizontal scaling.

---

## 19. Deployment Topology

```text
                    Internet
                       │
             ┌─────────┴─────────┐
             │                   │
          Vercel              Mobile App
             │
        Next.js Web
             │
             │ HTTPS / WebSocket
             ▼
      Node.js + Express
        + Socket.IO
             │
      ┌──────┼───────────┐
      ▼      ▼           ▼
 MongoDB  FastAPI AI   Storage
 Atlas    Service      Cloudinary/S3
             │
             ▼
          AI Engine

External:
Mapbox → maps/routes
FCM → push notifications
```

### Suggested deployment

- **Next.js:** Vercel
- **Node.js + Socket.IO:** Render / Railway
- **FastAPI:** Render / Railway
- **MongoDB:** MongoDB Atlas
- **Evidence:** Cloudinary / S3 / Supabase Storage
- **Mobile:** Expo/EAS for builds

---

## 20. MVP Build Order

Build the architecture in this order:

### Phase 1 — Foundation

```text
Next.js
React Native + Expo
Node.js + Express
MongoDB
JWT Authentication
```

### Phase 2 — Emergency Core

```text
Silent SOS
EmergencyEvent
Trusted Circle
Live GPS
Socket.IO
PC Dashboard
```

### Phase 3 — Intelligence

```text
Python + FastAPI
Rule-based Risk Engine
Guardian Mode
Safe Route
```

### Phase 4 — Evidence & Notifications

```text
Audio Evidence
Cloud Storage
Firebase FCM
Emergency Timeline
```

### Phase 5 — Hardening

```text
Validation
Rate Limiting
Authorization
Privacy controls
Error handling
Testing
Deployment
```

---

## 21. Architecture Summary

```text
                    🛡️ SURAKSHA AI

             PREVENT → DETECT → RESPOND

                        │
        ┌───────────────┴────────────────┐
        │                                │
   📱 React Native                  💻 Next.js
        │                                │
        └───────────────┬────────────────┘
                        │
                Node.js + Express
                        │
          ┌─────────────┼─────────────┐
          │             │             │
       MongoDB       Socket.IO     FastAPI
          │             │             │
          │        Real-time        AI
          │          events       Risk Engine
          │             │             │
          └─────────────┼─────────────┘
                        │
             Maps / Notifications /
                 Evidence Storage
```

**Core architectural idea:**

> **The Node.js backend is the central coordinator. MongoDB stores application and emergency state, Socket.IO distributes real-time safety events, and the Python/FastAPI service provides the AI risk layer.**

This keeps SURAKSHA AI **simple enough for the MVP, modular enough for development, and extensible enough for future AI, emergency-service and wearable integrations.**

---

## 22. Phase 7 Guardian Mode & Mini-Map Architecture

```text
GPS Location Source (POST /api/guardian/:sessionId/location)
       ↓
Guardian Engine (guardianService.js)
       ├── Save LocationEvent (source: "guardian")
       ├── Check 500m Route Deviation & 5-min Suspicious Stoppage
       └── Check SafetyZone Proximity (high_risk_location)
       ↓
Guardian Session State (GuardianSession)
       ↓
Socket.IO Broadcast (`guardian_warning` & `guardian_status`)
       ↓
Frontend Visual Layer (GuardianModeWidget & GuardianMiniMap)
       ├── 📍 Current Location Marker (YOU)
       ├── 🏁 Destination Marker (Target)
       ├── 🛣️ Journey Trajectory Vector
       └── ⚠️ Route Deviation Alert State (Amber Stroke & Badge)
```

**Architecture Principles:**
1. **Source of Truth:** The Node.js backend (`guardianService.js`) remains the sole authority for anomaly detection (`route_deviation`, `suspicious_stoppage`, `high_risk_location`).
2. **Visualization Layer:** `GuardianMiniMap.js` is a visual trajectory renderer. It displays spatial relationship between current location and destination.
3. **No Safe Route Computation:** Phase 7 mini-map does NOT calculate safe routes or Mapbox routing. Safe Route choice algorithms belong strictly to Phase 8.

---

## 23. Unified Real Map Foundation Architecture (`SafeRouteMap.js` & `LiveMap.js`)

Both the **Safe Route Map** (`SafeRouteMap.js`) and the **Real-Time Emergency Location Map** (`LiveMap.js`) share a single, unified map foundation based on dynamic Leaflet rendering:

```text
Map Provider Foundation (Leaflet)
 ├── OpenStreetMap Raster Tiles (Roadmap view)
 ├── Esri World Imagery (Satellite view)
 └── Esri World Boundaries & Places Overlay (Hybrid view)
       │
       ├── SafeRouteMap.js
       │    ├── OpenRouteService GeoJSON geometry
       │    ├── Risk segment color casing (Green / Amber / Red)
       │    └── Infrastructure markers (Police / Hospital / Safety Zones)
       │
       └── LiveMap.js (Real-Time Emergency Location Map)
            ├── Real-time GPS coordinate pan/center
            ├── SURAKSHA AI Red Emergency Pulsing Marker (setZIndexOffset 1000)
            ├── Real GPS Accuracy Circle (L.circle radius = accuracy)
            ├── Movement History Polyline Trail (L.polyline)
            └── Map type switcher (Roadmap / Satellite / Hybrid) & Zoom/Re-center controls
```

**Key Architectural Guarantees:**
- **Zero Synthetic Backgrounds:** Neither map component uses fake grid/SVG dot-matrix canvas drawings.
- **SSR Safety:** Dynamic `import('leaflet')` pattern inside React `useEffect` ensures zero server-side rendering DOM errors.
- **Marker Z-Index Offset:** `L.Marker` instances use `.setZIndexOffset(1000)` to ensure emergency markers float above vector paths and tile layers without calling invalid `.bringToFront()` methods.
- **Data Integrity:** Real GPS coordinates, accuracy data, and tracking events pass directly from backend Socket.IO subscriptions without synthetic transformation.

---

## 24. Phase 9 Legal AI Safety Assistant Architecture

```text
USER QUESTION
      ↓
CONVERSATIONAL PRIORITY & INTENT CLASSIFICATION
      1. EMERGENCY (Voice SOS / "Help me" -> Countdown)
      2. SAFETY / PERSONAL SAFETY GUIDANCE (5-Step Protocol, 0 cases dumped)
      3. DIRECT ANSWER (Definitions, Causes, Statutory Explanations)
      4. LEGAL INFORMATION IF NEEDED
      5. CASE RETRIEVAL ONLY WHEN RELEVANT / REQUESTED
      6. CASE EXPLORER (Category → Act → Section → Related Cases → Study Case)
      ↓
QUESTION UNDERSTANDING (assistantService.js: understandQuestion)
      ↓
ANSWER STRATEGY & SHORT-TERM CONTEXT (sessionContext for follow-ups like "At work")
      ↓
RELEVANT RAG SEARCH / TAXONOMY EXPLORER (legalRagService.js: AP High Court 2025–2026)
      ↓
VERIFIED METADATA & RELEVANCE VALIDATION (Exact Act/Section matching, zero fabricated mappings)
      ↓
GROUNDED ANSWER & CASE PRESERVATION
      ↓
PROVENANCE HANDLING (OFFICIAL_COURT vs DATASET_COPY vs UNKNOWN; original URL separation)
      ↓
STUDY CASE MODE (Interactive ratio decidendi breakdown with AI-summary disclaimer)
```

**Key Architectural Rules:**
1. **Conversational Priority & Safety First:** Personal safety expressions ("I am feeling harassed", "I am feeling targeted", "someone keeps threatening me") immediately trigger short, calm 5-step personal safety responses (Immediate Safety, Practical Next Steps, Evidence Preservation, Support Options, Context Clarification) without dumping legal provisions or cases.
2. **Case Explorer Architecture:** Direct UI access via "CASE STUDY" header button or chat commands ("case study", "explore cases"). Navigation follows a strict 5-tier taxonomy: `Category → Act → Section → Related Cases → Study Case`.
3. **Verified Metadata & Act/Section Provenance:** Act and Section fields are derived solely from verified database corpus records. Act/Section mappings are never fabricated or inferred solely from section numbers.
4. **Provenance & Source URL Separation:** Distinguishes between `OFFICIAL_COURT`, `DATASET_COPY`, and `UNKNOWN`. `repositoryUrl` (`https://github.com/vanga/indian-high-court-judgments`) is stored separately from `sourceUrl`. "View Original Judgment" buttons are displayed ONLY when the individual case URL is verified.
---

## 25. Phase 9 Master Refinement Emergency Response Orchestration Architecture

```text
Manual SOS / Global Voice SOS ("Hey Suraksha")
                     │
                     ▼
          emergencyService.createEmergency
                     │
                     ▼
             EmergencyEvent (ACTIVE)
                     │
     ┌───────────────┼───────────────┬────────────────┐
     ▼               ▼               ▼                ▼
AI Risk Assessment  Live GPS Tracking  Auto Audio Capture  Periodic Update Orchestrator
(Phase 6 Formula)  (locationService)  (60s Segments)      (notificationService)
     │               │               │                │
     │   Haversine   │ Segment 1..20 │ Update #1..#20 │ Identity: `${emergencyId}_seq_${sequenceNumber}`
     └─── SafetyZone ◄───────────────┼────────────────┼── Mobile: PENDING -> SENT/UNAVAILABLE
         Proximity                   │                └── Email:  PENDING -> SENT/UNAVAILABLE
         (+20 pts)                   │
                                     ▼
                      Resolution ("I'M SAFE")
                                     │
                     ┌───────────────┴────────────────┐
                     ▼                                ▼
        Stop Periodic Updates & Timers   Finalize Partial Final Segment
```

**Architecture & Security Guarantees:**
1. **Single Authoritative Pipeline**: Manual SOS and Global Voice SOS converge into the single `emergencyService.createEmergency` pipeline. Duplicate active emergency requests return HTTP 409 Conflict.
2. **20-Minute Evidence Hard Cap**: Slices audio into 60-second segments (Segment 1 to Segment 20, 1200s max duration). Segment 21 is strictly forbidden. On resolution/cancellation, partial segments are finalized and uploaded.
3. **Sequence Cap & Deduplication**: Dispatches periodic emergency updates (#1 through #20) at controlled 60-second intervals. Update #21 is rejected with HTTP 400 (`MAX_UPDATES_EXCEEDED`). Identity `${emergencyId}_seq_${sequenceNumber}` prevents duplicate dispatches.
4. **Dynamic Risk Engine Integration**: Location updates evaluate spatial `SafetyZone` proximity using Haversine distance. When near a high-risk safety zone, the system passes `{ type: 'high_risk_location', points: 20 }` to `riskService.js`, refreshing `currentRiskScore` dynamically without altering the Phase 6 formula.
5. **Truthful Delivery Channel State Machine**: Maintains explicit delivery states (`PENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED`, `UNKNOWN`, `MOBILE_NOTIFICATION_UNAVAILABLE`, `EMAIL_NOTIFICATION_UNAVAILABLE`). Unconfigured/simulated channels are never falsely recorded as `SENT` or `DELIVERED`.
6. **Subsystem Failure Isolation**: Audio, location, risk calculation, push notification, or email failures are completely isolated; failure of any single subsystem does NOT terminate or resolve the active emergency.
7. **Strict Ownership Verification**: User identity verified via JWT bearer tokens; emergency events, location logs, and evidence files enforce strict user ownership check (`emergency.user === req.user._id`), returning HTTP 403 Forbidden on unauthorized cross-user access attempts.


