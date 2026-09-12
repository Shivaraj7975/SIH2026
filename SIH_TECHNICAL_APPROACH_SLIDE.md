# SMART INDIA HACKATHON 2026 — IDEA SUBMISSION
## SLIDE 3: TECHNICAL APPROACH
**Category:** Student Innovation — Ideas that can boost fitness activities and assist in keeping fit  
**Project Name:** GeoFit (Gamified Real-World Territory Conquest)

---

### 1. Technologies to be used (programming languages, frameworks, hardware)

* **Frontend & Mobile Client:**
  * **Core Stack:** React 18, Vite (Progressive Web Application — lightweight, battery-efficient mobile execution).
  * **Map & Spatial Rendering:** MapLibre GL, Turf.js (planar polygon calculation & loop intersection tests).
  * **Geographic Tiling Engine:** Uber H3-js (**Resolution 14** — human-scale **~10 m²** micro-hexagons, ~2.7m diameter).
* **Backend Server & Real-Time Engine:**
  * **Runtime & API:** Node.js, Express REST API.
  * **Real-Time Multiplayer Sync:** Socket.IO / WebSockets (sub-100ms territory conquest events broadcast to competitors).
  * **Database & Indexing:** SQLite (WAL mode) / PostgreSQL + PostGIS (immutable audit logs & territory ownership).
* **Anti-Cheat & Validation Engine:**
  * Velocity cap algorithms ($\le 15\text{ m/s}$ / 54 km/h), Kalman GPS jitter rejection, and cryptographic activity signing.
* **Hardware Requirements:**
  * **Zero specialized or expensive hardware required**: Runs on any consumer Android / iOS smartphone with standard GPS location.

---

### 2. Methodology and process for implementation (Flow Charts / Images / working prototype)

#### Architecture Flowchart:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM IMPLEMENTATION FLOW                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [1. Mobile GPS Telemetry]         [2. Server Anti-Cheat]          [3. Spatial Geometry Engine]
  ┌───────────────────────┐         ┌────────────────────┐          ┌────────────────────────┐
  │ Real-Time GPS Sensor  │ ──────► │ • Velocity Audit   │ ───────► │ • Uber H3 Res-14 Grid  │
  │ (Lat, Lng, Accuracy)  │ (HTTPS) │   (<15 m/s human)  │          │   (~10 m² micro-cells) │
  │ Running / Walking     │         │ • Jitter Filter    │          │ • Planar Loop Closure  │
  └───────────────────────┘         │ • Anti-Spoof Check │          │   (Paper.io Polygon)   │
                                    └────────────────────┘          └───────────┬────────────┘
                                                                                │
 [6. Live Multiplayer Map]        [5. Real-Time Broadcast]                      ▼
  ┌───────────────────────┐         ┌────────────────────┐          ┌────────────────────────┐
  │ Interactive Grid      │ ◄────── │ Socket.IO Push     │ ◄─────── │ [4. Database State]    │
  │ Conquered & Glowing   │ (WS)    │ to Rival Athletes  │          │ • Claimed Cells Stored │
  │ Leaderboard Updated   │         │ (Zero GPS Leaked)  │          │ • Distance & Pace Log  │
  └───────────────────────┘         └────────────────────┘          └────────────────────────┘
```

#### Step-by-Step Implementation Methodology:

1. **Continuous Telemetry & Anti-Cheat Validation:**
   * Smartphone acquires GPS coordinates during active outdoor movement.
   * Server validates human motion limits ($\le 15\text{ m/s}$) and ignores static GPS noise ($<0.4\text{m}$) to eliminate vehicular transit (bikes, buses) and indoor spoofing.
2. **Dual Territory Capture Engine:**
   * **Corridor Trajectory:** Running straight claims a continuous strip of ~10 m² micro-hexagons along walkways and roads.
   * **Paper.io Loop Enclosure:** Closing a physical circuit around a campus quad, field, or park triggers planar polygonization, instantly capturing all enclosed interior cells.
3. **Student Privacy-by-Design:**
   * Athletes can conquer hexagons everywhere (including outside their door).
   * Runner starting points, ending points, and routes are **strictly redacted (`null`)** from public views; rivals only see claimed colored tiles on the tactical map.
4. **Real-Time Multiplayer & 3-Sector Leaderboards:**
   * Conquered cell IDs are broadcast via WebSockets in sub-100ms.
   * Live rankings updated across **Distance Covered**, **Current Holding Area**, and **Total Area Captured** on Daily and Weekly cycles.

---

### 3. Working Prototype Status
* **Full-Stack Working Prototype Tested & Verified:**
  * Production client bundle compiled with zero errors across 1,981 modules.
  * Backend automated verification suite passing (`12/12 test suites active`).
  * Live map, GPS tracking HUD, simulation mode, and real-time conquest broadcast fully functional.
