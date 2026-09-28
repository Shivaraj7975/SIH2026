# GeoFit UI Refinement Changelog

## 1. Layout: Map First
- **Full-Bleed Map Viewport**: Tactical map fills the viewport immediately below the navbar (`h-[calc(100vh-68px)]`) with zero scroll required on first load.
- **Bottom Sheet Live Run HUD** (`src/components/WorkoutHUD.jsx`):
  - Converted from static top block to an overlaying bottom sheet (dark `#0F172A`, 24px top radius, backdrop blur, `shadow-2xl`).
  - **Collapsed state**: Compact glanceable bar with 3 mini stats (Distance, Time, Pace) and a Start button.
  - **Expanded state**: Full large tabular display stats, mode controls, secondary chips, and 56px action button.
- **Floating Header Pill**: Converted the static map title block into a slim floating glass pill (`Live Tactical Territory Map` + `LIVE GRID` badge + hex count) on map top-left, with a dedicated `Sync Grid` icon button.
- **Mode Switch**: Converted into a 40px tall compact segmented control (`Test Run | Live GPS`) inside the HUD header.
- **Collapsed Circuit Selector**: Road Circuit dropdown and speed chips (`1x`, `2x`, `4x`, `8x`) collapsed into a single compact row under the mode switch when Test Run is active.
- **Desktop 70/30 Split**: Desktop layout anchors the bottom sheet as a floating card on the bottom-left (`w-[420px]`) and reserves a 360px right side panel for Sector Radar, Legend, and Dominance breakdown.
- **Mobile Drawer**: Side panel components accessible via a slide-over drawer so the mobile map remains 100% full bleed.

## 2. Territory Colors & Single Source of Truth
- **Tokens Defined**:
  - `My Territory`: `#7C3AED` (violet, 0.40 fill opacity, 2.5px solid stroke in `#5B21B6`).
  - `Rival Territory`: Cycle across `[#06B6D4, #EC4899, #EAB308, #3B82F6]` (cyan, pink, yellow, blue, 0.30 fill opacity, 1.5px stroke).
  - `Contested Territory`: `#F59E0B` (amber, 0.30 fill opacity, 1.5px dashed stroke).
  - `Unclaimed / Neutral`: Transparent fill, 0.5px `#CBD5E1` outline at 30% opacity.
- **Removed Red/Danger from Territory**: Pure red (`#EF4444`) is strictly reserved for territory-lost alerts, anti-cheat flags, and destructive actions.
- **Matching Legend Swatches**: Swatches in `TerritoryLegend.jsx` match map fill and stroke tokens 100%.

## 3. Visual Hierarchy & Surface Weights
- The **Live Run HUD Bottom Sheet** is the single primary-weight dark surface on screen.
- Surrounding cards and side panels use clean white surfaces with 1px `#E2E8F0` borders and `shadow-sm`.
- Removed decorative glows around purple CTA buttons; replaced with clean solid fill and subtle `shadow-md`.

## 4. Typography Polish
- Monospace replaced with **Inter (500/600)** for all UI labels, badges, and profile chips.
- Tabular numerals (`font-variant-numeric: tabular-nums`) preserved on all stats to eliminate mid-run digit jitter.
- Display font (`Space Grotesk 700`) used exclusively for big HUD numbers and primary headings.
- Section labels set to 11–12px uppercase, tracking `0.06em`, color `#64748B`, Inter 600.
- Profile chip updated: Name in 14px/600 Inter, subtitle "Rank #1 · 724 hexes" in 12px Inter.

## 5. HUD Details & Mid-Run Usability
- **Pace Empty State**: Formatted as plain text `-- : --` in muted `#64748B` with matching size and aligned tabular colons.
- **Units**: Units (`km`, `min/km`) set to 10–12px baseline-aligned `#94A3B8`.
- **Lime Active Timer**: Preserved high-contrast `#A3E635` timer.
- **Dynamic Hex Count Badge**: Uses lime `#A3E635` only when claimed hexes > 0, otherwise muted slate.
- **Action Button**: Full-width 56px tall button with "Start Run" label and smaller "(Test mode)" sub-label. During runs, transitions to a 72px circular Pause button + 1.2s hold-to-confirm Stop button.

## 6. Map Controls
- Grouped controls into a vertical right-edge cluster (44px buttons, white/90% glass, 12px radius, `shadow-md`).
- Prominent **Recenter on Me** crosshair button at the top of the cluster.
- Includes Zoom `+` / `-`, Night/Dark mode toggle, 3D pitch toggle, and North compass reset.

## 7. Polishing & Accessibility
- Tap targets set to minimum 44px on all interactive elements.
- Active nav tab set to `#7C3AED` with white text and 44px tap height.
- WCAG AA contrast compliance maintained across all text and UI elements.
