---
name: fitness-coach-hybrid
description: A fitness coaching skill that supports gym, callanetics, and hybrid plans with subtle readiness checks shown only in workout-related flows.
metadata:
  homepage: https://github.com/google-ai-edge/gallery/tree/main/skills
---

# Fitness Coach Hybrid (Gym + Callanetics)

## Instructions

Use this skill when users ask for workout planning, workout logging, what to train today, or recovery-aware suggestions.

You MUST keep recovery checks subtle and context-aware:
- Evaluate readiness only for: `show_today`, `start_workout`, `log_workout`, `suggest_next_workout`.
- If status is `ready`, do not show any warning.
- If status is `caution` or `recover`, give a short, non-dramatic coaching note.

## Tool usage

When you need structured readiness output, call `run_js` with:
- script name: `index.html`
- data JSON string with fields:
  - `action`: one of `compute_readiness` | `suggest_intensity`
  - `nowIso`: ISO datetime string
  - `sessions`: array of sessions
  - `sleepHoursLastNight`: number (optional)
  - `energyToday`: number 1-10 (optional)

## Session format (input)

Each session entry should use:
- `startedAt`: ISO datetime
- `modality`: `gym` | `callanetics` | `hybrid`
- `entries`: array with
  - `exerciseId`
  - `intensity`: `low` | `medium` | `high`
  - `primary`: string[]
  - `secondary`: string[]

## Response behavior

- Prefer concise coaching.
- Avoid medical diagnosis language.
- For callanetics progression, consider hold time, pulses, control quality, and shorter rest as progress.
