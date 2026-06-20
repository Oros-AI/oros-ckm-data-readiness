# V010 Migration Spec — Condition Module Tables

**Target file:** `migrations/V010__condition_modules.sql`
**Status:** Final. Paste into Claude Code on Studio to produce the SQL.
**Revision:** v3 — Decision 2 resolved empirically (V009 probe returned two rows; `use_case_pathway_results` carries the redundant `demo_session_id → demo_sessions(session_id)` FK to match the V009 Tier 3 pattern). Probe queries removed. Everything else from v2 stands.

**Authoritative sources:**
- Condition Module Schema §3.2 (dual enforcement), §4 (new tables; §4 enforcement note names `ck_use_case_pathway_results_active_pathway_null`)
- CLAUDE.md §8 (V010 summary), §9 (session-aware FK pattern)
- Data Model v2 §6.1 (remediation_work_items), §9 (FK design — documents both the session-aware composite FK pattern and the redundant session FK pattern on Tier 3 tables), §10.2 (session reset), §11 (Neon implementation notes)
- V009 (empirical): `fk_check_results_session`, `fk_remediation_work_items_session` establish the redundant session FK pattern that `use_case_pathway_results` mirrors.

**Prerequisites:**
- V001–V009 applied (18 tables present)
- `pgcrypto` extension enabled (V001)
- Composite UNIQUE on `patients(patient_id, demo_session_id)` exists from V009 (required as the FK target for session-aware composite FKs)

---

## 1. Scope

Purely additive. Three new tables, four new CHECK constraints (three on the new tables, one retrofit), no column changes on any existing table.

| Object | Kind | Target |
|---|---|---|
| `condition_modules` | new table | config tier |
| `use_case_specifications` | new table | config tier |
| `use_case_pathway_results` | new table | Tier 3 runtime |
| `ck_use_case_specifications_category` | new CHECK | `use_case_specifications.use_case_category` |
| `ck_use_case_pathway_results_pathway_result` | new CHECK | `use_case_pathway_results.pathway_result` |
| `ck_use_case_pathway_results_active_pathway_null` | new CHECK (structural invariant, named in Condition Module Schema §4) | `use_case_pathway_results` |
| `ck_remediation_work_items_responsible_role` | retrofit CHECK | `remediation_work_items.responsible_role` |

The dual-enforcement decision (§3.2) is that canonical enumerated strings are enforced both at the application layer (`scoring/lib/config_loader.js`) and at the database layer (CHECK constraint). V010 adds all DB-layer CHECKs for the three enumerations currently in scope: `use_case_category`, `pathway_result`, `responsible_role`. It also adds the structural invariant CHECK called out by name in Condition Module Schema §4.

---

## 2. Pre-migration Verification

Run these on Studio before executing V010. All must pass.

```sql
-- 2.1 Migrations V001–V009 applied
SELECT COUNT(*) AS n_tables FROM pg_tables WHERE schemaname = 'public';
-- Expect: 18

-- 2.2 pgcrypto extension enabled (needed for gen_random_uuid())
SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';
-- Expect: one row

-- 2.3 Composite UNIQUE on patients(patient_id, demo_session_id) exists.
-- This is the FK target for session-aware composite FKs; V009 should have
-- created it (as a UNIQUE constraint or UNIQUE INDEX). Without it, the FK
-- on use_case_pathway_results cannot be created.
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.patients'::regclass
  AND contype IN ('u','p')
  AND pg_get_constraintdef(oid) ILIKE '%patient_id%demo_session_id%';
-- Expect: at least one row

-- 2.4 remediation_work_items is either empty OR every existing row already
-- conforms to the seven canonical responsible_role values. As of Step 7a,
-- scoring has not run, so the table should be empty.
SELECT responsible_role, COUNT(*) AS n
FROM remediation_work_items
WHERE responsible_role NOT IN (
  'Primary Care Site','Specialty Partner','Regional Data Node',
  'Technology Vendor','Program Coordinator','Network/Payer','Policy/Regulatory'
)
GROUP BY responsible_role;
-- Expect: zero rows
```

If 2.3 returns nothing, stop. Investigate V009 before proceeding — the composite UNIQUE must exist on `patients` or the session-aware composite FK cannot be added.

