# Design.md — SURAKSHA AI

## 1. Design Philosophy

SURAKSHA AI is a safety-first product. The interface should feel **calm, trustworthy, modern and highly responsive**, while emergency actions remain immediately visible.

The visual direction combines:

- Premium SaaS UI
- Subtle glassmorphism
- Clean modern typography
- Generous whitespace
- Clear information hierarchy
- Soft surfaces and restrained shadows
- Functional micro-animations
- Strong emergency-state feedback

The design should communicate:

> **Calm when everything is safe. Extremely clear when something is wrong.**

Design inspiration may be borrowed for layout and interaction patterns, but SURAKSHA AI must use its own brand colors, typography, components and safety states.

---

## 2. Inspiration Reference

| Feature | Inspiration | What's actually borrowed |
|---|---|---|
| Overall Design System | Linear + modern SaaS dashboards | Clean hierarchy, spacing rhythm, minimal visual noise |
| Mobile Safety Home | Apple Health + modern safety apps | Large primary action, simple status cards, quick access |
| PC Dashboard | Linear + Vercel dashboards | Bento layout, compact navigation, information density |
| Emergency Dashboard | Modern incident-management dashboards | Status hierarchy, timeline, live-event cards |
| Live Map | Google Maps + modern logistics dashboards | Map-first layout, floating information panels |
| Guardian Mode | Fitness/travel tracking apps | Progress, route state, live monitoring |
| Safe Route | Google Maps + navigation products | Route comparison and clear selected-route state |
| Chat/Support | WhatsApp/Discord-style patterns | Message grouping, clear conversation hierarchy |
| Notifications | GitHub/Linear | Grouped notification list and unread state |
| Forms | Notion | Minimal fields, clear labels and inline validation |
| Settings | Notion | Sidebar navigation with grouped settings |
| Cards | Modern SaaS/Bento UI | Soft surfaces, consistent padding and hierarchy |
| Emergency State | Incident-response interfaces | Strong status color, timestamp, severity and action priority |

---

# 3. Brand Identity

## Brand

**SURAKSHA AI**

Tagline:

**Intelligent Protection**

The official SURAKSHA AI shield + waveform logo should remain consistent across:

- Website
- PC dashboard
- Mobile application
- Login/signup
- Emergency screens
- Notifications
- Marketing pages

Do not replace the official logo with generated alternatives unless explicitly requested.

---

# 4. Color Palette

The color system is designed around trust, technology and safety.

## Primary

| Token | Hex | Use |
|---|---|---|
| primary | `#032257` | Navigation, headings, primary brand areas |
| primary-blue | `#0270F7` | Primary actions, links, active states |
| accent-blue | `#76B0E5` | Secondary highlights, waveform/UI accents |

## Background

| Token | Hex | Use |
|---|---|---|
| background | `#F8FAFC` | Main page background |
| surface | `#FFFFFF` | Cards, panels, modals |
| surface-glass | `rgba(255,255,255,0.72)` | Glass panels |

## Text

| Token | Hex | Use |
|---|---|---|
| text-primary | `#0F172A` | Headings and important content |
| text-secondary | `#64748B` | Supporting text |
| text-muted | `#94A3B8` | Metadata and disabled content |

## Status

| Token | Hex | Use |
|---|---|---|
| danger | `#EF4444` | SOS, critical emergency and destructive actions |
| success | `#10B981` | Safe / low-risk status |
| warning | `#F59E0B` | Medium/high attention state |
| info | `#0270F7` | Information and active state |

### Important color rule

**Red is reserved primarily for emergency/destructive states.**

Do not use red as a general brand or decorative color.

---

# 5. Risk Color System

Risk must be visually understandable without relying only on color.

| Risk | Color | Meaning |
|---|---|---|
| Low | `#10B981` | Safe / normal |
| Medium | `#F59E0B` | Attention required |
| High | `#F97316` | Significant risk |
| Critical | `#EF4444` | Emergency / immediate attention |

Always combine color with:

