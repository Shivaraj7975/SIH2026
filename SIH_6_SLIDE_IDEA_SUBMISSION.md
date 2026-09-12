# SMART INDIA HACKATHON (SIH) 2026 — OFFICIAL 6-SLIDE SUBMISSION
**Problem Statement Track:** Student Innovation — Ideas that can boost fitness activities and assist in keeping fit  
**Project Name:** GeoFit — Real-World Multiplayer Territory Conquest & Fitness Gamification  
**Constraints Followed:** Exactly 6 Slides, Point-wise format, Zero bulky paragraphs, High clarity diagrams.

---

## 📄 SLIDE 1: TITLE SLIDE
* **Idea / Project Title:** GeoFit — Gamifying Physical Fitness via Real-World Hexagonal Territory Conquest
* **Problem Statement Category:** Student Innovation (Ideas that can boost fitness activities and assist in keeping fit)
* **Team Name:** [Your Team Name]
* **Team Members / Leader:** [Your Team Leader & Member Names]
* **Institute / College:** [Your College / Institute Name]
* **Core Value Proposition:** *Transforming sedentary campus routines into an engaging, competitive outdoor turf-war game where every step conquers real-world territory.*

---

## 📄 SLIDE 2: PROPOSED SOLUTION / IDEA DESCRIPTION
* **The Problem Addressed:**
  * **Sedentary Habits:** 8–10 hours of daily sitting across college lectures, coding marathons, and exam revisions.
  * **The Motivation Plateau:** Traditional fitness apps (Strava, step counters) suffer an 80% user drop-off within 3 weeks due to repetitive numbers and lack of immediate reward.
* **Our Novel Solution:**
  * Converts physical walking, jogging, and running into **H3 hexagonal territory conquest** on a shared campus & neighborhood map.
  * Combines physical cardiovascular fitness with the strategic fun of *Paper.io* and *Pokemon GO*.
* **Core Mechanics:**
  * **Corridor Conquest:** Sprinting straight captures every ~10 m² hexagonal cell along your path.
  * **Polygon Loop Enclosure:** Running around a campus park, hostel block, or ground captures the entire interior polygon at once.
  * **Live Turf Wars:** Opponents can challenge and recapture sectors from each other in real-time.

---

## 📄 SLIDE 3: TECHNICAL APPROACH

### 1. Technologies to be used (programming languages, frameworks, hardware)
* **Frontend & Mobile Client:**
  * React 18, Vite (Progressive Web App for ultra-lightweight, battery-efficient mobile execution).
  * MapLibre GL, Turf.js (Geospatial calculations & planar loop polygonization).
  * Uber H3-js (**Resolution 14** — human-scale **~10 m²** micro-hexagons, ~2.7m diameter).
* **Backend Server & Real-Time Engine:**
  * Node.js, Express REST API.
  * Socket.IO / WebSockets (Sub-100ms territory conquest broadcast).
  * SQLite (WAL mode) / PostgreSQL + PostGIS (Spatial indexing & immutable audit logs).
* **Anti-Cheat & Validation Engine:**
  * Server-side velocity cap filters ($\le 15\text{ m/s}$ / 54 km/h), Kalman GPS jitter rejection, and cryptographic activity signing.
* **Hardware Requirements:**
  * **Zero specialized hardware required**: Operates on any standard consumer Android / iOS smartphone with GPS.

### 2. Methodology and process for implementation (Flow Charts / Images / working prototype)

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

* **Step 1 — Real-Time Telemetry & Anti-Cheat:** Captures live GPS coordinates; rejects vehicle speeds (>15 m/s) and stationary indoor noise (<0.4m).
* **Step 2 — Spatial Tiling:** Maps coordinates into Uber H3 Res-14 micro-hexagons (~10 m²).
* **Step 3 — Geometric Enclosure:** Planar engine polygonizes closed loops to conquer interior areas.
* **Step 4 — Privacy Enforcement:** Conquers territory anywhere (including doorstep); strictly hides start/end points and running paths from rivals.
* **Step 5 — Real-Time Sync:** WebSockets broadcast updates in sub-100ms to update the live map and 3-sector leaderboard.
* **Working Prototype:** Fully functional, verified backend (12/12 test suites) and production frontend build.

---

## 📄 SLIDE 4: FEASIBILITY & VIABILITY
* **Technical Feasibility:**
  * **No Hardware Dependency:** Requires zero smartwatches or ground beacons; accessible to every student with a smartphone.
  * **Low Battery & Data Footprint:** Mathematical H3 integer indexing avoids heavy raster downloads; sub-100ms sync uses lightweight JSON payloads (<2KB).
* **Operational & Financial Viability:**
  * Built on open-source frameworks (React, Node.js, SQLite/PostgreSQL, OpenStreetMap).
  * Near-zero infrastructure running cost per campus; scalable to 100,000+ simultaneous athletes.
* **Risk Analysis & Mitigations:**
  * *Risk:* GPS drift in high-rise campus buildings.  
    *Mitigation:* Kalman smoothing and 350m initial lock tolerance.
  * *Risk:* Vehicular cheating (scooters/bikes).  
    *Mitigation:* Server-side acceleration and velocity bounds strictly disqualify motorized speeds.

---

## 📄 SLIDE 5: IMPACT & BENEFITS
* **Impact on Students & Youth:**
  * **Daily Habit Formation:** Replaces guilt-driven exercise with dopamine-driven game progression.
  * **Combatting Lifestyle Diseases:** Direct reduction in youth obesity, cardiovascular stagnation, and screen fatigue.
  * **Mental Health & Stress Relief:** Outdoor physical movement boosts endorphins and sharpens cognitive focus.
* **Campus & Community Benefits:**
  * **Campus Spirit & Camaraderie:** Inter-hostel leagues, department turf wars (e.g., Computer Science vs. Mechanical), and co-op squad runs.
  * **Inclusivity for All Fitness Levels:** Works equally for casual walking, power walking, jogging, and sprint intervals.
* **3-Sector Transparent Recognition:**
  1. **Distance Covered:** Stamina recognition.
  2. **Current Holding Area:** Real-time tactical skill.
  3. **Total Area Captured:** Consistency reward (never drops).

---

## 📄 SLIDE 6: RESEARCH, PRIOR ART & NOVELTY
* **Comparison with Existing Solutions:**
  * *Strava / Nike Run Club:* Static charts, numeric splits; high dropout rate; marathoner bias.
  * *Pokemon GO:* Requires looking at the phone screen constantly while walking, creating safety hazards.
  * *GeoFit (Our Novelty):* Eyes-up running—audio cues announce captures; tactical Paper.io loop enclosure; human-scale ~10 m² micro-hexagons; fair 3-sector leaderboards.
* **Novel Innovations:**
  1. **Dual Territory Invariant Engine:** Monotonically cumulative career area paired with dynamic live holding.
  2. **Planar Loop Enclosure:** First mobile engine to compute real-time interior polygon fills for runners.
  3. **Privacy-by-Design Architecture:** Doorstep territory conquest enabled everywhere while completely redacting starting points, ending points, and private route tracks from public viewers.
* **Future Roadmap:** Inter-college leagues, campus cafeteria reward sponsorships, and Bluetooth heart-rate sensor integration.
