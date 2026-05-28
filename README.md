# Stock Thesis Generator

### *Quant-grade equity research for the Nifty 50.*

**[Live](https://stock-thesis-generator-mae5.vercel.app/)** · **[GitHub](https://github.com/rajyyug1132/stock-thesis-generator)**

---

## 01. The Problem

Retail investors in the Indian market often fall into "vibe-based" investing or
rely on static, outdated PDFs. There is a lack of accessible, real-time tools
that combine **generative qualitative analysis** with **rigorous quantitative
validation.**

## 02. The Solution

Stock Thesis Generator fetches live market data first, shows it to you, then
writes the analysis from those numbers and nothing else. The AI can't hallucinate
a P/E ratio if the P/E ratio is sitting right there in the prompt.

### Key Features

- **Two-Pass Grounding:** A Writer model (Gemini 2.5 Pro) drafts the thesis; a
  Verifier model (Gemini Flash) cross-references every numeric claim against the
  source JSON. Each claim gets a verification pill — green if confirmed, sand if
  unverified.
- **Monte Carlo Simulation:** Correlated portfolio forecasting using Cholesky-
  decomposed GBM. Runs in a Web Worker so the UI never freezes. 5,000 paths by
  default.
- **Conversational Stress Testing:** Type "RBI raises rates 50bps" — the app
  parses it into a structured shock spec and re-runs the simulation. Base case
  in mint, shock case in rust, side by side.
- **Evidence Drawer:** Click any verification pill and a side panel slides in
  showing exactly what data was checked against what claim.
- **AI Cascade:** Gemini 2.5 Pro → Flash 2.5 → Flash 2.0 → DeepSeek → OpenRouter
  → Groq. The app keeps working when any provider hits quota.

---

## 03. Technical Architecture

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript | Server components + ISR for instant loads |
| **Styling** | Tailwind CSS, Framer Motion | Sharp-cornered editorial design system |
| **AI** | Gemini 2.5 Pro/Flash + 4 fallbacks | Thesis generation, verification, stress parsing |
| **Data** | yahoo-finance2, Upstash Redis | Live NSE prices + fundamentals, 1hr cache |
| **Math** | Web Workers, Float64Array | Thread-safe Monte Carlo, zero-copy buffer transfer |
| **Database** | Supabase Postgres, Drizzle ORM | Watchlists, price alerts, API keys, sim snapshots |

---

## 04. Design System: Mint & Bone

High-contrast, institutional palette — closer to a financial terminal than a
SaaS dashboard.

- **Canvas:** `#0a0a08` — deep ink black
- **Type:** `Fraunces` variable serif (display), `Geist` (UI), `Geist Mono` (numbers)
- **Accents:** `#6db89e` Mint for bullish/verified; `#c47d68` Rust reserved
  exclusively for the stress test shock overlay
- No border radius anywhere — every corner is sharp

---

## 05. What's Built

- [x] Core data layer — Yahoo Finance prices + fundamentals, Redis caching
- [x] Two-pass AI validation with grounding score
- [x] Correlated Monte Carlo (Cholesky decomp, Web Worker, fan chart)
- [x] Conversational stress testing — LLM parses natural language into GBM shocks
- [x] User auth (Supabase magic links), watchlist, price alerts
- [x] Developer API (v2) with API key auth and rate limiting
- [x] AI provider cascade — survives Gemini quota exhaustion
