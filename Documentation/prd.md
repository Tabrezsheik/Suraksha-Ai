# PRD — SURAKSHA AI
### Proactive Intelligent Protection: Detect Risk. Prevent Danger. Respond Instantly.

---

## 1. Overview

**SURAKSHA AI** is an AI-assisted personal safety platform designed to protect victims of domestic violence and abuse — regardless of gender or age — by providing discreet emergency detection, real-time risk assessment, and instant response coordination, without requiring the victim to openly ask for help.

Unlike traditional safety apps that rely on the victim manually triggering an alert, SURAKSHA AI is built around a proactive **Prevent → Detect → Respond** model that watches for danger before it escalates into an emergency.

---

## 2. Problem Statement

Domestic violence can affect people of any gender or age. Victims may be trapped in unsafe environments, monitored by their abuser, or unable to make a visible emergency call. Existing safety solutions often depend on the victim manually asking for help, which may not be possible during a dangerous situation.

SURAKSHA AI addresses this gap by providing discreet, AI-assisted protection that can detect potential distress, assess risk, activate a silent SOS, share live location with trusted contacts, and support emergency response without requiring the victim to openly seek help.

---

## 3. Target Users

- Women
- Men
- Children / young adults
- Elderly people
- Anyone living in an abusive household or unsafe environment

---

## 4. Goals & Non-Goals

### Goals (MVP)
- Provide a fast, discreet way to trigger an emergency (manual + voice).
- Assess situational risk using a transparent, rule-based scoring engine.
- Alert a trusted circle and visualize the emergency on a real-time dashboard.
- Proactively monitor journeys for anomalies (Guardian Mode).
- Suggest safer routes based on risk data.
- Capture minimal evidence (audio, location, timeline) during an emergency.

### Non-Goals (Explicitly Out of Scope for MVP)
- Police / law enforcement integration
- Full NGO / third-party organization dashboard
- Wearable or smartwatch integration
- Advanced facial recognition
- Complex emotion recognition
- Large-scale, multi-city crime datasets
- Full social network / community features
- Complex continuous video processing
- Advanced predictive ML models

These are candidates for future scope once the MVP is validated.

---

## 5. Core Concept

```
Potential Distress
       ↓
   🧠 AI Detection
       ↓
   Risk Assessment
       ↓
   🛡️ Silent SOS
       ↓
 ┌─────┼─────────┐
 ↓     ↓         ↓
GPS  Trusted   Evidence
     Circle
       ↓
💻 Real-Time Safety Dashboard
```

**Three-layer protection model:**

| Layer | Function | Features |
|---|---|---|
| 🧠 Prevent | Reduce exposure to risk before it happens | AI Risk Score, Safe Route, Guardian Mode |
| 🔍 Detect | Recognize distress signals as they emerge | Distress/anomaly detection, Silent SOS |
| 🚨 Respond | Coordinate help immediately | Live GPS, Trusted Circle, Real-Time Dashboard, Evidence |

---

## 6. MVP Feature Set (8 Core Features)

### 6.1 🔴 Silent SOS (Priority 1)
The core of the app. Allows the user to trigger an emergency discreetly.

**Triggers:**
- Manual SOS button
- Voice trigger (e.g., "Help me")

**Flow:**
```
SOS
 ↓
Create Emergency Event
 ↓
Get GPS location
 ↓
Alert Trusted Circle
 ↓
Show emergency on PC dashboard
 ↓
Start emergency monitoring
```

### 6.2 📍 Real-Time Live GPS (Priority 1)
- Tracks and broadcasts current location during an emergency
- Live location updates streamed to the dashboard
- Trusted contacts receive the user's live location

### 6.3 👥 Trusted Circle (Priority 1)
- User adds a small group of trusted contacts (e.g., mother, father, friend)
- On SOS activation, all trusted contacts are notified and location is shared
- Kept simple for MVP — no complex permission tiers

### 6.4 💻 Real-Time Safety Dashboard (Priority 1)
A web (PC) dashboard giving a live operational view of active emergencies.

