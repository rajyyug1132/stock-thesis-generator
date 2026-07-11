#!/usr/bin/env npx tsx
// Run on deploy to pre-warm Redis + Vercel edge cache for top 6 stocks.
// Costs: 6 thesis calls + 6 validation calls = 12 calls total. Fine on free tier.

const BASE_URL = process.env.SITE_URL ?? 'http://localhost:3000';
const TOP_6 = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS', 'ICICIBANK'];

async function warm() {
  console.log(`Warming cache for ${TOP_6.length} stocks...`);

  const results = await Promise.allSettled(
    TOP_6.map(async symbol => {
      const start = Date.now();
      const res = await fetch(`${BASE_URL}/api/thesis/${symbol}`);
      const ms = Date.now() - start;
      if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
      console.log(`  ✓ ${symbol} — ${ms}ms (${res.headers.get('x-cache') ?? 'fresh'})`);
      return symbol;
    })
  );

  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`\n${failed.length} stocks failed to warm:`);
    failed.forEach((r) => r.status === 'rejected' && console.error(`  ✗ ${r.reason}`));
    console.warn('\n[warm] Cache warming failed or was skipped. This is normal during the build container phase if the server is not yet running.');
    process.exit(0);
  }

  console.log(`\nCache warm complete. ${TOP_6.length} stocks ready.`);
}

warm();
