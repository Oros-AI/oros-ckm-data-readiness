-- =============================================================================
-- V009__foreign_keys.sql
-- RUN AGAINST: ckm_readiness database
-- Adds session-aware foreign key constraints across all Tier 1–4 tables.
--
-- Why session-aware FKs:
--   All tables use composite PKs that include demo_session_id. Standard FKs
--   referencing only patient_id would not enforce session isolation correctly.
--   These constraints enforce that every record belongs to a patient/encounter/etc
--   that exists within the SAME demo session.
--
-- Run AFTER V001–V008 and BEFORE loading any data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TIER 1 — Cross-table relationships within a session
-- ---------------------------------------------------------------------------

-- encounters → patients (same session)
ALTER TABLE encounters
    ADD CONSTRAINT fk_encounters_patient
    FOREIGN KEY (patient_id, demo_session_id)
    REFERENCES patients (patient_id, demo_session_id);

-- conditions → patients (same session)
ALTER TABLE conditions
    ADD CONSTRAINT fk_conditions_patient
    FOREIGN KEY (patient_id, demo_session_id)
    REFERENCES patients (patient_id, demo_session_id);

-- conditions → encounters (same session, nullable)
-- Note: encounter_id is nullable in conditions — some conditions recorded without encounter
-- PostgreSQL FK constraints allow NULL values in nullable FK columns by default
ALTER TABLE conditions
    ADD CONSTRAINT fk_conditions_encounter
    FOREIGN KEY (encounter_id, demo_session_id)
    REFERENCES encounters (encounter_id, demo_session_id);

-- medications → patients (same session)
ALTER TABLE medications
    ADD CONSTRAINT fk_medications_patient
    FOREIGN KEY (patient_id, demo_session_id)
    REFERENCES patients (patient_id, demo_session_id);

-- medications → encounters (same session, nullable)
ALTER TABLE medications
    ADD CONSTRAINT fk_medications_encounter
    FOREIGN KEY (encounter_id, demo_session_id)
    REFERENCES encounters (encounter_id, demo_session_id);

-- observations → patients (same session)
ALTER TABLE observations
    ADD CONSTRAINT fk_observations_patient
    FOREIGN KEY (patient_id, demo_session_id)
    REFERENCES patients (patient_id, demo_session_id);

-- observations → encounters (same session, nullable)
ALTER TABLE observations
    ADD CONSTRAINT fk_observations_encounter
    FOREIGN KEY (encounter_id, demo_session_id)
    REFERENCES encounters (encounter_id, demo_session_id);

-- cgm_readings → patients: FK intentionally omitted

-- cgm_window_metadata → patients (same session)
ALTER TABLE cgm_window_metadata
    ADD CONSTRAINT fk_cgm_window_metadata_patient
    FOREIGN KEY (patient_id, demo_session_id)
    REFERENCES patients (patient_id, demo_session_id);

-- bp_readings → patients (same session)
ALTER TABLE bp_readings
    ADD CONSTRAINT fk_bp_readings_patient
    FOREIGN KEY (patient_id, demo_session_id)
    REFERENCES patients (patient_id, demo_session_id);

-- weight_readings → patients (same session)
ALTER TABLE weight_readings
    ADD CONSTRAINT fk_weight_readings_patient
    FOREIGN KEY (patient_id, demo_session_id)
    REFERENCES patients (patient_id, demo_session_id);

-- ---------------------------------------------------------------------------
-- TIER 2 — normalized_fields → demo_sessions
-- (source_record_id is polymorphic TEXT — no FK to specific Tier 1 table)
-- ---------------------------------------------------------------------------

-- applied_patch_id → patch_records (added after Tier 3 tables exist)
-- This is a forward reference — added here after all tables are created
ALTER TABLE normalized_fields
    ADD CONSTRAINT fk_normalized_fields_patch
    FOREIGN KEY (applied_patch_id)
    REFERENCES patch_records (patch_id);

-- ---------------------------------------------------------------------------
-- TIER 3 — check_results, patches, work items
-- ---------------------------------------------------------------------------

-- variable_readiness_scores → patients (same session)
ALTER TABLE variable_readiness_scores
    ADD CONSTRAINT fk_variable_readiness_scores_patient
    FOREIGN KEY (patient_id, demo_session_id)
    REFERENCES patients (patient_id, demo_session_id);

-- patch_records: source_record_id is polymorphic TEXT — no FK to specific table
-- This is by design — patches can target any Tier 1 table

-- remediation_work_items → check_results already defined in V006
-- remediation_work_items → patients (same session)
ALTER TABLE remediation_work_items
    ADD CONSTRAINT fk_remediation_work_items_patient
    FOREIGN KEY (patient_id, demo_session_id)
    REFERENCES patients (patient_id, demo_session_id);

-- ---------------------------------------------------------------------------
-- TIER 4 — use_case_readiness, fhir_bundles
-- ---------------------------------------------------------------------------

-- use_case_readiness → patients (same session)
ALTER TABLE use_case_readiness
    ADD CONSTRAINT fk_use_case_readiness_patient
    FOREIGN KEY (patient_id, demo_session_id)
    REFERENCES patients (patient_id, demo_session_id);

-- fhir_bundles → patients (same session)
ALTER TABLE fhir_bundles
    ADD CONSTRAINT fk_fhir_bundles_patient
    FOREIGN KEY (patient_id, demo_session_id)
    REFERENCES patients (patient_id, demo_session_id);
