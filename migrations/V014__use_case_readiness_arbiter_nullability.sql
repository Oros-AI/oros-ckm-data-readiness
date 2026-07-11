-- =============================================================================
-- V014__use_case_readiness_arbiter_nullability.sql
-- RUN AGAINST: ckm_readiness database
-- Enables the 7i use_case_readiness writer (scoring/lib/use_case_writer.js):
-- adds its ON CONFLICT arbiter and relaxes fitness_score for boolean modules.
--
-- Why (7i pre-check findings, 2026-07-11):
--   1. The writer contract (CLAUDE.md §7) says the use_case writer upserts on
--      (patient_id, use_case_name, demo_session_id), but use_case_readiness
--      has no UNIQUE constraint or unique index on that tuple — the same gap
--      V012 closed for check_results and V013 closed for
--      variable_readiness_scores / use_case_pathway_results. The existing
--      NON-unique idx_use_case_readiness_patient_usecase (V001-era) covers
--      exactly the writer tuple but cannot serve as an ON CONFLICT arbiter —
--      drop it and add the named UNIQUE constraint on the same three columns
--      (the constraint's backing index preserves the read pattern; no
--      redundant duplicate remains). The ADD CONSTRAINT form follows the
--      V012/V013 arbiter precedent, so all upsert arbiters live on one
--      greppable surface (pg_constraint).
--   2. fitness_score is NOT NULL, which conflicts with the ratified
--      boolean-module contract: boolean/pathway-only modules (computation IS
--      NULL — the three stubs) write no fitness_score. Drop the NOT NULL so
--      the column is nullable, exactly as V011 dropped the NOT NULL on
--      use_case_specifications.computation for the same genericity reason.
--      V011 precedent.
--
-- No other schema changes: chk_use_case_readiness_status and the fitness
-- range CHECK stay as-is (the range CHECK constrains only non-NULL values).
--
-- The three DDL statements apply atomically (explicit BEGIN/COMMIT —
-- Postgres DDL is transactional; a failure mid-file leaves the schema
-- untouched).
--
-- Run AFTER V013. use_case_readiness is currently empty (0 rows, verified in
-- the 7i pre-check), so the unique index builds with zero risk of a
-- duplicate-key failure.
-- =============================================================================

BEGIN;

ALTER TABLE use_case_readiness
    ADD CONSTRAINT uq_use_case_readiness_upsert
    UNIQUE (patient_id, use_case_name, demo_session_id);

DROP INDEX idx_use_case_readiness_patient_usecase;

ALTER TABLE use_case_readiness ALTER COLUMN fitness_score DROP NOT NULL;

COMMIT;
