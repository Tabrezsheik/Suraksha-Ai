# Suraksha AI

<div align="center">
  <img src="web/suraksha-ai.jpeg" alt="Suraksha AI banner" width="900" />
</div>

<h1 align="center" style="font-size: 72px; font-weight: 800; letter-spacing: 0.08em; color: #0d3a68; margin-top: 16px; margin-bottom: 8px;">SURAKSHA AI</h1>
<p align="center" style="font-size: 28px; font-weight: 500; letter-spacing: 0.18em; color: #0d7ab8; margin-top: 0; margin-bottom: 24px;">INTELLIGENT PROTECTION</p>

Suraksha AI is a proactive safety platform built around a Prevent → Detect → Respond model. It combines a mobile safety companion, a web monitoring dashboard, an Express backend coordinator, and an AI-powered intelligence layer to help people stay safe before, during, and after critical situations.

## Why Suraksha AI?

Suraksha AI empowers individuals to stay safer through continuous risk awareness, emergency alerts, live tracking, and AI-assisted guidance when it matters most. The platform is designed for real-world safety scenarios where quick response and trusted communication can make a difference.

## Core Capabilities

- AI-assisted risk analysis for unsafe situations and travel patterns
- Real-time location sharing and live GPS monitoring
- Silent SOS and emergency alert workflows
- Trusted-circle notifications and guardian access
- AI safe-route recommendations and protective journey tracking
- Voice-powered emergency support and guidance
- Evidence collection and notification pipelines for response workflows

## Repository Structure

- `server/`: Node.js + Express backend, APIs, authentication, and coordinator logic
- `web/`: Next.js dashboard for monitoring and admin workflows
- `mobile/`: React Native Expo application for end-user safety features
- `ai-service/`: Python + FastAPI intelligence service for risk detection and recommendations
- `Documentation/`: technical design, API docs, schemas, and project roadmap

## Tech Stack

- Frontend: Next.js, React, Expo
- Backend: Node.js, Express.js, Socket.IO
- AI & Intelligence: Python, FastAPI, ML/AI workflows
- Data & Storage: MongoDB, structured safety records and event data
- Security: JWT authentication, secure coordination, and route/system protection

## Getting Started

### Prerequisites

- Node.js v18+
- Python 3.10+
- Expo CLI
- MongoDB instance or Atlas connection

### Backend Setup

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

### Web Dashboard

```bash
cd web
npm install
npm run dev
```

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

### AI Service

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Project Status

- Phase 1 — Foundation & Health Check: Complete
- Phase 2 — Authentication & Security: Complete
- Phase 3 — Trusted Circle & User Safety Core: Complete
- Phase 4 — Silent SOS & Emergency Core: Complete
- Phase 5 — Live GPS & Real-Time Tracking: Complete
- Phase 6 — AI Risk Detection Engine: Complete
- Phase 7 — Guardian Mode & Journey Monitoring: Complete
- Phase 8 — AI Safe Route: Complete
- Phase 9 — AI Safety Assistant, Voice SOS, Legal RAG, Evidence & Notifications: Complete

## Documentation

Detailed project documentation is available in the `Documentation/` directory, covering requirements, system design, API contracts, database design, testing, and deployment guidance.

## License

This project is licensed under the MIT License.
