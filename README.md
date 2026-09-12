# GeoFit — Real-World Territory Conquest & Fitness Gamification

GeoFit turns real-world running, walking, and outdoor cardio into a live multiplayer territory conquest game. Athletes claim hexagonal geographic micro-sectors (H3 resolution 14, ~10 m² per cell) as they move through campuses and cities, defend their home turf against rival runners, and climb daily and weekly leaderboards.

> 📖 **Looking for an in-depth breakdown of how the entire system, gameplay mechanics, and architecture work? Check out the [Comprehensive Project Overview](PROJECT_OVERVIEW.md).**

---

## ⚡ Key Highlights & Architecture

- **Territory Engine**: Uber H3 hierarchical spatial index (**Resolution 14 ~ 10 m² per cell**, diameter ~2.7m) matching college paths, sidewalks, and running tracks for ultra-precise conquest mapping.
- **Monotonic Territory Mechanics**:
  - **Total Area Captured**: Monotonically cumulative count of all verified conquered ground (never decreases, celebrating lifetime effort).
  - **Current Holding Area**: Live map grid ownership that dynamically reflects active territory and rival takeovers.
- **Competitions & Leaderboards**:
  - Strictly **Daily** and **Weekly** standings.
  - Three specialized sectors: **Distance Covered**, **Current Holding Area**, and **Total Area Captured**.
- **Real-Time Multiplayer**: WebSocket live event stream pushing notifications when rivals conquer adjacent territory.
- **Anti-Cheat & Noise Filtering**: Speed cap validation, unrealistic acceleration checks, and GPS jitter rejection.
- **Privacy & Safety by Design**: 
  - **Doorstep Conquest Enabled**: Conquers hexagons everywhere you move (including outside your door).
  - **Strict Path & Endpoint Privacy**: Other athletes can **never** see your starting point, ending point, or exact running/walking route. Rivals only see public colored hexagon tiles on the map.
- **Modern UI**: Clean White & Slate aesthetic, deep slate typography, and purple/dark-blue technical accents with micro-interactions.

---

## 🛠️ Project Structure

```
SIH/
├── client/                     # Vite + React 18 Single-Page Application
│   ├── src/
│   │   ├── components/         # HUD, Map, Modals, AppShell, UI components
│   │   ├── hooks/              # Auth, WebSocket, and GPS telemetry hooks
│   │   ├── pages/              # Dashboard, Map, Leaderboard, Activities, Login, Profile
│   │   └── lib/                # API client, Toast notifications, Turf & H3 utils
│   └── package.json
│
├── server/                     # Node.js + Express + Socket.IO Backend
│   ├── src/
│   │   ├── config/             # SQLite / PostgreSQL configuration
│   │   ├── db/                 # Schema migrations & multi-city seed generators
│   │   ├── repositories/       # Territory, Users, Activities, Leaderboard DB access
│   │   ├── services/           # Auth, Territory capture, Anti-cheat, Aggregation
│   │   ├── realtime/           # Socket.IO territory sync and alert emitters
│   │   └── routes/             # RESTful endpoints for all modules
│   └── package.json
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm` (bundled with Node)

### 1. Clone the Repository
```bash
git clone https://github.com/Shivaraj7975/SIH2026.git
cd SIH2026
```

### 2. Backend Setup
```bash
cd server
npm install
npm run migrate
npm run seed     # Seeds demo athletes (shivaraj, rahul, priya) and multi-city territory
npm run dev      # Starts server on http://localhost:5000
```

### 3. Frontend Setup
In a separate terminal:
```bash
cd client
npm install
npm run dev      # Starts frontend on http://localhost:5173
```

---

## 🔑 Demo Access
You can log in instantly using 1-click demo profiles on the sign-in screen or enter any username to auto-register:
- **Username**: `shivaraj` (or `rahul`, `priya`, `alex`)
- **Password**: `password123` (or any password)

---

## 🧪 Testing & Verification
The backend includes a comprehensive test suite covering territory invariants, anti-cheat, and real-time mechanics:
```bash
cd server
npm run test:all
```