- Risk label
- Score
- Icon/status indicator
- Supporting explanation where useful

Example:

```text
● LOW RISK
Risk Score 18
Normal activity
```

---

# 6. Typography

Use a modern sans-serif typeface across the product.

Preferred direction:

```text
Inter / Geist / system sans-serif
```

### Type hierarchy

```text
Display:       40–48px
H1:            32px
H2:            24px
H3:            20px
Body:          16px
Small:         14px
Caption:       12px
```

Rules:

- Headings use 600–700 weight.
- Body uses 400–500 weight.
- Keep line-height comfortable.
- Use tighter tracking for large headings.
- Avoid mixing many font families.
- Logo/brand wordmark may retain its official brand treatment.

---

# 7. Spacing Tokens

Use a consistent spacing scale.

```text
xs   = 4px
sm   = 8px
md   = 16px
lg   = 24px
xl   = 32px
2xl  = 48px
3xl  = 64px
```

Prefer the project's Tailwind spacing scale instead of arbitrary values.

---

# 8. Border Radius

```text
Cards:       16px
Buttons:     12px
Inputs:      10px
Badges:      999px
Modal:       20px
Avatar:      999px
SOS button:  999px
```

Use rounded corners consistently. Avoid mixing many unrelated radius values.

---

# 9. Shadows & Glassmorphism

SURAKSHA AI uses **soft depth**, not heavy shadows.

### Standard card

```text
background: #FFFFFF
border: none or subtle translucent border
shadow: soft / low elevation
radius: 16px
```

### Glass panel

```text
background: rgba(255,255,255,0.72)
backdrop-filter: blur(...)
border: 1px solid rgba(255,255,255,0.45)
```

Rules:

- Glassmorphism should improve hierarchy, not decorate every component.
- Avoid excessive blur.
- Avoid strong neon glows.
- Avoid heavy neumorphism.
- Avoid large dark shadows.

---

# 10. PC / Website Design

## 10.1 Website Landing Page

The landing page should communicate the product in seconds.

### Structure

```text
Navbar
   ↓
Hero
   ↓
How SURAKSHA AI Works
   ↓
Core Safety Features
   ↓
Emergency Workflow
   ↓
Mobile + PC Experience
   ↓
Trust / Privacy Section
   ↓
CTA
   ↓
Footer
```

### Hero

Primary message:

```text
Intelligent Protection
When you cannot ask for help,
SURAKSHA AI can respond.
```

Primary CTA:

```text
Get Protected
```

Secondary CTA:

```text
See How It Works
```

## 10.2 Authentication Pages (Login & Signup)

Login and Signup follow the same premium SaaS design language as the landing page and dashboard.

### Layout & Card
- Centered card layout with responsive padding (`p-6 sm:p-10`)
- Maximum width: `max-w-md` for Login, `max-w-lg` for Signup
- Card style: `#FFFFFF` background, `border: 1px solid #E2E8F0`, rounded corners (`rounded-2xl`), subtle elevation (`shadow-sm`)
- Clean header with official Suraksha AI shield logo mark and brand typography

### Form Fields & Inputs
- Background: `#F8FAFC` (slate-50), focused state: `#FFFFFF` with `#0270F7` focus ring
- Border radius: `10px` (`rounded-xl`)
- Left-aligned contextual icons (User, Mail, Lock, Phone) in `#94A3B8`
- Password visibility toggle (Eye/EyeOff icon button)
- Clear inline validation messages and password criteria hint

### Feedback & State Handling
- Error banners: `#FEF2F2` (red-50) with `#EF4444` border and `#B91C1C` text
- Success banners: `#ECFDF5` (emerald-50) with `#10B981` border and `#047857` text
- Primary button: `#0270F7` background, `#FFFFFF` text, loading spinner during network transit
- Bidirectional navigation: clear text links between Login and Signup

## 10.3 Dashboard Navigation Standards

