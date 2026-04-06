# Fitness Coach Hybrid Skill (AI Edge Gallery format)

> V1: compact rules for an AI model + lightweight coach actions.

## Repository contents

```text
SKILL.md
scripts/index.html
scripts/readiness-core.js
assets/exercise_catalog.json
assets/exercise_metadata.json
assets/tracking_types.json
tests/readiness-core.test.js
```

## Why instructions still matter for an AI model

The model still needs short operational rules to avoid forgetting behavior:
- when to run readiness
- when not to run readiness
- when to stay silent (`ready`)
- how to phrase one short coaching hint (`caution`/`recover`)

This repo intentionally uses concise rule-style guidance in `SKILL.md`.

## Implemented actions

- `show_today`
- `start_workout`
- `log_workout`
- `show_last_workout`
- `suggest_next_workout`
- `create_hybrid_plan`
- `compute_readiness`
- `suggest_intensity`

## Design intent

- Recovery should stay mostly invisible.
- For “today” flows: workout first, only add short caution/recovery note when needed.
- Targeted readiness (`targetGroups`) should be preferred over global-only interpretation.

## Local tests

```bash
node tests/readiness-core.test.js
```
