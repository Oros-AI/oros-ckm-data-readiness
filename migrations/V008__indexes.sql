-- =============================================================================
-- V008__indexes.sql
-- RUN AGAINST: ckm_readiness database
-- Creates all indexes for the CKM Data Readiness schema.
--
-- Strategy:
--   1. All demo_session_id columns — session-scoped reset queries
--   2. All foreign keys — join performance
--   3. Primary query patterns for the scoring engine and UI
--   4. GIN index on fhir_bundles.bundle_content for full-text search
-- =============================================================================


-- ---------------------------------------------------------------------------
-- TIER 1 — Raw Input
-- ---------------------------------------------------------------------------

-- patients
CREATE INDEX idx_patients_demo_session    ON patients (demo_session_id);
CREATE INDEX idx_patients_organization    ON patients (organization_id, demo_session_id);

-- providers
CREATE INDEX idx_providers_demo_session   ON providers (demo_session_id);
CREATE INDEX idx_providers_organization   ON providers (organization_id, demo_session_id);

-- encounters
CREATE INDEX idx_encounters_demo_session  ON encounters (demo_session_id);
CREATE INDEX idx_encounters_patient       ON encounters (patient_id, demo_session_id);
CREATE INDEX idx_encounters_organization  ON encounters (organization_id, demo_session_id);

-- conditions
CREATE INDEX idx_conditions_demo_session  ON conditions (demo_session_id);
CREATE INDEX idx_conditions_patient       ON conditions (patient_id, demo_session_id);

-- medications
CREATE INDEX idx_medications_demo_session ON medications (demo_session_id);
CREATE INDEX idx_medications_patient      ON medications (patient_id, demo_session_id);

-- observations
CREATE INDEX idx_observations_demo_session    ON observations (demo_session_id);
CREATE INDEX idx_observations_patient         ON observations (patient_id, demo_session_id);
CREATE INDEX idx_observations_code            ON observations (code, demo_session_id);
CREATE INDEX idx_observations_source          ON observations (source, demo_session_id);
-- Supports routing derived_from_cgm observations vs. ehr observations
CREATE INDEX idx_observations_patient_code    ON observations (patient_id, code, source, demo_session_id);

-- cgm_readings
CREATE INDEX idx_cgm_readings_demo_session    ON cgm_readings (demo_session_id);
CREATE INDEX idx_cgm_readings_patient         ON cgm_readings (patient_id, demo_session_id);
CREATE INDEX idx_cgm_readings_user_id         ON cgm_readings (user_id, demo_session_id);
-- Supports temporal density calculation over a window
CREATE INDEX idx_cgm_readings_patient_time    ON cgm_readings (patient_id, system_time, demo_session_id);

-- cgm_window_metadata
CREATE INDEX idx_cgm_window_metadata_demo_session ON cgm_window_metadata (demo_session_id);

-- bp_readings
CREATE INDEX idx_bp_readings_demo_session     ON bp_readings (demo_session_id);
CREATE INDEX idx_bp_readings_patient          ON bp_readings (patient_id, demo_session_id);

-- weight_readings
CREATE INDEX idx_weight_readings_demo_session ON weight_readings (demo_session_id);
CREATE INDEX idx_weight_readings_patient      ON weight_readings (patient_id, demo_session_id);


-- ---------------------------------------------------------------------------
-- TIER 2 — Normalized
-- ---------------------------------------------------------------------------

-- normalized_fields
-- Primary lookup: find normalized value for a specific Tier 1 field
CREATE INDEX idx_normalized_fields_demo_session   ON normalized_fields (demo_session_id);
CREATE INDEX idx_normalized_fields_source         ON normalized_fields (source_table, source_record_id, demo_session_id);
CREATE INDEX idx_normalized_fields_field_name     ON normalized_fields (field_name, normalization_status, demo_session_id);
CREATE INDEX idx_normalized_fields_patch          ON normalized_fields (applied_patch_id) WHERE applied_patch_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- TIER 3 — Check Results, Patches, Work Items
-- ---------------------------------------------------------------------------