- **Authenticated Home Base:** `/dashboard` is the authenticated user's home screen after login.
- **Subpage Navigation Links:** Subpages (e.g. `/dashboard/trusted-circle`, `/dashboard/profile`) contain a top-level "Back to Home" control with an `ArrowLeft` icon routing back to `/dashboard`.
- **Header Brand Logo:** Clicking the SURAKSHA AI brand logo in `Navbar.js` routes authenticated users to `/dashboard` and unauthenticated visitors to `/`.
- **Shared Country-Code Selector:** Phone number input fields across authenticated pages and modals (Profile page, Add/Edit Trusted Contact modal) use the identical flex country-code `<select>` + local phone `<input>` component styling, matching spacing, focus states, and country flag labels (🇮🇳 `+91`, 🇺🇸 `+1`, 🇬🇧 `+44`, 🇦🇪 `+971`).
- **Splash Animation & Back to Home Lifecycle:** The official startup splash animation (`/Assets/logo_Intro_animation.html`) plays on the first app load of a session with a full-screen white overlay (`z-[9999]`) and zero Hero content flashing. On completion, it smoothly fades (`transition-opacity duration-500`) into the Hero section. Subsequent navigations to Home or subpage "Back to Home" actions within the same session evaluate `sessionStorage` synchronously, bypassing the splash animation and rendering instantly without black screens or layout jumps.

---

# 11. PC Dashboard Layout

The PC dashboard is the **control center** for emergency monitoring.

### Desktop layout

```text
┌─────────────────────────────────────────────────────┐
│ Logo        Dashboard     Alerts      Profile       │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│ Sidebar      │       Main Dashboard                │
│              │                                      │
│ Overview     │  ┌────────┐ ┌────────┐ ┌────────┐  │
│ Emergencies  │  │Active  │ │Risk    │ │Alerts  │  │
│ Guardian     │  │Events  │ │Score   │ │Today   │  │
│ Safe Routes  │  └────────┘ └────────┘ └────────┘  │
│ Evidence     │                                      │
│ Contacts     │  ┌────────────────────────────────┐ │
│ Settings     │  │                                │ │
│              │  │          LIVE MAP              │ │
│              │  │                                │ │
│              │  └────────────────────────────────┘ │
│              │                                      │
│              │  Emergency Timeline / Risk / Alerts │
└──────────────┴──────────────────────────────────────┘
```

### Dashboard priority

```text
1. Active emergency
2. Current location
3. Risk level
4. Trusted Circle status
5. Emergency timeline
6. Evidence
7. Historical information
```

---

# 12. PC Dashboard Navigation

Desktop sidebar:

```text
SURAKSHA AI

Overview
Emergencies
Live Tracking
Guardian Mode
Safe Routes
Evidence
Trusted Circle
Notifications
Settings
```

Active item:

```text
Blue accent + subtle accent-soft background
```

Emergency item:

```text
Red indicator only when an active emergency exists
```

Do not permanently color the navigation red.

---

# 13. Emergency Dashboard

When an emergency is active, the interface changes priority.

### Header

```text
● ACTIVE EMERGENCY

Risk: CRITICAL
Score: 92/100
Started: 10:42 AM
```

### Main layout

```text
┌───────────────────────────┬─────────────────────┐
│                           │ Emergency Status    │
│                           │                     │
│        LIVE MAP           │ Risk Score          │
│                           │ Location            │
│                           │ Trusted Circle      │
│                           │                     │
├───────────────────────────┤ Evidence            │
│ Emergency Timeline        │ Notifications       │
└───────────────────────────┴─────────────────────┘
```

Use red only for the active emergency state and critical actions.

---

# 14. Live Map Design

The map should be the main visual element during active tracking.

Display:

- Current location
- Movement path
- User marker
- Safe zones
- Risk zones
- Route
- Trusted Circle notification state

### User marker

Normal:

```text
Blue location marker
```

Active emergency:

```text
Blue marker + subtle red emergency pulse
```

Do not create a continuously flashing screen.

---

# 15. Mobile App Design

Mobile is the primary emergency interaction surface.

The mobile UI must prioritize:

```text
Safety
Speed
Clarity
One-handed interaction
Minimal navigation
```

