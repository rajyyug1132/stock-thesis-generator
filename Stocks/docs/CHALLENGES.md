# What Broke and How I Fixed It

These are the five problems that took the most time. Not the most lines of code — time. The kind of time where you're staring at a browser tab or a response JSON wondering what's wrong with you.

---

## 1. The LLM was making up financial data

**The problem**

The first version of this app was embarrassingly simple: take a ticker, ask Gemini to "analyze RELIANCE and write a bull/bear thesis." That's it. The output looked great. Clear structure, confident tone, specific-sounding numbers.

Then I fact-checked one of them. The P/E ratio the model cited was wrong. Not slightly off — wrong by a factor of three. The model had answered from training data, not real data. The stock had re-rated significantly after whatever cutoff Gemini was trained on, and the model didn't know that and didn't say it didn't know.

This is the fundamental problem with AI financial tools. The model sounds confident regardless of whether it's right.

**What I tried first**

I added a note to the prompt: "Only cite numbers you are certain about." That did nothing useful. The model just became slightly more hedged-sounding while still making up the same numbers.

Then I tried asking the model to caveat uncertain claims. It added caveats to everything, including things it actually had right, and the thesis became unreadable.

**What fixed it**

Flip the whole thing. Don't ask the model to analyze a stock — give the model the data and ask it to analyze that data.

Now the sequence is: fetch prices and fundamentals from Yahoo Finance first, put those numbers into the prompt, tell the model "every numeric claim in your evidence field must reference a number that appears in this JSON — do not invent numbers." Then add a second AI call that reads the thesis back and checks each claim against the source data.

