# AGENTS.md — AI Agent Instructions

## Coding Tasks

When spawning Claude Code sessions for coding work, tell the session to use gstack skills.

Examples:

- **Security audit**: "Load gstack. Run /cso"
- **Code review**: "Load gstack. Run /review"
- **QA test a URL**: "Load gstack. Run /qa https://stock-thesis-generator-mae5.vercel.app"
- **Build a feature end-to-end**: "Load gstack. Run /autoplan, implement the plan, then run /ship"
- **Plan before building**: "Load gstack. Run /office-hours then /autoplan. Save the plan, don't implement."
- **Visual/design QA**: "Load gstack. Run /design-review"
- **Investigate a bug**: "Load gstack. Run /investigate"
- **Performance check**: "Load gstack. Run /benchmark https://stock-thesis-generator-mae5.vercel.app"

## Project Context

- **Stack**: Next.js 16 App Router, TypeScript strict, Turbopack, Vercel
- **AI**: Gemini 2.5 Pro/Flash (primary), DeepSeek V3 (fallback)
- **Data**: Yahoo Finance (prices/fundamentals), Upstash Redis (cache), Supabase (auth/snapshots)
- **Design system**: Editorial Quant — `--mint` primary accent, `--rust` reserved for shock/stress case only, no border-radius
- **Prod URL**: https://stock-thesis-generator-mae5.vercel.app
- **Repo**: https://github.com/rajyyug1132/stock-thesis-generator