---

# 16. Mobile Home Screen

Suggested layout:

```text
┌────────────────────────────┐
│ SURAKSHA AI          🔔    │
│                            │
│ Good evening               │
│ You are protected          │
│                            │
│ ┌────────────────────────┐ │
│ │     ● LOW RISK         │ │
│ │       18 / 100         │ │
│ │       Safe              │ │
│ └────────────────────────┘ │
│                            │
│        ┌─────────┐         │
│        │   SOS   │         │
│        │         │         │
│        └─────────┘         │
│                            │
│ Guardian Mode              │
│ ┌────────────────────────┐ │
│ │ Start Safe Journey  →  │ │
│ └────────────────────────┘ │
│                            │
│ Trusted Circle             │
│ ○  ○  ○  +                │
│                            │
├────────────────────────────┤
│ Home   Guardian   Safety   │
└────────────────────────────┘
```

---

# 17. SOS Button

The SOS button is the most important mobile component.

### Normal state

```text
Large circular button
Brand/primary blue
"SOS" label
Subtle shadow
```

### Press state

```text
Hold / confirmation interaction
Clear visual progress
```

### Active emergency

```text
Red #EF4444
ACTIVE SOS
Live location
Emergency timer
```

The SOS interaction should be accessible quickly without navigating through multiple screens.

---

# 18. Mobile Emergency Screen

When SOS activates:

```text
┌────────────────────────────┐
│ ← ACTIVE EMERGENCY         │
│                            │
│       🔴                   │
│   EMERGENCY ACTIVE         │
│                            │
│ Risk Score                 │
│      92 / 100              │
│      CRITICAL              │
│                            │
│ Location                   │
│ Live location sharing      │
│                            │
│ Trusted Circle             │
│ ✓ Alert sent               │
│ ✓ Location shared          │
│                            │
│ Evidence                   │
│ ● Audio recording          │
│                            │
│        [ I'M SAFE ]        │
└────────────────────────────┘
```

The emergency screen should contain only necessary actions.

---

# 19. Guardian Mode Mobile

Guardian Mode should feel like a journey tracker.

```text
┌────────────────────────────┐
│ Guardian Mode              │
│                            │
│ Destination                │
│ Anantapur → Home           │
│                            │
│ ┌────────────────────────┐ │
│ │                        │ │
│ │          MAP           │ │
│ │                        │ │
│ └────────────────────────┘ │
│                            │
│ 12 min remaining           │
│ 2.4 km                     │
│                            │
│ ● Route safe               │
│                            │
│ [ End Guardian Mode ]      │
└────────────────────────────┘
```

If an anomaly occurs:

```text
⚠ Unusual stop detected

Are you safe?

[ I'm Safe ]
[ Get Help ]
```

---

# 20. Safe Route Mobile

The route screen should make safety comparison obvious.

```text
┌────────────────────────────┐
│ Safe Routes                │
│                            │
│ ┌────────────────────────┐ │
│ │         MAP            │ │
│ │                        │ │
│ └────────────────────────┘ │
│                            │
│ Safest                     │
│ 🟢 18 min   Low Risk       │
│                            │
│ Fastest                    │
│ 🟠 14 min   Medium Risk    │
│                            │
│ [ Start Safest Route ]     │
└────────────────────────────┘
```

Never label a route as "100% safe."

Use:

```text
Lower Risk
Safer Option
Recommended
```

---

# 21. Trusted Circle

Use a clean contact-card layout.

```text
Trusted Circle

┌────────────────────────────┐
│ 👤 Mother                  │
│ Parent                     │
│ ✓ Emergency alerts enabled │
└────────────────────────────┘

┌────────────────────────────┐
│ 👤 Brother                 │
│ Family                     │
│ ✓ Emergency alerts enabled │
└────────────────────────────┘

             + Add Contact
```

During an emergency:

```text
✓ Alert Sent
✓ Location Shared
```

---

# 22. Risk Card

Risk should be simple enough to understand immediately.

