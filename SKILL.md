---
name: fitness-coach-hybrid
description: Gym + Callanetics fitness coach with subtle readiness checks and lightweight workout actions.
metadata:
  homepage: https://github.com/google-ai-edge/gallery/tree/main/skills
---

# Fitness Coach Hybrid

## Use this skill when
- user asks what to train today
- user logs a workout
- user wants next workout suggestion
- user wants gym/callanetics/hybrid plan creation
- user asks for recovery-aware suggestion

## Do not run readiness when
- user asks only for generic fitness knowledge
- user requests a static plan overview only
- user asks non-training questions

## Required behavior
- If `status=ready`: no recovery warning text.
- If `status=caution` or `status=recover`: add one short, practical note.
- Keep tone coaching-focused, non-medical.

## Supported actions
- `compute_readiness`
- `suggest_intensity`
- `show_today`
- `log_workout`
- `show_last_workout`
- `suggest_next_workout`
- `create_hybrid_plan`

## Action hints
- `show_today`: name today’s workout first, then optional short note.
- `log_workout`: confirm log first, then optional short note.
- `suggest_intensity`: for callanetics prefer wording like shorter holds/fewer pulses/longer rest.

## Input keys (common)
- `nowIso`, `sessions`, `sleepHoursLastNight`, `energyToday`
- optional: `targetGroups`, `plannedModality`, `plannedWorkout`, `planDays`, `newSession`
