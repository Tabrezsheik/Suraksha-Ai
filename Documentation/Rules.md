# Rules.md — SURAKSHA AI

Development standards to keep every phase consistent. These rules are especially important when development is AI-assisted across multiple phases. The goal is to make every implementation follow the same PRD, Architecture, Database, API and Design decisions instead of introducing different patterns from phase to phase.

---

## 1. Naming Conventions

* **Files:** camelCase for JavaScript/TypeScript utility and service files (`authController.ts`, `riskService.ts`).
* **React components:** PascalCase (`EmergencyCard.tsx`, `LiveMap.tsx`, `RiskIndicator.tsx`).
* **Variables/functions:** camelCase (`getEmergency`, `calculateRiskScore`).
* **Constants:** UPPER_SNAKE_CASE where appropriate (`MAX_RISK_SCORE`, `LOCATION_UPDATE_INTERVAL`).
* **MongoDB models/collections:** PascalCase singular model names (`User`, `EmergencyEvent`, `RiskAssessment`).
* **REST routes:** kebab-case plural nouns for multi-word resources (`/api/trusted-contacts`, `/api/safety-zones`).
* **Socket.IO events:** snake_case (`location_update`, `risk_updated`, `emergency_created`).
* **CSS/Tailwind:** use the project's design tokens instead of arbitrary values. Avoid values such as `p-[13px]` when an existing spacing token is available.

---

## 2. Folder Structure

Follow `Architecture.md` exactly.

Do not introduce new top-level folders or services without first updating `Architecture.md`.

Backend features should follow the existing layering:

```text
routes/
controllers/
services/
models/
middleware/
utils/
config/
```

Frontend features should remain organized according to the mobile and PC application structures defined in `Architecture.md`.

New functionality should be added to the appropriate existing module rather than creating ad-hoc files.

---

## 3. Code Style

* Use functional React components only.
* Use hooks for React state and lifecycle behaviour.
* Use TypeScript consistently where the project is configured for TypeScript.
* Use `async/await` instead of `.then()` chains.
* Keep one main component/class/module per file where practical.
* Keep controllers thin.
* Business logic belongs in `services/`.
* Database access belongs in the model/data layer.
* Reuse shared utilities instead of duplicating logic.
* Use clear, descriptive function and variable names.
* Avoid unnecessary abstractions for simple MVP features.

---

## 4. Backend Layering