```text
┌────────────────────────────┐
│ AI Safety Risk             │
│                            │
│       72 / 100             │
│       HIGH                 │
│                            │
│ • Distress detected        │
│ • Route deviation          │
│ • High-risk zone           │
└────────────────────────────┘
```

Avoid exposing unnecessary technical AI terminology to normal users.

---

# 23. Evidence UI

Evidence should be discreet and privacy-focused.

```text
Emergency Evidence

Audio Recording
────────────────────────
10:42:10 AM
12 seconds
Captured during emergency

[ View Details ]
```

Do not automatically display sensitive evidence publicly on the dashboard.

---

# 24. Notifications

Use grouped notifications.

```text
Today

🔴 Emergency Alert
Emergency activated
10:42 AM

🔵 Guardian Mode
Journey completed
9:30 AM

🟢 Safety
You arrived safely
8:15 AM
```

Unread notifications use a subtle accent-soft background.

---

# 25. Components

Core components:

```text
Button
SOSButton
RiskBadge
RiskCard
EmergencyCard
LocationCard
LiveMap
GuardianCard
RouteCard
TrustedContactCard
EvidenceCard
NotificationItem
Timeline
Modal
BottomSheet
Toast
LoadingState
EmptyState
ErrorState
```

Components should be reusable across screens.

---

# 26. Button System

### Primary

```text
Background: #0270F7
Text: #FFFFFF
```

### Secondary

```text
Background: #FFFFFF
Text: #032257
Subtle border/shadow
```

### Success

```text
Background: #10B981
Text: #FFFFFF
```

### Danger

```text
Background: #EF4444
Text: #FFFFFF
```

Use danger buttons only for emergency/destructive actions.

---

# 27. Micro-Interactions

Animations must communicate state.

Good examples:

- SOS button subtle pulse during emergency
- Live location marker movement
- Risk score transition
- Notification arrival
- Guardian Mode progress
- Route selection transition
- Map marker update
- Button loading indicator

Avoid:

- Constant background animations
- Excessive floating objects
- Decorative particle effects
- Long transitions during emergencies
- Flashing UI that can create confusion

Recommended duration:

```text
Micro interaction: 150–250ms
Panel transition: 250–350ms
Page transition: 300–400ms
```

Emergency state changes should prioritize immediate feedback over animation.

---

# 28. Responsive Behavior

## Desktop — ≥1024px

- Sidebar navigation
- Multi-column dashboard
- Large live map
- Bento information cards
- Persistent emergency panel
- Two-panel chat/support where applicable

## Tablet — 768–1023px

- Collapsible sidebar
- Reduced card columns
- Map remains prominent
- Bottom sheets for secondary information

## Mobile — <768px

- Single-column layout
- Bottom navigation
- Large touch targets
- Full-screen maps where needed
- Bottom sheets instead of desktop modals
- Separate views for complex workflows
- Minimal navigation during emergencies

---

# 29. Mobile Bottom Navigation

Recommended:

```text
Home
Guardian
Safety
Alerts
Profile
```

Do not put too many items in the bottom navigation.

SOS should remain a primary action on the Home screen rather than becoming another bottom-nav tab.

---

# 30. Accessibility

Follow WCAG-oriented practices.

- Maintain sufficient text/background contrast.
- Do not rely only on color to communicate risk.
- Use icons + labels + status text.
- Support screen readers.
- Provide meaningful accessibility labels for SOS.
- Use large touch targets.
- Avoid tiny map controls.
- Respect reduced-motion preferences.
- Provide clear focus states on web.
- Ensure keyboard navigation on PC dashboard.

---

# 31. Safety UX Rules

The emergency interface has higher priority than visual aesthetics.

### During emergency:

```text
Emergency status
      ↓
Risk
      ↓
Location
      ↓
Trusted Circle
      ↓
Evidence
      ↓
Resolution
```

Do not hide emergency information behind menus.

Do not place unrelated promotional content on an emergency screen.

Do not use ambiguous labels such as:

