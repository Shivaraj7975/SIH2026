# Limitations of GPS-Based Anti-Cheat in Location Gamification

## Executive Overview

While the GeoFit Anti-Cheat Engine employs mathematical, physical, and temporal models (Kalman-inspired point filtering, maximum human acceleration caps, Haversine velocity calculations, and structural trail analysis), **GPS hardware and browser-level location APIs possess intrinsic physical and environmental limitations**.

Understanding these limitations is essential to balancing competitive integrity with user experience and minimizing false positives.

---

## 1. Physical & Environmental Limitations

### A. Urban Canyons & Multipath Reflection
- **Mechanism**: In dense urban environments with tall glass, concrete, and steel buildings (e.g. downtown skyscrapers), GPS satellite signals do not travel in a straight line from space to the phone antenna. Instead, they bounce off multiple building facades before arriving at the receiver.
- **Symptom**: The receiver calculates pseudo-ranges based on delayed signal arrivals, resulting in momentary jumps (50m–150m) or high positional jitter even when the runner is stationary or running steadily.
- **Engine Countermeasure**: GeoFit does not invalidate an entire activity for isolated accuracy spikes. The engine filters out points with `accuracy > 45m` and recalculates velocity across the verified clean baseline.

### B. Tunnels, Overpasses, and Subsurface Blackouts
- **Mechanism**: Running through underpasses, subway exits, or densely covered canopy trails causes temporary loss of direct satellite line-of-sight.
- **Symptom**: The GPS receiver loses lock for 30–90 seconds. When the runner exits into open sky, the phone acquires a new lock 300m down the road in a single instant.
- **Engine Countermeasure**: Time delta ($\Delta t$) is calculated between the pre-tunnel point and the exit point. As long as the implied average velocity $\Delta d / \Delta t$ remains within human running thresholds ($\le 11.5\text{ m/s}$), the gap is accepted as a legitimate continuous workout rather than a teleportation hack.

---

## 2. Hardware & Operating System Limitations

### A. Background Location Throttling & Battery Savers
- **Mechanism**: Both iOS (CoreLocation) and Android (FusedLocationProvider) aggressively throttle GPS polling when the phone screen is turned off or when Low Power Mode is enabled.
- **Symptom**: Instead of 1 Hz (1 point per second), the browser may receive location updates once every 30–60 seconds, resulting in larger discrete leaps.
- **Engine Countermeasure**: The anti-cheat model evaluates speed as a function of timestamp difference rather than raw point distance, preventing false flags during low-frequency sampling.

### B. Clock Drift, Leap Seconds & Network Time Offsets
- **Mechanism**: Some client devices experience local clock skew or desynchronization when switching between cellular towers and Wi-Fi networks.
- **Symptom**: In rare cases, consecutive timestamps can report identical milliseconds or drift forward/backward.
- **Engine Countermeasure**: The engine enforces monotonic non-decreasing timestamp validation with a tolerant $\le 60\text{s}$ future drift buffer, rejecting explicit backwards time travel while tolerating micro-jitter.

---

## 3. Adversarial & Spoofing Limitations

### A. OS-Level Fake GPS / Developer Mock Locations with Realistic Speeds
- **Mechanism**: Attackers using rooted Android devices, jailbroken iOS devices, or developer mock location apps can simulate a GPS route that artificially advances at 10.5 km/h (a realistic running speed).
- **Limitation**: Pure GPS-based algorithms processing only $(lat, lng, timestamp, accuracy)$ cannot mathematically distinguish between a real human running at 10.5 km/h and a software joystick moving at 10.5 km/h along the exact same path.
- **Recommended Advanced Extensions**:
  1. Sensor Fusion: Correlate GPS movements with hardware accelerometer/gyroscope step cadence (e.g. DeviceMotionEvent API).
  2. Heart Rate Telemetry: Bluetooth Low Energy (BLE) heart rate monitor integration (e.g. Web Bluetooth API).
  3. Cell Tower / Wi-Fi BSSID Geolocation cross-verification.

### B. Human Activity Mode Overlap (Running vs Cycling vs Scooters)
- **Mechanism**: An electric scooter traveling at 18–25 km/h moves at speeds comparable to world-class sprint cycling or downhill intervals.
- **Engine Countermeasure**: GeoFit separates activity modes (`WALK` vs `RUN`) with tailored velocity envelopes (e.g., walking capped at 3.5 m/s, running at 11.5 m/s, vehicle cutoff at 13.5 m/s).

---

## 4. Summary Matrix of Anti-Cheat Rules & Limitations

| Anomaly Type | Detection Method | Classification | False Positive Mitigation |
| :--- | :--- | :--- | :--- |
| **Isolated GPS Jitter** | Accuracy $> 45\text{m}$, $\Delta d < 0.8\text{m}$ | `VALID` (point discarded) | Do NOT fail workout if clean baseline is $\ge 70\%$ intact |
| **Single Discontinuous Leap** | Leap $> 250\text{m}$ at $> 12\text{ m/s}$ | `SUSPICIOUS` | Tagged for review; does not corrupt competitive state |
| **Repeated Teleportation** | $\ge 2$ impossible spatial leaps | `INVALID` | Requires multiple clear breaches |
| **Motorized Vehicle Speed** | Sustained avg speed $> 48.6\text{ km/h}$ | `INVALID` | Exceeds all human sprinting biomechanical limits |
| **Corrupted / Negative Timestamps** | $t_i \le t_{i-1}$ | `INVALID` | Defies chronological physical law |

---

## 5. Architectural Invariant

> **Authoritative Security Invariant**:
> Activities marked as `SUSPICIOUS` or `INVALID` are immutably archived in the database for auditing and diagnostics, but **never** contribute to territory conquest, daily challenges, or weekly/monthly leaderboard rankings.
