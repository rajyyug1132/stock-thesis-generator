# Editorial Quant — Design System

> *Every claim verified.*
> A research-journal interface for AI-generated investment theses.

**Editorial Quant** is the visual language for the **Stock Thesis Generator** — an AI-grounded thesis engine for the Indian Nifty 50. The product writes opinionated bull/bear cases on stocks, then validates every numeric claim against live data from Yahoo Finance. The interface earns its credibility by *looking* like an institutional research note instead of a fintech app: dark charcoal canvas, rigid 1px grid, hard corners, monospaced numbers, editorial serif headlines.

This document is the foundation. The CSS lives in [`colors_and_type.css`](./colors_and_type.css); rendered specimens are in [`preview/`](./preview/); the React-based UI kit is in [`ui_kits/stock-thesis/`](./ui_kits/stock-thesis/).

---

## Sources

This system is derived from a single product repo:

- **GitHub:** [`rajyyug/stock-thesis-generator`](https://github.com/rajyyug1132/stock-thesis-generator) (default branch: `master`)
  - `Stocks/app/globals.css` — the original tokens
  - `Stocks/tailwind.config.ts` — the Tailwind binding
  - `Stocks/app/page.tsx`, `Stocks/app/stock/[symbol]/page.tsx`, `Stocks/app/compare/page.tsx` — three core screens
  - `Stocks/components/ui/*` — primitive components (Panel, Pill, SectionLabel, DataRow, DirectionalNum, GroundedClaim, ThesisAbstract, Citation)

Explore that repo for deeper context: the AI grounding flow (`Stocks/lib/ai/`), the Monte Carlo portfolio simulator (`Stocks/lib/sim/`), and the Yahoo Finance data layer (`Stocks/lib/data/`) define what the UI is in service of.

---

## Product context

| | |
|---|---|
| **What** | AI-grounded stock thesis generator for the Indian Nifty 50 |
| **Who** | Retail analysts, finance students, anyone evaluating individual equities |
| **How** | Two-pass AI: Gemini Pro writes structured thesis JSON → Gemini Flash validates every numeric claim against the source data → grounded vs. unverified is shown inline as a citation tone |
| **Where** | Web — Next.js 16, React 19, Tailwind 3.4, Recharts, Base UI primitives |
| **Brand promise** | *No vibe analysis.* Every number is shown with its source. The aesthetic backs the claim. |

### Core surfaces (one product, three screens)

1. **Home** — hero with serif declaration, method strip (01/02/03), featured-stock cards
2. **Stock page** — fundamentals data rows, 1Y price chart, editorial abstract, bull/bear panels with grounded citations, risks, catalysts, news
3. **Compare** — multi-symbol selector, comparison table with sparklines + best/worst highlighting, portfolio simulator with Monte Carlo fan chart

---

## Content fundamentals

The voice is **institutional, terse, evidentiary** — closer to a Goldman research note than to a consumer app. The aesthetic and the copy are inseparable: the design earns credibility, the copy delivers it.

### Voice rules

| Rule | Yes | No |
|---|---|---|
| **Voice** | Third-person, declarative | "We", "you", first-person |
| **Casing** | UPPERCASE for mono labels & buttons; sentence case for body | Title Case Headlines, lowercase-everywhere |
| **Numbers** | Always mono, always precise (`23.4%`, `₹2,847.20`, `Sharpe 1.2`) | "About 23%", rounded to nothing |
| **Hedging** | Cite the evidence, then claim | "We think...", "Maybe..." |
| **Punctuation** | `·` (interpunct) as separator, `—` em-dash for clauses | `|`, `-`, ASCII pipes |
| **Emoji** | **Never.** Use `▲ ▼ · →` glyphs instead | 🚀 📈 ✅ |
| **Currency** | `₹` for INR everywhere | `Rs.`, `INR ` prefix |

### Concrete examples (lifted from the source)

- Hero headline (serif italic accent): **"Every claim *verified.*"**
- Method strip: **"01 · LIVE DATA"** / **"02 · GEMINI PRO THESIS"** / **"03 · FLASH VALIDATION"**
- Body description: *"AI-generated investment theses for Nifty 50 stocks. Two-pass grounding: Pro model writes, Flash model verifies every numeric claim against live data. No vibe analysis."*
- Footer disclaimer (mono micro): **"NIFTY 50 THESIS ENGINE · DATA FROM YAHOO FINANCE · AI BY GOOGLE GEMINI · NOT FINANCIAL ADVICE"**
- CTA buttons (mono uppercase): **"COMPARE STOCKS →"**, **"SAMPLE THESIS"**, **"TRY WITH RELIANCE · TCS · INFY →"**
- Pill labels: **"HIGH"**, **"GROUNDED"**, **"UNVERIFIED"**, **"NIFTY 50"**, **"CACHED"** / **"FRESH"**
- Citation tooltip: `[3] Confirmed against Yahoo Finance fundamentals snapshot for FY24.`
- Abstract block (serif italic): *"Reliance trades at a 24× P/E despite Jio Platforms' 18% YoY ARPU growth and a maturing retail vertical..."* — always followed by `EV · <evidence string>` in mono micro.

### Density & rhythm

- Headlines breathe — set on a 16ch–22ch max, line-height 0.95–1.05.
- Body sets at 65–75ch max, line-height 1.65.
- Mono labels track at **0.15em** for section labels, **0.1em** for buttons.
- Numbers always inline with their unit (`23.4%`, `₹2,847`, `1.2σ`) — never naked.

### The "EV ·" pattern

Every claim is paired with its evidence. The claim is body sans; the evidence is mono micro, prefixed with a quaternary-color `EV ·`. The citation superscript at the end of the claim ties the two together and colors itself mint (grounded) or sand (unverified).

> Reliance's retail segment grew 18.2% YoY in FY24 ⁽·³⁾
> EV · Q4FY24 earnings report, retail revenue ₹76,627Cr vs ₹64,807Cr FY23

---

## Visual foundations

### Palette

| Token | Hex | Use |
|---|---|---|
| `--bg-canvas` | `#0b0a09` | Page base — warm-leaning charcoal |
| `--bg-elevated` | `#131210` | +1 surface for panels, method strip |
| `--bg-card` | `#1a1816` | +2 surface for cards |
| `--bg-input` | `#211e1b` | Form inputs |
| `--text-primary` | `#e6e2dd` | Bone-white — all headlines + body |
| `--text-secondary` | `#a6a098` | Subdued body |
| `--text-tertiary` | `#6c665e` | Captions, axis ticks, "EV ·" |
| `--accent` | `#a8c7ba` | Mint green — bullish, grounded, primary CTA |
| `--up` | `#a8c7ba` | Positive return (same as accent — bullish is brand) |
| `--down` | `#c98a7a` | Negative return — muted brick, never pure red |
| `--unverified` | `#b8a382` | Warm sand — citations that failed validation |
| `--border-subtle` | `#26221f` | 1px grid lines, hairlines |
| `--border-strong` | `#3a342d` | Card outlines, focus |

The palette is **deliberately desaturated** — no pure red/green. The mint accent does double duty as both the brand color and the positive-direction color, which is intentional: the system is biased *toward* finding bullish theses worth grounding.

### Typography

Three families, hard-mapped to roles:

| Family | Role | When |
|---|---|---|
| **Instrument Serif** (italic available) | Editorial | Hero, page H1, abstract blockquotes, italic accents inside otherwise sans copy |
| **Geist** (300–700) | Sans body | Body, H3, sub-section, labels |
| **Geist Mono** (400/500/600) | Data + Labels | Every number, ticker, section label, button text, pill, citation, timestamp |

**Type scale** (all CSS variables):
- `--text-display` clamp(3rem, 6vw, 5.5rem) — hero only
- `--text-h1` clamp(2rem, 4vw, 3.5rem) — page title
- `--text-h2` 1.875rem — section title
- `--text-h3` 1.25rem — sub-section
- `--text-body` 0.9375rem (15px) — body
- `--text-small` 0.8125rem (13px) — captions
- `--text-micro` 0.6875rem (11px) — mono labels, citations

### Backgrounds & atmosphere

- **No images as backgrounds.** No gradients, no photography. The canvas is flat charcoal.
- **A single grain overlay** (SVG `feTurbulence`, opacity ~0.035, `mix-blend-mode: overlay`) is applied to `body::before` so the charcoal isn't dead-flat. This is the *only* texture in the system.
- **No full-bleed imagery.** All hero/featured content is composed of typography, rules, and (where data demands) inline charts.
- **No illustrations.** Vector charts only — and only when they show real data. The "bullish hero graph" is a stylized weekly-close line + area fill, not decoration.

### Borders & rules

- Everything is **1px solid**. No 2px, no 0.5px. The grid is rigid.
- Hairline dotted dividers between data rows: `background-image: linear-gradient(to right, var(--border-subtle) 50%, transparent 50%); background-size: 4px 1px;`
- Editorial blockquote: 2px solid mint on the left only.
- **No shadows, no glows, no blurs.** Elevation comes from background-color steps (`canvas → elevated → card → input`), never from `box-shadow`.

### Corners

- **Zero radius. Every corner is sharp.** Pills, panels, buttons, cards, inputs, tooltips — `border-radius: 0`.
- Spec violation: the `Stocks/components/ui/button.tsx` is shadcn-generic and uses `rounded-lg`. We discard it in this system — see `ui_kits/stock-thesis/Button.jsx` for the corrected version.

### Spacing

8pt grid — `--space-xs` 4 → `--space-3xl` 96. Section blocks use `--space-2xl` (64px) vertical rhythm; data rows use `--space-md` (16px); inline tokens use `--space-sm` (8px).

### Animation

- **Motion is rare.** No bouncing, no spring physics, no decorative animation.
- Durations are short: `--duration-fast 150ms`, `--duration-base 250ms`.
- Easing is `cubic-bezier(0.16, 1, 0.3, 1)` — a calm out-curve.
- The only animated states are: hover (color/border change), open/close (tooltips fade), and chart paths (no animation on initial render — `isAnimationActive={false}` in Recharts).

### Hover & press states

- **Hover** = border or text steps up to the next strength (`subtle → strong`, `tertiary → secondary`) OR opacity to 0.8. Never a color shift.
- **Active/press** = `translate-y-1px`. No scale, no shrink.
- **Focus** = 1px outline in `--accent`, offset 2px. Never a glow.
- **Disabled** = `opacity: 0.4`, `cursor: not-allowed`. No grayscale filter.

### Transparency & blur

- **No backdrop blur.** No glassmorphism.
- Soft directional fills use `rgba(168,199,186,0.10)` (`--up-soft`) and `rgba(201,138,122,0.10)` (`--down-soft`) — used behind pills and chart areas only.
- Selection: `--accent-muted` (`#3d5249`) — a desaturated mint.

### Cards

- 1px solid `--border-subtle` border
- `--bg-elevated` background
- 24px (`--space-lg`) padding by default
- **Optional floating label**: a section-label rendered on top of the card border, with `--bg-canvas` background behind it (the "Panel" pattern — see `ui_kits/stock-thesis/Panel.jsx`)
- No hover lift. On hover, the border steps to `--accent` if the card is interactive.

### Layout rules

- Reading column max-width: `--column-max` (1024px). Always centered.
- Outer page padding: `--gutter` (2rem / 32px).
- Section vertical rhythm: 64px between major sections, 24px between sub-sections.
- Grid lines visible where data is dense: comparison tables, fundamentals lists.

---

## Iconography

**The system uses almost no icons.** This is a deliberate constraint.

### What's used instead

- **Unicode glyphs** for direction and emphasis:
  - `▲` / `▼` / `·` — directional (up / down / neutral) — appear in `DirectionalNum`
  - `→` — link/action arrow in buttons
  - `·` (middle dot) — separator in labels and timestamps
  - `✓` — selected state in pickers (very sparingly)
  - `↑` / `↓` — bull/bear case headings
- **Mono digit superscripts** (`¹ ² ³`) — used as citation markers in `GroundedClaim`
- **CSS-drawn shapes** — triangular play affordances, rule lines

### What's installed but barely used

The repo includes `lucide-react@^1.16.0` in `package.json`, but only one or two icons are referenced in practice. The convention is: **prefer a unicode glyph; reach for Lucide only when the meaning genuinely needs a pictogram** (e.g. a search icon in a stock picker — but the source repo doesn't even use that).

If you need Lucide, link via CDN:

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
```

Substitution flag: **the source repo doesn't ship a custom icon font or SVG sprite.** No company logo is defined either. The `assets/` folder in this design system contains:
- `logo-mark.svg` — a quant-style monogram we constructed for this system (not from the source repo). **Treat as a placeholder** — ask the user for a real wordmark before shipping.
- `hero-bullish-chart.svg` — the bullish vector graph for hero use, drawn from synthetic Nifty-like data.

### Emoji

**Never.** The brand voice forbids emoji. If you find yourself wanting one, use a unicode glyph or a section label instead.

---

## File index

This is the root manifest. Everything is at the project root unless noted.

| File | What |
|---|---|
| [`README.md`](./README.md) | This file |
| [`colors_and_type.css`](./colors_and_type.css) | All design tokens — colors, type, spacing, motion |
| [`SKILL.md`](./SKILL.md) | Skill manifest for agent invocation |
| [`assets/`](./assets/) | Logos, hero graphics — copy these into your build |
| [`preview/`](./preview/) | Rendered specimen cards (Type, Colors, Spacing, Components) |
| [`ui_kits/stock-thesis/`](./ui_kits/stock-thesis/) | React UI kit recreating three core screens of the product |
| [`ui_kits/stock-thesis/index.html`](./ui_kits/stock-thesis/index.html) | Click-through prototype: home → stock page → compare |

### UI kits

- **`stock-thesis`** — the only product. Home / Stock detail / Compare. JSX components: `Panel`, `SectionLabel`, `Pill`, `DataRow`, `DirectionalNum`, `GroundedClaim`, `ThesisAbstract`, `Button`, `StockCard`, `Sparkline`, `PriceChart`, `BullBearPanels`, `ComparisonTable`, `Header`, `MethodStrip`.

---

## How to use this system

1. Copy `colors_and_type.css` and `fonts/` (if you mirror the webfonts locally) into your project.
2. Reference tokens via CSS custom properties (`var(--accent)`, `var(--text-primary)`) — never hardcode hex.
3. Reach for the JSX components in `ui_kits/stock-thesis/` as the canonical implementations. They are intentionally simple and prop-driven; lift them as-is or copy and edit.
4. When you add a new component: it must use `--bg-elevated` or deeper for surfaces, 1px solid borders, sharp corners, mono for numbers, and a section label if it carries a heading.

---

## Caveats

- **No real brand wordmark exists.** The source repo never defines one. `assets/logo-mark.svg` is a constructed placeholder.
- The original CSS used a *warm amber* accent (`#d4a574`). The user requested **mint green (`#a8c7ba`)** for this system — every accent reference has been re-keyed to mint.
- Fonts are loaded via Google Fonts `@import` in `colors_and_type.css`. The source repo loads Geist via `next/font` and the others via the same `@import`. If you need offline bundles, fetch from <https://vercel.com/font> (Geist) and <https://fonts.google.com/specimen/Instrument+Serif>.
- Some legacy components in the repo (`comparison-table.tsx`, `symbol-picker.tsx`, `stock-card.tsx` partials, `thesis-card.tsx`, `metric-pill.tsx`) use generic shadcn / Tailwind defaults (rounded-lg, gray-50, blue-500) that **violate** the Editorial Quant aesthetic. The UI kit in `ui_kits/stock-thesis/` reimplements them on-spec.
