-- =============================================================================
-- V004__tier2_normalized_fields.sql
-- RUN AGAINST: ckm_readiness database
-- Creates the Tier 2 normalized_fields table.
--
-- Implementation pattern: All normalization outputs for ALL Tier 1 tables
-- are stored in this single table. One row per field normalized, per source
-- record. Raw values are never overwritten — the normalized value lives here
-- alongside a reference to the original Tier 1 record.
--
-- Examples:
--   patients.birth_date = '19760923'
--     → normalized_value = '1976-09-23', normalization_type = 'date_format', status = 'success'
--
--   encounters.encounter_date = '04/25/2023' (Bug 5, normalizable)
--     → normalized_value = '2023-04-25', normalization_type = 'date_format', status = 'success'
--
--   encounters.encounter_date = '20/04/2023' (Bug 5, transposed, cannot auto-resolve)
--     → normalized_value = NULL, normalization_type = 'date_format', status = 'failed'
-- =============================================================================

CREATE TABLE normalized_fields (
    normalization_id        UUID            NOT NULL DEFAULT gen_random_uuid(),
    source_record_id        TEXT            NOT NULL,   -- PK of the Tier 1 record being normalized
    source_table            VARCHAR(32)     NOT NULL,   -- name of the Tier 1 table (e.g. 'patients')
    field_name              VARCHAR(64)     NOT NULL,   -- field being normalized (e.g. 'birth_date')
    raw_value               TEXT            NOT NULL,   -- original value from Tier 1; copied for reference
    normalized_value        TEXT,                       -- normalized value; NULL if failed or not applicable
    normalization_type      VARCHAR(32)     NOT NULL,   -- date_format | terminology_map | value_standard | identity_crosswalk
    normalization_status    VARCHAR(16)     NOT NULL,   -- 'success' | 'failed' | 'not_applicable'
    normalized_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    applied_patch_id        UUID,                       -- FK → patch_records.patch_id; populated when this normalized value came from an approved patch
    demo_session_id         UUID            NOT NULL,

    CONSTRAINT pk_normalized_fields PRIMARY KEY (normalization_id),
    CONSTRAINT fk_normalized_fields_session FOREIGN KEY (demo_session_id)
        REFERENCES demo_sessions (session_id),
    CONSTRAINT chk_normalized_fields_status CHECK (
        normalization_status IN ('success', 'failed', 'not_applicable')
    )
);

COMMENT ON TABLE normalized_fields IS
    'Tier 2 — Normalization outputs. One row per field normalized per Tier 1 record. '
    'Raw data is never modified. Normalized values live here alongside provenance metadata. '
    'applied_patch_id links back to the patch that produced this value when AI/human correction was applied. '
    'Read-only once generated within a session.';
