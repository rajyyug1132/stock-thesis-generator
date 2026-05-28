# Design

I'm not a designer. I'm a CS student. But I thought about the UX on this, and I made deliberate decisions, so here's what they were.

---

## The one rule I designed around

**Show the data before you show the AI.**

Every AI financial tool I've used puts the AI output front and center. You ask about a stock and you get a paragraph. Maybe a number or two embedded in it. You have no way to check those numbers because you don't have the raw data.

The rule I built around: the metrics dashboard — current price, P/E, ROE, D/E, volatility, Sharpe ratio, 1Y high and low — appears before the thesis. Before the AI generates anything. You're looking at numbers pulled directly from Yahoo Finance, and you can verify them yourself before you read a single word of analysis.

This isn't just a UX choice. It's the thing that makes the thesis mean something. If the thesis says "P/E of 24.3" and the panel above it says P/E is 24.3, you trust the thesis. If those numbers match, the rest of the claims become more credible by association. If they don't match, you know something's wrong.

Everything else in the design follows from this. The verification pills, the evidence drawer, the grounding score — they're all extensions of the same idea. Keep the source data visible. Make it possible to check.

---

## How a user moves through it

**Home page**

Six stock cards in a grid. Each shows the current price, 1-day change, and a sparkline. The cards are the six most-viewed Nifty 50 stocks, pre-rendered so they load instantly. There's a search input at the top for any other Nifty 50 ticker.

**Stock page**

You land on a stock page — either by clicking a card or navigating to `/stock/RELIANCE`. Here's the sequence:

1. The metrics panel loads first. Price, P/E, ROE, debt/equity, volatility, Sharpe, 1Y high/low. This data is already fetched by the time the page renders — it's part of the server component response.

2. The annotated price chart appears below the metrics. One year of daily closes. Events (earnings dates, major news) are pinned on the chart as vertical markers with tooltips.

3. Below the chart, the executive summary. Two or three sentences from the AI. This is the first time you see AI-generated content — after you've already read the actual data.

4. The conviction slider sits between the summary and the bull/bear cases. A horizontal range input, bear on the left and bull on the right. Centered at 50. Dragging it shifts the visual weight of the bull and bear sections — more bull conviction makes the bull case more prominent, more bear conviction dims the bull case. The thumb turns rust at the bear end and mint at the bull end.

5. Bull case and bear case below the slider. Each point has a citation badge — a small colored pill showing whether the claim was verified. Green pill means the verification pass confirmed the number against source data. Yellow/sand pill means unverified or couldn't be confirmed.

6. Click any citation badge and a side panel slides in from the right. This is the evidence drawer. It shows the full claim, the evidence the AI cited, the verification result, and the reason the verifier gave. You can close it with Escape or the X button.

7. Below the bull/bear split, risk factors with severity ratings (high/medium/low) and upcoming catalysts with timeframes.

8. At the very bottom, the grounding score. Percentage of claims the verification pass confirmed. Not a quality rating — a transparency measure.

**Compare page**

Pick 2–5 Nifty 50 stocks. The page fetches prices for all of them and runs a correlated Monte Carlo simulation. You see a fan chart showing the 5th/25th/50th/75th/95th percentile paths. Below that, risk metrics: CAGR, annualized volatility, Sharpe, max drawdown, P(positive return).

The portfolio weight sliders let you drag allocations. The simulation re-runs immediately when you change weights (the worker handles it off-thread so the UI doesn't freeze).

The stress test input is at the bottom of the compare page. You type a scenario — "oil prices spike 20%" or "RBI raises rates 50bps" — and the app sends that to the API, which calls Gemini to parse it into a structured shock specification. The specification says which stocks get hit, by how much, on which parameters (price, drift, volatility). Then the simulation runs again with the shocked parameters, and the fan chart splits: mint for base case, rust for the shock case. The rust color is reserved exclusively for the shock overlay. Nothing else in the app uses it.

---

## Three decisions I made on purpose

**1. No rounded corners anywhere**

The design system token is `--radius-none: 0`. Every panel, card, button, input, and badge has sharp corners. This was a deliberate choice to match the editorial aesthetic — the site is supposed to feel like a financial terminal crossed with a well-typeset magazine, not a SaaS dashboard. Rounded corners read as friendly and consumer. Sharp corners read as precise and data-dense.

**2. The color system has semantic meaning**

The color tokens aren't just for aesthetics. They carry specific meanings throughout the app:

- `--mint` / `--accent`: bullish, verified, positive. Used for the bull case, verified claims, positive returns.
- `--rust`: shock case only. The stress test overlay. If you see rust on screen, you're looking at the shocked simulation. Nothing else gets this color.
- `--up` / `--down`: directional changes (price up/down). Separate from the bull/bear colors — they're for raw data movement, not investment stance.
- `--unverified`: warm sand (#b8a382). Claims the verification pass couldn't confirm. Not red — not saying the claim is wrong, saying it couldn't be checked.

The conviction slider uses this system. At 100% bull, the thumb is mint. At 0% bull, it's rust. At 50%, it's the neutral border color. The track fill interpolates between them. Every visual state is semantically meaningful.

**3. The evidence drawer instead of inline tooltips**

Early versions had the verification detail in a tooltip on hover. This didn't work. The verification output is sometimes two or three sentences explaining exactly why a claim was confirmed or flagged. That doesn't fit in a tooltip. You need a surface large enough to read it.

The drawer slides in from the right edge. It's a portal — it renders outside the normal DOM tree so it doesn't get clipped by overflow:hidden on any ancestor. It traps focus for accessibility (keyboard navigation stays inside the drawer while it's open). Escape key closes it.

The trade-off is that opening the drawer hides part of the content behind it. I thought about making it an expandable section instead, but that would break the flow of the bull/bear split layout. The drawer felt cleaner.

---

## What I'd change about the design

**The blank screen problem on first load.** The 6 featured stocks are pre-rendered and load instantly. Any other stock has a loading state — the thesis takes 6–14 seconds to generate. I built a `ThesisLoading` component that shows a skeleton while you wait, but it's still a long wait. Streaming the data as it becomes available — show the metrics immediately, then the chart, then stream in the thesis content — would be better, and it's how the page should work. I haven't done it yet.

**The compare page has no skeleton.** Before the covariance data loads and the simulation runs, the page just sits there mostly empty. The stock pages have a skeleton loader. The compare page doesn't have one yet.

**P/B ratio and dividend yield aren't shown in the metrics panel.** The data is fetched from Yahoo Finance and available in the AI context — the thesis generator uses them. But the metrics dashboard on the stock page only renders P/E, ROE, D/E, volatility, Sharpe, and 1Y high/low. I ran out of space in the panel layout and didn't figure out how to add them without making it feel cluttered.

**The AlertSetup component only lives on the watchlist page.** I built it as a standalone component (`components/notifications/alert-setup.tsx`) with the intent of wiring it into the individual stock pages. You'd be reading a thesis and see a button to set a price alert for that stock. That makes much more sense than burying it inside the portfolio watchlist. It's not done yet — it just hasn't been connected.

**Mobile.** The compare page's dual fan chart and risk metrics panel are barely usable on mobile. The price chart is okay. The thesis page is readable. The simulation UI is not. I'd want to reconsider the layout for narrow screens on the compare page specifically — probably hide the correlation heatmap and simplify the controls.
