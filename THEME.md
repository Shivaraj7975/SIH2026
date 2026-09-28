# GeoFit Design System & Theme Specification

GeoFit is a real-world territory-conquest running application built on React 18, Tailwind CSS, MapLibre GL, and H3 Hexagonal Grid systems.

---

## 1. Design Principles

1. **Map is the Hero**: UI chrome is quiet and minimal (`bg-white/85` with `backdrop-blur-md` on map overlays). Owned territory is the loudest element on screen.
2. **Glanceable While Moving**: Key stats mid-run are rendered at **72px / 32px** in `Space Grotesk 700` with tabular numbers (`font-variant-numeric: tabular-nums`) so digits never jitter. Readability takes under 1 second even in direct sunlight.
3. **Color = Ownership**: Every athlete receives a distinct territory color from an 8-color colorblind-safe palette. Colors are reinforced with stroke weight and patterns.
4. **Game Energy, Athletic Calm**: Confident and sporty, pairing deep violet (`#7C3AED`) and high-energy lime (`#A3E635`) against crisp slate surfaces.
5. **Battery-Aware**: Continuous looping animations are restricted exclusively to the live GPS location marker pulse and active-run dot. All motion obeys `prefers-reduced-motion`.

---

## 2. Color Tokens & CSS Variables

Tokens are declared on `:root` and mapped directly into `tailwind.config.js` and `src/styles/tokens.css`.

### Surfaces & Chrome
| Token | Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| **Canvas** | `--bg-canvas` | `#F8FAFC` | Main app background |
| **Surface** | `--bg-surface` | `#FFFFFF` | Standard cards & lists |
| **Elevated** | `--bg-elevated` | `#FFFFFF` (`shadow-lg`) | Floating controls & modals |
| **Inverse** | `--bg-inverse` | `#0F172A` | Live Run HUD bottom sheet & dark tooltips |
| **Border** | `--border` | `#E2E8F0` | Subtle hairline dividers |
| **Border Strong** | `--border-strong` | `#CBD5E1` | Interactive borders & card outlines |

### Typography Colors
| Token | Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| **Text Primary** | `--text-primary` | `#0F172A` | Primary headings and values |
| **Text Secondary** | `--text-secondary` | `#475569` | Body text and descriptions |
| **Text Muted** | `--text-muted` | `#94A3B8` | Stat labels and timestamps |
| **Text Inverse** | `--text-inverse` | `#F8FAFC` | HUD labels and dark surface text |

### Brand & State Accents
| Token | Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| **Brand Violet** | `--brand` | `#7C3AED` | Primary action buttons, active navigation |
| **Brand Hover** | `--brand-hover` | `#6D28D9` | Button hover and pressed states |
| **Brand Soft** | `--brand-soft` | `#EDE9FE` | Pinned user row, tinted chips, badge backgrounds |
| **Accent Lime** | `--accent-lime` | `#A3E635` | Live active GPS path, GO moments, success pulse |
| **Accent Amber** | `--accent-amber` | `#F59E0B` | Rival alerts, anti-cheat warnings, gold badge |
| **Danger** | `--danger` | `#EF4444` | Territory lost, anti-cheat flag, destructive actions |
| **Success** | `--success` | `#10B981` | Completed goals, positive deltas |

### 8-Color Territory Palette
| Name | Hex | Usage Rule |
| :--- | :--- | :--- |
| **Violet** (Player default) | `#7C3AED` | "My Territory" fill opacity 0.35, 2.5px solid stroke |
| **Cyan** | `#06B6D4` | Rival territory, 1.5px stroke |
| **Orange** | `#F97316` | Rival territory, 1.5px stroke |
| **Emerald** | `#10B981` | Rival territory, 1.5px stroke |
| **Pink** | `#EC4899` | Rival territory, 1.5px stroke |
| **Yellow** | `#EAB308` | Rival territory, 1.5px stroke |
| **Blue** | `#3B82F6` | Rival territory, 1.5px stroke |
| **Red** | `#EF4444` | Rival territory, 1.5px stroke |

---

## 3. MapLibre GL Layer Paint Specifications

- **Basemap (Light)**: Carto Positron / Dataviz Light (`https://tiles.openfreemap.org/styles/positron`).
- **Basemap (Dark/Night)**: Carto Dark Matter (`https://tiles.openfreemap.org/styles/dark`).
- **Hex Fill Layer**: `fill-opacity: 0.35`, color mapped dynamically by `owner_color`.
- **Hex Outline Layer**:
  - Player cells: `line-width: 2.5px`, `line-opacity: 0.95`.
  - Rival cells: `line-width: 1.5px`, `line-opacity: 0.95`.
  - Neutral / Unclaimed cells: `line-width: 0.5px`, `line-color: #94A3B8`, `line-opacity: 0.15` (visible at zoom $\ge$ 15).
