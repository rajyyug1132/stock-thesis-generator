# Coding Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Codebase exploration

Try `mcp__code-review-graph__*` tools first (`semantic_search_nodes`, `query_graph`,
`get_impact_radius`, `detect_changes`) if that MCP server is connected in this session —
check the tool list before assuming it's there. It has not been connected in any session
observed as of 2026-07-07, so in practice: use `graphify` (this repo already has a graph —
see `graphify-out/`, rebuild with `/graphify` if stale) or plain Grep/Glob/Read. Don't
block on the code-review-graph tools being available; fall back immediately if they aren't
in the tool list, rather than retrying.

## Shipping

Use the `/shipcheck` skill (`~/.claude/skills/shipcheck/SKILL.md`) for the
typecheck→build→deploy→smoke-test loop instead of retyping each step. This project
deploys via `vercel deploy --prod` (git-connected auto-deploy is NOT configured — a
`git push` alone does not deploy). Smoke-test routes: `/`, `/stock/RELIANCE`,
`/api/thesis/RELIANCE`.

## Pinned decisions (don't re-litigate without asking)

- **Nifty 50 only** — scope is deliberate, not a TODO. Adding other markets is a
  documented future item, not something to do opportunistically mid-task.
- **Two-pass grounding is the product** — one AI call writes the thesis, a second
  verifies every numeric claim against source data. Never collapse this to one call
  "for simplicity."
- **Line endings are LF, enforced by `.gitattributes`** (added 2026-07-07) — don't
  add `core.autocrlf` overrides or per-file line-ending fixes; the repo-level fix
  already covers it.
- Five execution-ready plans live at the repo root as `PLAN-1..5-*.md` (written
  2026-07-07, ranked by leverage). Check these before proposing new work in the areas
  they cover (API rate limiting, cache TTL, v2 API, data completeness) — they contain
  edge cases already found by exploration; don't rediscover them from scratch.

## gstack

For all web browsing, use the `/browse` skill from gstack. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:
`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/document-generate`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /shipcheck first (verify), then /ship or /land-and-deploy if a PR flow is also wanted
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

## Session hygiene

This project has produced multi-week single-thread sessions that hit the context limit
mid-task ("this session is being continued from a previous conversation..." appeared 5
times in the last 30 days). When a task naturally completes a phase (a feature ships, a
plan finishes, a review lands), suggest `/context-save` rather than continuing to pile
unrelated work into the same thread.
