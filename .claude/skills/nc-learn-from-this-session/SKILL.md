---
name: nc-learn-from-this-session
description:
  Review the current Claude Code session transcript and propose durable learnings (corrections,
  validated choices, project-specific facts, and insights Claude surfaced that the user found worth
  keeping) to add to AGENTS.md or docs/LEARNINGS.md. Use whenever the user says
  "/nc:learn-from-this-session", "learn from this session", "extract learnings", "what did we
  learn", "wrap up the session", "session retro", "session post-mortem", or otherwise signals the
  work is done and it's time to capture lessons. Strongly prefer triggering this skill at the
  natural end of a substantive session — before the user runs /clear, switches topics, or closes
  Claude Code — so insights are not lost.
---

# Learn From This Session

Review the current session and propose additions to the repo's living documentation.

The goal: capture **all** durable learnings from the session — regardless of who originated them.
Code changes are already in git; commit messages explain those. What's NOT in git:

- The user's corrections, validated decisions, project facts revealed in passing, recurring
  frustrations — things the **user taught Claude**.
- Insights Claude surfaced during investigation, explanation, or research that the user found
  valuable, accepted, or built upon — things the **user learned from Claude** (or that the session
  jointly uncovered).

Both directions matter. A V8 optimization detail Claude explained, a root cause Claude tracked down,
a library quirk Claude documented mid-session — if the user reacted with "huh, good to know" or
built on it, that's a durable learning even though the user didn't originate it.

## When to skip

If the session was trivial (one quick question, a single grep, a one-line fix with no
back-and-forth), say so and stop. Not every session produces a learning. Forcing one creates noise.

## Step 1: Review the current conversation

Don't read transcript files. The session is already in your context — introspect it directly.
Mentally walk back through this conversation from start to now, paying attention to inflection
points: where the user corrected you, where they validated a non-obvious choice, where they revealed
something about the project, where friction recurred.

If the conversation has been compacted, you'll see a summary instead of the early turns. That's fine
— work from what you have and note the limitation to the user if it materially affects the result.

## Step 2: Extract candidate learnings

Look for these signal types. For each candidate, capture **what** and **why** in one or two
sentences. Signals come from both directions — user-originated and Claude-originated.

### User-originated signals (what the user taught Claude)

**Corrections.** User pushes back on your approach: "no", "don't", "stop", "actually", "wrong way",
"that's not how we do it here". The _reason_ they gave (or implied) is the learning. Example: "you
used a for-loop, but the convention here is `_map` from js-lib because…" → durable rule.

**Validated non-obvious choices.** You proposed an unusual approach, the user said "yes, exactly" or
accepted it without pushback. The validation is the learning — it confirms a judgment call that's
worth repeating. Don't capture validations of obvious choices.

**Project facts revealed in passing.** "We're freezing merges Thursday", "INGEST is the Linear
project for pipeline bugs", "the auth rewrite is driven by legal, not tech debt", "X is owned by Y
team". Facts that aren't in code and won't be obvious to a future reader.

**Recurring friction.** The user had to say the same thing twice in different forms, or sighed
audibly ("again", "as I said", "for the third time"). Strong signal that whatever was missed belongs
in durable docs.

**Tool/workflow surprises.** "`pnpm check` already runs lint", "the husky hook will format on commit
so don't pre-format", "tests in this package need `--silent=false` to see output". Non-obvious
tooling behavior.

### Claude-originated signals (what the user learned from Claude, or what the session jointly uncovered)

**Surfaced root causes.** Claude tracked down a non-obvious cause (a V8 deopt, a race in a hook, a
silent type widening, a library bug) and the user accepted it as the explanation. The cause — and
the diagnostic that exposed it — is the learning. Example: "the perf regression was the spread on a
TypedArray going through the iterator protocol; `slice()` restored the fast path."

**Researched / explained facts the user reacted to.** Claude looked something up or explained a
mechanism (an engine optimization, an API contract, a benchmark result, a spec detail), and the user
visibly updated ("huh, didn't know that", "ok let's switch to that then", or just immediately
adopted it). The fact is the learning when it's non-obvious and likely to recur.

**Proposed approaches the user adopted.** Claude suggested a pattern, refactor, or technique the
user hadn't considered, and the user accepted it. If the pattern is reusable beyond this one fix,
it's a durable learning — capture the pattern and the situation that makes it the right call.

