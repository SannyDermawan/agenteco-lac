# AgentEco: life after code

**Post-code automation for an AI-agent escrow project, built on GitLab CI/CD and GitLab Duo Agent Platform.** Submission for the GitLab Transcend "Life After Code" hackathon, Path B ("Bring Your Own"), Supervised autonomy.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

- Original open source project (MIT): [SannyDermawan/agenteco-multichain](https://github.com/SannyDermawan/agenteco-multichain)
- GitLab project for this submission: [gitlab.com/agenteco-group/agenteco-lac](https://gitlab.com/agenteco-group/agenteco-lac)
- What changed for this hackathon: [`pre-lac...main`](https://github.com/SannyDermawan/agenteco-lac/compare/pre-lac...main)
- The full write-up, with the submission text and video script: [docs/LIFE-AFTER-CODE.md](docs/LIFE-AFTER-CODE.md)

## The problem

[AgentEco](AGENTECO.md) lets AI agents hire each other with on-chain escrow, disputes and reputation. It is built by one person. AI made writing the code (Solidity contracts, an SDK, a backend, a website) much faster, but everything after the code stayed manual: running three test suites by hand, reading diffs alone, checking for leaked keys, remembering to look at the deployment. The repository had no CI at all, and it holds escrow logic. That is the risky half.

## What this adds

A nine-stage pipeline in [`.gitlab-ci.yml`](.gitlab-ci.yml), plus four GitLab Duo flows for the parts that need judgement.

| Stage | What runs | Where |
|---|---|---|
| plan | Issue and merge request templates, a Duo flow that triages new issues | `.gitlab/issue_templates/`, `.gitlab/duo/flows/issue-triage.yaml` |
| create | Duo reviewer flows for TypeScript and for Solidity contracts, CODEOWNERS | `.gitlab/duo/flows/`, `.gitlab/CODEOWNERS` |
| verify | Foundry build and tests, SDK, backend and CLI typecheck and tests, frontend lint and production build | stage `verify` |
| package | SDK and CLI tarballs, contract ABIs | stage `package` |
| secure | SAST, secret detection, dependency scanning, a findings summary, a Duo flow that explains findings and proposes fixes | stages `test` and `secure` |
| release | Public status site on GitLab Pages; a manual, approval-gated Cloud Run deploy | job `pages`, job `release:cloud-run` |
| configure | Environment contract: every service documents its variables and no example holds a secret | `scripts/ci/check-env.mjs` |
| monitor | Health checks of the API and website after each deploy and on a schedule; a failure opens an incident issue | `scripts/ci/health-check.mjs` |
| govern | License check of every locked package, nine repository policy rules | `scripts/ci/license-check.mjs`, `scripts/ci/policy-check.mjs` |

### The Duo flows

| Flow | Job |
|---|---|
| [`contract-security-review.yaml`](.gitlab/duo/flows/contract-security-review.yaml) | Reviews merge requests that touch contracts: reentrancy, access control, deadline and fee arithmetic, the dispute state machine, missing tests. Posts one verdict note |
| [`mr-code-review.yaml`](.gitlab/duo/flows/mr-code-review.yaml) | Reviews TypeScript changes in the SDK, backend, CLI and frontend |
| [`security-finding-explainer.yaml`](.gitlab/duo/flows/security-finding-explainer.yaml) | Explains scanner findings in plain words, says when one is a false positive, proposes the smallest fix |
| [`issue-triage.yaml`](.gitlab/duo/flows/issue-triage.yaml) | Labels and summarises new issues, asks for missing details |

Install steps (flows are created in the GitLab UI): [.gitlab/duo/README.md](.gitlab/duo/README.md). Research notes: [docs/DUO-NOTES.md](docs/DUO-NOTES.md).

### The status page

The `pages` job builds a public page from what the pipeline actually produced (test counts from the jobs' own reports, the security summary, license and policy results), so the page is generated evidence, not typed-in claims. It stays up between pipelines.

## Before and after

| Before | After |
|---|---|
| No CI. Tests run by hand before a release | Every push and merge request runs all suites |
| One maintainer reading diffs alone | Duo flows review every merge request, a human approves |
| Leaked keys or risky dependencies found by luck | SAST and secret detection on every pipeline (dependency scanning is configured but currently produces no report), findings explained in plain language |
| Outages noticed when a user complains | Scheduled checks open an incident issue |
| The state of the project lives in the maintainer's head | A public status page generated from each pipeline |

## What existed before and what is new

**Before (tag `pre-lac`, commit `172edc3`, 150 commits since 24 Sep 2026):** the whole AgentEco product: escrow and arbiter contracts, the Solana program, SDK, CLI, backend, keeper, host and AI arbiter, the website, deployments on test networks. See [AGENTECO.md](AGENTECO.md) and the [project history](#project-history).

**New for this hackathon (commits after the tag):** `.gitlab-ci.yml`, `scripts/ci/`, `.gitlab/` (Duo flows, templates, CODEOWNERS), `deploy/cloud-run/`, `SECURITY.md`, and the docs listed above. Nothing in the product code was changed.

## Run it locally

The same commands the jobs run:

```bash
forge test                                        # contracts
cd agent-runtime && npm ci && npm test            # SDK
cd backend && npm ci && npm test                  # API and keeper
cd frontend && npm ci && npm run build            # website
node scripts/ci/policy-check.mjs                  # repository policy rules
node scripts/ci/license-check.mjs                 # dependency licenses
```

## Evidence you can open

Everything below is public on GitLab and was produced by the pipeline and the Duo flows, not typed in.

| Claim | Where to look |
|---|---|
| The nine-stage pipeline runs, with history | [Pipelines](https://gitlab.com/agenteco-group/agenteco-lac/-/pipelines) (`main` is green) |
| The status page is generated from the pipeline and stays up | [agenteco-group.gitlab.io/agenteco-lac](https://agenteco-group.gitlab.io/agenteco-lac/) |
| The contract security reviewer read a diff and found a real inaccuracy | [Merge request !1](https://gitlab.com/agenteco-group/agenteco-lac/-/merge_requests/1) |
| The code reviewer and the finding explainer ran on a merge request | [Merge request !2](https://gitlab.com/agenteco-group/agenteco-lac/-/merge_requests/2) |
| The triage flow labelled an issue and asked for missing details | [Issue #1](https://gitlab.com/agenteco-group/agenteco-lac/-/work_items/1) |
| What each flow got wrong on its first run, and the fix | [.gitlab/duo/README.md](.gitlab/duo/README.md) |

The two merge requests and the issue are demo material: they are comment-only changes made to exercise the flows, and are left open on purpose (do not merge).

## Honest status

- The current contracts (escrow v3, the arbiter council and the Solana program) run on test networks only, with no real funds. An earlier, escrow-only version of the contract was deployed on BOT Chain mainnet for a hackathon entry (GMT Build Week Vol. 2); the current code no longer uses it and was not changed here.
- The pipeline has run on GitLab (21 Oct 2026): configure, verify (228 tests), package, the four scanners and govern pass. The first GitLab run found real problems, fixed in follow-up commits: jobs that did not install the packages their typecheck compiles, a Foundry job that could not write to a root-owned folder, a stale CLI test, and a policy job without git.
- The four Duo flows were created from the YAML in `.gitlab/duo/flows/` in the GitLab UI, enabled with the default Mention / Assign / Assign reviewer triggers, and each has run once on GitLab (two merge requests and one issue, all demo material). Each first run exposed a gap in the flow's own YAML (missing diff tools, missing project id) that was fixed; details and links in [.gitlab/duo/README.md](.gitlab/duo/README.md).
- The security scanners reported 237 findings on the first run (10 critical, dependency lockfiles for the most part). In the latest pipeline SAST reports 71 findings (26 high) and secret detection finds none, but the dependency scanning jobs succeed without producing a report, so the latest counts do not include dependency findings (cause not yet diagnosed). Findings are reported, not fixed: [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md).
- Five lint errors in existing frontend code are reported by the pipeline, not fixed: [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md).

## Project history

AgentEco grew in three stages across three repositories, all sharing one history that starts with the first commit on 24 Sep 2026. This repository keeps that history intact, so the work is visible commit by commit.

| Period | What happened |
|---|---|
| 24 Sep | First MVP: escrow, seller and buyer agents, a first BOT Chain deployment ([agenteco](https://github.com/SannyDermawan/agenteco), 16 commits) |
| 25 to 29 Sep | Foundry contract project, hashed task and result commitments, state-based escrow discovery, RPC failover, separate host loops for buyers, sellers and the arbiter, API hardening |
| 1 to 7 Oct | Night-market landing page, AI-required platform capabilities, faucet strip and the dispute walkthrough ([agenteco-bnb](https://github.com/SannyDermawan/agenteco-bnb), 78 commits, the BNB hackathon snapshot) |
| 10 to 13 Oct | One-prompt onboarding with the staged `hire()` SDK, CLI and MCP server; Solana program and adapter; deployments with proof runs on Base, Ethereum, Arbitrum and Tempo testnets and BOT Chain; ERC-8004 identity ([agenteco-multichain](https://github.com/SannyDermawan/agenteco-multichain), 150 commits) |
| 17 Oct | Tag `pre-lac`: the baseline for this hackathon |
| 20 Oct onward | The work in this repository |

## License

MIT, see [LICENSE](LICENSE).
