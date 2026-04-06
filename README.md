# Fitness Coach Hybrid Skill (AI Edge Gallery format)

This repository follows an AI Edge Gallery-friendly layout and contains these files:

- `SKILL.md`
- `scripts/index.html`
- `scripts/readiness-core.js`
- `assets/tracking_types.json`
- `assets/exercise_catalog.json`
- `assets/exercise_metadata.json`

## Implemented behavior

- Unified support for `gym`, `callanetics`, `hybrid`.
- Recovery/readiness remains "silent" by design and should only be surfaced in workout flows.
- Readiness supports:
  - **global mode** (all recent stress)
  - **targeted mode** via `targetGroups` for planned workout relevance.

## JS invocation payload

### A) Global readiness

```json
{
  "action": "compute_readiness",
  "nowIso": "2026-04-06T12:00:00Z",
  "sleepHoursLastNight": 6.5,
  "energyToday": 5,
  "sessions": []
}
```

### B) Targeted readiness for today's planned workout

```json
{
  "action": "suggest_intensity",
  "nowIso": "2026-04-06T12:00:00Z",
  "targetGroups": ["chest", "shoulders", "triceps"],
  "sessions": [
    {
      "startedAt": "2026-04-05T18:30:00Z",
      "modality": "callanetics",
      "entries": [
        {
          "exerciseId": "side_leg_lift_hold",
          "trackingType": "hold_time",
          "holdSec": 75,
          "controlQuality": 8,
          "intensity": "medium",
          "primary": ["glutes"],
          "secondary": ["core"]
        }
      ]
    }
  ]
}
```

## Notes on hybrid semantics

- `intensity` is still the main load driver.
- For callanetics entries, `holdSec`, `pulses`, `controlQuality`, and `formQuality` can adjust effective load slightly.
- This keeps V1 simple while reducing mismatch between instructions and implementation.

## Local tests

Run:

```bash
node tests/readiness-core.test.js
```
