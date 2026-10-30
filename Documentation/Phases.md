# Phases.md — SURAKSHA AI

12 phases, each scoped to a focused deliverable with a clear **"Done ="** criterion. The phases follow the SURAKSHA AI PRD, Architecture, Database and API design, while keeping the MVP focused on **Prevent → Detect → Respond**.

---

## Phase 1 — Project Foundation

* **Goal:** Set up the mobile app, PC dashboard, backend, database and shared development infrastructure.
* **Features:**
  * React Native mobile application setup
  * Next.js PC/dashboard setup
  * Node.js + Express backend setup
  * MongoDB Atlas connection with Mongoose
  * FastAPI AI service setup
  * Socket.IO server setup
  * Layered folder structure
  * Environment variables (`.env`)
  * Initial API configuration
  * Git/GitHub project setup
* **Done =** Mobile app, PC dashboard, backend and AI service run successfully and MongoDB Atlas is connected.

---

## Phase 2 — Authentication & Authorization ✅ COMPLETE

* **Goal:** Implement secure account access and protected resources.
* **Features:**
  * User registration
  * User login
  * JWT authentication
  * Password hashing with bcrypt
  * Authentication middleware
  * Protected API routes
  * User ownership checks
  * Dashboard role/permission checks
  * Secure logout/token handling
* **Architecture Decision:** Protected resources must use the authenticated identity from the verified JWT rather than trusting a client-supplied user ID.
* **Done =** Users can securely register, log in and access only authorized resources.

---

## Phase 3 — User, Trusted Circle & Authentication UI/UX ✅ COMPLETE

* **Goal:** Build the user's profile, emergency contact system, and full web authentication user experience.
* **Features:**
  * **User Profile & Enhancements**: View authenticated profile, whitelisted field editing (`name`, `phone`, `ageGroup`, `gender`, `profilePicture`), passwordHash protection.
    * Gender dropdown (`Male`, `Female`, `Other`, `Prefer not to say`).
    * Profile Image / Avatar section (JPEG/PNG/WebP, max 2MB, Base64 Data URL, Upload/Change/Remove photo).
    * Selectable Country Code dropdown (🇮🇳 `+91`, 🇺🇸 `+1`, 🇬🇧 `+44`, 🇦🇪 `+971`), parsing existing numbers and normalizing international E.164 strings.
  * **Trusted Circle**: List contacts, add contact, edit contact, remove contact, relationship mapping (`parent`, `friend`, `relative`, `other`), activate/deactivate toggle, emergency recipient preparation.
    * Shared Country Code selector matching Profile UI (🇮🇳 `+91` default, 🇺🇸 `+1`, 🇬🇧 `+44`, 🇦🇪 `+971`), parsing existing numbers on edit and normalizing international E.164 strings on submit across both Add and Edit Trusted Contact forms.
  * **Authentication UI/UX & Navigation**:
    * Login page (`/login`) with input validation, password visibility toggle, error/loading feedback, and redirect to dashboard.
    * Registration/Signup page (`/signup`) with field validation, password confirmation matching, duplicate account handling, and redirect to dashboard.
    * Login ↔ Signup bidirectional navigation.
    * Hero CTA buttons ("Get Protected Free" → `/signup`, "Sign In to Dashboard" → `/login`).
    * Navbar authentication navigation, session lifecycle integration, and authenticated brand logo routing (`/dashboard` for authenticated, `/` for unauthenticated).
    * Subpage "Back to Home" navigation: `/dashboard/trusted-circle` and `/dashboard/profile` route "Back to Home" directly to `/dashboard`.
    * Startup Splash & Light Theme Lifecycle: Explicit `color-scheme: light` and `#F8FAFC` background enforced on root HTML/Body elements, eliminating black frame flashes. Startup splash animation plays first on fresh load, revealing hero content smoothly on completion without hero content flashes or hydration mismatch errors.
    * Official Suraksha AI branding with exact waveform and vector shield mark.
