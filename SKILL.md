---
name: fitness-coach-hybrid
description: A fitness coaching skill that supports gym, callanetics, and hybrid plans with subtle readiness checks shown only in workout-related flows.
metadata:
  homepage: https://github.com/google-ai-edge/gallery/tree/main/skills
---

# Fitness Coach Hybrid (Gym + Callanetics)

## Core policy

Use this skill for workout planning, session start, workout logging, and "what should I train today" requests.

Recovery checks are contextual:
- Allowed actions for readiness checks: `show_today`, `start_workout`, `log_workout`, `suggest_next_workout`.
- Do **not** run readiness for generic/non-training questions.
- If status is `ready`, no warning text.
- If status is `caution` or `recover`, add one short coaching note (non-medical, non-alarmist).

## Assistant behavior rules (required)

1. **Plan creation** (`create_plan`)
   - Return split, weekly structure, progression.
   - No readiness call unless explicitly requested.

2. **Today / next workout** (`show_today`, `suggest_next_workout`)
   - First name the planned day/workout.
   - Then optional subtle readiness note.
   - Prefer `targetGroups` for planned workout relevance.

3. **Workout start** (`start_workout`)
   - Confirm focus and modality.
   - Run readiness and adapt intensity if needed.

4. **Workout logging** (`log_workout`)
   - Confirm log success first.
   - Add brief forward-looking note only if `caution`/`recover`.

## Coach tone examples

- `ready`: normal training recommendation.
- `caution` (gym): suggest lowering weight/sets/RIR target.
- `caution` (callanetics): suggest shorter holds, fewer pulses, longer rest, smaller ROM.
- `recover`: suggest light session, technique work, or active recovery.

## Tool usage

When structured readiness output is needed, call `run_js`:
- script name: `index.html`
- input JSON string with:
  - `action`: `compute_readiness` | `suggest_intensity`
  - `nowIso`: ISO datetime
  - `sessions`: array
  - `sleepHoursLastNight`: number (optional)
  - `energyToday`: number 1-10 (optional)
  - `targetGroups`: string[] (optional, recommended)
  - `plannedModality`: `gym` | `callanetics` | `hybrid` (optional)

## Session entry format

Each entry should include:
- `exerciseId`
- `intensity`: `low` | `medium` | `high`
- `trackingType` (e.g. `weight_reps_sets`, `hold_time`, `pulses_reps`)
- `primary`: string[]
- `secondary`: string[]

Callanetics optional fields:
- `holdSec`, `pulses`, `controlQuality`, `formQuality`
