-- =============================================================================
-- V015__remediation_work_items_arbiter.sql
-- RUN AGAINST: ckm_readiness database
-- Enables the 7j work-item generator (scoring/lib/work_item_generator.js):
-- adds its ON CONFLICT arbiter on check_result_id.
--
-- Why (7j pre-check finding, Part 1, 2026-07-11; approved by the planning
-- thread 2026-07-11): the writer contract (CLAUDE.md §7) says the work item
-- generator upserts on (check_result_id) — one work item per FAIL — but
-- remediation_work_items has only the NON-unique
-- idx_remediation_work_items_check_result on that column, which cannot serve
-- as an ON CONFLICT arbiter. This is the same arbiter gap V012 closed for
-- check_results, V013 for variable_readiness_scores /
-- use_case_pathway_results, and V014 for use_case_readiness. Drop the
-- non-unique index and add the named UNIQUE constraint on the same column
-- (the constraint's backing index preserves the read pattern; no redundant
-- duplicate remains). Constraint form, not index form, so all upsert
-- arbiters live on one greppable surface (pg_constraint) — V012/V013/V014
-- precedent.
--
-- The two DDL statements apply atomically (explicit BEGIN/COMMIT — Postgres
-- DDL is transactional; a failure mid-file leaves the schema untouched).
--
-- Run AFTER V014. remediation_work_items is currently empty (0 rows,
-- verified in the 7j pre-check), so the unique index builds with zero risk
-- of a duplicate-key failure.
-- =============================================================================

BEGIN;

DROP INDEX idx_remediation_work_items_check_result;

ALTER TABLE remediation_work_items
    ADD CONSTRAINT uq_remediation_work_items_upsert
    UNIQUE (check_result_id);

COMMIT;