* **Architecture Decision:** Contact operations enforce strict user data isolation and leverage compound indexes `{ user: 1, isActive: 1 }` for instant emergency alert recipient retrieval. Web authentication uses JWT bearer tokens stored in localStorage. The authenticated dashboard (`/dashboard`) serves as the primary home area for logged-in users.
* **Done =** Users can securely register, log in, manage their profile with enhanced avatar/gender/country-code fields, and manage Trusted Circle successfully across responsive web interfaces, with seamless navigation returning to `/dashboard`.

---

## Phase 4 — Silent SOS & Emergency Core ✅ COMPLETE

* **Goal:** Implement the central emergency lifecycle.
* **Features:**
  * Manual SOS activation
  * Voice-triggered SOS integration point
  * EmergencyEvent creation
  * Emergency status management
  * Initial location capture
  * Initial risk calculation
  * Trusted Circle alert trigger
  * Emergency timeline
  * Active emergency screen
  * Resolve emergency
  * Cancel emergency
* **Architecture Decision:** `EmergencyEvent` is the central entity connecting location, risk, evidence, notifications and dashboard monitoring.
* **Done =** A user can activate an emergency and the complete emergency session is created, tracked and resolved.

---

## Phase 5 — Live GPS & Real-Time Emergency Dashboard ✅ COMPLETE

* **Goal:** Provide real-time location tracking between the mobile app and PC dashboard.
* **Features:**
  * GPS permission handling
  * Live location collection
  * Location event storage
  * Socket.IO authentication
  * Emergency-specific Socket.IO rooms
  * Real-time location updates
  * PC live map
  * Current emergency status
  * Risk level display
  * Emergency timeline updates
  * Dashboard active-emergency list
* **Architecture Decision:** REST APIs persist data; Socket.IO handles live emergency events and location updates.
* **Done =** An active emergency's location and status update on the PC dashboard in real time.

---

## Phase 6 — AI Risk Detection

* **Goal:** Add transparent AI-assisted risk assessment to emergency events.
* **Features:**
  * FastAPI AI service
  * Rule-based risk engine
  * Distress keyword detection
  * Voice-stress analysis integration point
  * High-risk location signal
  * Route-deviation signal
  * Suspicious-stoppage signal
  * Risk score from `0–100`
  * Risk levels: Low / Medium / High / Critical
  * Risk assessment persistence
  * Real-time risk updates
* **Architecture Decision:** The MVP uses a transparent rule-based engine. Advanced ML is a future enhancement.
* **Done =** Emergency signals produce a risk score and level that are stored and shown on the dashboard.

---

## Phase 7 — Guardian Mode (COMPLETE + VERIFIED ✅)

* **Goal:** Monitor a journey and detect unusual activity before it becomes an emergency.
* **Status:** COMPLETE + VERIFIED ✅
* **Features:**
  * Start Guardian Mode (`POST /api/guardian/start`)
  * Destination selection & coordinate validation
  * Continuous location updates (`source: "guardian"`)
  * Server-side route deviation detection (> 500m)
  * Server-side suspicious stoppage detection (< 0.5 m/s for 5 mins)
  * Safety-zone spatial proximity checks
  * GuardianEvent persistence (`Database.md` §9)
  * Interactive user check-in warning modal
  * Safe confirmation (`status: "safe"`)
  * Get Help escalation (`status: "get_help"` -> `EmergencyEvent` with `triggerType: "guardian"`)
  * Guardian status on PC dashboard & real-time Socket.IO events (`guardian_status`, `guardian_warning`)
  * **Guardian Mode Journey Mini-Map** (Live visual trajectory, current location marker, destination marker, and route deviation state indicator)
* **Architecture Decision:** Guardian Mode does not automatically escalate every anomaly. The MVP uses a 60-second check-in step before emergency escalation.
* **Done =** A user can start Guardian Mode, visualize their journey trajectory on the interactive mini-map, receive real-time anomaly warnings, and confirm safety or escalate to emergency assistance.