**Displays:**
- Active alerts count
- User identity and live location on a map
- AI risk score
- Emergency timeline
- Trusted circle status
- Evidence log

### 6.5 🧠 AI Risk Score (Priority 2 — Differentiator)
A transparent, rule-based risk engine (not a black-box ML model for MVP).

**Example scoring logic:**

| Signal | Points |
|---|---|
| Distress keyword | +30 |
| Voice stress | +25 |
| High-risk location | +20 |
| Route deviation | +15 |
| Suspicious stoppage | +10 |

**Risk bands:**

| Score | Level |
|---|---|
| 0–30 | Low |
| 31–60 | Medium |
| 61–80 | High |
| 81–100 | Critical |

### 6.6 🛡️ Guardian Mode (Priority 3) — COMPLETE + VERIFIED ✅
Monitors an ongoing journey and proactively checks in when something looks unusual (route deviation, unexpected stoppage in a risky area).

**Features:**
- Destination selection & journey protection
- Continuous location monitoring (`source: "guardian"`)
- Server-side 500m route deviation & 5-minute stoppage anomaly detection
- **Guardian Mode Journey Mini-Map**: A compact interactive journey visualization layer integrated into the active Guardian card showing:
  - 📍 Current user location marker
  - 🏁 Destination marker
  - Journey trajectory/path line
  - Visual route-deviation indicator (amber stroke & alert badge when off-route > 500m)

**Example UI states:**
```
GUARDIAN MODE
● ACTIVE

Route             Safe
Movement          Normal
Location          Safe
AI Risk           18%

[ Mini-Map Canvas: You ─── Target ]

Monitoring...
```

```
⚠️ UNUSUAL ACTIVITY
You stopped in a high-risk area / deviated from route.
Are you safe?

[ I'M SAFE ]   [ GET HELP ]
```

This shifts SURAKSHA AI from a reactive tool ("use it when in danger") to a proactive one ("watches for danger before it becomes an emergency").

### 6.7 🗺️ AI Safe Route (Priority 4) — COMPLETE + REAL-DATA VALIDATED ✅
Offers a choice between the fastest route and the safest route, each with verifiable risk scoring and emergency infrastructure attribution.

**Features:**
- Origin and destination selection with OpenRouteService (ORS) Directions API v2 (`driving-car` profile) providing live road-following GeoJSON LineString geometry
- Up to 3 genuine ORS route alternatives (no synthetic fallback geometry used in real-data validation)
- Route names derived from actual ORS road/step information (e.g. "Via Anantapur Main Road", "Via Court Road") — no "(Estimated)" labels on verified ORS routes
- Real-world safety data integration:
  - Official district violent crime baseline rates (`data.gov.in / NCRB 2023`) — district-level historical context only; NOT street-level crime detection
  - Current/retrieved OpenStreetMap emergency infrastructure (police & hospitals via Overpass API)
  - Verified local safety zones from PostGIS spatial evidence
- Evidence-based confidence scoring (HIGH / MEDIUM / LOW)
- Dynamic Data Coverage panel disclosing data provenance and gaps
- Interactive Leaflet tile map:
  - **Roadmap:** Real OpenStreetMap raster tiles
  - **Satellite:** Genuine Esri World Imagery photographic aerial tiles
  - **Hybrid:** Esri World Imagery + Esri World Boundaries and Places reference overlay
  - Zoom / reset / locate / fullscreen viewport controls
  - Risk-colored polyline route overlays (Low: Green, Moderate: Amber, High: Red)
  - Police, hospital, and safety zone markers with tooltips
- One-click route selection automatically starts Guardian Mode (after verified ORS geometry check)
- **Guardian Mode geometry safety requirement:** Guardian Mode can only be initiated from a route that carries verified real ORS road geometry (`isEstimatedGeometry !== true` and at least 2 coordinate points). Routes using fallback/estimated geometry display a disabled button and the warning: "Guardian Mode unavailable — verified route geometry required." This constraint is enforced both client-side and server-side.
- **Equal-risk route transparency:** Routes with identical risk scores receive honest messaging: `"Insufficient evidence to distinguish route safety."`
- Route provenance and geometry verification status visible in route cards (`Routing: OpenRouteService`, `Geometry: Verified road route`)