---

## 3. DDL — In Execution Order

### 3.1 `condition_modules`

Config-layer table. Not session-scoped. One row per loaded condition. Populated by the config loader at app startup. No FKs out.

```sql
CREATE TABLE condition_modules (
  condition_id    VARCHAR(32)  NOT NULL,
  display_name    VARCHAR(128) NOT NULL,
  description     TEXT,
  schema_version  VARCHAR(16)  NOT NULL,
  config_json     JSONB        NOT NULL,
  loaded_at       TIMESTAMPTZ  NOT NULL,
  CONSTRAINT pk_condition_modules PRIMARY KEY (condition_id)
);
```

### 3.2 `use_case_specifications`

Config-layer table. Not session-scoped. FK to `condition_modules`. CHECK on `use_case_category`.

```sql
CREATE TABLE use_case_specifications (
  use_case_name          VARCHAR(64)  NOT NULL,
  condition_id           VARCHAR(32)  NOT NULL,
  use_case_category      VARCHAR(32)  NOT NULL,
  display_name           VARCHAR(128) NOT NULL,
  population_definition  JSONB        NOT NULL,
  variable_pathways      JSONB        NOT NULL,
  variables              JSONB        NOT NULL,
  computation            JSONB        NOT NULL,
  output_definition      JSONB        NOT NULL,
  loaded_at              TIMESTAMPTZ  NOT NULL,
  CONSTRAINT pk_use_case_specifications
    PRIMARY KEY (use_case_name),
  CONSTRAINT fk_use_case_specifications_condition
    FOREIGN KEY (condition_id)
    REFERENCES condition_modules(condition_id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_use_case_specifications_category
    CHECK (use_case_category IN (
      'risk_stratification',
      'care_coordination_delivery',
      'vbc_reporting'
    ))
);
```

FK uses `ON DELETE RESTRICT` — config tables should never be dropped out from under runtime rows.

### 3.3 `use_case_pathway_results`

Tier 3 runtime output. Session-aware. One row per patient × use case × session. Three FKs (composite patient, use case, session) matching the V009 Tier 3 pattern.

```sql
CREATE TABLE use_case_pathway_results (
  pathway_result_id  UUID         NOT NULL DEFAULT gen_random_uuid(),
  patient_id         VARCHAR(32)  NOT NULL,
  use_case_name      VARCHAR(64)  NOT NULL,
  pathway_result     VARCHAR(32)  NOT NULL,
  active_pathway_id  VARCHAR(64),
  organization_id    VARCHAR(16)  NOT NULL,
  evaluated_at       TIMESTAMPTZ  NOT NULL,
  demo_session_id    UUID         NOT NULL,
  CONSTRAINT pk_use_case_pathway_results
    PRIMARY KEY (pathway_result_id),
  CONSTRAINT fk_use_case_pathway_results_patient
    FOREIGN KEY (patient_id, demo_session_id)
    REFERENCES patients(patient_id, demo_session_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_use_case_pathway_results_use_case
    FOREIGN KEY (use_case_name)
    REFERENCES use_case_specifications(use_case_name)
    ON DELETE RESTRICT,
  CONSTRAINT fk_use_case_pathway_results_session
    FOREIGN KEY (demo_session_id)
    REFERENCES demo_sessions(session_id)
    ON DELETE CASCADE,
  CONSTRAINT ck_use_case_pathway_results_pathway_result
    CHECK (pathway_result IN (
      'primary_pass',
      'fallback_pass',
      'no_valid_pathway'
    )),
  CONSTRAINT ck_use_case_pathway_results_active_pathway_null
    CHECK (
      (pathway_result = 'no_valid_pathway' AND active_pathway_id IS NULL)
      OR (pathway_result IN ('primary_pass','fallback_pass')
          AND active_pathway_id IS NOT NULL)
    )
);
```

