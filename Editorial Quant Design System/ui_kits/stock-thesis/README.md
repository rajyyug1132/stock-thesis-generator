# Stock Thesis Generator — UI Kit

A pixel-faithful, Editorial Quant–branded React recreation of three core screens from `rajyyug1132/stock-thesis-generator`, wired together as a click-through prototype.

## What's in it

| File | Role |
|---|---|
| `index.html` | Entry — boots React, mounts the prototype router |
| `tokens.css` | Imports the system tokens (`../../colors_and_type.css`) |
| `data.js` | Mock Nifty 50 stocks, mock thesis JSON, mock fundamentals |
| `primitives.jsx` | `SectionLabel`, `Pill`, `Panel`, `DataRow`, `DirectionalNum`, `Sparkline`, `Button` |
| `GroundedClaim.jsx` | Claim + EV evidence row + citation superscript |
| `StockCard.jsx` | Featured grid card |
| `Header.jsx` | Nav bar with live Nifty ticker |
| `MethodStrip.jsx` | 01/02/03 method columns |
| `PriceChart.jsx` | Inline SVG area chart + crosshair |
| `HomeScreen.jsx` | Hero + method strip + featured stocks + sim CTA + footer |
| `StockScreen.jsx` | Fundamentals + 1Y chart + abstract + bull/bear panels + risks + catalysts |
| `CompareScreen.jsx` | Symbol picker + comparison table + allocation bar + fan chart |

## What's faked

This is a recreation, not a working app. We don't call Yahoo Finance, Gemini, or Upstash. The mock thesis and price data live in `data.js`.

## Source map

Every component traces back to a real file:

- `primitives.jsx` → `Stocks/components/ui/{panel,pill,section-label,data-row,directional-num,button}.tsx`
- `GroundedClaim.jsx` → `Stocks/components/ui/grounded-claim.tsx` + `citation.tsx`
- `StockCard.jsx` → `Stocks/components/stock-card.tsx` (reskinned — original used Tailwind grays)
- `HomeScreen.jsx` → `Stocks/app/page.tsx`
- `StockScreen.jsx` → `Stocks/app/stock/[symbol]/page.tsx`
- `CompareScreen.jsx` → `Stocks/app/compare/page.tsx`
- `PriceChart.jsx` → `Stocks/components/price-chart.tsx` (we drew it as raw SVG instead of recharts so it renders without a bundler)