```text
Activate Mode
Continue
Proceed
```

Prefer:

```text
Activate SOS
I'm Safe
Get Help
Start Guardian Mode
End Guardian Mode
```

---

# 32. Empty & Error States

Every major screen should have clear states.

### No Trusted Contacts

```text
Your Trusted Circle is empty.

Add people you trust so they can
receive emergency alerts.

[ Add Trusted Contact ]
```

### Location unavailable

```text
Location unavailable

Turn on location access to enable
live safety tracking.

[ Enable Location ]
```

### AI service unavailable

```text
Risk analysis temporarily unavailable.

Your emergency monitoring remains active.
```

Never imply that safety monitoring has stopped merely because the AI service is unavailable.

---

# 33. Design Do / Don't

## Do

- Use clean layouts.
- Use consistent spacing.
- Keep emergency actions obvious.
- Use glass panels selectively.
- Use blue for normal primary interaction.
- Use green for safe state.
- Use red for emergency.
- Use subtle animations.
- Prioritize information hierarchy.
- Keep mobile interactions simple.

## Don't

- Use random gradients everywhere.
- Use excessive neon effects.
- Use heavy shadows.
- Use red for normal navigation.
- Mix multiple unrelated fonts.
- Hide SOS behind menus.
- Overload emergency screens.
- Use decorative animations during emergencies.
- Claim routes are guaranteed safe.
- Expose sensitive location/evidence publicly.

---

# 34. Core Screen Map

## Website

```text
Landing
 ├── Features
 ├── How It Works
 ├── Safety
 ├── Privacy
 └── Login
```

## Mobile

```text
Home
 ├── SOS
 ├── Risk
 ├── Guardian Mode
 ├── Safe Route
 ├── Trusted Circle
 ├── Notifications
 └── Profile
```

## PC Dashboard

```text
Dashboard
 ├── Overview
 ├── Active Emergencies
 ├── Live Tracking
 ├── Guardian Mode
 ├── Safe Routes
 ├── Evidence
 ├── Trusted Circle
 ├── Notifications
 └── Settings
```

---

# 35. Final Design Principle

SURAKSHA AI should look like a **premium modern safety platform**, not a generic emergency app.

The visual hierarchy should follow:

```text
NORMAL STATE
      ↓
Calm
Clean
Trustworthy
Minimal

      ↓

ATTENTION STATE
      ↓
Clear warning
Risk score
Actionable guidance

      ↓

EMERGENCY STATE
      ↓
Immediate
Focused
High contrast
Live status
Clear actions
No distractions
```

### Core principle

> **The interface should disappear when the user is safe and become unmistakably clear when the user needs help.**

---

# 36. Phase 7 Guardian Mode Mini-Map UI Specification

The **Guardian Mode Mini-Map** is integrated directly inside the active Guardian card on the dashboard.

### Layout & Appearance
- **Container:** Dark navy vector canvas (`#0F172A`), rounded 16px (`rounded-xl`), slate border (`border-slate-800`).
- **Background Pattern:** Dot matrix radial pattern (`bg-[radial-gradient(#38BDF8_1px,transparent_1px)]`).
- **Header Badge:** Glassmorphism overlay (`bg-slate-900/90 backdrop-blur-md`) displaying status (`● GUARDIAN JOURNEY PATH` vs `⚠️ ROUTE DEVIATION DETECTED`).
- **Current Location Marker (YOU):** Pulsing halo, emerald green fill (`#10B981`) or amber (`#F59E0B`) when off-route, navigation arrow icon.
- **Destination Marker (Target):** Cyan fill (`#06B6D4`), finish flag icon (`Flag`), destination name label.
- **Trajectory Line:** Vector line connecting current location to destination. Green dashed line in normal monitoring state; amber/orange dashed line when off-route > 500m.
- **Footer Readout:** Monospace coordinates bar (`LAT`, `LON`) for target and current position.

---

# 37. Phase 8 Safe Route UI + Map Architecture (COMPLETE + REAL-DATA VALIDATED)

