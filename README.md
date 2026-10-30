# Suraksha AI — Master Repository

Suraksha AI is a proactive safety platform built on a **Prevent → Detect → Respond** model. It includes a mobile safety client, a web monitoring dashboard, an Express backend coordinator, and a Python FastAPI risk analysis engine.

## Project Structure

- `server/`: Node.js + Express API server and Socket.IO coordinator
- `web/`: Next.js web application (PC safety dashboard)
- `mobile/`: React Native Expo mobile application
- `ai-service/`: Python + FastAPI intelligence service
- `Documentation/`: API specifications, schemas, design rules, and project roadmap

## Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Python](https://www.python.org/) (v3.10+ recommended)
- [Expo CLI](https://docs.expo.dev/) (for mobile application development)

### 2. Environment Setup

Copy `.env.example` to `.env` in the server directory and configure your local settings:

```bash
cd server
cp .env.example .env
```

Define the local variables:

- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: Connection string to your MongoDB database (Atlas or local)
- `JWT_SECRET`: Secret token for JWT signatures

### 3. Installation & Run

Refer to each directory's instructions for development setup and startup commands.
- **Server**: `npm install` && `npm run dev`
- **Web**: `npm install` && `npm run dev`
- **Mobile**: `npm install` && `npx expo start`
- **AI Service**: Install virtual environment, `pip install -r requirements.txt`, and run `uvicorn app.main:app --reload`

## Project Status Summary
- **Phase 1 — Foundation & Health Check:** COMPLETE + VERIFIED ✅
- **Phase 2 — Authentication & Security:** COMPLETE + VERIFIED ✅
- **Phase 3 — User & Trusted Circle Core:** COMPLETE + VERIFIED ✅
- **Phase 4 — Silent SOS & Emergency Core:** COMPLETE + VERIFIED ✅
- **Phase 5 — Live GPS & Real-Time Tracking:** COMPLETE + VERIFIED ✅
- **Phase 6 — AI Risk Detection Engine:** COMPLETE + VERIFIED ✅
- **Phase 7 — Guardian Mode & Journey Mini-Map:** COMPLETE + VERIFIED ✅
- **Phase 8 — AI Safe Route:** COMPLETE + REAL-DATA VALIDATED ✅
- **Phase 9 — AI Safety Assistant, Voice SOS, Legal RAG, Emergency Evidence & Notifications:** COMPLETE + VERIFIED ✅
