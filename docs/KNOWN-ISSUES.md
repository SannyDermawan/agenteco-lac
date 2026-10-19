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