-- check_results
-- Primary scoring engine query pattern: patient × check × session
CREATE INDEX idx_check_results_demo_session       ON check_results (demo_session_id);
CREATE INDEX idx_check_results_patient_check      ON check_results (patient_id, check_name, demo_session_id);
CREATE INDEX idx_check_results_patient            ON check_results (patient_id, demo_session_id);
CREATE INDEX idx_check_results_organization       ON check_results (organization_id, demo_session_id);
CREATE INDEX idx_check_results_scope              ON check_results (check_scope, demo_session_id);
CREATE INDEX idx_check_results_status             ON check_results (status, demo_session_id);
-- Supports filtering by variable for variable-level scoring rollup
CREATE INDEX idx_check_results_variable           ON check_results (variable_name, patient_id, demo_session_id);

-- variable_readiness_scores
CREATE INDEX idx_variable_readiness_scores_demo_session   ON variable_readiness_scores (demo_session_id);
CREATE INDEX idx_variable_readiness_scores_patient        ON variable_readiness_scores (patient_id, demo_session_id);
CREATE INDEX idx_variable_readiness_scores_organization   ON variable_readiness_scores (organization_id, demo_session_id);
CREATE INDEX idx_variable_readiness_scores_variable       ON variable_readiness_scores (variable_name, demo_session_id);
CREATE INDEX idx_variable_readiness_scores_status         ON variable_readiness_scores (overall_status, demo_session_id);

-- patch_records
CREATE INDEX idx_patch_records_demo_session       ON patch_records (demo_session_id);
CREATE INDEX idx_patch_records_source             ON patch_records (source_table, source_record_id, demo_session_id);
CREATE INDEX idx_patch_records_status             ON patch_records (patch_status, demo_session_id);
CREATE INDEX idx_patch_records_organization       ON patch_records (organization_id, demo_session_id);
CREATE INDEX idx_patch_records_check              ON patch_records (check_name, demo_session_id);

-- remediation_work_items
CREATE INDEX idx_remediation_work_items_demo_session  ON remediation_work_items (demo_session_id);
CREATE INDEX idx_remediation_work_items_patient       ON remediation_work_items (patient_id, demo_session_id);
CREATE INDEX idx_remediation_work_items_check_result  ON remediation_work_items (check_result_id);
CREATE INDEX idx_remediation_work_items_organization  ON remediation_work_items (organization_id, demo_session_id);
CREATE INDEX idx_remediation_work_items_status        ON remediation_work_items (status, demo_session_id);
CREATE INDEX idx_remediation_work_items_role          ON remediation_work_items (responsible_role, demo_session_id);


-- ---------------------------------------------------------------------------
-- TIER 4 — Use-Case Readiness and FHIR
-- ---------------------------------------------------------------------------

-- use_case_readiness
-- Primary UI readiness panel query pattern: patient × use case × session
CREATE INDEX idx_use_case_readiness_demo_session      ON use_case_readiness (demo_session_id);
CREATE INDEX idx_use_case_readiness_patient_usecase   ON use_case_readiness (patient_id, use_case_name, demo_session_id);
CREATE INDEX idx_use_case_readiness_patient           ON use_case_readiness (patient_id, demo_session_id);
CREATE INDEX idx_use_case_readiness_organization      ON use_case_readiness (organization_id, demo_session_id);
CREATE INDEX idx_use_case_readiness_status            ON use_case_readiness (overall_status, demo_session_id);
CREATE INDEX idx_use_case_readiness_usecase           ON use_case_readiness (use_case_name, demo_session_id);
CREATE INDEX idx_use_case_readiness_patch             ON use_case_readiness (derived_from_patch_id) WHERE derived_from_patch_id IS NOT NULL;

-- fhir_bundles
CREATE INDEX idx_fhir_bundles_demo_session            ON fhir_bundles (demo_session_id);
CREATE INDEX idx_fhir_bundles_patient                 ON fhir_bundles (patient_id, demo_session_id);
CREATE INDEX idx_fhir_bundles_organization            ON fhir_bundles (organization_id, demo_session_id);
CREATE INDEX idx_fhir_bundles_use_case                ON fhir_bundles (use_case, demo_session_id);
-- GIN index for full-text search across FHIR bundle JSON — supports Ad Hoc Query tab
CREATE INDEX idx_fhir_bundles_content_gin             ON fhir_bundles USING GIN (bundle_content);
