# CKM Data Readiness — Database Migration Files

**Repo:** oros-ckm-data-readiness
**Branch:** ckm-poc-build
**Database:** ckm_readiness (Neon PostgreSQL)
**Schema:** public
**Last updated:** 2026-04-20
**Authority:** `docs/Oros - CKM Data Readiness - Data Model.docx`

---

## Files in This Directory

| File | What It Does |
|------|-------------|
| `V000__create_database.sql` | Creates the `ckm_readiness` database inside your Neon project. Run against the default `neondb` connection. |
| `V001__extensions_and_setup.sql` | Enables pgcrypto (UUID generation) and pg_trgm (text search) |
| `V002__demo_sessions.sql` | Creates the session management table — anchor for all Tier 1–4 records |
| `V003__tier1_raw_tables.sql` | All 10 raw input tables (patients, providers, encounters, conditions, medications, observations, cgm_readings, cgm_window_metadata, bp_readings, weight_readings). Includes v2 corrections: `observations.interpretation` VARCHAR(32), `cgm_readings.user_id`/`patient_id` VARCHAR(64), composite PKs on device tables. |
| `V004__tier2_normalized_fields.sql` | Single `normalized_fields` table for all Tier 2 normalization outputs |
| `V005__tier3a_check_results.sql` | `check_results` and `variable_readiness_scores` |
| `V006__tier3b_3c_patches_and_workitems.sql` | `patch_records` and `remediation_work_items` |
| `V007__tier4_readiness_and_fhir.sql` | `use_case_readiness` and `fhir_bundles` |
| `V008__indexes.sql` | All indexes — session_id columns, FK indexes, primary query patterns, GIN index on fhir_bundles.bundle_content |
| `V009__foreign_keys.sql` | Session-aware composite FK constraints across Tier 1–4 tables. `cgm_readings → patients` FK intentionally omitted to preserve Bug 1 demo fidelity. |

**Total tables after V001–V009:** 18 (demo_sessions + 10 Tier 1 + 1 Tier 2 + 2 Tier 3a + 2 Tier 3b/c + 2 Tier 4)

---

## How to Run (Step by Step)

### Step 1 — Create the database

You need your `neondb` connection string for this step only. Replace `<YOUR-NEONDB-CONNECTION-STRING>` with the full string from Neon console (the one ending in `/neondb`).

```bash
psql '<YOUR-NEONDB-CONNECTION-STRING>' -f V000__create_database.sql
```

### Step 2 — Switch to the new database

Take your connection string and replace `neondb` with `ckm_readiness` at the end.

Example:
```
postgresql://neondb_owner:xxxx@ep-autumn-dream-ad1au28g-pooler.c-2.us-east-1.aws.neon.tech/neondb
→
postgresql://neondb_owner:xxxx@ep-autumn-dream-ad1au28g-pooler.c-2.us-east-1.aws.neon.tech/ckm_readiness
```

On Studio this is already exported as `CKM_DIRECT` in `~/.zshrc`.

### Step 3 — Run V001 through V009 in order

Either one at a time:

```bash
psql "$CKM_DIRECT" -f V001__extensions_and_setup.sql
psql "$CKM_DIRECT" -f V002__demo_sessions.sql
psql "$CKM_DIRECT" -f V003__tier1_raw_tables.sql
psql "$CKM_DIRECT" -f V004__tier2_normalized_fields.sql
psql "$CKM_DIRECT" -f V005__tier3a_check_results.sql
psql "$CKM_DIRECT" -f V006__tier3b_3c_patches_and_workitems.sql
psql "$CKM_DIRECT" -f V007__tier4_readiness_and_fhir.sql
psql "$CKM_DIRECT" -f V008__indexes.sql
psql "$CKM_DIRECT" -f V009__foreign_keys.sql
```

Or in a loop:

```bash
for f in V001 V002 V003 V004 V005 V006 V007 V008 V009; do
  psql "$CKM_DIRECT" -f ${f}__*.sql
  echo "✓ $f done"
done
```

### Step 4 — Verify

```bash
psql "$CKM_DIRECT" -c "\dt"
```

You should see 18 tables:

- `demo_sessions`
- **Tier 1 (10):** `patients`, `providers`, `encounters`, `conditions`, `medications`, `observations`, `cgm_readings`, `cgm_window_metadata`, `bp_readings`, `weight_readings`
- **Tier 2 (1):** `normalized_fields`
- **Tier 3a (2):** `check_results`, `variable_readiness_scores`
- **Tier 3b/c (2):** `patch_records`, `remediation_work_items`
- **Tier 4 (2):** `use_case_readiness`, `fhir_bundles`

Check FK count (should be 34):

```bash
psql "$CKM_DIRECT" -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';"
```

---

## Architecture Reminders

**Raw data is never modified.** Tier 1 tables are append-only after load. All corrections live in `normalized_fields` (Tier 2) and `patch_records` (Tier 3).

**Everything is session-scoped.** All tables carry `demo_session_id`. Reset between demos by deleting in reverse tier order (Tier 4 → Tier 3 → Tier 2 → Tier 1). See Data Model §10.2 for the full reset sequence.

**Check names must match the Technical Specification exactly.** The `check_name` field in `check_results` is the join key to the agentic layer. Use the full form (e.g., `device_temporal_density_cgm_14d`, `layer1_notnull_fields_a1c`), not the short registry name.

**Session-aware composite FKs.** V009 adds FKs that reference `(entity_id, demo_session_id)` pairs, not `entity_id` alone. This enforces that every record belongs to a patient/encounter/etc that exists within the same demo session.

**`cgm_readings → patients` FK is intentionally omitted.** Bug 1 loads CGM records with UUID-format `user_id` values that don't match any patient. A DB-level FK would prevent the demo. Identity validation happens at the application layer via the `device_patient_linkage_cgm` check.

---

## Step 7 — Upcoming Migrations

**V010** will add three tables for condition module support (Step 7a):

- `condition_modules` — one row per loaded condition
- `use_case_specifications` — one row per use case, JSONB-heavy
- `use_case_pathway_results` — runtime pathway evaluation results, session-aware

Additive only. No ALTER TABLE on existing schema. See `docs/Oros - CKM Data Readiness - Condition Module Schema.md` §4 for full DDL specification.

---

## Current Status

| Step | Status |
|------|--------|
| Schema applied (V001–V009) | ✅ |
| All three datasets loaded (A/B/C) and verified | ✅ |
| Three scoring engine checks implemented | ✅ (device_patient_linkage_cgm, device_temporal_density_cgm_14d, layer1_notnull_fields_smoking) |
| V010 — condition module tables | ⬜ Step 7a |
| Remaining scoring engine checks | ⬜ Steps 7d–7f |
| Scoring aggregation + pathway + use-case writers | ⬜ Steps 7g–7j |
| End-to-end test against Datasets B and C | ⬜ Steps 7k–7l |
