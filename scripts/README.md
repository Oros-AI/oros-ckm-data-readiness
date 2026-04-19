# CKM Data Readiness — Scripts

Data loading and session management scripts for the CKM Data Readiness POC.

---

## Setup (one time)

```bash
cd /Volumes/OrosFast/workspace/projects/ckm-readiness/oros-ckm-data-readiness/scripts
npm install
cp .env.example .env
```

Then edit `.env` and add your actual Neon connection strings from 1Password.

---

## Loading a dataset

Always load Dataset A first to verify the pipeline before loading B and C.

```bash
# Load Dataset A (clean — all checks READY)
npm run load:a

# Load Dataset B (buggy — bugs visible in check results)
npm run load:b

# Load Dataset C (remediated — remediation arc complete)
npm run load:c
```

Each load creates a new demo session and tags all records with that session ID.
The session ID is printed at the end — save it if you want to reset just that session.

---

## Resetting between demos

```bash
# Reset a specific session (replace with actual UUID)
npm run reset -- --session 550e8400-e29b-41d4-a716-446655440000

# Reset ALL active sessions (full wipe)
npm run reset:all
```

Reset deletes all Tier 1–4 data for the session. Raw CSV files on disk are untouched.
After reset, reload with `npm run load:a` (or b/c) to start fresh.

---

## What each script does

| Script | Purpose |
|--------|---------|
| `load_dataset.js` | Reads 10 CSV files, creates a demo session, loads all tables in FK-safe order, verifies row counts |
| `reset_session.js` | Deletes all records for a session in reverse tier order (Tier 4 → Tier 1), deactivates the session |

---

## Load order (why it matters)

Tables are loaded in this order to satisfy foreign key constraints:

```
patients → providers → encounters → conditions → medications →
observations → cgm_readings → cgm_window_metadata → bp_readings → weight_readings
```

Loading out of order will cause FK constraint errors.

---

## Expected row counts

| Table | Dataset A | Dataset B | Dataset C |
|-------|-----------|-----------|-----------|
| patients | 50 | 50 | 50 |
| providers | 15 | 15 | 15 |
| encounters | 490 | 490 | 490 |
| conditions | 463 | 463 | 463 |
| medications | 604 | 604 | 604 |
| observations | 1,420 | 1,414 | 1,414 |
| cgm_readings | 90,462 | 78,717 | 78,717 |
| cgm_window_metadata | 25 | 25 | 25 |
| bp_readings | 328 | 328 | 328 |
| weight_readings | 70 | 70 | 70 |

Dataset B/C have fewer observations (6 removed — Bug 3 smoking status)
and fewer CGM readings (11,745 removed — Bug 2 temporal density gaps).

---

## Column mapping notes

Two tables require column name translation from CSV to database:

**bp_readings:**
- CSV `systolic_bp` → DB `value_primary`
- CSV `diastolic_bp` → DB `value_secondary`
- CSV `manufacturer`, `measurement_type`, `pulse` → dropped (not in schema)

**weight_readings:**
- CSV `value` → DB `value_primary`
- DB `value_secondary` → always NULL for weight
- CSV `manufacturer`, `measurement_type` → dropped (not in schema)
