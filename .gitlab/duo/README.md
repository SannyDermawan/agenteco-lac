# GitLab Duo Agent Platform: AgentEco flows

These four flows are the AI part of the project's post-code automation. They are plain YAML in the flow registry v1 format, so they are versioned and reviewed like code.

| File | What it does | Suggested trigger |
|---|---|---|
| `flows/contract-security-review.yaml` | Reviews merge requests that touch contracts, checks tests, writes one verdict note | Merge request mention, reviewer assigned |
| `flows/mr-code-review.yaml` | Reviews TypeScript changes in the SDK, backend, CLI and frontend | Merge request mention, reviewer assigned |
| `flows/security-finding-explainer.yaml` | Explains scanner findings in plain words and proposes the smallest fix | Merge request mention |
| `flows/issue-triage.yaml` | Labels and summarises new issues, asks for missing details | Work item created |

## Installing a flow (once per flow, in the GitLab UI)

GitLab creates custom flows and agents in the UI, not from a file in the repository:

1. Project > Automate > Flows > New flow.
2. Under Configuration choose Flow and paste the content of the YAML file.
3. Save, then enable the flow in the project and add the trigger from the table (Automate > Triggers).
4. Open a merge request and mention the flow, or assign it as reviewer, to run it.

Requires the Developer role or higher and an active GitLab Duo Agent Platform trial or subscription.

## Honest status

The YAML follows the public schema page and the registry v1 conventions. Each flow was created from it in the GitLab UI (GitLab accepted all four) and enabled. Tool names are the snake_case form of the tools GitLab lists in the agent form (AI > Agents > New agent > Tools).

First runs on GitLab (21 Oct 2026, merge requests !1 and !2 of this project, comment-only demo changes): the contract security reviewer and the code reviewer both started, ran and posted a note. The first version of their toolset had no way to read the merge request diff, so both said so and refused to guess; `get_merge_request` and `list_merge_request_diffs` were added afterwards. The issue triage and security finding explainer flows have not run yet.