Follow this flow:

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Model / External Service
```

### Routes

Routes should only define:

* HTTP method
* URL
* Middleware
* Controller

### Controllers

Controllers should:

* Read validated request data
* Call the appropriate service
* Return the standard response
* Avoid containing large business rules

### Services

Services contain:

* Emergency logic
* Risk calculation orchestration
* Guardian Mode logic
* Notification logic
* Safe Route processing
* Evidence handling
* External API integrations

### Models

Models define:

* MongoDB schemas
* Validation constraints
* Indexes
* Relationships/references

---

## 5. Error Handling

* Use one shared error-handling middleware.
* Do not create unrelated custom error formats in individual controllers.
* Use the standard API response format from `API.md`.
* Never expose stack traces or internal implementation details in production.
* Log server-side errors with enough context to debug them.
* Never log passwords, JWTs, private evidence URLs or sensitive emergency content.

### Standard success response

```json
{
  "success": true,
  "data": {}
}
```

### Standard message response

```json
{
  "success": true,
  "message": "Operation completed successfully"
}
```

### Standard error response

```json
{
  "success": false,
  "message": "Unable to complete request",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

---

## 6. Validation

Every API endpoint accepting user input must validate it before business logic or database access.

Use a shared validation library such as **Zod** or **Joi**, according to the final agreed dependency set.

Validate:

* Required fields
* Email and phone formats
* Password requirements
* MongoDB IDs
* Latitude and longitude
* Risk scores
* Enum values
* Evidence file type
* Evidence file size
* Query parameters
* Request body structure

### Profile & Contact Input Rules:
* **Gender Enum:** Gender must accept only approved enum values (`'Male'`, `'Female'`, `'Other'`, `'Prefer not to say'`).
* **Profile Image Validation:** Profile images must be restricted to supported formats (JPEG, PNG, WebP) and maximum 2MB size limit.
* **Phone Normalization:** Emergency contact phone numbers must be normalized into international format (e.g. `+919392075827`).
* **Data Preservation:** Existing stored user numbers must be parsed and preserved without corruption or blind prepending.

Do not scatter manual validation such as:

```js
if (!field) {
  ...
}
```

through controllers when the same validation can be expressed in a schema.

---

## 7. Authentication & Authorization

* All protected APIs must require a valid access token.
* Verify JWTs through shared authentication middleware.
* Never trust a client-supplied `userId` for ownership decisions.
* Obtain the authenticated user identity from the verified token.
* Users can only access their own contacts, emergencies, locations and evidence.
* Dashboard APIs require the appropriate role/permission.
* Sensitive operations must perform server-side authorization checks.
* Never store plain-text passwords.
* Passwords must be securely hashed.
* Never return password hashes to clients.

---

## 8. Emergency & Safety Rules

SURAKSHA AI is a safety-critical application, so emergency flows must be treated as high-priority functionality.

### Silent SOS

* SOS activation must be fast and reliable.
* Do not add unnecessary UI steps before creating an emergency.
* Preserve the initial trigger type.
* Capture the best available location.
* Create the `EmergencyEvent` before dependent emergency actions.
* Notify configured Trusted Circle contacts according to the documented workflow.
* Start real-time emergency monitoring.
* Keep emergency status synchronized across mobile and PC.

### Emergency Resolution

* Only an authorized user/system flow can resolve an emergency.
* Record the resolution time.
* Preserve the emergency timeline.
* Do not silently delete an emergency when it is resolved.

---

## 9. Location & Privacy Rules

Location is sensitive information.

* Request location permission only when required.
* Explain location usage clearly in the UI.
* Never expose live location through public endpoints.
* Validate latitude from `-90` to `90`.
* Validate longitude from `-180` to `180`.
* Store only the location data required for the feature.
* Do not collect continuous location when Guardian Mode/emergency monitoring is inactive.
* Protect location history using authentication and authorization.
* Define retention/deletion rules for historical location data.

---

## 10. AI Risk Rules

The MVP risk engine must remain transparent and predictable.

* Use the documented risk signals only.
* Keep risk scoring in the agreed `0–100` range.
* Use the documented risk levels:
  * `low`
  * `medium`
  * `high`
  * `critical`
* Store the signals that contributed to a risk assessment.
* Do not invent new risk signals without updating the relevant documentation.
* Do not replace the documented MVP rule engine with an unapproved ML model.
* AI output must be treated as risk assistance, not an absolute guarantee of safety.
* If the AI service fails, the backend must fail safely and maintain the emergency workflow where possible.

---

## 11. Guardian Mode Rules

* Guardian Mode must have an explicit start state.
* Location updates should be tied to the active Guardian session.
* Route deviation and suspicious stoppage should generate documented Guardian events.
* Do not automatically escalate every anomaly without following the documented check-in/escalation flow.
* Guardian sessions must have clear active/stopped states.
* Stopping Guardian Mode must stop unnecessary location tracking.

---

## 12. Safe Route Rules

* Use OpenRouteService (ORS) as the current validated routing provider through the documented route service (`routeService.js`).
* Do not switch route providers without updating `Architecture.md`, `API.md`, and `PRD.md`.
* Mapbox is not the active routing provider in the validated implementation. Do not re-introduce Mapbox routing without explicit approval.
* Safety scoring must use the documented safety-zone/risk information from PostGIS spatial evidence.
* Clearly distinguish safest and alternative route options.
* Never claim that a route is guaranteed safe.
* If route calculation fails, show a clear fallback/error state rather than fabricated route information.
* **Geometry safety guard:** Guardian Mode must never be initiated from a route with estimated or missing geometry. If `selectedRoute.isEstimatedGeometry === true`, the UI must disable the Guardian Mode button and display: "Guardian Mode unavailable — verified route geometry required." The server must also reject such requests with HTTP 400.
* **Equal-risk route wording:** Do not label a route "riskier" or "Shorter but Riskier" when its risk score is equal to the safest route. Use `'Higher Risk Alternative'` only when `riskLevel === 'high'` compared to the safest route; otherwise use `'Alternative Option'`.
* **TEST/DEMO data:** Any safety zone or data record marked as `TEST` or `DEMO` contributes exactly 0 points to the route risk calculation. TEST/DEMO data must never affect production risk scores.
* **Route naming:** Route names must use clean capitalization derived from ORS road/step information (e.g. "Via Anantapur Main Road", "Via Court Road"). Do not display "(Estimated)" labels for verified ORS routes.
* **NCRB limitation:** NCRB 2023 data provides district-level historical context only. Do not present district statistics as street-level crime data or real-time crime detection.
* **No fabricated crime data:** Do not fabricate crime hotspots, pedestrian counts, or street-level incident points from district-level statistics.
* **Guardian Mode auto-start:** After a user selects a genuine ORS route with verified geometry, Guardian Mode starts automatically. Do not require a separate manual Guardian Mode button press for this flow.

---

## 13. Evidence Rules

* Evidence is sensitive data.
* Store large audio files in approved external storage, not directly inside MongoDB.
* MongoDB should store evidence metadata and secure references.
* Validate MIME type and file size before accepting uploads.
* Evidence must be associated with an authorized `EmergencyEvent`.
* Do not expose public evidence URLs.
* Do not log raw audio/video content.
* Do not add continuous video collection to the MVP without explicit approval.
* Delete temporary uploaded files after successful processing when applicable.

---

## 14. Real-Time / Socket.IO Rules

* REST APIs handle persistent operations.
* Socket.IO handles real-time emergency events and live location updates.
* Authenticate Socket.IO connections.
* Users may only join rooms they are authorized to access.
* Use documented room naming:

```text
user:<userId>
emergency:<emergencyId>
dashboard:alerts
```

* Use documented event names.
* Do not introduce a new event name without updating `API.md`.
* Do not use Socket.IO as a replacement for persistent database storage.

---

## 15. Database Rules

Follow `Database.md` as the source of truth for the MVP schema.

* Do not invent database collections during implementation.
* Do not add fields without updating `Database.md`.
* Use Mongoose schemas.
* Add indexes based on documented query patterns.
* Avoid storing duplicate data unless there is a clear reason.
* Do not store large binary evidence files in MongoDB.
* Validate data before persistence.
* Never expose MongoDB directly to frontend clients.
* Database access must happen through authorized backend services.

---

## 16. API Rules

`API.md` is the source of truth for documented endpoints.

* Do not invent new routes during implementation.
* If a new endpoint is required, update `API.md` first.
* Keep request and response formats consistent.
* Use the documented HTTP status codes.
* Validate every request.
* Protect sensitive endpoints with authentication.
* Test every new endpoint before marking its phase complete.

---

## 17. Frontend Rules

### Mobile

* Prioritize emergency actions and safety information.
* SOS must be visually prominent and easy to access.
* Avoid unnecessary screens during an emergency.
* Handle location permissions clearly.
* Show clear loading, success, error and offline states.
* Do not expose sensitive data unnecessarily.

### PC Dashboard

* Prioritize active emergencies.
* Live location and risk level must have clear visual hierarchy.
* Use real-time updates instead of unnecessary polling where Socket.IO is available.
* Avoid decorative UI that distracts from emergency information.
* Keep emergency status, location, risk and timeline easy to scan.

### Design

Follow `Design.md` and the established SURAKSHA AI design system.

* Use the approved brand colors.
* Use consistent typography.
* Use existing spacing/radius tokens.
* Keep glassmorphism subtle and functional.
* Use micro-animations only when they communicate state.
* Do not introduce random colors, fonts or visual styles.

---

## 18. Git & Commit Rules

Use:

```text
type: short description
```

Examples:

```text
feat: add silent sos endpoint
feat: implement guardian mode
fix: correct emergency risk calculation
fix: handle gps permission failure
chore: update database documentation
docs: update api emergency flow
test: add emergency controller tests
```

Rules:

* One logical change per commit.
* Avoid bundling unrelated changes.
* Prefer phase-based branches when using branches:

```text
phase-1-foundation
phase-2-auth
phase-4-silent-sos
phase-6-ai-risk
phase-7-guardian
```

* Keep commit messages phase-aware when working directly on one branch.

---

## 19. Environment & Secrets

All secrets must be stored in environment variables.

Examples:

```text
MONGODB_URI
JWT_SECRET
MAPBOX_TOKEN
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
AI_SERVICE_URL
STORAGE_API_KEY
```

Rules:

* Never hardcode secrets.
* Never commit `.env`.
* Keep `.env` in `.gitignore`.
* Use `.env.example` for variable names without real values.
* Never expose server-side secrets to the React Native or Next.js client.
* Rotate compromised credentials immediately.

---

## 20. AI-Assistance Rules

When using AI coding tools:

* Always read the relevant project documentation before implementation.
* Reference the specific document relevant to the phase:
  * `PRD.md` — requirements
  * `Architecture.md` — system structure
  * `Database.md` — data model
  * `API.md` — endpoints
  * `Design.md` — UI/design system
  * `Phases.md` — current development phase
  * `Rules.md` — mandatory development standards
* One phase should have one clear implementation goal.
* Follow the `Done =` criterion from `Phases.md`.
* Do not introduce new npm/pip packages without a deliberate decision.
* Do not invent API routes.
* Do not invent database fields.
* Do not redesign the architecture during implementation.
* If a new dependency, route, field or service is genuinely required, update the relevant documentation first.

---

## 21. Testing Rules

Every new feature must be tested before its phase is marked complete.

### API

Test:

* Happy path
* Validation errors
* Unauthorized access
* Forbidden access
* Not-found cases
* Common server failures

### Frontend

Test:

* Successful operation
* Validation errors
* Loading state
* Empty state
* Error state
* Permission denial
* Network failure

### Emergency features

Test:

* Manual SOS
* Voice-trigger integration
* GPS unavailable
* GPS permission denied
* Trusted Circle notification
* Risk calculation
* Socket.IO reconnect
* Emergency resolution
* Guardian anomaly
* Safe Route failure
* Evidence upload failure

No feature is complete until its normal and common error cases work.

---

## 22. Temporary Data Rules

* Do not create fake users or demo accounts unless explicitly required.
* Do not seed fake emergency records into the production database.
* Do not leave placeholder emergency events in the database.
* Temporary test data must be clearly isolated.
* Remove temporary scripts and debugging utilities before marking a phase complete.
* **TEST/DEMO safety data:** Any `SafetyZone` or `spatial_evidence` record whose `source`, `description`, or `provenance_class` marks it as `TEST` or `DEMO` contributes exactly **0 points** to route risk scoring. It must be explicitly excluded by the scoring service and must not appear in the `calculationBreakdown` as a real evidence contribution.
* **Dual-Database Separation:** MongoDB Atlas is authoritative for application state (Auth, Users, Contacts, SOS, Guardian Mode). PostgreSQL + PostGIS is authoritative ONLY for Phase 8 spatial evidence storage and querying.
* **No Silent Spatial Engine Fallback:** If PostgreSQL/PostGIS is unreachable, Phase 8 responds with explicit `SPATIAL_ENGINE_UNAVAILABLE` and `EVIDENCE_UNAVAILABLE` statuses. It will never silently run a secondary MongoDB JavaScript risk engine.
* **Mapbox Geometry Classification:** Mapbox routes provide `ROUTING_PROVIDER_GEOMETRY`. They do not prove absence of crime or guarantee real-world safety.
* **Accident vs. Crime Separation:** AP Transport accident records must remain in `evidence_family = 'accident'` and never be conflated with crime.
* **District Context Precision:** NCRB 2023 district statistics provide historical district context and must never be converted into synthetic street-level coordinates or incident points.

---

## 23. Documentation-First Workflow

Documentation is part of the codebase.

Before starting a task:

```text
Identify Phase
     ↓
Read Phases.md
     ↓
Read PRD.md
     ↓
Read relevant architecture/database/API/design docs
     ↓
Implement
     ↓
Test
     ↓
Update affected documentation
     ↓
Verify consistency
```

### Documentation Map

| Document | Purpose |
|---|---|
| `README.md` | Project overview and setup |
| `PRD.md` | Product requirements and feature behaviour |
| `Architecture.md` | System architecture and technical structure |
| `Database.md` | MongoDB collections, schemas and relationships |
| `API.md` | REST endpoints, Socket.IO events and responses |
| `Design.md` | UI components, design system and responsive behaviour |
| `Phases.md` | Development phases and completion criteria |
| `Rules.md` | Mandatory development standards |

---

## 24. Documentation Maintenance

Whenever implementation changes a documented behaviour:

* Update `API.md` when endpoints change.
* Update `Database.md` when schemas/fields/indexes change.
* Update `Architecture.md` when system structure changes.
* Update `Design.md` when UI/design tokens change.
* Update `PRD.md` when product requirements change.
* Update `Phases.md` when phase scope changes.
* Update `Rules.md` when development standards change.
* Update `README.md` when setup or project structure changes.

Remove obsolete information immediately.

**Never leave documentation describing a feature, API, database field or architecture component that no longer exists.**

---

## 25. Consistency Checks

Before marking any phase complete, verify:

* [ ] Code follows naming conventions.
* [ ] Code follows `Architecture.md`.
* [ ] Database changes match `Database.md`.
* [ ] API routes match `API.md`.
* [ ] Socket.IO events match `API.md`.
* [ ] UI follows `Design.md`.
* [ ] Requirements match `PRD.md`.
* [ ] Work matches the current `Phases.md` scope.
* [ ] No undocumented dependencies were added.
* [ ] No undocumented routes were added.
* [ ] No undocumented database fields were added.
* [ ] Tests pass.
* [ ] No temporary data/scripts remain.
* [ ] No secrets are committed.
* [ ] No obsolete documentation remains.

---

## 26. Final Definition of Done

A SURAKSHA AI task or phase is complete only when:

```text
Implementation complete
        +
Tests complete
        +
Security checks complete
        +
Documentation synchronized
        +
No obsolete information
        +
Done = criterion from Phases.md satisfied
```

### Core principle

> **PRD defines what SURAKSHA AI should do. Architecture defines how the system is structured. Database defines how data is stored. API defines how systems communicate. Design defines how users experience it. Phases define what is built and when. Rules define how every part must be implemented consistently.**

---

## 27. Phase 7 Visualization Scoping Rules

1. **Visualization Only:** The Phase 7 Guardian Mini-Map is a visual journey renderer. It must NOT calculate safe routes or ORS/Mapbox routing.
2. **Backend Authority:** The Node.js backend (`guardianService.js`) remains the sole authority for route deviation (> 500m) and stoppage (< 0.5 m/s for 5 mins) anomaly detection. Visual map state must NOT trigger independent emergency escalations.
3. **Phase 8 Isolation:** No turn-by-turn navigation or safe route choice algorithms may be introduced during Phase 7. Safe Routes belong strictly to Phase 8.

---

## 28. Phase 8 Data Integrity + Guardian Integration Rules (COMPLETE + REAL-DATA VALIDATED)

These rules are permanently enforced from Phase 8 onward and must not be removed or relaxed in future phases.

### Routing Provider
* OpenRouteService (ORS) is the validated routing provider for Phase 8. Do not silently reintroduce Mapbox or any alternative provider.
* If the ORS provider changes in a future phase, update `Architecture.md`, `API.md`, `PRD.md`, and `Rules.md` before implementation.

### Provenance Classification
* Route geometry from ORS is classified as `ROUTING_PROVIDER_GEOMETRY`. It does not prove absence of crime or guarantee safety.
* OSM/APS public infrastructure data has `REAL_PUBLIC_DATA` provenance.
* NCRB 2023 district statistics have `OFFICIAL_DATA` provenance at district level only.
* TEST/DEMO records have `TEST_DEMO_DATA` provenance and contribute 0 risk points.
* Unknown data must remain `UNKNOWN`. Estimated data must remain `ESTIMATED`.
* Provenance must not be upgraded merely because the application's internal publisher label says it is official.

### NCRB / Crime Data Limitation
* Verified street-level crime incident data for Anantapur/Anantapuramu is NOT available in the Phase 8 validated data sources.
* NCRB 2023 district statistics must never be converted into synthetic street-level coordinates.
* Do not fabricate crime hotspots from district-level statistics.
* Do not fabricate pedestrian/activity counts.
* Do not claim individual roads are dangerous based solely on NCRB district data.
* Do not present the system as real-time crime detection.

### Risk Scoring Integrity
* Risk is an estimate (`0–100`). Confidence represents evidence quality/coverage.
* Police/hospital proximity does NOT prove that an area is safe. It must not falsely inflate confidence.
* Big-company proximity is contextual only; it is not an automatic safety bonus.
* Equal-risk routes must not be artificially differentiated.
* The system must not claim a route is safest when evidence cannot distinguish routes.

### Guardian Mode Integration (Phase 8)
* Guardian Mode is integrated into the Safe Route page. There is no standalone Guardian Mode widget on the main dashboard.
* Guardian Mode starts automatically after a user selects a genuine ORS route with verified geometry.
* Estimated/unverified geometry must be rejected by the geometry safety gate (client and server).
* Deviation threshold: 500 m (preserved from Phase 7).
* Prolonged-stop threshold: 2 minutes / 120 seconds.
* Movement resets the prolonged-stop condition.
* Guardian Mode can be ended from the Safe Route page.
* Do not create a second Guardian Mode system. Reuse the existing Guardian Mode service.

### Phase Boundary
* Phase 1–7 behavior must remain preserved. No Phase 9 functionality may be added to Phase 8 or earlier code.
* Do not modify `routeService.js`, `SafeRouteMap.js`, `RouteCard.js`, `RouteComparison.js`, or Guardian Mode core logic without explicit approval.

---

## 29. Phase 9 Direct Android SIM Emergency SMS Rules (COMPLETE + REFINEMENT VALIDATED)

These rules govern direct SIM SMS emergency alerting:

### Transport & Gateways
* Use native Android `android.telephony.SmsManager` and `android.permission.SEND_SMS` exclusively.
* NO third-party SMS providers (No MSG91, No Twilio, No n8n, No gateway APIs).
* Actual emergency SMS must be dispatched through the physical SIM installed on the Android device.

### Development Identity & Test Configuration
* Single source configuration: `SURAKSHA_SMS_TRANSPORT=ANDROID_SIM` and `SURAKSHA_TEST_SIM_NUMBER=+919392075827`.
* Do NOT hardcode sender phone numbers into Java/Kotlin or production transport logic.
* Runtime checks on the Android device verify the physical SIM/subscription via `SubscriptionManager`.
* Mask phone numbers in UI and logs (`+91******5827`).

### Minimum Permissions & Google Play Policy
* Request ONLY `android.permission.SEND_SMS` when required. Do NOT request `READ_PHONE_STATE`.
* Show clear user rationale: `"Allow SURAKSHA AI to send emergency SMS alerts from this device's SIM to your Trusted Circle."`
* `SEND_SMS` is subject to Google Play's restricted-permission policy and review. Physical safety/emergency alerts are an eligible exception, but approval is not automatic.

### Recipient Capping & Deduplication
* Trusted Circle emergency SMS dispatches are capped at a maximum of 5 active contacts per round.
* Deduplication key: `EmergencyEventId + Sequence + TrustedContactId + channel=sms`.
* Prevent duplicate sends caused by re-renders, timers, network retries, or callback duplication.

### Truthful Delivery State Machine
* Android accepted SMS request → `SENT`
* Confirmed recipient network delivery → `DELIVERED`
* Delivery confirmation unavailable / unconfirmed → `SENT` with `deliveryStatus: UNKNOWN`
* Android native rejection / error → `FAILED`
* Permission or SIM unavailable → `UNAVAILABLE`
* `smsMessageId` represents an internal Android correlation/transaction ID.