The model stopped hallucinating because there was nothing to hallucinate. If the JSON says P/E is 24.3, the model cites 24.3. If a field is null (Yahoo Finance doesn't have it for that ticker), the model says it doesn't have it. The verification pass catches it if the model sneaks something in anyway.

The grounding score at the bottom of each thesis is what the verification pass produces — the percentage of claims it could confirm. It's not a quality rating. It's a transparency measure.

---

## 2. Yahoo Finance returning null for half the fields

**The problem**

`yahoo-finance2` is a JavaScript library wrapping Yahoo Finance's undocumented API. It works, but the response shape is not consistent. Same fields, different tickers, different structures. Some tickers return P/B ratio nested one level deep. Some return it two levels deep. Some return it as a number. Some return it as an object with a `raw` property. Some return the string "N/A" instead of null when a value isn't available. Some return nothing at all and the key doesn't exist in the response.

The first version crashed constantly. A field would be there for RELIANCE and missing for BPCL. My code would do `fundamentals.trailingPE` and get undefined, then try to `.toFixed(2)` it, and throw.

**What I tried first**

I added individual null checks everywhere. `if (data.trailingPE !== undefined && data.trailingPE !== null)`. This was tedious and still missed cases because Yahoo sometimes returns "N/A" as a string.

**What fixed it**

A single `toNumber()` guard that handles every bad value case in one place:

```typescript
function toNumber(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'number' && isFinite(val)) return val;
  if (typeof val === 'object' && val !== null && 'raw' in val) {
    return toNumber((val as { raw: unknown }).raw);
  }
  const n = Number(val);
  return isFinite(n) ? n : null;
}
```

Everything goes through this. String "N/A" → null. Object with `.raw` → unwrap and recurse. Non-finite number (Infinity, NaN) → null. Now the fundamentals object either has a real number or null, and the thesis prompt handles null fields by not mentioning them.

The other issue was Yahoo rate limiting. If you call it too fast or too many times, it starts returning empty arrays instead of data. Fixed with a 2-second retry using the `.BO` suffix (BSE) as a fallback — most Nifty 50 stocks are dual-listed, so if the `.NS` (NSE) endpoint is being rate-limited you can usually get the data from `.BO`.

---

## 3. Getting the model to return the same JSON structure every time

**The problem**

The thesis is a structured object with bull/bear cases, each containing an array of points, each with `claim`, `evidence`, and `confidence` fields. Plus risks with severity ratings, catalysts with timeframes, an executive summary, and a price-drop event flag.

When I first started prompting for this, I got everything except what I wanted. Free-form essays. JSONs that were close but had the fields in different positions. JSONs with extra fields I didn't ask for. JSONs with missing fields. Sometimes the model would return the JSON wrapped in a markdown code block instead of raw JSON. Sometimes it would return valid JSON preceded by a sentence like "Here is the analysis:". All of this breaks JSON.parse() or Zod validation.

I spent a lot of time trying to get this right through prompt engineering alone.

**What I tried first**

More explicit prompts. "Return ONLY valid JSON. No markdown. No preamble. No prose." This helped with the markdown wrapper and the preamble, but the structure still drifted. The model would sometimes collapse the nested `points` array into a flat list, or omit `confidence` on some bullet points but not others.

Adding a schema example to the prompt helped more. But it was still unreliable on the fallback models.

**What fixed it**

Two different solutions for two different situations.

For Gemini: `responseMimeType: 'application/json'` with a `responseSchema` that describes the exact structure, property by property, with required fields and enum constraints on severity/confidence values. Gemini's structured output mode enforces this at the token level — it literally cannot generate tokens that would violate the schema. Zero drift.

For the fallback providers (DeepSeek, OpenRouter, Groq): those don't have schema-enforced output, so I put a compact JSON schema in the system prompt and parse with Zod after. If Zod validation fails, I return a 500 with a clear error rather than returning a malformed thesis. The fallback prompts are also more compressed — the free-tier models have tighter context limits, so I trim the price history and send only the fundamentals and a few news headlines.

The Zod schema has an `injectDefaults()` helper that fills in `symbol` and `generatedAt` if the model forgot them, which happens occasionally on the smaller models.

---

## 4. API keys in a React app

**The problem**

The app calls Gemini, Groq, DeepSeek, and Supabase. All of those require API keys. A React app runs in the browser. API keys in the browser means API keys in your JavaScript bundle, which means anyone who opens DevTools can see them and use them.

When I first built this, I didn't think carefully about this. I was just trying to get things working. I had a Gemini call in a React component. It worked. Then I looked at the network tab and saw the API key sitting in the request header, visible to anyone.

**What I tried first**

Environment variables with the `NEXT_PUBLIC_` prefix. That felt like it should work — it's how you pass variables to React in Next.js. But `NEXT_PUBLIC_` means the variable is baked into the client bundle. It's not hidden. It just looks hidden until you check.

**What fixed it**

Move every external API call to route handlers. The Next.js App Router makes this clean — route handlers run on the server (as Vercel serverless functions), they have access to server-only environment variables, and the client never sees them.

The client calls `/api/thesis/RELIANCE`. The route handler calls Gemini. The API key lives in the route handler's process environment. It never appears in the client bundle, never shows up in network requests from the browser, and can't be extracted from the JavaScript.

The only client-side Supabase credentials are the anon key and the public URL. These are designed to be public — Supabase's row-level security policies control what the anon key can actually do. The service role key (which can bypass RLS) stays server-only.

It sounds obvious in retrospect. It wasn't obvious to me when I started.

---

## 5. Six to fourteen seconds of blank screen

**The problem**

The first time you visit a stock page that isn't in the cache, this happens: the page loads, the server makes two Yahoo Finance calls (prices + fundamentals), then two AI calls (generate thesis + verify thesis). All of that is blocking. The user sees nothing until all of it is done. On a slow day — Gemini quota exhausted, falling through to DeepSeek, which is slower — that's 14 seconds of white screen.

**What I tried first**

Loading spinners. This doesn't solve the problem, it just makes the wait slightly less confusing. You're still waiting 14 seconds, you just have a spinner to look at.

Streaming was the obvious next idea. Stream the thesis word by word as it generates. But the structured JSON output requirement breaks streaming — you can't parse partial JSON, so you can't render partial structured data meaningfully. You'd just be streaming unformatted JSON characters which is useless.

**What fixed it**

Two things together.

First, split the data fetch from the AI generation. The prices and fundamentals fetch is fast (under a second). Render those immediately. The user sees the metrics dashboard — current price, P/E, ROE, 1Y high/low, volatility, Sharpe — before the AI does anything. They know they're looking at real data. They're already reading the numbers while the thesis generates.

Second, ISR (Incremental Static Regeneration). The six most-viewed stocks (RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK, KOTAKBANK) are pre-rendered at build time via `generateStaticParams`. When anyone visits those pages, the thesis is already there — served from the edge cache in under 100ms. For everything else, the first load is slow but the page is then cached at the edge for an hour, so subsequent visitors get the cached version instantly.

The real fix for the 14-second wait on cache misses would be streaming structured output — some newer model APIs support that now. I haven't implemented it yet. For now, the combination of pre-rendered featured stocks and ISR caching means most visitors never see the slow path.

---

There are other things that broke — the covariance matrix going non-positive-definite when you apply stress shocks and Cholesky decomposition failing, the Groq free tier's 12,000 token-per-minute cap silently rejecting requests that looked valid, the ticker strip Web Worker causing memory pressure when left running for hours. But those five are the ones that changed how I think about building things.

The LLM hallucination problem was the one that mattered most. It's the whole point of the app.