- **Live Running Path**: 5px solid line in `#A3E635` with 2px casing in `#0F172A` (`line-width: 9px` total) so it is visible against any road or satellite background.
- **Completed Run Path**: 4px solid line in owner's territory color.
- **Player Location Marker**: 16px circular marker in `#7C3AED` with a 3px crisp white border, soft radial accuracy ring (`rgba(124, 58, 237, 0.15)`), and directional heading cone.

---

## 4. Typography Scale

- **Display / Numbers**: `Space Grotesk`, `700` weight. Always with `font-variant-numeric: tabular-nums`.
- **UI & Body**: `Inter`, `400 / 500 / 600` weight.
- **Scale**:
  - `72px` (4.5rem): Live HUD primary distance / pace.
  - `48px` (3rem): Hero headline numbers.
  - `32px` (2rem): Secondary HUD stats / card metrics.
  - `24px` (1.5rem): Section titles.
  - `20px` (1.25rem): Card headers.
  - `16px` (1rem): Body text.
  - `14px` (0.875rem): Small labels / secondary descriptions mid-run.
  - `11px` (0.6875rem): Stat captions (`uppercase`, `tracking-wider`).

---

## 5. Shape, Spacing & Elevation

- **Border Radius**:
  - Cards: `rounded-2xl` (`16px`).
  - Buttons: `rounded-xl` (`12px`).
  - Chips / Badges: `rounded-full` (`9999px`).
  - Bottom Sheets: `rounded-t-3xl` (`24px` top only).
  - Floating Map Controls: `rounded-2xl` (`16px`).
- **Touch Target Floor**: Minimum **48 × 48px** for all interactive targets. Primary Run FAB is **72 × 72px**.
- **Shadows**:
  - `shadow-xs`: `0 1px 2px rgba(15, 23, 42, 0.05)`
  - `shadow-sm`: `0 1px 3px rgba(15, 23, 42, 0.08)`
  - `shadow-md`: `0 4px 12px rgba(15, 23, 42, 0.08)`
  - `shadow-lg`: `0 12px 32px rgba(15, 23, 42, 0.14)` (Used for all floating map overlays).

---

## 6. Shared Component Set

1. `<Button>` (`src/components/ui/Button.jsx`):
   - Variants: `primary` (brand violet), `secondary`, `dark`, `lime`, `danger`, `outline`, `ghost`, `soft`, `runFab` (72px circle).
2. `<Card>` (`src/components/ui/Card.jsx`):
   - Variants: `surface`, `elevated`, `glassMap` (`bg-white/85` with `backdrop-blur-md`), `dark`, `brand`.
3. `<StatTile>` (`src/components/ui/StatTile.jsx`):
   - Sizes: `hero` (72px), `lg` (32px), `md` (20px), `sm` (16px). Built-in tabular numbers and 11px uppercase tracking labels.
4. `<Chip>` (`src/components/ui/Chip.jsx`):
   - Variants: `brand`, `lime`, `amber`, `danger`, `success`, `neutral`, `dark`.
5. `<BottomSheet>` (`src/components/ui/BottomSheet.jsx`):
   - Dark `#0F172A` styling with 24px top radius and swipe indicator.
6. `<Toast>` (`src/lib/toast.jsx`):
   - Amber left-border cards for rival capture alerts with territory color dot and "Retake" button. Lime accent for success.
7. **Hold-to-Confirm Stop Button**:
   - 1.2s circular progress ring fill to avoid accidental run terminations mid-stride.

---

## 7. Dual Invariant Metric Model

GeoFit enforces an invariant model across all dashboards, profile hubs, and leaderboards:
1. **TOTAL CAPTURED (m² / hexes)**: Permanent cumulative area conquered. Strictly monotonic and **never decreases**, preserving athlete effort permanently.
2. **CURRENTLY HOLDING (m² / cells)**: Live territorial dominion. Dynamic and shifts when other athletes run over cells.

---

## 8. Accessibility & Motion

- **WCAG AA Compliant**: High contrast ratios on all text ($\ge 4.5:1$ for body, $\ge 3:1$ for display stats).
- **Non-Color Differentiators**: Territory owners are paired with custom stroke widths (2.5px vs 1.5px), usernames, and color dots.
- **Focus Rings**: 3px visible ring in `#7C3AED` with 2px offset on all keyboard-navigable elements.
- **Screen Reader Readiness**: Live stats announced politely via `aria-live="polite"`.