### Project Phase Status Summary
- **Phase 1 — Project Foundation:** COMPLETE + VERIFIED ✅
- **Phase 2 — Authentication & Authorization:** COMPLETE + VERIFIED ✅
- **Phase 3 — User Profile & Trusted Circle:** COMPLETE + VERIFIED ✅
- **Phase 4 — Silent SOS & Emergency Core:** COMPLETE + VERIFIED ✅
- **Phase 5 — Live GPS & Real-Time Dashboard:** COMPLETE + VERIFIED ✅
- **Phase 6 — AI Risk Detection:** COMPLETE + VERIFIED ✅
- **Phase 7 — Guardian Mode:** COMPLETE + VERIFIED ✅
- **Phase 8 — AI Safe Route & Integrated Guardian Protection:** COMPLETE + REAL-DATA VALIDATED ✅
- **Phase 9 — AI Safety Assistant, Voice SOS, Legal Intelligence RAG, Emergency Evidence & Notifications:** COMPLETE + VERIFIED ✅

---

## Phase 8 — AI Safe Route 🟢 REAL-DATA VALIDATED

* **Goal:** Help users choose a safer route instead of only the fastest route using verified public safety data, OpenRouteService live routing, PostgreSQL/PostGIS spatial evidence engine, and interactive Google-Maps-style multi-layer mapping.
* **Features:**
  * Origin and destination selection with interactive Leaflet map interface
  * Live OpenRouteService Directions API v2 integration (driving-car GeoJSON LineString) — genuine road-following geometry; synthetic/estimated fallback geometry is flagged with `isEstimatedGeometry: true` and cannot activate Guardian Mode
  * Multiple route comparison (Safest vs. Fastest vs. Alternative paths)
  * Dual-Database Architecture: MongoDB Atlas (auth & application state) + PostgreSQL 17.11 / PostGIS 3.6.2 (`spatial_evidence` SRID 4326)
  * Real-world safety data integration:
    * Official historical district violent crime rates (data.gov.in / NCRB 2023)
    * Real-time OpenStreetMap emergency infrastructure (police & hospitals)
    * 18/18 synchronized SafetyZones in PostGIS with GiST spatial indexing (`idx_spatial_evidence_geom`)
  * Credibility-hardened transparent scoring:
    * Geographic boundary checks (no cross-city contamination)
    * Evidence-based confidence rating (HIGH/MEDIUM/LOW)
    * Strict credit capping (≤ 8 police, ≤ 4 hospital, ≤ 17 combined) preventing score collapse below verified district baselines
    * Line-by-line detailed calculation breakdown logging
    * Zero risk points from TEST_DEMO_DATA records
  * Rich frontend visualization (Leaflet + OpenStreetMap + Esri World Imagery):
    * **Roadmap View**: Real OpenStreetMap standard raster tiles
    * **Satellite View**: Genuine Esri World Imagery photographic aerial tiles
    * **Hybrid View**: Esri World Imagery + Esri World Boundaries and Places reference overlay
    * Viewport controls: Zoom +, Zoom -, Reset/Fit Route, Locate Me, Fullscreen
    * Dynamic Data Coverage panel with data source attribution
    * Risk-colored glowing polyline segments (Low: Green, Moderate: Amber, High: Alert Red)
    * Interactive police, hospital, and safety zone markers with detailed tooltips
    * Clickable alternative route selection on map
    * Route cards with classification tags (`[OFFICIAL DATA]`, `[REAL PUBLIC DATA]`, `[ESTIMATED / DATA GAP]`)
    * Direct "Start Guardian Journey with this Route" CTA
    * Guardian Mode geometry safety guardrails (blocks unverified/estimated geometry)
    * Equal-risk route comparison: routes with identical risk scores receive transparent `"Insufficient evidence to distinguish route safety"` messaging
    * Clear and persistent legal attribution footer (OSM / Esri / OpenRouteService)
