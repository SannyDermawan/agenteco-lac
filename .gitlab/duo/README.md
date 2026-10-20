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

First runs on GitLab (21 Oct 2026), all four flows:

| Flow | Where it ran | Result |
|---|---|---|
| contract security reviewer | [MR !1](https://gitlab.com/agenteco-group/agenteco-lac/-/merge_requests/1) | First run could not see the diff (the toolset had no diff tool) and said so. After adding `get_merge_request` and `list_merge_request_diffs` it read the diff and found a real inaccuracy in the added comment |
| code reviewer | [MR !2](https://gitlab.com/agenteco-group/agenteco-lac/-/merge_requests/2) | Same limitation, same fix; the second run read the diff, checked callers and posted a review |
| security finding explainer | [MR !2](https://gitlab.com/agenteco-group/agenteco-lac/-/merge_requests/2) | Grouped the ten critical findings of `main` and said which are reachable; suggested excluding vendored `lib/` from dependency scanning, which was applied |
| issue triage | [issue #1](https://gitlab.com/agenteco-group/agenteco-lac/-/work_items/1) | First run failed because the flow was not given the project id (it said so and changed nothing). After adding `project_id` it labelled the test issue `bug` and `security` and posted one note telling the reporter to use a confidential issue |

The MRs and the issue are demo material (comment-only changes, do not merge). Each flow's first run exposed a gap in its own YAML, which is why the YAML in this folder differs from the first version in the commit history.
