# UI Guide

## Design Principles
1. It should feel like a developer operations dashboard, not a marketing page.
2. Optimize for scanning: status, changed files, and failed/blocked steps must be visible without drilling into every file.
3. Keep interactions predictable: filters, tabs, refresh, and detail panels should behave like standard productivity tools.
4. Use restrained styling so status colors carry meaning.

## Layout
- First screen: summary metrics, active/blocked/error steps, and recent file changes.
- Main navigation: compact tabs or sidebar for Overview, Phases, Files, Output.
- Detail view: selecting a phase or step reveals summaries, timestamps, output excerpts, and related files.
- Width: use a full-width dashboard layout with a constrained inner max width only where text readability requires it.
- Avoid landing-page hero sections. The dashboard itself is the first screen.

## Color Tokens
| Purpose | Value |
| --- | --- |
| Page background | `#0b0d10` |
| Surface | `#151922` |
| Surface raised | `#1d2430` |
| Border | `#2a3342` |
| Primary text | `#f4f7fb` |
| Secondary text | `#a9b4c2` |
| Muted text | `#738196` |
| Accent | `#38bdf8` |
| Completed | `#22c55e` |
| Pending | `#94a3b8` |
| Blocked | `#f59e0b` |
| Error | `#ef4444` |
| Deleted file | `#fb7185` |
| Added file | `#34d399` |
| Modified file | `#60a5fa` |

## Components
### Cards and Panels
```text
border: 1px solid #2a3342
background: #151922
border-radius: 8px
padding: 16px
```

Use cards for repeated items such as phase rows, step rows, and file change entries. Do not put cards inside cards.

### Buttons
```text
Primary: #38bdf8 background, #061018 text
Secondary: transparent background, #2a3342 border, #f4f7fb text
Danger: transparent background, #ef4444 border/text
```

Icon buttons should use recognizable icons for refresh, filter, search, expand, collapse, and external/open actions.

### Status Badges
- Completed: green
- Pending: gray
- Blocked: amber
- Error: red
- Keep badges compact and text-based. Do not animate status indicators.

### Tables and Lists
- File changes and steps should use dense rows with stable columns.
- Long paths should truncate from the middle or wrap only in detail views.
- stdout/stderr should use monospace blocks with explicit truncation indicators.

## Typography
| Purpose | Style |
| --- | --- |
| Page title | `24px`, semibold |
| Section title | `16px`, semibold |
| Metric value | `28px`, semibold, tabular numbers |
| Row title | `14px`, medium |
| Body | `14px`, regular |
| Metadata | `12px`, regular |
| Code/output | `13px`, monospace |

Use `font-variant-numeric: tabular-nums` for counts, timestamps, and durations.

## Interactions
- Auto-refresh is enabled for MVP and must include a visible pause/resume control.
- Manual refresh remains available as an explicit icon button.
- Filters should be reversible and never hide error/blocked counts from the summary.
- Selecting a step should preserve the user's current phase/file filters.
- Empty states should explain which file or command produced no data.

## Anti-patterns
| Do not use | Reason |
| --- | --- |
| gradient text | Distracts from operational status |
| decorative gradient blobs | Adds noise without information |
| glass morphism blur | Reduces legibility in dense dashboards |
| oversized hero content | Delays access to the actual tool |
| animated glowing status | Makes severity harder to scan |
| purple/indigo AI branding palette | Generic and unrelated to local development state |
| rounded-2xl everywhere | Makes dense operational UI feel soft and imprecise |

## Accessibility
- Status cannot rely on color alone; include text labels.
- All controls need keyboard focus states.
- Output blocks must preserve whitespace but allow copying.
- Error and blocked states should be reachable through headings or landmark regions.
