-- =============================================================================
-- V013__downstream_upsert_arbiters.sql
-- RUN AGAINST: ckm_readiness database
-- Adds the unique upsert keys the downstream writers' INSERT ... ON CONFLICT
-- DO UPDATE statements require: the 7g aggregator (variable_readiness_scores)
-- and the 7h pathway evaluator (use_case_pathway_results).
--
-- Why (7g pre-check finding, Section 2, 2026-07-09): the writer contract
-- (CLAUDE.md §7) says the aggregator upserts on (variable_name, patient_id,
-- demo_session_id) and the pathway evaluator on (patient_id, use_case_name,
-- demo_session_id), but neither table has a UNIQUE constraint or unique index
-- on its tuple — the same gap V012 closed for check_results before the check
-- writer could run. Exact V012 precedent.
--
-- variable_readiness_scores: the existing non-unique indexes
-- (idx_variable_readiness_scores_patient on (patient_id, demo_session_id);
-- idx_variable_readiness_scores_variable on (variable_name, demo_session_id))
-- are NOT on the writer tuple — they stay in place; nothing to replace. The
-- new constraint's backing index leads with variable_name, so
-- variable-first three-column lookups are served here; patient-first lookups
-- remain covered by idx_variable_readiness_scores_patient.
--
-- use_case_pathway_results: the existing NON-unique
-- idx_use_case_pathway_results_patient_usecase_session (V010) covers exactly
-- the writer tuple but cannot serve as an ON CONFLICT arbiter — drop it and
-- add the named UNIQUE constraint on the same three columns (the constraint's
-- backing index preserves the read pattern; no redundant duplicate remains).
--
-- The three DDL statements apply atomically (explicit BEGIN/COMMIT —
-- Postgres DDL is transactional; a failure mid-file leaves the schema
-- untouched).
--
-- Run AFTER V012. Both tables are currently empty (0 rows, verified in the
-- 7g pre-check), so the unique indexes build with zero risk of a
-- duplicate-key failure.
-- =============================================================================

BEGIN;

ALTER TABLE variable_readiness_scores
    ADD CONSTRAINT uq_variable_readiness_scores_upsert
    UNIQUE (variable_name, patient_id, demo_session_id);

DROP INDEX IF EXISTS idx_use_case_pathway_results_patient_usecase_session;

ALTER TABLE use_case_pathway_results
    ADD CONSTRAINT uq_use_case_pathway_results_upsert
    UNIQUE (patient_id, use_case_name, demo_session_id);

COMMIT;
