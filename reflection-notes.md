# Reflection Notes — Setup Diagnosis (2026-07-02)

Evidence base: all three substantive sessions on this machine, mined from
`~/.claude/projects/C--Users-Admin-Stocks/`:

| ID | Session | File | Span | Size |
|----|---------|------|------|------|
| S1 | Stock Thesis Generator build | `f45ad0de-….jsonl` | May 24 → Jun 26 | 6,861 records / 24 MB |
| S2 | AeroBMSCE club site build | `44546f90-….jsonl` | Jun 18 → Jun 25 | 4,033 records / 18 MB |
| S3 | career-ops setup | `1fd1a34e-….jsonl` | May 29 | 211 records |
| S4 | This diagnosis session | `6ca33845-…` | Jul 2 | (live) |

Diagnosis only — nothing below has been built or changed.

---

## 1. Secrets hygiene — FIX NOW + small guardrail (highest leverage)

**What happens:** live credentials are routinely pasted into chat and embedded in
shell commands, so they land permanently in transcripts, and in one case in a
settings file.

**Evidence (S1 unless noted):**
- Gemini API key pasted in chat twice (May 24 07:00, May 28 12:29 — the second was the *replacement* after the first leaked).
- DeepSeek key pasted (May 27 03:20), Groq key (May 27 03:54), OpenRouter key (May 28 11:28).
- A rotation incident already occurred mid-project (May 27 04:45 "Two API keys were shared in plain text… need to be rotated immediately") — and the *new* keys were then pasted into the same transcript (May 27 04:47).
- Supabase secret key + publishable key + account email pasted in chat (S2, Jun 20 12:17); Supabase account password pasted in chat (S1, May 26 11:41); DB password visible in `DIRECT_URL` shell commands (3x).
- GitHub token `gho_…` inlined in curl commands 7x; Vercel token `vca_…` inlined 6x+ (S1).
- **Still live right now:** `Stocks/.claude/settings.local.json` contains the Vercel bearer token hardcoded inside a permission-allowlist entry.

**Verdict: Fix + automation.**
1. Rotate every key named above (Gemini, DeepSeek, Groq, OpenRouter, Supabase secret, Supabase account password, GitHub `gho_…`, Vercel `vca_…`). Assume all are burned — they exist in plaintext JSONL on disk and possibly in the pushed repo history.
2. Remove the token-bearing entry from `settings.local.json` (replace with `Bash(curl -s https://api.vercel.com/*)` + token from env).
3. Adopt one habit + one guardrail: keys go into `.env` files by the *user*, Claude is told only the variable name; add a lightweight PreToolUse hook (or CLAUDE.md rule) that flags `sk-`, `gsk_`, `gho_`, `vca_`, `sb_secret` patterns in Bash commands. Recurrence is ~10 incidents across 2 sessions — the highest-frequency, highest-blast-radius pattern found.

## 2. gstack scaffolding is broken and taxes every session — FIX OR REMOVE

**What happens:** the harness is wired for gstack, but gstack was never
successfully installed, so every session pays error noise and dead instructions.

**Evidence:**
- `SessionStart` hook `gstack-session-update` fails with exit 127 in **every single session/resume/compact**: 22x in S1, 13x in S2, 2x in S3, and it fired again in S4. That's ~37 recorded hook failures.
- Install attempted at least 4 separate times (S1 May 24 07:01, S1 May 27 03:08 + 03:13, S2 Jun 21 17:42) and failed on: bun missing (2x), `cd: …/gstack: No such file or directory` (4x), clone-dir-already-exists, `./setup` errors.
- The `PreToolUse:Skill` hook **blocked skill use** with "gstack is not installed globally" at least 3x (S1, S2, S3).
- Both CLAUDE.md files carry ~40 gstack skill listings + routing rules, yet actual Skill invocations in 24 MB of S1: 10 (mostly `/caveman` and `/browse`). The routing table is context cost with almost no usage.

**Verdict: Fix (pick one, once).** Either (a) do a clean install with bun preinstalled and verify `gstack-session-update` runs, or (b) delete the SessionStart/PreToolUse hooks and the gstack sections from both CLAUDE.md files. Option (b) is 15 minutes and removes a per-session tax; option (a) only makes sense if you actually want /ship and /design-review (see cluster 4 — you do have recurring need for exactly those two).

## 3. Git repo rooted at C:\Users\Admin (home directory) — FIX

**What happens:** the git repository containing the Stocks app has its root at
the *home directory*, so `git status` sweeps NTUSER.DAT, AppData, Downloads, etc.