Design notes:
- `pathway_result_id` uses `gen_random_uuid()` default, consistent with existing UUID PK columns (`work_item_id`, `patch_id`, `readiness_id`, etc.).
- Composite FK on `(patient_id, demo_session_id)` mirrors the V009 canonical pattern. `ON DELETE CASCADE` aligns with session reset semantics.
- `use_case_name` FK uses `ON DELETE RESTRICT` — config tables must not be dropped while runtime rows reference them.
- `demo_session_id` FK to `demo_sessions(session_id)` with `ON DELETE CASCADE` matches the Tier 3 pattern established in V009 (`fk_check_results_session`, `fk_remediation_work_items_session`). The pattern provides explicit session enforcement independent of the composite patient FK.
- No FK on `(patient_id, use_case_name, demo_session_id)` to `use_case_readiness`. Per Condition Module Schema §4.3, the join to `use_case_readiness` is at the application and query layer. A FK here would create a second session-aware composite FK with ambiguous cascade semantics.
- `organization_id` is denormalized onto this table for UI filtering, consistent with `check_results`, `variable_readiness_scores`, `use_case_readiness`, and `remediation_work_items`.
- The second CHECK (`ck_use_case_pathway_results_active_pathway_null`) enforces the §4.3 rule that `active_pathway_id` is NULL iff `pathway_result = 'no_valid_pathway'`. The constraint is now named explicitly in Condition Module Schema §4 per the canonical doc update.

### 3.4 Retrofit CHECK on `remediation_work_items.responsible_role`

Closes the gap in V006 where the column was declared `VARCHAR(32) NOT NULL` without a value list. Application-layer validation in `scoring/lib/config_loader.js` validates the same list at config load time (§3.2).

Step 2.4 must return zero rows before this ALTER is run.

```sql
ALTER TABLE remediation_work_items
  ADD CONSTRAINT ck_remediation_work_items_responsible_role
  CHECK (responsible_role IN (
    'Primary Care Site',
    'Specialty Partner',
    'Regional Data Node',
    'Technology Vendor',
    'Program Coordinator',
    'Network/Payer',
    'Policy/Regulatory'
  ));
```

The constraint is added as VALID (no `NOT VALID` clause). Full validation is the goal. If step 2.4 reveals non-conforming rows that cannot be cleaned before V010, escalate before proceeding — do not silently downgrade to `NOT VALID`.

---

## 4. Indexes

Per Data Model §11 ("Index all foreign keys and demo_session_id columns"):

```sql
-- condition_modules: PK is sufficient; no FKs out.

-- use_case_specifications
CREATE INDEX idx_use_case_specifications_condition_id
  ON use_case_specifications(condition_id);

-- use_case_pathway_results
CREATE INDEX idx_use_case_pathway_results_patient_usecase_session
  ON use_case_pathway_results(patient_id, use_case_name, demo_session_id);

CREATE INDEX idx_use_case_pathway_results_demo_session_id
  ON use_case_pathway_results(demo_session_id);

CREATE INDEX idx_use_case_pathway_results_organization
  ON use_case_pathway_results(organization_id, demo_session_id);

CREATE INDEX idx_use_case_pathway_results_use_case_name
  ON use_case_pathway_results(use_case_name);
```

Rationale:
- `(patient_id, use_case_name, demo_session_id)` is called out explicitly in Condition Module Schema §4.3 as the index that supports the scoring engine's join back to `use_case_readiness`.
- `demo_session_id` alone supports session reset DELETEs and session-scoped queries.
- `(organization_id, demo_session_id)` supports UI filtering by site within a session, consistent with patterns on existing tables.
- `use_case_name` alone supports FK enforcement and config-joined lookups.

---

## 5. Verification Queries

Run after the migration. Every query has an expected result. Mismatches mean V010 is not correct.

