# Stock Thesis Generator

AI-grounded stock thesis generator for Indian markets. Day 1: data layer for fetching and caching stock prices and fundamentals from Yahoo Finance.

## Setup

1. Clone repo
2. `npm install`
3. Create `.env` from `.env.example` and fill in Upstash Redis credentials
4. `npm run dev`

## Test

```bash
curl http://localhost:3000/api/stocks/RELIANCE | jq
```

Expected: JSON with symbol, prices, fundamentals, and cache metadata.

Run curl twice to verify cache hit on second request.

## Error handling

```bash
curl http://localhost:3000/api/stocks/INVALID@@@
```

Expected: 400 status with error message.

## What's not done yet

- UI/dashboard for viewing theses
- AI thesis generation with Claude API
- Multi-stock comparison
- Authentication
- Database persistence (Drizzle schema)
- Historical thesis tracking