**Evidence:**
- This session's own git snapshot: branch `master` rooted at `C:\Users\Admin`, with the entire home dir showing as untracked (`../.ssh/`, `../NTUSER.DAT…`, `../Downloads/`…).
- S1: `fatal: Unable to create 'C:/Users/Admin/.git/index.lock'` 4x; `pathspec 'Stocks/Stocks/'` confusion 2x; recurring "Permission denied" noise piped out of `git status`.
- Risk: any `git add -A` from the wrong cwd stages home-directory contents (including `.ssh/`) into a repo that gets pushed publicly. Combined with cluster 1, this is a real exposure path.

**Verdict: Fix.** Re-root the repo at `C:\Users\Admin\Stocks` (move `.git` history via a fresh clone or `git filter-repo`, or simplest: verify remote is current, re-clone into a clean folder). One-time, ~30 min, removes both the lock contention and the staging hazard.

## 4. Typecheck → build → deploy → prod-smoke loop — the one true SKILL candidate

**What happens:** the same verification/deploy ritual is retyped dozens of times
across both app projects, and prod breakage is discovered manually.

**Evidence:**
- S1: `npx tsc --noEmit` variants ~40x; `npm run build` ~15x; `vercel deploy --prod` + Vercel-API status polling ~10x; curl smoke tests against `stock-thesis-generator-…vercel.app/api/thesis/RELIANCE` and `/stock/RELIANCE` ~15x.
- S2: `npm run build | grep …` 12x+; `vercel --prod` variants 10x+; prod curl checks + Supabase REST checks 8x.
- User-visible failures that this loop was manually catching: "failing to give sample thesis, also failing to compare 2 stocks" (S1 May 26), "still not working" x3 (May 27–28), "this is so pathetic it the main feature of my webpage" (May 28), "why is the site not live yet" (Jun 24), "fix git hub pussh and vercel prod the site has not been updated" (Jun 26).
- Recurs across **both** projects and would recur in every future one.

**Verdict: Skill (or plain npm script + thin skill wrapper).** A `/preflight`-style project skill: `tsc --noEmit` → `next build` → deploy → poll deployment state → curl 2–3 smoke endpoints defined per-project → report pass/fail. Tokens/URLs from env, per cluster 1. This is what gstack's `/ship` + `/canary` promised; if cluster 2 resolves to "install gstack properly," use those instead of building new.

## 5. Dead `code-review-graph` MCP instructions in CLAUDE.md — FIX (small)

**Evidence:** both `~/CLAUDE.md` and `Stocks/CLAUDE.md` open with a mandatory
"ALWAYS use code-review-graph MCP tools BEFORE Grep/Glob/Read" section, but no
`mcp__code-review-graph__*` server is connected in this environment (verified in
S4 — not in the tool list, not in connecting servers). Every session loads
instructions to prefer tools that don't exist; every exploration then "falls
back" after wasted deliberation.

**Verdict: Fix.** Either connect the MCP server or delete both sections. 5 minutes.

## 6. Windows toolchain gaps — FIX (one 15-minute batch)

**Evidence of repeated small breakage:**
- `jq: command not found` — broke transcript work in S1 (1x) and derailed S4's first mining attempt entirely.
- `gh: command not found` (S1, 2x) then later "GitHub CLI authentication expired" (Jun 25) — PR workflows fall back to raw-token curl (feeds cluster 1).
- `python3` resolves to the Microsoft Store stub → Exit 49 / "Python was not found" (4x, S1).
- `pkill: command not found` (S1); bun missing (blocked gstack setup 2x); bash backslash-path mangling (`C:UsersAdmin…`, 1x).

**Verdict: Fix.** One batch: `winget install jqlang.jq GitHub.cli`, `gh auth login`, disable the WindowsApps python aliases (or install real Python), optionally bun if cluster 2 goes the install route. Small cost, removes a steady drip of failed calls.

## 7. Session/context churn — NOTHING (awareness only)

**Evidence:** "This session is being continued from a previous conversation that
ran out of context" appears ~12x in S1 and ~4x in S2; ~20 model switches
(opus/sonnet/haiku) mid-session; S4's three mining subagents all died instantly
to the session usage limit. Marathon multi-week sessions in one thread are the
cause.

**Verdict: Nothing to build** — `/context-save`/`/context-restore` already exist
and were even used once (Jun 25). Habit change: one session per work item; save
context at natural boundaries. Not automatable at reasonable cost.

## 8. career-ops / job-search workflow — NOTHING (yet)

**Evidence:** single session (S3, May 29): clone + configure career-ops, generate
CV PDF, then "find jobs for web dev and apply" and a freelance-gig search
(₹20–30k, 2-month, Bengaluru/remote). Setup completed; only 1 occurrence.

**Verdict: Nothing for now.** The anthropic-skills suite already installed
(`make-resume`, `make-cl`, `critique`, `edit-resume`) covers the recurring part.
If job-hunting sessions start recurring weekly, revisit a `/job-hunt` wrapper
that chains search → shortlist → tailored CV. One session doesn't justify build cost.