## 37.1 Safe Route Page Layout

The Safe Route page is the **primary route-planning and Guardian Mode activation interface**. It combines route selection, safety analysis, and Guardian Mode into a single integrated experience.

```text
┌──────────────────────────────────────────────────────────────────┐
│ SURAKSHA AI Safe Route                                           │
├────────────────────────┬─────────────────────────────────────────┤
│ Route Planning Panel   │                                         │
│                        │          Leaflet Map                    │
│ [Origin input]         │   (OpenStreetMap / Esri satellite)      │
│ [Destination input]    │                                         │
│ [Analyze Routes]       │   Route polylines (ORS road geometry)   │
│                        │   Police / Hospital / Safety markers    │
│ Route 1 Card           │   Risk color overlays (Green/Amber/Red) │
│ Route 2 Card           │                                         │
│ Route 3 Card           │   Viewport controls:                    │
│                        │   [+] [-] [Reset] [Locate] [Fullscreen] │
│ ──────────────────── │                                         │
│ Guardian Mode Status   │   Map mode buttons:                     │
│ ● ACTIVE               │   [Roadmap] [Satellite] [Hybrid]        │
│ Deviation / Stoppage   │                                         │
│                        │   Attribution footer:                   │
│ [End Guardian Mode]    │   OSM © / Esri © / OpenRouteService ©  │
└────────────────────────┴─────────────────────────────────────────┘
```

### Layout Rules
- **Desktop (≥ 1024px):** 12-column grid. Left panel = 5 columns (route cards + Guardian status). Right panel = 7 columns (Leaflet map). Both columns stretch to equal height.
- **Mobile (< 1024px):** Single column. Route cards stack above map.
- **Map container fills available height** without blank space below. `items-stretch` grid with `h-full` on the map column.

---

## 37.2 Map Stack

| Mode | Provider | Description |
|---|---|---|
| Roadmap | OpenStreetMap raster tiles | Standard street map with road labels |
| Satellite | Esri World Imagery | Photographic aerial imagery |
| Hybrid | Esri World Imagery + Esri World Boundaries and Places | Aerial imagery with place/boundary labels |

**Routing geometry:** OpenRouteService Directions API v2 (`driving-car`). Do NOT use Mapbox tiles or Mapbox routing.

**Attribution:** All map modes display a persistent attribution footer crediting OSM contributors, Esri, and OpenRouteService. Attribution must never be hidden.

---

## 37.3 Route Cards

Each route card displays:

```text
┌────────────────────────────────────────────────┐
│ 🛡️ SURAKSHA RECOMMENDED ★   [OFFICIAL DATA]    │
│ ✅ Safest Route                                │
│ Via Anantapur Main Road                        │
│ 3.8 km · 11 min                               │
│ Risk: 20/100 (LOW)  Confidence: MEDIUM         │
│ Routing: OpenRouteService                      │
│ Geometry: Verified road route                  │
│                                                │
│ ✓ 1 police station within 1.0 km              │
│ ✓ 1 hospital within 1.0 km                    │
└────────────────────────────────────────────────┘
```

**Rules:**
- Route names use clean capitalization derived from ORS road/step information ("Via Anantapur Main Road"). Never display "(Estimated)" for verified ORS routes.
- `[OFFICIAL DATA]`, `[REAL PUBLIC DATA]`, or `[ESTIMATED / DATA GAP]` classification tags are shown based on actual provenance.
- Routing provider is always shown (`Routing: OpenRouteService`).
- Geometry verification is always shown (`Geometry: Verified road route` vs `Geometry: Estimated / fallback`).
- Equal-risk routes show: "Insufficient evidence to distinguish route safety."

---

## 37.4 Guardian Mode Integration in Safe Route

Guardian Mode is integrated directly into the Safe Route page. There is **no standalone Guardian Mode widget on the main dashboard**.

**Flow:**
1. User enters origin and destination.
2. ORS returns genuine routes with verified geometry.
3. User selects a route.
4. Guardian Mode **automatically starts** — no separate button press required.
5. Guardian Mode status panel appears within the Safe Route page.
6. User can end Guardian Mode from the Safe Route page.

