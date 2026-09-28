# Caveman skills

Skills vendored from [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)
(`skills/` tree, upstream commit `2fd153c`, 2026-09-22). Upstream licenses that
tree as MIT — see `LICENSE.caveman`.

Claude Code picks these up automatically: any `SKILL.md` under `.claude/skills/`
in the project is available in sessions started from this repository.

## What is here

Works standalone, no extra tooling:

| Skill | Purpose |
|---|---|
| `caveman` | Ultra-compressed output mode (lite / full / ultra) |
| `caveman-commit` | Conventional Commits message, compressed to intent |
| `caveman-review` | Code review, one line per finding |
| `caveman-explore` | Read-only repo explorer, returns `path:line` citations |
| `caveman-help` | Quick-reference card for the caveman modes and skills |
| `caveman-stats` | Token usage / mode attribution for the session |
| `cavecrew` | When to delegate to the `cavecrew-*` subagents |
| `investigate-first` | Diagnose ambiguous failures before editing |
| `surgical-patch` | Narrowest-layer bug fixes |
| `safe-refactor` | Behavior-preserving restructuring |
| `lean-build` | Feature work with overbuilding risk |
| `migration` | Reversible, compatibility-safe transitions |
| `verify-and-stop` | Validation-only, prove acceptance without scope creep |

Needs `python3` on PATH:

| Skill | Purpose |
|---|---|
| `caveman-compress` | Compress `CLAUDE.md` / todo files via `scripts/__main__.py` |

Needs the Caveman CLI or a Caveman Cloud account (installed separately — these
are inert without it):

| Skill | Purpose |
|---|---|
| `caveman-setup` | Wire a repo through the Caveman Cloud gateway |
| `caveman-discover` | Label LLM workflows for per-workflow spend |
| `caveman-learn` | Act on a Caveman learn report |
| `caveman-evidence-review` | Read-only review of Cloud evidence |
| `caveman-manage` | Inspect experiment lifecycle |
| `caveman-optimize` | Evaluate an optimization candidate |

## Companion subagents

`cavecrew` delegates to three subagents, vendored alongside into
`.claude/agents/`: `cavecrew-investigator`, `cavecrew-builder`,
`cavecrew-reviewer`.

## Updating

Re-copy the `skills/` subdirectories (and the three `agents/cavecrew-*.md`
files) from upstream; nothing here is locally modified.
