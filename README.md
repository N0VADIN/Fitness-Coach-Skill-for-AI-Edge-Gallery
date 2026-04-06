# Fitness Coach Hybrid Skill (AI Edge Gallery format)

This repository is now structured like an AI Edge Gallery skill:

- `SKILL.md` with frontmatter metadata + invocation instructions.
- `scripts/index.html` as Gallery JS entrypoint exposing `ai_edge_gallery_get_result`.
- `scripts/readiness-core.js` containing readiness and intensity logic.
- `assets/` JSON reference files for tracking types and exercise metadata.

## Implemented behavior

- Unified support for `gym`, `callanetics`, `hybrid`.
- Recovery/readiness remains "silent" by design and should only be surfaced in workout flows.
- Readiness statuses: `ready`, `caution`, `recover`.

## JS invocation payload

```json
{
  "action": "compute_readiness",
  "nowIso": "2026-04-06T12:00:00Z",
  "sleepHoursLastNight": 6.5,
  "energyToday": 5,
  "sessions": [
    {
      "startedAt": "2026-04-05T18:30:00Z",
      "modality": "callanetics",
      "entries": [
        {
          "exerciseId": "side_leg_lift_hold",
          "intensity": "medium",
          "primary": ["glutes"],
          "secondary": ["core"]
        }
      ]
    }
  ]
}
```

For intensity guidance use:

```json
{
  "action": "suggest_intensity",
  "nowIso": "2026-04-06T12:00:00Z",
  "sessions": []
}
```

## Local test

Run:

```bash
node tests/readiness-core.test.js
```
