# Known issues the pipeline reports

These existed before the Life After Code work. The pipeline reports them instead of hiding them, and they are good first tasks for the Duo reviewer flows.

## Frontend lint (5 errors, 1 warning)

`npx eslint .` in `frontend/` reports `react-hooks/set-state-in-effect` in:

- `app/app/agents/[id]/activate/page.tsx:29`
- `components/app/DisputeTimelineCard.tsx:94`
- `components/app/FaucetStrip.tsx:54`
- `components/app/SessionGate.tsx:55`
- `lib/useOverview.ts:44`

and an unused variable `_at` in `lib/useOverview.ts:166`. The CI job logs them (`reports/frontend-lint.log`) and does not fail on them yet. Fixing them is a candidate for a merge request reviewed by the code reviewer flow.

## Dependency licenses to review

`license-check.mjs` lists packages that are not on the permissive allow list. At the time of writing: `seq-queue` declares no license, and `elkjs` is EPL-2.0 (weak copyleft, allowed with review).

## Solana read session in Phantom

Reading a Solana account in Phantom fails with "Account not supported" because the EVM session path is used for Solana accounts. See `agent-runtime/src/shared/session.ts`. Not addressed here.

## Dependency and code scan findings (first GitLab run, 21 Oct 2026)

The first full GitLab pipeline reported 237 findings: 154 from dependency scanning and 83 from SAST (10 critical, 96 high, 113 medium, 14 low, 4 unknown). They are reported, not fixed: the scanners run with `allow_failure`, and nothing here changed the product code.

- Many dependency findings come from lockfiles inside the vendored Solidity libraries (`lib/openzeppelin-contracts`, a git submodule). After this run the dependency scanners exclude `lib/`, so the next count will be lower and honest about what belongs to this repository.
- The critical findings that remain after that are in the website and backend lockfiles (for example `next`, `handlebars`, `sharp`, `pbkdf2`). The security finding explainer flow grouped the ten critical ones on MR !2 and said which are reachable. Upgrading those packages is real work that was not done for this submission.
- Treat the status page's "security" numbers as the scanner's raw output, not as a clean bill of health.
