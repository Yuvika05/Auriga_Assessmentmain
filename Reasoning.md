SplitPool — Design Rationale
Why the solution was built this way, phase by phase.
This document explains the reasoning behind the decisions made across the SplitPool build prompts —
not what to build, but why each choice was made and what alternatives were rejected. It's meant to be
read alongside the phase prompts, as the "why" companion to their "what."
---
1. Why derive everything, store nothing
Decision: Fair share, total collected, and per-person balance are never stored — they're always
computed from `target amount` and the `contributions` table.
Reasoning: The moment a balance is stored as its own field, it can drift from the transactions
that should have produced it — an edit, a delete, or a failed write can leave a stale number sitting
in the database with nothing forcing it back into agreement. Deriving it on every read makes drift
structurally impossible: there is no "wrong" balance to fix, only a correct calculation over whatever
contributions currently exist. The cost is recomputation on every read, which is deliberately traded
away — at the scale this app runs at (tens to low hundreds of participants, thousands of
contributions), that cost is negligible next to the correctness it buys.
Rejected alternative: Store balances and update them incrementally on each contribution (common
in ledger systems at large scale, for performance). Rejected because SplitPool never operates at a
scale where derivation is slow, so the performance argument for incremental storage doesn't apply —
only its downside (drift risk) would.
2. Why integer minor units, not decimals
Decision: All money is stored and calculated as integer paise, formatted to rupees only at the
display layer.
Reasoning: Floating-point arithmetic cannot represent most decimal fractions exactly (`0.1 + 0.2 != 0.3` in IEEE 754), so repeated addition/subtraction of rupee amounts across many contributions
compounds into visible errors — the kind of `₹1999.9999999998` bug the original spec explicitly
called out. Integers under addition and subtraction have no such error; the only place fractional
values could appear is the initial division of a target across participants, which is exactly where
the residual-distribution rule (§5) applies deliberately, once, rather than accumulating unpredictably
across many operations.
3. Why greedy settlement, not the exact minimum
Decision: The settle-up algorithm is the greedy largest-debtor/largest-creditor match — not a
solver for the provably fewest possible transactions.
Reasoning: Finding the exact minimum number of transactions is a partition problem and is
NP-hard in general — the only way to solve it exactly is exponential search over subsets, which is
wasted engineering effort for a farewell-gift or kitty-party pool with a handful to a few dozen
people. The greedy approach is O(n log n), always terminates, always produces a correct
(balances-reach-zero) result, and in practice produces a transaction count very close to optimal.
This is a case where "provably optimal" and "good enough to be invisible to the user" diverge sharply
in implementation cost, and the cheaper option was chosen deliberately — with the exact-minimum
solver kept explicitly as a labeled stretch goal rather than silently dropped, so the trade-off is a
visible decision, not an omission.
4. Why pure functions, separated from the UI, everywhere
Decision: Fair share, balance, and settlement calculations — and later, the import
parse/normalize/match/dedupe pipeline — are all pure, side-effect-free functions that don't know
about React, Zustand, or Supabase.
Reasoning: Money-handling logic is exactly the code you most want to unit test exhaustively and
least want to accidentally change while touching something else (a re-render, a prop rename, a UI
refactor). Keeping it pure and separate means it can be tested with plain input/output assertions,
independent of whatever's rendering it, and means a UI change can never silently alter what a balance
means. This is also why the import pipeline in Phase 4 was designed as a named sequence of pure
stages rather than one big "handle the file" function — each stage (parse, normalize, match,
deduplicate, validate) can be tested and reasoned about on its own.
5. Why the repository pattern, even before a real backend existed
Decision: All persistence went through a repository interface (get/save/update/delete) from the
very first version, with localStorage as its first implementation — not baked directly into
components.
Reasoning: This was a deliberate bet that the backend would change (it did — Phase 2 swapped in
Supabase). Writing storage calls directly into components would have meant touching every screen
during that migration; going through an interface meant Phase 2 only had to write a new
implementation of the same contract, with zero UI changes required. The up-front cost of an
abstraction layer was paid once, early, specifically to avoid a much larger cost later.
6. Why Supabase over a custom backend or Firebase
Decision: Phase 2 replaced localStorage with Supabase (Postgres + Auth + Realtime + Row Level
Security), rather than a hand-rolled Node server or Firebase.
Reasoning: Three things were needed at once — real accounts, live multi-device sync, and per-user
data scoping — and Supabase provides all three as one integrated service without requiring a backend
to be built and operated separately. Firebase would have solved the same three problems roughly as
well; Supabase was preferred here specifically because its data model is relational (Postgres), which
maps naturally onto the pool/member/contribution/split structure already designed, and because Row
Level Security expresses "a user only sees their own pools" as a database-enforced policy rather than
an application-level check that every new screen has to remember to apply correctly.
7. Why custom password hashing was removed, not improved
Decision: Phase 2 replaced the original spec's "hash passwords with SHA-256 before storage" with
Supabase's built-in Auth, rather than just upgrading the hash function.
Reasoning: Authentication is a narrow, extremely well-studied problem where almost every
custom implementation reintroduces a solved vulnerability (weak session handling, no rate limiting on
login attempts, no secure password-reset flow, timing attacks on comparison). The original spec's
SHA-256 requirement was a reasonable instruction for a prototype, but "make login work well" (the
Phase 3 requirement) was better served by removing the custom implementation entirely than by
hardening it — the highest-leverage security fix here was deletion, not improvement.
8. Why payment confirmation trusts a server-side webhook, never the browser
Decision: A Razorpay payment is only marked confirmed once a server-side webhook verifies it — a
client-side "payment succeeded" callback is never sufficient on its own.
Reasoning: Anything that happens in the browser is, by construction, visible to and alterable by
whoever controls that browser — a client callback firing "success" only proves the browser claims
the payment succeeded, not that the money actually moved. A webhook from Razorpay's own servers,
verified with a signature the browser never sees, is the only signal that can't be forged by the
person paying. This is also why real-time broadcast (Phase 2's channels) is triggered by the webhook
handler, not by the payment UI — "visible in real time" was explicitly reinterpreted to mean
visible once verified in real time, not visible immediately and possibly wrong.
9. Why the pool model didn't need a redesign for generalization
Decision: Phase 3's "not specific to a manager's farewell pool" requirement was treated mostly as
an audit-and-remove-assumptions task, not a rebuild.
Reasoning: The original data model (Pool → Members → Contributions, with an editable target and
live-recalculated fair share) never actually encoded anything farewell-gift-specific — the ₹6,000 and
"manager" framing existed only in the example narrative, not the schema or the algorithms. Adding a
`category` field for labeling and confirming no hardcoded copy remained was enough; a deeper redesign
would have solved a problem that didn't exist in the architecture, only in leftover example text.
10. Why two separate visibility scopes, not one privacy setting
Decision: Contribution history is visible to every member within a pool, but a person's
consolidated history across pools is visible only to them — enforced at the database level via Row
Level Security, not hidden only in the UI.
Reasoning: These solve two different trust problems that are easy to conflate into a single
"private/public" toggle. Within one pool, everyone needs to see everyone's contributions or the
organizer's numbers aren't verifiable and the whole point of the app (trustworthy shared bookkeeping)
fails. Across pools, no one needs — and no one consented — to expose their participation in every
other group they're part of to people in this one group. Enforcing this via RLS rather than
UI-hiding matters because a UI restriction is cosmetic — the data is still reachable by anyone who
queries the API directly — while an RLS policy makes the restriction true regardless of which client
asks.
11. Why the import pipeline is a strict review gate, not an autonomous cleaner
Decision: Phase 4's import never writes to live data without an explicit human-reviewed preview;
ambiguous rows are never auto-resolved by picking the statistically likely answer.
Reasoning: An import pipeline's job here is reconciling someone's actual money history — a
wrong auto-merge (two different people combined into one balance) or a wrong amount interpretation
(locale-ambiguous decimal parsed the wrong way) doesn't fail loudly, it produces a plausible-looking
but incorrect ledger that nobody has reason to double-check. The design principle carried through
Phase 4 and Phase 4.1 is: automation should only ever narrow the human's job, never replace their
judgment on anything genuinely ambiguous. This is why confidence tiers exist at all (high-confidence
auto-merge is still shown and reversible; medium-confidence and below always require a decision), and
why Phase 4.1 explicitly biased matching thresholds toward more false negatives (extra manual review)
rather than fewer false positives (wrong auto-merges) — a person re-confirming an obvious match is a
minor annoyance; a silently wrong balance is a trust failure the app may not recover from.
12. Why hardening (Phase 4.1) was a separate pass, not folded into Phase 4
Decision: The import feature was specified once for its happy path (Phase 4), then audited
separately for failure modes (Phase 4.1: idempotency, concurrency, security, encoding, locale
ambiguity).
Reasoning: Specifying the correct-path behavior and specifying everything that can go wrong
are different modes of thinking, and conflating them tends to produce a spec where edge cases get
one bullet point each and are easy for a build tool to under-implement. Separating them mirrors how
the original project spec itself worked (a features list, then a dedicated "edge cases to handle
explicitly" section) — treating hardening as its own deliberate audit pass, done after the core shape
exists, rather than trying to anticipate every failure mode while also designing the happy path.
---
Cross-cutting principle, stated once
Nearly every decision above reduces to the same underlying rule, applied at a different layer each
time:
> **When the system isn't certain something is correct, it should say so — to a human, loudly — rather
> than produce a confident-looking but possibly wrong result.**
Ambiguous dates and amounts go to review instead of being guessed. Uncertain name matches go to
review instead of being merged. Payments aren't confirmed until a server can prove they happened.
Balances are recomputed from source data instead of trusted as stored numbers. Access is restricted
at the database, not just hidden in the interface. The common thread isn't a specific technology
choice — it's a bias, held consistently across every phase, toward failing visibly over failing
silently.