* **Status:** PostgreSQL 17.11 & PostGIS 3.6.2 deployed, schema initialized, 18 records synchronized, OpenRouteService live routing provider active (HTTP 200 with genuine GeoJSON LineString coordinates), Leaflet OSM/Esri real-tile basemap engine integrated, and 160/160 regression tests passed. Status: **`REAL-DATA VALIDATED`**.



---

## Phase 9 — AI Safety Assistant, Voice SOS, Legal Intelligence RAG, Emergency Evidence & Notifications ✅ COMPLETE + MASTER REFINEMENT VALIDATED

* **Goal:** Implement AI Safety Assistant, Controlled Pre-Retrieval Conversational Intelligence Router, Voice SOS emergency intent detection, Andhra Pradesh High Court Legal Intelligence RAG, 20-minute automatic audio evidence capture (20 x 60s segments, 1200s max cap), dynamic risk refresh, periodic Trusted Circle updates (mobile + email), truthful delivery state tracking, and backend-authoritative deduplicated emergency response orchestration.
* **Features:**
  * **Controlled Conversational Intelligence Router**: Pre-retrieval semantic classification (`conversationRouter.js`) evaluating intent BEFORE any database or RAG lookup:
    * `CASUAL` & `GENERAL_KNOWLEDGE`: Direct server-side OpenAI API integration (`openaiConversationService.js` using `OPENAI_MODEL="gpt-4o-mini"`). Zero RAG retrieval, zero DB queries.
    * `APP_RELATED`: SURAKSHA feature capabilities RAG (Guardian Mode, Safe Route, Risk Engine, Voice SOS).
    * `SAFETY`: Personal safety guidance. Does NOT trigger automatic EmergencyEvent or Voice SOS dispatches.
    * `EMERGENCY`: Emergency distress guidance. Recommends pressing red SOS button; does NOT create EmergencyEvent or send SMS automatically.
    * `LEGAL` & `CASE_EXPLANATION`: AP High Court Legal Intelligence RAG (`legalRagService.js`) and Case Explorer taxonomy.
  * **Strict Security & Secret Guardrails**: `OPENAI_API_KEY` is strictly backend-only in local environment (`server/.env`). Exposed to NO frontend (`web/`), NO API responses, NO logs, NO documentation, and NO Git repository. Casual OpenAI requests transmit ONLY sanitized dialogue text without GPS, phone numbers, auth tokens, or evidence metadata.
  * **Unified Emergency Pipeline**: Manual SOS and Global Voice SOS ("Hey Suraksha") converge into the single authoritative `EmergencyEvent` / `emergencyService` pipeline. Duplicate active emergency triggers are rejected (HTTP 409 Conflict).
  * **20-Minute Emergency Evidence Capture**: Auto-starts audio recording upon SOS activation (if mic permission granted). Slices recording into 60-second segments (Segment 1 to Segment 20, 1200s total duration max). Segment 21 MUST NEVER be created. Partial final segments are uploaded upon emergency resolution or cancellation. Audio recording failure is non-blocking (isolated; emergency continues).
  * **20 Emergency Updates Cap & Deduplication**: Dispatches periodic emergency updates (#1 through #20) at controlled 60-second intervals. Update #21 MUST NEVER be created (rejected with HTTP 400 Bad Request). Deduplicated by backend identity `${emergencyId}_seq_${sequenceNumber}` to prevent duplicate sends caused by rerenders, remounts, or duplicate timers.
  * **Dynamic Risk Refresh**: Evaluates location updates against spatial `SafetyZone` boundaries using Haversine formula. When near a high-risk safety zone, passes `{ type: 'high_risk_location', points: 20 }` signal to the existing Phase 6 risk model (`riskService.js`), dynamically refreshing `currentRiskScore` and `riskLevel` (LOW: 0–30, MODERATE: 31–60, HIGH: 61–100) without modifying the formula or hardcoding scores.
  * **Truthful Delivery Channel Tracking**: Distinguishes `PENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED`, and `UNKNOWN`. Records `MOBILE_NOTIFICATION_UNAVAILABLE` or `EMAIL_NOTIFICATION_UNAVAILABLE` when external push/SMS or SMTP providers are unconfigured. Never labels unconfigured or simulated delivery as `SENT` or `DELIVERED`.
  * **Subsystem Failure Isolation**: Audio, location, risk calculation, push notification, or email failures are isolated; failure of any single subsystem does NOT terminate or resolve the active emergency.
  * **Security & Authorization**: Strict user ownership verification on emergency events, evidence files, and tracking history. Exposes no raw public audio URLs and rejects cross-user access with HTTP 403 Forbidden.
  * **Direct SIM-Based Emergency SMS**: Native Android cellular SMS dispatch via `android.telephony.SmsManager` and `android.permission.SEND_SMS`. Uses physical SIM transport (no third-party gateways). Development/test identity `SURAKSHA_TEST_SIM_NUMBER=+919392075827` verified at runtime on-device. Dispatches concise emergency text to active Trusted Circle members (max 5 contacts). Includes callback status tracking (`SENT`, `DELIVERED`, `UNKNOWN`, `FAILED`, `UNAVAILABLE`) with internal transaction IDs (`smsMessageId`), deduplication by `EmergencyEventId + Sequence + ContactId + sms`, and isolated Test SMS mode.
* **Architecture Decision**: Pre-retrieval conversation router prevents unnecessary database load and guarantees casual/general dialogue never queries legal or application RAG databases. Audio segments stored in protected local storage (`server/uploads/evidence/`); metadata linked to `EmergencyEvent`. Direct Android cellular SIM module bridges to `SmsManager` for native SMS alerts. Backend serves as authoritative source for update identity and deduplication. Truthful delivery state machine enforced across all notification channels.
* **Done =** Controlled Pre-Retrieval Conversation Router, OpenAI casual dialogue isolation, 20-minute audio evidence capture, max 20 periodic updates, dynamic risk refresh, direct Android SIM SMS dispatch, truthful delivery tracking, subsystem failure isolation, backend deduplication, and single-orchestration SOS pipeline verified across 14-criteria router suite (`test-phase9-conversation-router.js`), 36-criteria SOS suite (`test-phase9-automated-sos-response.js`), 19-criteria native SIM SMS suite (`test-phase9-native-sim-sms.js`), 20-criteria legal refinement suite (`test-phase9-legal-refinement.js`), 28-criteria voice wakeword suite (`test-phase9-voice-wakeword.js`), full system regression suite, real Chrome UI validation at `/dashboard/assistant`, and clean Next.js production build (`npm run build`).


---

## Phase 10 — Complete PC Safety Dashboard

* **Goal:** Combine emergency, location, risk and evidence information into the main PC control interface.
* **Features:**
  * Dashboard overview
  * Active emergency cards
  * Live map
  * Current risk score
  * Risk level
  * Emergency timeline
  * Location history
  * Guardian alerts
  * Evidence metadata
  * Notification status
  * Emergency resolution status
  * Responsive dashboard layout
* **Architecture Decision:** The dashboard consumes the same authorized backend APIs and Socket.IO events used by the application; it does not directly access MongoDB.
* **Done =** An authorized dashboard user can monitor an active emergency from one complete interface.

---

## Phase 11 — Security, Testing & UI/UX Polish

* **Goal:** Make the MVP reliable, secure and presentation-ready.
* **Features:**
  * API validation
  * Authentication testing
  * Authorization testing
  * SOS flow testing
  * GPS permission/error testing
  * Socket.IO connection testing
  * AI risk calculation testing
  * Guardian Mode flow testing
  * Safe Route testing
  * Evidence upload testing
  * Notification testing
  * Rate limiting
  * Secure error handling
  * Loading states
  * Empty states
  * Error states
  * Mobile responsive verification
  * PC dashboard responsive verification
  * Accessibility improvements
  * Suraksha AI branding consistency
* **Done =** All critical MVP flows work reliably on mobile and PC without major security, API or UI errors.

---

## Phase 12 — Deployment & Production Verification

* **Goal:** Deploy the complete SURAKSHA AI MVP and verify the end-to-end system.
* **Features:**
  * Production environment configuration
  * MongoDB Atlas production connection
  * Backend deployment
  * Next.js dashboard deployment
  * React Native production build
  * FastAPI AI service deployment
  * External evidence storage configuration
  * Firebase notification configuration
  * Socket.IO production verification
  * Mapbox configuration
  * HTTPS verification
  * Production API testing
  * End-to-end emergency testing
  * Production logging/monitoring
* **Done =** SURAKSHA AI works end-to-end in production: a user can trigger an emergency, location and risk update in real time, Trusted Circle alerts are sent, and the PC dashboard can monitor and resolve the event.

---

# MVP Build Order

```text
Phase 1
   ↓
Foundation
   ↓
Phase 2
   ↓
Authentication
   ↓
Phase 3
   ↓
Trusted Circle
   ↓
Phase 4
   ↓
Silent SOS
   ↓
Phase 5
   ↓
Live GPS + Dashboard
   ↓
Phase 6
   ↓
AI Risk
   ↓
Phase 7
   ↓
Guardian Mode
   ↓
Phase 8
   ↓
Safe Route
   ↓
Phase 9
   ↓
Evidence + Notifications
   ↓
Phase 10
   ↓
Complete Dashboard
   ↓
Phase 11
   ↓
Testing + Polish
   ↓
Phase 12
   ↓
Deployment
```

---

# Critical MVP Path

If development time is limited, prioritize:

```text
1. Foundation
2. Authentication
3. Trusted Circle
4. Silent SOS
5. Live GPS
6. Real-Time Dashboard
7. AI Risk Score
8. Guardian Mode
9. Safe Route
10. Evidence + Notifications
```

The most important demonstration flow is:

```text
User
 ↓
Silent SOS
 ↓
Emergency Created
 ↓
GPS Starts
 ↓
AI Risk Assessment
 ↓
Trusted Circle Alert
 ↓
Socket.IO
 ↓
PC Dashboard
 ↓
Live Location + Risk
 ↓
Evidence
 ↓
Emergency Resolved
```

---

# Post-MVP / Future Scope

The following should remain outside the core MVP unless additional development time is available:

```text
Police / emergency-service integration
NGO support dashboard
Smartwatch / wearable integration
Advanced predictive ML
Large-scale crime-data pipeline
Continuous video analysis
Community safety reporting
Advanced voice emotion models
WhatsApp / SMS / voice-call escalation
Multi-city safety intelligence
```

These can be added after the core emergency workflow is stable.

---

# Production Checklist

* [ ] Environment variables configured correctly
* [ ] MongoDB Atlas connected from production backend
* [ ] JWT authentication working end-to-end
* [ ] Protected routes verified
* [ ] Trusted Circle CRUD working
* [ ] Silent SOS working
* [ ] Manual and voice-trigger integration verified
* [ ] GPS permissions and location updates working
* [ ] Socket.IO real-time updates working in production
* [ ] AI risk scoring working
* [ ] Guardian Mode anomaly detection working
* [ ] Safe Route calculation working
* [ ] Emergency audio storage working
* [ ] Firebase notifications working
* [ ] PC dashboard receives live updates
* [ ] Emergency resolution working
* [ ] API validation and rate limiting enabled
* [ ] No secrets committed to Git
* [ ] HTTPS enabled
* [ ] Critical mobile and PC flows tested
* [ ] No major console/API errors

---

# Final Definition of Done

SURAKSHA AI is considered MVP-complete when:

> **A user can securely log in, create a Trusted Circle, activate Silent SOS, share live GPS, receive an AI-based risk assessment, notify trusted contacts, use Guardian Mode and Safe Route, securely capture emergency evidence, and have the complete emergency state monitored in real time through the PC dashboard.**