```sql
-- 5.1 All three new tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'condition_modules',
    'use_case_specifications',
    'use_case_pathway_results'
  )
ORDER BY tablename;
-- Expect: 3 rows

-- 5.2 Column counts match spec
SELECT table_name, COUNT(*) AS col_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'condition_modules',
    'use_case_specifications',
    'use_case_pathway_results'
  )
GROUP BY table_name
ORDER BY table_name;
-- Expect:
--   condition_modules         | 6
--   use_case_pathway_results  | 8
--   use_case_specifications   | 10

-- 5.3 All four CHECK constraints present with correct definitions
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname IN (
  'ck_use_case_specifications_category',
  'ck_use_case_pathway_results_pathway_result',
  'ck_use_case_pathway_results_active_pathway_null',
  'ck_remediation_work_items_responsible_role'
)
ORDER BY conname;
-- Expect: 4 rows, each CHECK containing the expected IN (...) list or invariant

-- 5.4 FKs present with correct targets
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (
    'public.use_case_specifications'::regclass,
    'public.use_case_pathway_results'::regclass
  )
  AND contype = 'f'
ORDER BY conname;
-- Expect 4 rows:
--   fk_use_case_pathway_results_patient      → patients(patient_id, demo_session_id)
--   fk_use_case_pathway_results_session      → demo_sessions(session_id)
--   fk_use_case_pathway_results_use_case     → use_case_specifications(use_case_name)
--   fk_use_case_specifications_condition     → condition_modules(condition_id)

-- 5.5 Indexes present
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_use_case_%'
ORDER BY indexname;
-- Expect: 5 rows (the five idx_* names created in §4)

-- 5.6 CHECK enforces bad values — smoke test with ROLLBACK
BEGIN;
INSERT INTO condition_modules (condition_id, display_name, schema_version, config_json, loaded_at)
  VALUES ('__test__','Test','0.1','{}'::jsonb, NOW());
-- This should raise: ck_use_case_specifications_category
INSERT INTO use_case_specifications (
  use_case_name, condition_id, use_case_category, display_name,
  population_definition, variable_pathways, variables, computation, output_definition, loaded_at
) VALUES (
  '__test__','__test__','bogus_category','Test',
  '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb, NOW()
);
ROLLBACK;
-- Expect: ERROR on the second INSERT naming ck_use_case_specifications_category

-- 5.7 Table count is now 21 (18 + 3)
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
-- Expect: 21

-- 5.8 Retrofit CHECK rejects bad responsible_role values
-- (Verify constraint exists via 5.3; a direct INSERT smoke test requires
-- a valid check_result_id and patient. Skip unless those are easy to set up.)
```

---

## 6. Rollback

```sql
BEGIN;

ALTER TABLE remediation_work_items
  DROP CONSTRAINT IF EXISTS ck_remediation_work_items_responsible_role;

DROP TABLE IF EXISTS use_case_pathway_results;
DROP TABLE IF EXISTS use_case_specifications;
DROP TABLE IF EXISTS condition_modules;

COMMIT;
```

Indexes on dropped tables are removed automatically. The retrofit CHECK must be dropped explicitly.

---

## 7. Downstream Follow-ups (LAND IN THE SAME COMMIT AS V010)

These are small changes outside the migration file but bundled in the same PR so the `21 tables` assertion is consistent across the repo.

### 7.1 Dev Environment Setup §7 — "18 tables" → "21 tables", loop includes V010

**File:** `docs/Oros - Dev Environment - Studio Setup - Apr 2026.md` (or current path)
**Section:** §7 Migration Files, under "To run migrations (full reset)"

Replace this block:

```bash
# 2. Run migrations
for f in V001 V002 V003 V004 V005 V006 V007 V008 V009; do
  psql "$CKM_DIRECT" -f /Volumes/OrosFast/workspace/projects/ckm-readiness/migrations/${f}__*.sql
  echo "✓ $f done"
done

# 3. Verify
psql "$CKM_DIRECT" -c "\dt"   # Should show 18 tables
```

With:

```bash
# 2. Run migrations
for f in V001 V002 V003 V004 V005 V006 V007 V008 V009 V010; do
  psql "$CKM_DIRECT" -f /Volumes/OrosFast/workspace/projects/ckm-readiness/migrations/${f}__*.sql
  echo "✓ $f done"
done

# 3. Verify
psql "$CKM_DIRECT" -c "\dt"   # Should show 21 tables (18 base + 3 from V010)
```

Also add a row to the migration files table in the same section:

| File | Purpose |
|------|---------|
| V010 | Condition module tables (condition_modules, use_case_specifications, use_case_pathway_results) + retrofit CHECK on remediation_work_items.responsible_role |

### 7.2 Session reset sequence (Data Model §10.2) — add DELETE for `use_case_pathway_results`