**Investigation findings.** Claude grepped/read across the codebase and surfaced a fact that isn't
obvious from any single file ("X is called from 14 places, all of which assume Y", "this helper is
only used in tests", "every caller passes the same default"). When the finding shaped the decision,
it's worth preserving.

When the signal originated from Claude, double-check before proposing it: re-read the relevant code
or re-run the command if cheap. A learning built on a hallucinated fact is worse than no learning.

## Step 3: Filter ruthlessly

Drop candidates that are:

- **Derivable from current code.** Architecture, file paths, naming conventions, existing patterns.
  Anyone reading the repo can see these.
- **Already in AGENTS.md / CLAUDE.md.** Read `AGENTS.md` (the project's CLAUDE.md is a symlink to
  it) and de-dupe. If a candidate is a sharper version of an existing rule, propose an _edit_ not an
  _append_.
- **Ephemeral.** Debugging steps for one bug, in-progress task state, conversation context.
- **Git-discoverable.** "We renamed X to Y last week" → `git log` knows. Skip.
- **Speculative.** A pattern observed once isn't a rule. Wait for it to recur.
- **Unverified Claude claims.** A fact Claude stated but the user didn't acknowledge, and you
  haven't re-verified against the code or a primary source. Drop or verify before proposing.

If after filtering there's nothing left, say so plainly: "No durable learnings from this session —
it was [reason]." Don't manufacture content.

## Step 4: Classify each survivor

For each remaining candidate, decide the destination:

- **AGENTS.md** (this repo's CLAUDE.md): durable, enforceable coding/workflow rules that should bind
  future Claude sessions. Match the existing tone — terse, imperative, grouped under a relevant `##`
  section. Add a one-line **why** when the rule isn't self-evident, so the next reader (human or
  model) can judge edge cases instead of cargo-culting. Examples of fit: comparator style, sort
  fast-path, function ordering, `__exclude` boundary, "don't stage changes".

- **docs/LEARNINGS.md**: broader observations, retros, anti-patterns, "we tried X and it didn't pan
  out because Y", historical context that informs judgment but isn't an enforceable rule. Create the
  file if it doesn't exist (entry format below).

- **Drop**: borderline cases the user is unlikely to want recorded. When in doubt, drop. AGENTS.md
  is read at the start of every session; bloating it has a real cost.

## Step 5: Present the proposal

Before editing anything, show the user:

1. A short header: how many candidates surfaced, how many filtered out, how many you're proposing.
2. For each proposal, a block like this:

   ```
   → AGENTS.md (Sort Comparators section)  [origin: user correction]
   ADD:
   - When sorting by a derived value, hoist the mapper outside the comparator
     so it's computed once per element, not O(n log n) times.
     Why: user flagged this in commondao sort path (2026-05-16 session).

   → AGENTS.md (Array & Iterable Patterns section)  [origin: Claude-surfaced, user adopted]
   ADD:
   - Spreading a TypedArray (`[...u8]`) goes through the iterator protocol and
     is materially slower than `Array.from(u8)` or `u8.slice()`. Prefer the
     latter on hot paths.
     Why: traced a perf regression to this pattern; user accepted the fix and
     asked to codify it (2026-05-16 session).

   → docs/LEARNINGS.md (new file)
   ADD entry:
   ## 2026-05-16 — Mocking the DB in integration tests
   We considered swapping the real datastore for a mock to speed up the
   commondao suite. Decision: keep real DB. Why: prior incident where mocked
   tests passed but a prod migration broke. (See commit b8e2c5fe context.)
   ```

   Tag each proposal with its `[origin: …]` so the user can quickly see which learnings came from
   their input vs. from Claude's investigation. This makes it easier to spot Claude-originated
   claims that deserve extra scrutiny before being codified.

3. End with: "Apply these? I'll edit the files and leave them unstaged for your review." Wait for
   explicit confirmation. If the user wants changes, iterate.

## Step 6: Apply

On confirmation:

- For AGENTS.md: use the `Edit` tool, slot each addition under the most appropriate existing `##`
  section. If a new section is needed, place it next to a thematically related one. Preserve
  existing wording and order; don't reformat surrounding content.
- For docs/LEARNINGS.md: if missing, `Write` a new file with this header:

  ```markdown
  # Learnings

  Long-form notes, retros, and anti-patterns from working in this repo. Newer entries on top. For
  enforceable rules, see AGENTS.md (CLAUDE.md).
  ```

  Then append each new entry under a `## YYYY-MM-DD — Title` heading, newest first.

- **Do not stage changes.** The repo's workflow rule is explicit: leave modifications unstaged for
  manual review.
- Don't touch `__exclude/`. Ever.

Report what changed in one or two lines. Don't summarize the additions — the diff is right there.

## Edge cases

- **Compacted sessions.** If your context starts with a compaction summary instead of the original
  turns, raw signal from those turns is gone. Be honest with the user: "the early part was
  compacted, so I can only learn from what's still in context." Don't fabricate learnings from a
  summary.
- **Multiple sessions.** This skill only sees the _current_ session. If the user asks "learn from
  everything we did today," say so and ask them to invoke it at the end of each session instead.
- **Sensitive content.** If credentials, tokens, or personal data appeared in the conversation, do
  _not_ include them verbatim in any proposal. Paraphrase or omit.
