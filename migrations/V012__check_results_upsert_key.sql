-- =============================================================================
-- V012__check_results_upsert_key.sql
-- RUN AGAINST: ckm_readiness database
-- Adds the unique upsert key on check_results that the check writer's
-- INSERT ... ON CONFLICT DO UPDATE requires.
--
-- Why (7d pre-flight finding, 2026-07-06): the writer contract (CLAUDE.md §7)
-- says scoring/lib/writer.js upserts on (check_name, patient_id,
-- demo_session_id), but no UNIQUE constraint or unique index exists on that
-- tuple — V008 created only the NON-unique btree index
-- idx_check_results_patient_check on the same three columns, which cannot
-- serve as an ON CONFLICT arbiter.
--
-- Does two things:
--   1. Drops the redundant non-unique index idx_check_results_patient_check.
--   2. Adds named UNIQUE constraint uq_check_results_upsert on
--      (check_name, patient_id, demo_session_id).
-- The unique constraint's backing index covers the same three columns and
-- enforces uniqueness while serving as the ON CONFLICT arbiter. It leads with
-- check_name (matching the writer-contract tuple), so check-first lookups are
-- served here; patient-first lookups remain covered by the surviving
-- idx_check_results_patient (patient_id, demo_session_id). No read pattern is
-- lost and no redundant duplicate index remains.
--
-- Run AFTER V011. check_results is currently empty (0 rows), so the unique
-- index builds with zero risk of a duplicate-key failure.
-- =============================================================================

DROP INDEX IF EXISTS idx_check_results_patient_check;

ALTER TABLE check_results
    ADD CONSTRAINT uq_check_results_upsert
    UNIQUE (check_name, patient_id, demo_session_id);