Add a DELETE for `use_case_pathway_results` to the Tier 3 block, at the top of the Tier 3 DELETEs. Neither it nor its siblings have FKs pointing at each other, but grouping by tier keeps the sequence readable:

```sql
-- 4. Clear Tier 3 — checks, patches, work items, pathway results
DELETE FROM use_case_pathway_results  WHERE demo_session_id = :session_id;
DELETE FROM remediation_work_items    WHERE demo_session_id = :session_id;
DELETE FROM patch_records             WHERE demo_session_id = :session_id;
DELETE FROM variable_readiness_scores WHERE demo_session_id = :session_id;
DELETE FROM check_results             WHERE demo_session_id = :session_id;
```

Update `scripts/reset.js` to match. Note that `condition_modules` and `use_case_specifications` are NOT session-scoped and must NOT be added to the reset sequence — they are loaded at app startup and persist across sessions as governance artifacts.

### 7.3 Canonical docs — status check

- **Condition Module Schema §4:** updated with a sentence in the enforcement note that names `ck_use_case_pathway_results_active_pathway_null`. Landed in this commit alongside the migration.
- **CLAUDE.md §11 (Commands → Database Migrations):** already correct — loop includes V010 and verifies "21 after V010".
- **Data Model §9:** rewritten as a two-pattern section documenting both the session-aware composite FK (`fk_encounters_patient` and peers) and the redundant session FK pattern carried by V009 on Tier 3 tables (`fk_check_results_session`, `fk_remediation_work_items_session`, and now `fk_use_case_pathway_results_session`). Landed in this commit. Closes the documentation drift the V009 probe surfaced.
- **Build Plan "Neon Database Schema" narrative:** says "existing 18-table schema ... is untouched." This is historically accurate narrative about V010's design intent, not a runtime assertion. Optional to update; not required for V010 to land.

---

## 8. File Header

Match the style used in V001–V009. Suggested header for `V010__condition_modules.sql`:

```sql
-- V010__condition_modules.sql
-- Adds condition module config tables (condition_modules, use_case_specifications)
-- and runtime pathway results (use_case_pathway_results). Retrofits a CHECK
-- constraint on remediation_work_items.responsible_role (gap in V006).
--
-- use_case_pathway_results carries three FKs (composite patient, use case,
-- session), matching the Tier 3 pattern established in V009
-- (fk_check_results_session, fk_remediation_work_items_session).
--
-- Sources:
--   Condition Module Schema v0.1 §3.2 (dual enforcement), §4 (new tables,
--     names ck_use_case_pathway_results_active_pathway_null)
--   CLAUDE.md §8 (V010 summary)
--   Data Model v2 §9 (session-aware FK patterns — composite patient FK
--     and redundant session FK on Tier 3 tables)
--
-- Prereqs: V001–V009 applied. pgcrypto enabled. Composite UNIQUE on
-- patients(patient_id, demo_session_id) exists from V009.
--
-- Reversible: see rollback section in the spec.
```

---

## 9. Summary of Confirmed Decisions

| Point | Decision | Rationale |
|---|---|---|
| Structural invariant CHECK on `active_pathway_id` | **Keep** (named `ck_use_case_pathway_results_active_pathway_null`) | Stated rule in Condition Module Schema §4.3; §4 enforcement note now names the constraint; dual-enforcement philosophy §3.2. |
| Redundant FK from `demo_session_id` to `demo_sessions(session_id)` | **Keep** (`fk_use_case_pathway_results_session`, ON DELETE CASCADE) | V009 probe returned two rows (`fk_check_results_session`, `fk_remediation_work_items_session`); V010 mirrors the established Tier 3 pattern. Data Model §9 documents both patterns (landed in this commit). |
| Retrofit CHECK on `remediation_work_items.responsible_role` | **Keep VALID** (no `NOT VALID`) | Step 7 has not run; `remediation_work_items` empty; step 2.4 confirms. |
| "18 tables" references | **Patch in same commit** (Dev Env Setup §7) | §7.1 has the exact diff. |
| Canonical doc alignment | Condition Module Schema §4 and Data Model §9 both updated and landed in this commit. | CLAUDE.md §8, §9, §13 remain on build project side per original handoff. |
