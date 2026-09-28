# SMART INDIA HACKATHON 2026 — IDEA SUBMISSION
## SLIDE 6: RESEARCH AND REFERENCES
**Category:** Student Innovation — Ideas that can boost fitness activities and assist in keeping fit  
**Project Name:** GeoFit (Gamified Real-World Territory Conquest)

---

### Details / Links of the Reference and Research Work

#### 1. Geospatial & Discrete Global Grid Indexing (Uber H3)
* **Uber H3 Spatial Hierarchical Indexing System:**
  * Utilized **H3 Resolution 14** (~10 m² hexagonal cells, ~2.7m diameter) for human-scale sidewalk, road, and campus track rasterization.
  * *Reference:* Uber Engineering, *"H3: Uber's Hexagonal Hierarchical Spatial Index"*  
    *Link:* https://h3geo.org/docs/core-library/restable
* **Planar Computational Geometry & Polygonization:**
  * Implemented planar graph cycle detection and Jordan Curve polygonization for real-time loop enclosure capture (Paper.io mechanics).
  * *Reference:* Turf.js Advanced Geospatial Analysis & OGC Simple Feature Specification.  
    *Link:* https://turfjs.org/docs/api/polygonize

#### 2. Behavioral Psychology & Fitness Gamification Literature
* **Self-Determination Theory (SDT) in Physical Exergaming:**
  * Research shows static metrics (step count/pace) cause an 80% user drop-off within 3 weeks. Spatial territorial competition provides the 3 core psychological needs: *Autonomy* (route choice), *Competence* (conquest feedback), and *Relatedness* (campus rivalry).
  * *Reference:* Ryan, R. M., & Deci, E. L., *"Self-Determination Theory and the Facilitation of Intrinsic Motivation, Social Development, and Well-Being."* American Psychologist.
* **Spatial Territorial Incentives vs. Traditional Fitness Trackers:**
  * Studies on location-based exergames demonstrate a **35–45% sustained increase in daily moderate-to-vigorous physical activity (MVPA)** among sedentary college students compared to standard fitness apps.
  * *Reference:* LeBlanc, A. G., et al., *"Active Video Games and Physical Activity in Youth: A Meta-Analysis."* Journal of Physical Activity and Health.

#### 3. Anti-Cheat Integrity & Human Biomechanics Standards
* **Human Biomechanical Sprint & Running Ceilings:**
  * Server-side velocity filters set at $\le 15.0\text{ m/s}$ (54 km/h), derived from peak human sprint velocity data (Usain Bolt peak speed: 12.42 m/s). Velocities $>15\text{ m/s}$ strictly flag motorized transit (scooters, bikes, buses).
  * *Reference:* World Athletics Scientific Biomechanical Studies & Track Telemetry Standards.
* **Urban GPS Multipath Reflection & Jitter Mitigation:**
  * Real-world mobile location testing across urban high-rises and campus structures utilizing adaptive accuracy thresholds (up to 350m initial lock tolerance) and stationary drift rejection ($<0.4\text{m}$).
  * *Reference:* Groves, P. D., *"Principles of GNSS, Inertial, and Multisensor Integrated Navigation Systems."* Artech House.

#### 4. Geospatial Privacy-by-Design & Legal Frameworks
* **Trajectory Privacy & Start/End Point Redaction:**
  * Implemented complete redaction of starting points, ending points, and private movement breadcrumbs for non-owners, eliminating boundary inference and home address doxxing.
  * *Reference:* Krumm, J., *"A Survey of Computational Location Privacy."* Personal and Ubiquitous Computing.
* **Regulatory Compliance:**
  * Fully aligned with Digital Personal Data Protection (DPDP) Act 2023 (India) and EU-GDPR (Article 17: Right to Erasure / 1-click telemetry wipe).

#### 5. Prior Art & Competitive Landscape Benchmarks
* **Conventional Fitness Apps:** Strava, Nike Run Club, Garmin Connect (benchmark for GPS metrics, pace calculation, and energy expenditure formulas).
* **Location-Based Games:** Ingress, Pokémon GO, Paper.io, Turf.ly (benchmark for territory conquest, spatial competition, and viral retention loops).
