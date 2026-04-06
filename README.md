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
assets/training_reference.json
tests/readiness-core.test.js
```

## Session-coach capabilities (implemented)

- `show_today`
- `start_workout`
- `log_workout`
- `show_last_workout`
- `suggest_next_workout`
- `targeted_readiness`
- `suggest_adjustment`
- `weekly_snapshot`
- `micro_progression_suggestion`
- `create_hybrid_plan`

## Readiness decision logic

Readiness returns score + status + decision:
- `8-10` → `full_intensity`
- `6-7.99` → `normal_training`
- `4-5.99` → `reduce_20_percent`
- `<4` → `active_recovery_or_rest`

## Workout log structure (compact)

- session: `startedAt`, `modality`, optional `durationMin`, `sessionNotes`
- entry: `exerciseId`, `primary`, `secondary`, `intensity`
- gym sets: `weightKg`, `reps`, optional `rpe`, `rir`
- callanetics: `holdSec`, `pulses`, `controlQuality`, `restSec`

## RPE/RIR reference (short)

- RPE 10 = 0 RIR
- RPE 9 = 1 RIR
- RPE 8 = 2 RIR
- RPE 7 = 3 RIR
- RPE 6 = 4+ RIR

## Micro-progression rules

- Gym: add reps first, then +2.5-5 kg when top range is stable with good RIR.
- Callanetics: +5-10 sec holds, +5-10 pulses, or shorter rest if quality stays high.
- If readiness is caution/recover: reduce load/volume or choose lighter variant.

## Weekly snapshot idea

`weekly_snapshot` returns:
- sessions completed
- modality mix
- most loaded muscle groups
- compact readiness-based weekly note

## Behavior guarantees

- Readiness is checked only in workout-related flows.
- If status is `ready`, no recovery warning is shown.
- If status is `caution`/`recover`, exactly one short practical note is added.
- Tone stays concise and non-medical.

## Local tests

```bash
node tests/readiness-core.test.js
```
