# Design

## Theme

### Dark (default)
Scene: stadium safety officer at a monitoring station during a live cricket match. Dim ambient light, multiple screens, pressure to act fast. The interface must be readable without competing for attention.

Near-black slate background. Cyan-blue accent. No glow overload.

### Light (user-selectable)
Scene: daytime event review, sunlit stadium office. Warm, grounded, paper-like quality. Sage green primary.

Warm cream base. Stone panels. Muted sage.

---

## Color

### Dark palette
```
--bg-color:  oklch(9.5% 0.010 252)   /* near-black, slate tint */
--bg-panel:  oklch(13.0% 0.014 254)  /* panel surface */
--bg-card:   oklch(15.5% 0.016 252)  /* card surface */
--border-color: oklch(100% 0 0 / 0.07)

--color-primary:      oklch(61% 0.14 214)  /* cyan-blue */
--color-primary-glow: oklch(61% 0.14 214 / 0.22)
--color-primary-tint: oklch(61% 0.14 214 / 0.07)

--color-success:      oklch(64% 0.15 142)
--color-warning:      oklch(73% 0.17 65)
--color-danger:       oklch(56% 0.22 12)

--text-main:  oklch(93% 0.008 256)
--text-muted: oklch(61% 0.012 252)
```

### Light palette
```
--bg-color:  oklch(96.5% 0.007 88)  /* warm cream */
--bg-panel:  oklch(98.0% 0.005 90)
--bg-card:   oklch(95.5% 0.008 87)
--border-color: oklch(25% 0.010 80 / 0.10)

--color-primary:  oklch(44% 0.10 158)  /* muted sage */
--color-success:  oklch(42% 0.12 142)
--color-warning:  oklch(52% 0.13 65)
--color-danger:   oklch(43% 0.17 12)

--text-main:  oklch(18% 0.015 252)
--text-muted: oklch(47% 0.012 252)
```

### Strategy
Restrained. Tinted neutrals + one emerald accent. Semantic danger/warning/success for alerts only. No color for decoration.

### Banned
- Cyan (`hsl(195, ...)`, `#00b4d8`, `#008cb3`) — tech-dashboard reflex, violates calm authority
- Pure `#000` or `#fff` — replaced with tinted neutrals
- Gradient text — never

---

## Typography

Font: **Outfit** (Google Fonts), weights 300–800.

```
Body:      13.5px / 500 weight
Labels:    10–11px / 700 / uppercase / letter-spacing 0.5px
Headings:  15–20px / 700–800
Micro:     9–10px / 600
```

Line length capped at content width (mobile-first, 480px container).

---

## Spacing

```
--sp-1: 4px   --sp-2: 8px   --sp-3: 12px
--sp-4: 16px  --sp-5: 20px  --sp-6: 24px
```

Cards: 16px padding. Sections: 16px gap. Header: 0 16px. Nav: 64px height.

---

## Radius

```
--radius-sm: 6px    /* inputs, micro badges */
--radius-md: 10px   /* cards, agent cards */
--radius-lg: 14px   /* panels, main cards */
--radius-xl: 20px   /* onboarding card, auth card, role drawer */
```

---

## Elevation

```
--shadow-sm:    0 1px 3px oklch(0% 0 0 / 0.30)
--shadow-md:    0 4px 16px oklch(0% 0 0 / 0.28)
--shadow-lg:    0 12px 40px oklch(0% 0 0 / 0.40)
--shadow-toast: 0 8px 24px oklch(0% 0 0 / 0.55)
```

---

## Motion

```
--ease-out:     cubic-bezier(0.16, 1, 0.3, 1)  /* ease-out-quart */
--duration-fast: 150ms
--duration-base: 220ms
--duration-slow: 340ms
```

Rules:
- Never animate layout properties (width, height, padding)
- Fade + translate for enter/exit
- No bounce, no elastic, no spring
- All animations respect `prefers-reduced-motion`

---

## Components

### Buttons
- `btn-primary`: solid emerald, no gradient. Text: light emerald-white.
- `btn-danger`: solid danger red. No gradient.
- `btn-secondary`: ghost (semi-transparent bg, border).
- `btn-large-onboarding`: full-width, 16px, primary color, radius-lg.
- Active/hover: single background shift, 150ms.

### Cards
`.card`: `var(--bg-card)`, 1px border, `var(--radius-lg)`, 16px padding.

No nested cards. No identical card grids.

### Agent Cards
Full border + tinted background per agent type. No side-stripe `border-left` (banned).
- Agent 1: primary-tint bg + primary border (25% alpha, cyan-blue)
- Agent 2: warning-tint bg + warning border
- Agent 3: success-tint bg + success border

### Toasts
Full border + semantic tinted background. No side-stripe `border-left` (banned).
- Colored title only. Body: `var(--text-muted)`.
- Duration: 4 seconds. Fade-out: 300ms.
- Max stack: limited by cooldown (3s).

### Navigation
Bottom tab bar. 64px height. 4-column grid. Active: `var(--color-primary)` + drop-shadow glow.

### Form inputs
Background: `rgba(10, 11, 20, 0.8)` dark / light cream in light mode.
Focus: `border-color: var(--color-primary)`.
All use `var(--font-family)`.

---

## Semantic Map Colors

Sector density levels (traffic-light, not branding):
```
Low (<50%):  teal — hsl(171, 100%, 41%)
Med (50-80%): amber — hsl(48, 100%, 67%)
High (>80%): red — hsl(348, 100%, 61%)
Alert:       danger — oklch(56% 0.22 12)
```

Route line: `var(--color-primary)` (emerald), stroke-dasharray animated.

---

## Alert States

```
Active     → danger tint badge
Responding → warning tint badge
Resolved   → success tint badge
```

Resolved incidents: removed from emergency banner, map, and notifications. Kept in incident history only.
