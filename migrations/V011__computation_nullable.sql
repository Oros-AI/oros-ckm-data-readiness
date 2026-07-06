-- =============================================================================
-- V011__computation_nullable.sql
-- RUN AGAINST: ckm_readiness database
-- Drops the NOT NULL constraint on use_case_specifications.computation.
--
-- Why (7c genericity finding, 2026-07-06): the computation block is OPTIONAL
-- in use-case configs. A use case without one is a boolean/pathway-only
-- module — readiness derives from pathway results alone, no continuous score.
-- The 7c stub modules (hypertension_risk_stratification, care_coordination,
-- vbc_reporting) omit the block by design; V010 declared the column NOT NULL
-- on the diabetes-shaped assumption that every use case computes a weighted
-- score. This aligns the DB layer with the application layer (config_loader.js
-- made computation optional in the same finding — dual-enforcement pattern,
-- both layers must agree).
--
-- Run AFTER V010. Additive-safe: no data change, no table rewrite.
-- Doc updates in the same change: Condition Module Schema §2/§6 (semantics,
-- landed with the loader change) and §4.2 DDL table (computation → nullable).
-- =============================================================================

ALTER TABLE use_case_specifications
    ALTER COLUMN computation DROP NOT NULL;
