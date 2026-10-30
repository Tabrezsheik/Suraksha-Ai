# Suraksha AI

<div align="center">
  <img src="web/suraksha-ai.jpeg" alt="Suraksha AI Banner" width="900" />
</div>

<h1 align="center" style="font-size: 72px; font-weight: 800; letter-spacing: 0.08em; color: #0d3a68; margin-top: 16px; margin-bottom: 8px;">SURAKSHA AI</h1>
<p align="center" style="font-size: 28px; font-weight: 500; letter-spacing: 0.18em; color: #0d7ab8; margin-top: 0; margin-bottom: 24px;">INTELLIGENT PROTECTION</p>

Suraksha AI is a proactive safety platform designed for real-world risk prevention and emergency response. Built around a Prevent → Detect → Respond model, it combines a mobile safety companion experience, real-time situation awareness, trusted-circle communication, and AI-driven rescue guidance to help users act earlier and more confidently in unsafe conditions.

From everyday travel risk awareness to emergency escalation workflows, Suraksha AI enables users to act faster, stay informed, and share critical safety information with trusted contacts when it matters most.

---

## Why Suraksha AI?

Personal safety is not just about reacting during emergencies—it is about identifying risks early, preventing harm, and responding intelligently when incidents occur.

Suraksha AI empowers individuals, families, and guardians by providing:

- Continuous risk awareness and intelligent monitoring
- Live location sharing and emergency coordination
- Silent SOS alert workflows
- Trusted-circle notifications for rapid support
- AI-based recommendations for safe travel and protection
- Voice-assisted guidance in emergency scenarios
- Evidence capture and response-oriented communication

---

## Core Capabilities

- AI-assisted safety intelligence for unsafe situations and travel patterns
- Real-time location sharing and live GPS monitoring
- Silent SOS and emergency alert workflows
- Trusted-circle notifications and guardian access
- AI safe-route recommendations and protective journey tracking
- Voice-powered emergency support and guidance
- Evidence collection and notification pipelines for response workflows

---

## System Overview

Suraksha AI is structured as a multi-layer safety ecosystem:

- Mobile App: end-user smartphone experience for safety check-ins, alerts, and emergency actions
- Web Dashboard: monitoring interface for guardians, admins, and live safety oversight
- Backend API: central coordination, user management, event processing, and communication
- AI Service: risk intelligence, safe-route recommendations, and semantic safety assistance
- Database & Storage: structured data for users, locations, alerts, safety events, and trusted circles

---

## Repository Structure

```bash
Suraksha-AI/
├── server/                 # Node.js + Express backend APIs and coordination logic
├── web/                   # Next.js web dashboard for monitoring and guardianship
├── mobile/                # React Native Expo mobile app for end-user safety features
├── ai-service/            # Python + FastAPI AI intelligence service
├── Documentation/         # Design docs, API docs, requirements, roadmap, and testing notes
├── README.md              # Project overview and setup guide
├── LICENSE                # MIT License
├── .gitignore
└── package.json
```

---

## Technology Stack

### 🛠️ Tech Stack

#### Frontend
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/) 
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://react.dev/) 
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

#### Backend
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/) 
[![Express.js](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white)](https://expressjs.com/) 
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socketdotio&logoColor=white)](https://socket.io/)

#### AI & Safety Intelligence
[![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)](https://www.python.org/) 
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/) 
[![OpenRouter](https://img.shields.io/badge/OpenRouter-FF6B35)](https://openrouter.ai/)

#### Data & Mapping
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/) 
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/) 
[![PostGIS](https://img.shields.io/badge/PostGIS-4F5B8B?logo=postgresql&logoColor=white)](https://postgis.net/) 
[![Leaflet](https://img.shields.io/badge/Leaflet-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/) 
[![Mapbox](https://img.shields.io/badge/Mapbox-000000?logo=mapbox&logoColor=white)](https://www.mapbox.com/) 
[![OpenRouteService](https://img.shields.io/badge/OpenRouteService-3A7BD5)](https://openrouteservice.org/)

#### Security & Auth
[![JWT](https://img.shields.io/badge/JWT-000000)](https://jwt.io/)

---

## Features in Detail

### 1. AI Risk Detection
The system continuously evaluates behavioral, route, and contextual signals to detect potential unsafe scenarios and warn users early.

### 2. Live GPS Monitoring
Users and guardians can monitor live location updates, improving awareness and enabling rapid response during emergencies.

### 3. Trusted Circle Coordination
Users can share safety information with trusted contacts and guardians, enabling faster support in real time.

### 4. Silent SOS & Emergency Alerts
Critical workflows allow users to trigger help without requiring heavy interaction, making the system usable in urgent situations.

### 5. Safe Route Recommendations
AI-powered suggestions help users avoid risky paths and adopt safer alternatives during travel or movement.

### 6. Voice-Assisted Emergency Guidance
The system guides users through important emergency steps using voice-based support and structured safety instructions.

### 7. Evidence & Response Workflows
The platform supports evidence collection and notification pipelines, helping users document and escalate situations effectively.

---

## Project Status

The repository reflects a phased development pipeline with the following status:

- Phase 1 — Foundation & Health Check: Complete
- Phase 2 — Authentication & Security: Complete
- Phase 3 — Trusted Circle & User Safety Core: Complete
- Phase 4 — Silent SOS & Emergency Core: Complete
- Phase 5 — Live GPS & Real-Time Tracking: Complete
- Phase 6 — AI Risk Detection Engine: Complete
- Phase 7 — Guardian Mode & Journey Monitoring: Complete
- Phase 8 — AI Safe Route: Complete
- Phase 9 — AI Safety Assistant, Voice SOS, Legal RAG, Evidence & Notifications: Complete

This signals that the project has reached a substantial feature-complete stage, with a focus on intelligent safety operations and emergency readiness.

---

## Getting Started

### Prerequisites

- Node.js v18+
- Python 3.10+
- Expo CLI
- MongoDB instance or Atlas connection

---

### 1. Backend Setup

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

---

### 2. Web Dashboard Setup

```bash
cd web
npm install
npm run dev
```

Visit:

```bash
http://localhost:3000
```

---

### 3. Mobile App Setup

```bash
cd mobile
npm install
npx expo start
```

---

### 4. AI Service Setup

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## Environment Configuration

Example server configuration:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/suraksha-ai
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

Optional AI configuration:

```env
GEMINI_API_KEY=your_api_key
```

---

## Documentation

Detailed project documentation is available in the `Documentation/` directory, covering:

- Requirements and scope
- System design and architecture
- API contracts
- Database design
- Security and configuration
- Testing and validation
- Deployment guidance
- User manual and roadmap

---

## Security & Data Integrity

Suraksha AI is designed with safety-first principles in mind:

- JWT-based authentication and secure access
- Authorization safeguards for sensitive routes
- Trusted-circle protection and restricted visibility
- Secure coordination of alerts and live updates
- Data protection through controlled access patterns

---

## License

This project is licensed under the MIT License.

---

## Team

This project was developed as a collaborative mini-project by:

- P. Tabrez Ahmad (Lead Developer)
- Y. Srinivas Sameer
- G. Bhavitha Sree
- P. Srivalli
- S. Sravanthi

---

## Project Links

- GitHub Repository: https://github.com/Tabrezsheik/Suraksha-Ai
- Project Type: Full-stack safety platform
- Focus Area: AI-powered personal safety, real-time monitoring, emergency response

---

## Acknowledgments

Built with the goal of improving personal safety, emergency awareness, and intelligent protection for users in everyday, travel, and high-risk scenarios.
