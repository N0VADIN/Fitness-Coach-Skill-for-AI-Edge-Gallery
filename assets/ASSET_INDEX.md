# Asset Index

This folder contains:

- `exercise_catalog.json` → canonical list/index of exercise IDs by modality + supported muscle-group keys.
- `exercise_metadata.json` → per-exercise details (`trackingType`, `primary`, `secondary`, `progressSignals`).
- `tracking_types.json` → logging schema definitions per tracking type.

Design choice: **single detailed source** (`exercise_metadata.json`) plus a lightweight catalog index to avoid duplicated field maintenance.
