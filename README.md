# Fitness Coach Hybrid Skill (AI Edge Gallery format)

> Product role: **lightweight local session coach** (not just a readiness calculator).

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

## Session-coach capabilities (implemented)

- `show_today` → tells today’s workout first, adds note only if needed.
- `start_workout` → starts planned session with subtle readiness context.
- `log_workout` → logs a session and returns `updatedSessions` for local state continuity.
- `show_last_workout` → returns latest session or latest session containing a specific `exerciseId`.
- `suggest_next_workout` → picks next day from `planDays` and reuses today-flow behavior.
- `targeted_readiness` → readiness for specific target groups (not only global fatigue).
- `suggest_adjustment` → lightweight practical adjustments for today’s unit.
- `create_hybrid_plan` → small 3+2 style hybrid template generator.

## Behavior guarantees

- Readiness is checked only in workout-related flows.
- If status is `ready`, no recovery warning is shown.
- If status is `caution`/`recover`, exactly one short practical note is added.
- Tone stays concise and non-medical.

## Why instructions still matter for an AI model

The model still needs short operational rules so it does not forget:
- when to run readiness
- when not to run readiness
- when to stay silent (`ready`)
- how to phrase one short coaching hint (`caution`/`recover`)

## Local tests

```bash
node tests/readiness-core.test.js
```
