# GitLab Duo Agent Platform: research notes

Read on 20 Oct 2026 from the official documentation at docs.gitlab.com. Nothing here is guessed; open questions are listed at the end.

## What the platform is

An AI layer across the software lifecycle. Custom agents and custom flows are generally available on Premium and Ultimate. MCP clients are available on all tiers. Flows run in an ambient environment (a session with an optional repository clone). Generally available features consume GitLab Credits.

## Custom flows

- A flow is one YAML file with the top-level keys `version`, `environment`, `components`, `routers`, `flow`, optionally `prompts` and `coding_environment`.
- `environment` must be `ambient` in custom flows. `coding_environment` is `full` (default, clones the repository) or `none`.
- A component of type `AgentComponent` has `name`, `type`, `prompt_id`, `inputs` (bare values such as `"context:goal"` or `from`/`as` pairs), and optionally `toolset` and `ui_log_events`.
- Routers connect components (`from`, `to`; reserved targets `end` and `abort`). `flow.entry_point` names the first component.
- Inline prompts: `prompt_id`, `name`, `unit_primitives: []`, `prompt_template` with `system` and `user`, `placeholder: history`, `params`.
- Triggers include merge request events (mention, reviewer assigned, ready, approved or created), work item created and status changed, and pipeline events. The goal given to the flow depends on the trigger (the comment text for mentions, the IID for assign events).
- Created in the UI: Automate > Flows > New flow, or from the AI Catalog.

## Custom agents

Defined in the UI (name, description, visibility, system prompt, tools), enabled per project, then chosen from the Duo chat dropdown. Not defined by a repository file.

## Open questions (verify in the product)

- Exact tool names beyond `read_file`, `list_dir`, `find_files`, `grep`, `edit_file`, `create_merge_request_note`.
- How many GitLab Credits a trial includes and what one flow run costs.
- Whether pipeline-event triggers can read job artifacts.

## What AgentEco uses

Four flows in `.gitlab/duo/flows/`, one per job: contract security review, TypeScript review, finding explanation, issue triage. See `.gitlab/duo/README.md`.