**Example:**
```
Choose Route

🛡️ SURAKSHA RECOMMENDED ★
✅ Safest Route
Route 1 — Via Anantapur Main Road — Risk: 20/100 (LOW)
Routing: OpenRouteService | Geometry: Verified road route

⚡ ALTERNATIVE OPTION
Route 2 — Via Court Road — Risk: 20/100 (LOW)
```

> **Data Limitation:** Verified street-level crime incident data for Anantapur/Anantapuramu is NOT currently available. NCRB 2023 provides district-level historical context only. Risk scores are estimates and must never be presented as real-time crime detection or guaranteed safety.

### 6.8 📹 Emergency Audio Evidence & 20-Minute Segmentation (Priority 5) — MASTER REFINEMENT VALIDATED ✅
Minimal evidence capture auto-starts upon emergency activation.

```text
Emergency Event (ACTIVE)
      │
      ├── 📍 Live GPS Tracking & Dynamic Risk Refresh
      ├── 🎙 Audio Capture (60s chunks, 20 segments max, 1200s max cap)
      │      ├── Segment 1 (00:00–01:00) → Segment 20 (19:00–20:00)
      │      └── Segment 21 MUST NEVER be created
      └── ⏱ Authoritative Deduplicated Timeline & Updates (#1 to #20)
```

**Key Behaviors:**
- **20-Minute Maximum Duration**: Slices audio into 60-second chunks (Segment 1 to Segment 20, 1200s total max duration). Segment 21 is strictly forbidden and cannot be created.
- **Partial Segment Finalization**: On emergency resolution or cancellation, partial audio segments (e.g. 34 seconds) are finalized, uploaded, and preserved without data loss.
- **Audio Failure Isolation**: Microphone permission failure or audio upload error is non-blocking; emergency continues tracking location and risk.

### 6.9 🔔 Emergency Alerts & Truthful Channel Tracking (Supporting feature) — MASTER REFINEMENT VALIDATED ✅
```text
Emergency Update Orchestrator (Sequence #1 to #20)
      ↓
Authoritative Identity: emergencyId_seq_N
      ├── Mobile / Push (FCM) State: PENDING -> SENT -> UNKNOWN or MOBILE_NOTIFICATION_UNAVAILABLE
      └── Email (SMTP) State: PENDING -> SENT -> UNKNOWN or EMAIL_NOTIFICATION_UNAVAILABLE
```

**Truthful Delivery State Machine:**
- Distinguishes `PENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED`, `UNKNOWN`, `MOBILE_NOTIFICATION_UNAVAILABLE`, and `EMAIL_NOTIFICATION_UNAVAILABLE`.
- Never labels an unconfigured or simulated delivery path as `SENT` or `DELIVERED`.
- Deduplicated by backend identity `${emergencyId}_seq_${sequenceNumber}` to prevent repeated dispatches on UI rerenders or navigation.

---

## 7. System Architecture

```
🛡️ SURAKSHA AI
                       │
       ┌───────────────┴────────────────┐
       │                                │
   📱 MOBILE                        💻 PC
       │                                │
       ├── Silent SOS                   ├── Live Dashboard
       ├── Guardian Mode                ├── Live Alerts
       ├── Live GPS                     ├── Live GPS Map
       ├── AI Risk Score                ├── AI Risk Score
       ├── Safe Route                   ├── Emergency Timeline
       ├── Trusted Circle               └── Analytics
       └── Emergency Evidence
                       │
                       ↓
                🧠 AI SAFETY ENGINE
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   Threat         Risk Score     Anomaly
   Detection      Prediction      Detection
```