**Guardian Mode status panel inside Safe Route:**
```text
● GUARDIAN MODE ACTIVE — Monitoring location, deviation, and stoppage

Route: Via Anantapur Main Road
Deviation: Within 500m ✓
Stoppage: Normal movement ✓
Status: Monitoring

[End Safe Route / Stop Guardian Protection]
```

**Geometry gate:** If the selected route has `isEstimatedGeometry === true`, Guardian Mode does NOT start. The UI shows: "Guardian Mode unavailable — verified route geometry required."

---

## 37.5 Risk Overlays on Map

Risk-colored polyline segments:
- **Low (0–30):** `#10B981` (Green glow)
- **Moderate (31–60):** `#F59E0B` (Amber glow)
- **High (61–100):** `#EF4444` (Red glow)

Police station markers: blue shield icon
Hospital markers: green cross icon
Safety zone markers: purple/teal polygon/circle

---

## 37.6 Map Responsive Behavior

- Map container fills its intended parent area (`h-full`, `w-full`).
- No blank/empty space below or to the right of the map.
- `map.invalidateSize()` called after DOM mount to prevent Leaflet tile rendering gaps in flex/grid containers.
- Map mode buttons (Roadmap/Satellite/Hybrid) are always visible.
- Attribution footer always present and readable.

---

## 37.7 Data Provenance Display

The Dynamic Data Coverage panel discloses:

| Data Type | Classification | Displayed As |
|---|---|---|
| ORS route geometry | Routing Provider Geometry | "Routing: OpenRouteService · Geometry: Verified road route" |
| OSM police/hospital | Real Public Data | "[REAL PUBLIC DATA]" |
| NCRB 2023 district stats | Official Data | "[OFFICIAL DATA]" |
| Estimated/gap data | Estimated / Data Gap | "[ESTIMATED / DATA GAP]" |
| TEST/DEMO records | Test/Demo | Never shown in production risk scores (0 points) |

**NCRB limitation:** Always disclose that NCRB 2023 is district-level historical context, not street-level or real-time crime data.

---

## 37.8 Attribution Requirements

The following attribution is required in the Safe Route UI:

```text
© OpenStreetMap contributors | Imagery © Esri | Routing © OpenRouteService
```

Do not claim Google Maps is being used. The UI may be described as a "Google-Maps-style navigation experience" in marketing copy, but actual technical attribution must name the real providers (OSM, Esri, OpenRouteService).

---

# 38. Emergency Location Map Real Geographic Map Specification (`LiveMap.js`)

The **Real-Time Emergency Location Map** (`LiveMap.js`) renders live tracking data on the same real geographic Leaflet tile foundation as `SafeRouteMap.js`.

### 38.1 Visual Components
- **Tile Foundation**: OpenStreetMap (Roadmap default), Esri World Imagery (Satellite), and Esri Boundaries & Places (Hybrid).
- **Emergency Marker**: Custom red SURAKSHA AI emergency pin with white icon, white border, drop shadow, and a 1.5s pulsing red background halo.
- **Z-Order Index**: `zIndexOffset: 1000` via `.setZIndexOffset(1000)` ensures emergency marker floats above polyline paths and accuracy circles.
- **Accuracy Circle**: `L.circle` with `fillOpacity: 0.12`, `#EF4444` stroke, dashed border, matching real GPS accuracy meters (`±accuracy`).
- **Movement Path**: `L.polyline` connecting historical coordinates with `#0270F7` stroke and `5, 5` dash pattern.
- **Top Header Overlay**:
  - Left: `LIVE GPS TRACKING ACTIVE` badge with pulsing red indicator, and `±accuracy` confidence badge.
  - Right: Map mode selector pills (`Roadmap`, `Satellite`, `Hybrid`) and zoom/re-center action buttons.
- **Bottom Footer Bar**: LAT / LON monospace display and live location update timestamp readout (`Updated at ...`).
