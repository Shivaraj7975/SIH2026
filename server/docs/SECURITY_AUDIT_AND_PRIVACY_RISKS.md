# GeoFit Security Audit & Location Privacy Threat Model

**Document Version**: 1.0.0  
**Status**: Authoritative Reference  
**Last Updated**: September 2026  

---

## 1. Executive Summary

GeoFit is a competitive fitness and territory conquest application built on Node.js, Express, React, MapLibre GL, and H3 spatial indexing. Because fitness applications handle sensitive, highly identifiable geographical telemetry, GeoFit implements **Privacy by Design** and **Defense in Depth** across its backend APIs, database persistence, and client interfaces.

This document details the security controls, privacy safeguards, threat mitigations, and remaining residual risks of the GeoFit platform.

---

## 2. Core Security Controls & Audit Findings

### A. Injection Protection (SQL & NoSQL)
- **Status**: ✅ **Mitigated**
- **Mechanism**: All SQL queries across both PostgreSQL and SQLite fallback engines utilize strict parameterized binding (`$1, $2, ...` and `?` placeholders) in [database.js](file:///d:/SIH/server/src/config/database.js).
- **Validation**: Raw strings are never concatenated directly into SQL execution strings. Numerical and spatial inputs (latitude, longitude, radius, timestamps) are strictly cast and validated via type checks before execution.

### B. Broken Object-Level Authorization (BOLA / IDOR Prevention)
- **Status**: ✅ **Mitigated**
- **Mechanism**:
  - `POST /api/activity`: Server verifies that the authenticated `req.userId` matches the submission owner. Users cannot submit or forge workout sessions on behalf of other athletes.
  - `DELETE /api/activity/:id`: Verifies that `activity.userId === req.userId`. Attempted deletions by non-owners are rejected with `403 Forbidden`.
  - `DELETE /api/privacy/zones/:id` and `/api/privacy/account-data`: Verifies zone ownership and executes cascades strictly scoped to the requesting user ID.

### C. Replay Attack & Duplicate Submission Defense
- **Status**: ✅ **Mitigated**
- **Mechanism**:
  - `activityId` idempotency check prevents duplicate submission of previously processed workouts.
  - Timestamp freshness checks in [AntiCheatService](file:///d:/SIH/server/src/gps/anti-cheat.service.js) reject future clock drifts ($> 60\text{s}$) and backward timestamps ($\Delta t < 0$).
  - Duplicate coordinate filters reject static GPS jitter without creating spurious duplicate history records.

### D. Secure Environment Variable Configuration
- **Status**: ✅ **Mitigated**
- **Mechanism**:
  - Secret keys (`JWT_SECRET`, database passwords, server ports) are loaded strictly through `dotenv` from `.env`.
  - Default fallbacks for development are isolated from production credentials.
  - CORS policies strictly restrict allowable origins to configured client domains (`CLIENT_URL`, localhost Vite ports).

---

## 3. Location Privacy Architecture

```
                      ┌────────────────────────────────────────┐
                      │    Raw Mobile/Browser GPS Sensor       │
                      │  (lat, lng, accuracy, timestamp, speed)│
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼ (Encrypted HTTPS)
                      ┌────────────────────────────────────────┐
                      │      Authoritative Server Engine       │
                      │  - Point-to-Point Anti-Cheat Filter   │
                      │  - Privacy Zone Evaluation (Home/Work) │
                      │  - H3 Spatial Conversion               │
                      └─────────┬────────────────────┬─────────┘
                                │                    │
       (Private Storage)        │                    │ (Public Broadcast)
                                ▼                    ▼
┌──────────────────────────────────────┐  ┌─────────────────────────────────────┐
│       Encrypted DB Persistence       │  │        WebSocket & Public Map       │
│  - Raw GPS Points (Owner-only access)│  │  - ONLY H3 Hex IDs (e.g. 886189...) │
│  - Private Fitness Totals            │  │  - Athlete Display Name & Avatar    │
│  - Redacted from Non-Owner Viewers   │  │  - ZERO exact live GPS coordinates  │
│  - Safe Zones Masked from Territory  │  │  - ZERO raw private polylines       │
└──────────────────────────────────────┘  └─────────────────────────────────────┘
```

### Privacy Safeguards:
1. **Zero Live GPS Broadcast**: Real-time Socket.IO broadcasts transmit *only* discrete H3 cell indices (`h3CellId`), athlete display names, and avatars. Raw GPS points are never emitted over public sockets.
2. **Exact Route Redaction**: When non-owners view activity logs, `routeGeometry` and GPS coordinates are redacted (`null`), preventing route stalking.
3. **Privacy Safe Zones (Home & Workplace)**: Athletes can define custom exclusion circles (e.g., 300m–1000m radius). Any movement inside these safe zones will *never* claim public territory hexes, preventing opponents from deducing the runner's home or office address.
4. **Anonymous Leaderboard Mode**: Athletes can toggle anonymous mode to hide their handle on public rankings.
5. **GDPR / CCPA Data Sovereignty**: Athletes can delete individual workouts or trigger a complete account telemetry purge at any time.

---

## 4. Remaining Known Risks & Mitigation Recommendations

| Threat / Risk | Likelihood | Impact | Current Mitigation | Recommended Production Hardening |
| :--- | :--- | :--- | :--- | :--- |
| **Boundary Inference Attacks** (Opponent analyzes perimeter of unclaimed cells to deduce a privacy zone center) | Medium | Medium | Movement in privacy zones generates 0 territory claims. | Encourage users to set larger privacy zone radii (500m–1000m) and add random jitter to zone boundaries. |
| **OS-Level Developer Mock Location Tools** (Simulating human speeds via GPS spoofing apps) | Medium | Low | Velocity, acceleration, and anomaly validation reject high-speed motorized travel. | Future integration with mobile SDK hardware sensors (step cadence, barometer altitude, BLE heart rate). |
| **Physical Stalking via Public Map Timing** | Low | High | Workouts are only uploaded upon completion (batch submission), not as a live beacon. | Keep live GPS tracking strictly local to client memory during run. |
| **Database Compromise (Direct DB Access)** | Low | High | Application access uses parameterized queries. | Enable TLS/SSL connection strings and AES-256 transparent data encryption (TDE) for production PostgreSQL disks. |

---

## 5. Security Checklist & Audit Sign-Off

- [x] All mutating activity endpoints validate user authentication and ownership.
- [x] Cross-user activity submission is strictly prevented.
- [x] Territory capture mutations are restricted to server-authoritative GPS processing.
- [x] Privacy Zones effectively mask sensitive home and workplace locations.
- [x] Raw GPS points and detailed routes are withheld from public viewers.
- [x] GDPR data deletion and full account purging are fully supported.
- [x] Transparent in-app location disclosure policy is accessible to all users.
