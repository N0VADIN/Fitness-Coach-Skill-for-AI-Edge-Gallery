# Fitness Coach Hybrid Skill (AI Edge Gallery format)

> V1: lightweight readiness engine with global + target-group checks.

## Repository contents (source of truth)

```text
SKILL.md
scripts/index.html
scripts/readiness-core.js
assets/exercise_catalog.json
assets/exercise_metadata.json
assets/tracking_types.json
tests/readiness-core.test.js
```

If a connector cache does not yet show `assets/`, rely on this repository tree as canonical and refresh/reindex.

## Behavior scope (V1)

- Supports `gym`, `callanetics`, `hybrid`.
- Readiness should be subtle and shown only in workout context.
- Readiness supports:
  - **global mode** (all recent stress)
  - **targeted mode** via `targetGroups` for planned workout relevance.

## JS invocation payload

### Global readiness

```json
{
  "action": "compute_readiness",
  "nowIso": "2026-04-06T12:00:00Z",
  "sleepHoursLastNight": 6.5,
  "energyToday": 5,
  "sessions": []
}
```

### Targeted readiness for planned workout

```json
{
  "action": "suggest_intensity",
  "nowIso": "2026-04-06T12:00:00Z",
  "targetGroups": ["chest", "shoulders", "triceps"],
  "plannedModality": "gym",
  "sessions": []
}
```

## Hybrid semantics in code

- Main signal: `intensity`.
- Callanetics-aware modifiers in V1: `holdSec`, `pulses`, `controlQuality`, `formQuality`.
- Target-group readiness can override global caution when planned groups are fresh.

## Local tests

```bash
node tests/readiness-core.test.js
```
