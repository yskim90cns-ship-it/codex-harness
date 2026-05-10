---
name: harness
description: Use this skill when working in this Harness-framework project: reading docs, discussing implementation decisions, designing phase/step plans, creating phases metadata and step files, or running scripts/execute.py workflows.
---

# Harness

## Workflow

This project uses the Harness framework. Follow this workflow when the user asks to plan or implement work in this repository.

### A. Explore

Read the project documents under `/docs/` such as `PRD.md`, `ARCHITECTURE.md`, and `ADR.md` to understand product intent, architecture, and design decisions.

Use parallel exploration agents only when the user explicitly asks for sub-agents or parallel agent work.

### B. Discuss

If implementation requires product clarification or a technical decision that cannot be safely inferred from the repository, present the concrete options and discuss them with the user.

### C. Design Steps

When the user asks for an implementation plan, draft it as multiple steps and request feedback before creating files.

Step design principles:

1. **Minimize scope**: each step should touch one layer or module. Split steps when several modules must change.
2. **Make each step self-contained**: every step file runs in an independent Codex session. Do not refer to prior chat context; include all necessary information in the file.
3. **Force preparation**: list relevant docs and files created or modified by prior steps so the next session reads context before editing.
4. **Specify signatures, not full implementations**: provide function/class interfaces and key invariants, while leaving implementation details to the executing agent.
5. **Use executable acceptance criteria**: prefer concrete commands such as `npm run build && npm test`.
6. **Be specific in warnings**: write "Do not do X. Reason: Y" instead of vague caution.
7. **Name steps with kebab-case slugs**: use one or two words that capture the core module or task, such as `project-setup`, `api-layer`, or `auth-flow`.

### D. Create Files

When the user approves the plan, create the files below.

#### `phases/index.json`

This top-level index tracks multiple tasks. If it already exists, append a new entry to `phases`.

```json
{
  "phases": [
    {
      "dir": "0-mvp",
      "status": "pending"
    }
  ]
}
```

Rules:

- `dir`: task directory name.
- `status`: one of `"pending"`, `"completed"`, `"error"`, or `"blocked"`.
- Do not add timestamps when creating the file. `execute.py` records them during state transitions.

#### `phases/{task-name}/index.json`

```json
{
  "project": "<project-name>",
  "phase": "<task-name>",
  "steps": [
    { "step": 0, "name": "project-setup", "status": "pending" },
    { "step": 1, "name": "core-types", "status": "pending" },
    { "step": 2, "name": "api-layer", "status": "pending" }
  ]
}
```

Rules:

- `project`: project name from `AGENTS.md`.
- `phase`: task name, matching the directory name.
- `steps[].step`: zero-based sequence number.
- `steps[].name`: kebab-case slug.
- `steps[].status`: initially `"pending"`.
- `summary` should be a one-line completion summary useful to later steps, including created files or key decisions.
- Do not add `created_at`, `started_at`, `completed_at`, `failed_at`, or `blocked_at` during file creation. `execute.py` records them.

State fields:

| Transition | Field | Writer |
| --- | --- | --- |
| `completed` | `completed_at`, `summary` | Codex session writes `summary`; `execute.py` writes timestamp |
| `error` | `failed_at`, `error_message` | Codex session writes message; `execute.py` writes timestamp |
| `blocked` | `blocked_at`, `blocked_reason` | Codex session writes reason; `execute.py` writes timestamp |

#### `phases/{task-name}/step{N}.md`

Use this structure for each step:

````markdown
# Step {N}: {name}

## Files To Read

First read these files and understand the architecture and design intent:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- {files created or modified by prior steps}

Read prior-step code carefully before working.

## Task

{Concrete implementation instructions. Include file paths, function/class signatures, and logic requirements. Keep snippets at interface/signature level unless an invariant must be exact.}

## Acceptance Criteria

```bash
npm run build
npm test
```

## Verification

1. Run the AC commands.
2. Check the architecture checklist:
   - Does the work follow the `ARCHITECTURE.md` directory structure?
   - Does it stay within the `ADR.md` technology stack?
   - Does it avoid violating `AGENTS.md` CRITICAL rules?
3. Update `phases/{task-name}/index.json` for this step:
   - Success: `"status": "completed"`, `"summary": "one-line artifact summary"`
   - Failure after 3 fix attempts: `"status": "error"`, `"error_message": "specific error"`
   - User action required: `"status": "blocked"`, `"blocked_reason": "specific reason"`, then stop immediately.

## Prohibited

- {Specific "Do not do X. Reason: Y" items for this step}
- Do not break existing tests.
````

### E. Execute

Run:

```bash
python3 scripts/execute.py {task-name}
python3 scripts/execute.py {task-name} --push
```

`execute.py` handles:

- creating or checking out `feat-{task-name}`
- injecting guardrails from `AGENTS.md` and `docs/*.md`
- passing completed step summaries into later prompts
- retrying failed work up to 3 times with prior errors in context
- separating code changes and metadata into two commits
- recording `started_at`, `completed_at`, `failed_at`, and `blocked_at`

Recovery:

- For `error`, set the step status back to `"pending"` and remove `error_message`, then rerun.
- For `blocked`, resolve `blocked_reason`, set status back to `"pending"`, remove `blocked_reason`, then rerun.
