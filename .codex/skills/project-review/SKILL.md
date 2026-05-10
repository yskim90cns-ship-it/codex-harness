---
name: project-review
description: Use this skill when reviewing this project's changed files for architecture compliance, ADR technology-stack compliance, tests, AGENTS.md CRITICAL rules, and buildability.
---

# Project Review

## Review Workflow

When the user asks to review this project's changes, first read:

- `/AGENTS.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`

Then inspect changed files and evaluate them against the checklist below.

## Checklist

1. **Architecture compliance**: does the work follow the directory structure defined in `ARCHITECTURE.md`?
2. **Technology stack compliance**: does it avoid technology choices outside `ADR.md`?
3. **Test coverage**: were tests added or updated for new behavior?
4. **CRITICAL rules**: does it avoid violating the CRITICAL rules in `AGENTS.md`?
5. **Buildability**: do the build commands pass without errors?

## Output Format

Use this table:

| Item | Result | Notes |
| --- | --- | --- |
| Architecture compliance | ✅/❌ | {details} |
| Technology stack compliance | ✅/❌ | {details} |
| Test coverage | ✅/❌ | {details} |
| CRITICAL rules | ✅/❌ | {details} |
| Buildability | ✅/❌ | {details} |

If violations exist, provide concrete fixes.
