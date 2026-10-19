# Security policy

AgentEco is a research project that runs on test networks only. There is no mainnet deployment of the current contracts and no real funds.

## Reporting a vulnerability

Please report suspected vulnerabilities privately instead of opening a public issue: use the "Confidential" option when you create an issue in this project, or contact the maintainer through the profile linked from the repository. Include the affected file or contract, what you observed, and how to reproduce it. A first response is usually given within a few days.

## What is in scope

Smart contracts in `contracts/` and `solana/`, the API and keeper in `backend/`, the SDK in `agent-runtime/`, and the website in `frontend/`.

## Automated checks

Every pipeline runs SAST, secret detection and dependency scanning. See `docs/LIFE-AFTER-CODE.md`.