## 9. Misc signals logged, no action

- `File has not been read yet` tool errors: 12x across S1/S2/S3 — harness-internal friction, not user-fixable.
- `preview_screenshot timed out after 30s` 16x in S2 (screenshot-for-team-lead workflow); port-3000 EADDRINUSE conflicts (S1+S2). Partially mitigated already by `.claude/launch.json` (stocks on 3007). Watch, don't build.
- LLM-provider fallback saga in S1 (Gemini quota → DeepSeek → Groq → OpenRouter 404) — was a project bug, since stabilized in code; the residue is the key-hygiene problem (cluster 1), not a tooling gap.

---

## Ranked summary (most leverage first)

1. **Rotate all leaked keys + purge token from settings.local.json + .env-only habit** — fix + tiny guardrail (cluster 1)
2. **gstack: install properly or rip out hooks/CLAUDE.md sections** — fix (cluster 2)
3. **Re-root git repo from C:\Users\Admin to the project folder** — fix (cluster 3)
4. **`/preflight` deploy-verify skill (tsc → build → deploy → smoke)** — the only new skill that earns its build cost (cluster 4)
5. **Delete or connect the code-review-graph CLAUDE.md mandate** — fix (cluster 5)
6. **Toolchain batch: jq, gh + auth, python stub** — fix (cluster 6)
7. Session hygiene, career-ops, misc — no build (clusters 7–9)

---

## Addendum (2026-07-02): top 3 actioned

**#1 Secrets — partially fixed, rest requires the user.**
Removed the hardcoded Vercel token from `Stocks/.claude/settings.local.json` (was
never git-committed — confirmed via `check-ignore`, matched to a global
`~/.config/git/ignore` rule — but sat in plaintext locally). Found and deleted a
**second, different** live Vercel token in a stray file `Stocks/%TEMP%vtoken.txt`
(artifact of a broken `$TEMP` shell redirect that wrote literally to that
filename). Confirmed via full-history + tracked-file grep that no secret has
ever been committed to git — `.env.example` only ever held placeholders. Full
grep sweep of Stocks/aerobmsce/career-ops found no other stray secret files.
**Still needs the user:** every key named in cluster 1 must be rotated at the
provider dashboard (Gemini, DeepSeek, Groq, OpenRouter, Supabase secret key +
account password, GitHub `gho_`, Vercel `vca_` ×2) — no dashboard access from
here.

**#2 gstack — turned out to already be fixed, no action taken.**
Verified by running `bin/gstack-session-update` and the `check-gstack.sh`
PreToolUse hook directly: both exit 0 cleanly. The install that succeeded on
2026-06-21 (mid-S2) resolved it; this session's own transcript has zero hook
failures. The original note claiming the hook "fired again in S4" was an
unverified inference — corrected after actually checking rather than trusting
the pattern.

**#3 Git re-root — done, verified end-to-end.**
The repo really was rooted at `C:\Users\Admin` (home dir), tracking only
`CLAUDE.md`, `README.md`, and `Stocks/*` (186 files) — confirmed nothing
sensitive was ever swept in, but any future `git add -A` from the wrong cwd
could have staged `.ssh` etc. Did the full history rewrite the user approved:
backed up the original repo as a bundle (kept at
`…/scratchpad/admin-repo-backup-preregroot.bundle` — a stale unpushed local
artifact once this is confirmed stable), ran `git filter-repo --path Stocks/
--path-rename Stocks/:` in an isolated temp clone (never touched the live
working tree directly), swapped the rewritten `.git` into `Stocks/.git`,
force-pushed to `origin/master` with `--force-with-lease` pinned to the known
prior SHA (safe — confirmed no remote drift first), and independently verified
by fresh-cloning from GitHub: layout is correctly rooted, 79 of 92 commits
survived (13 were pure root-CLAUDE.md/README.md-only commits, correctly pruned
since those paths no longer exist standalone — their content lives on inside
`Stocks/CLAUDE.md`/`Stocks/README.md`'s own history). Root-level `CLAUDE.md`
and `README.md` (older/shorter duplicates of the more current `Stocks/`
versions) remain on disk untouched but are no longer tracked — the root
`CLAUDE.md` is effectively user-level global config now, consistent with
everything else under `~/.claude/`.

**Required follow-up (not done here — external service, needs the user):**
Vercel's project has "Root Directory" set to `Stocks` (see commit
`9696730 fix(vercel): set rootDirectory to Stocks`). Now that the repo root
*is* the app root, that setting must be changed back to blank/root in the
Vercel dashboard before the next deploy, or it will look for a nonexistent
`Stocks/Stocks/` path and fail.
