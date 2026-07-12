---
name: editorial-quant-design
description: Use this skill to generate well-branded interfaces and assets for Editorial Quant — the AI-grounded stock-thesis aesthetic. Deep-charcoal canvas, bone-white type, mint-green accents, Geist Mono for data, Instrument Serif for editorial headlines, rigid 1px grid, sharp corners. Use for finance / research / journal / data-tools surfaces, either production or throwaway prototypes.
user-invocable: true
---

# Editorial Quant — design skill

This skill packages the Editorial Quant design system. Read `README.md` for the full story; this file is the agent's working brief.

## How to use

1. **Read `README.md` first.** It has the brand voice, the visual foundations (color, type, borders, motion), and the iconography rules.
2. **Pull tokens from `colors_and_type.css`** — every color, font, spacing, and motion value is a CSS custom property. Never hardcode hex values; reach for `var(--accent)`, `var(--bg-elevated)`, `var(--text-primary)`, etc.
3. **Copy assets out of `assets/`** when you need a logo or the hero bullish chart.
4. **Mirror components from `ui_kits/stock-thesis/`** — `Panel`, `SectionLabel`, `Pill`, `DataRow`, `DirectionalNum`, `Sparkline`, `Button`, `GroundedClaim`, `Header`, `MethodStrip`, `PriceChart`, `StockCard`. They're the canonical implementations.

## What outputs to make

- **For mocks / throwaway prototypes / slides** → produce a self-contained HTML file: link `colors_and_type.css`, paste in the components you need (or `<script src>` them from the kit), reference asset SVGs by relative path.
- **For production code** → copy `colors_and_type.css` and the JSX components into the user's codebase; treat the source GitHub repo (`rajyyug1132/stock-thesis-generator`) as the canonical implementation reference.

## Non-negotiable rules

1. **No emoji. Ever.** Use unicode glyphs (`▲ ▼ · → ↑ ↓ ✓`) instead.
2. **No border-radius.** Every corner is sharp.
3. **No drop shadows.** Elevation comes from background-color steps.
4. **No bright reds/greens.** Use the muted `--up` / `--down` tokens.
5. **Numbers are always mono.** Apply `.num` or `font-family: var(--font-mono)` to every digit.
6. **Editorial headlines are serif.** Reach for Instrument Serif italic when you want a moment.
7. **Section labels are mono uppercase, tracked 0.1em–0.15em, color `--text-tertiary`.**

## If the user invokes this skill without a brief

Ask:
- What surface are you designing? (landing page, dashboard, report, slide deck, mobile screen)
- Real data or stylized? Do you have a dataset, or should we synthesize one?
- What's the central claim or headline?
- One screen or a multi-screen flow?
- Editable production code, or a one-off mock?

Then commit to a layout: column-led editorial composition with at least one piece of typeset data and one annotated chart. Avoid feature-listing — surface a thesis with evidence.

## What this skill is *not* good for

- Cheerful consumer products (the palette is too austere)
- Heavy-illustration brands (we have no illustration system)
- Any product that wants emoji or rounded corners (we don't ship those)

If a request needs those qualities, tell the user the skill won't fit and recommend a different aesthetic.