**Simplified data flow:**
```
📱 React Native
      ↓
Node.js + Express
      ↓
MongoDB
      ↕
Socket.IO
      ↓
💻 Next.js Dashboard

      ↕
Python + FastAPI
      ↓
🧠 AI Risk Engine
```

---

## 8. Tech Stack

| Layer | Technology | Priority |
|---|---|---|
| 🌐 Website | Next.js | ⭐⭐⭐⭐⭐ |
| 💻 PC Dashboard | Next.js | ⭐⭐⭐⭐⭐ |
| 📱 Mobile | React Native + Expo | ⭐⭐⭐⭐⭐ |
| 🎨 UI | Tailwind CSS | ⭐⭐⭐⭐⭐ |
| ⚙️ Backend | Node.js + Express | ⭐⭐⭐⭐⭐ |
| 🗄️ Database | MongoDB | ⭐⭐⭐⭐⭐ |
| 🔄 Real-time | Socket.IO | ⭐⭐⭐⭐⭐ |
| 🗺️ Maps / Routing | OpenRouteService (ORS) + OpenStreetMap (Leaflet) + Esri World Imagery | ⭐⭐⭐⭐⭐ |
| 🗄️ Spatial Evidence DB | PostgreSQL 17.11 + PostGIS 3.6.2 | ⭐⭐⭐⭐⭐ (Phase 8) |
| 🧠 AI Service | Python + FastAPI | ⭐⭐⭐⭐ |
| 🔔 Notifications | Firebase Cloud Messaging | ⭐⭐⭐⭐ |
| 📞 SMS/WhatsApp | SMS Gateway Provider | ⭐⭐⭐ (post-MVP) |
| 📦 Evidence Storage | Cloudinary / S3 / Supabase Storage | ⭐⭐⭐ |
| ⚡ Cache | Redis | ⭐⭐ (post-MVP) |

**MVP build order:**
`Next.js + React Native + Node/Express + MongoDB + Socket.IO + Mapbox + Python/FastAPI`
→ Add Redis, external SMS/Email gateways, and other enhancements once the core system is working.

---

## 9. Reference Inspiration

| Repo | Contribution to SURAKSHA AI |
|---|---|
| [ShieldHer](https://github.com/dakshjainofficial/Shield-Her-By-DAKSH-JAIN) | Real-time SOS, emergency ecosystem, alerts, tracking, dashboard architecture |
| [Safe-Route](https://github.com/Heshmitha/Safest_Route) | AI safety score, safer routing, Guardian Mode, risk zones, route monitoring |

SURAKSHA AI combines ShieldHer's real-time emergency-response backbone with Safe-Route's proactive safety/routing concepts, under its own three-layer (Prevent–Detect–Respond) architecture and identity.

---

## 10. Positioning

**Not:** "AI Women Safety App with SOS" (too generic, too narrow)

**Instead:** *SURAKSHA AI — Proactive Intelligent Protection: Detect risk. Prevent danger. Respond instantly.*

An AI-powered domestic violence protection platform for anyone in an unsafe household — not limited by gender or age.

---

## 11. MVP Success Criteria

- SOS can be triggered manually and via voice, end-to-end, within seconds.
- Live location successfully streams to the dashboard during an active emergency.
- Trusted Circle members receive a notification within a few seconds of SOS activation.
- Risk score updates visibly in response to at least the core rule-based signals.
- Guardian Mode detects at least one class of anomaly (route deviation or stoppage) and prompts a check-in.
- Dashboard reflects an active emergency in real time (via Socket.IO) with no manual refresh.

---

## 12. Future Scope (Post-MVP)

- Police / emergency-services integration
- NGO / support-organization dashboard access
- Wearable and smartwatch integration
- Facial recognition
- Advanced emotion recognition (beyond voice-stress signal)
- Large-scale, multi-city crime datasets for route scoring
- Community / social support network features
- Continuous video evidence capture
- Predictive ML-based risk modeling (replacing the rule-based engine)
- SMS/WhatsApp/voice-call escalation via gateway providers
