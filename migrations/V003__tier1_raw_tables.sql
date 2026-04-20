-- =============================================================================
-- V003__tier1_raw_tables.sql (v2 — corrected 2026-04-04)
-- RUN AGAINST: ckm_readiness database
-- Creates all Tier 1 (Raw Input) tables.
--
-- Changes from v1:
--   - observations.interpretation: VARCHAR(4) → VARCHAR(32)
--   - cgm_readings.user_id: VARCHAR(32) → VARCHAR(64)
--   - cgm_readings PK: record_id → (record_id, demo_session_id)
--   - bp_readings PK: record_id → (record_id, demo_session_id)
--   - weight_readings PK: record_id → (record_id, demo_session_id)
-- =============================================================================

CREATE TABLE patients (
    patient_id          VARCHAR(32)      NOT NULL,
    organization_id     VARCHAR(16)      NOT NULL,
    provider_id         VARCHAR(32),
    provider_id_type    VARCHAR(8)       NOT NULL DEFAULT 'npi',
    birth_date          VARCHAR(8)       NOT NULL,
    postal_code         VARCHAR(5)       NOT NULL,
    gender              VARCHAR(16)      NOT NULL,
    race_1              VARCHAR(16),
    ethnicity           VARCHAR(16),
    language            VARCHAR(4),
    insurance_type_1    VARCHAR(4),
    education_level     VARCHAR(4),
    cgm_available       BOOLEAN          NOT NULL,
    date_of_death       VARCHAR(8),
    demo_session_id     UUID             NOT NULL,
    loaded_at           TIMESTAMPTZ      NOT NULL DEFAULT now(),
    CONSTRAINT pk_patients PRIMARY KEY (patient_id, demo_session_id),
    CONSTRAINT fk_patients_session FOREIGN KEY (demo_session_id) REFERENCES demo_sessions (session_id)
);
COMMENT ON TABLE patients IS 'Tier 1 — Raw patient demographics. Never modified after load.';

CREATE TABLE providers (
    npi_id              VARCHAR(10)      NOT NULL,
    organization_id     VARCHAR(16)      NOT NULL,
    provider_type       VARCHAR(8)       NOT NULL,
    pos_id              VARCHAR(16),
    demo_session_id     UUID             NOT NULL,
    CONSTRAINT pk_providers PRIMARY KEY (npi_id, demo_session_id),
    CONSTRAINT fk_providers_session FOREIGN KEY (demo_session_id) REFERENCES demo_sessions (session_id)
);
COMMENT ON TABLE providers IS 'Tier 1 — Raw provider records. Never modified after load.';

CREATE TABLE encounters (
    encounter_id                VARCHAR(32)      NOT NULL,
    patient_id                  VARCHAR(32)      NOT NULL,
    organization_id             VARCHAR(16)      NOT NULL,
    encounter_date              VARCHAR(10)      NOT NULL,
    encounter_time              VARCHAR(4),
    class                       VARCHAR(16)      NOT NULL,
    encounter_reason_code       VARCHAR(32),
    encounter_reason_code_type  VARCHAR(8),
    provider_id                 VARCHAR(32)      NOT NULL,
    provider_id_type            VARCHAR(8)       NOT NULL DEFAULT 'npi',
    status                      VARCHAR(16)      NOT NULL,
    insurance_types             VARCHAR(8),
    demo_session_id             UUID             NOT NULL,
    CONSTRAINT pk_encounters PRIMARY KEY (encounter_id, demo_session_id),
    CONSTRAINT fk_encounters_session FOREIGN KEY (demo_session_id) REFERENCES demo_sessions (session_id)
);
COMMENT ON TABLE encounters IS 'Tier 1 — Raw encounter records. encounter_date is VARCHAR to preserve raw bugs (Dataset B Bug 5). Never modified after load.';

CREATE TABLE conditions (
    condition_id        VARCHAR(32)      NOT NULL,
    patient_id          VARCHAR(32)      NOT NULL,
    organization_id     VARCHAR(16)      NOT NULL,
    encounter_id        VARCHAR(32),
    code                VARCHAR(16)      NOT NULL,
    code_type           VARCHAR(8)       NOT NULL DEFAULT 'icd10',
    onset_date          VARCHAR(8),
    date_recorded       VARCHAR(8),
    clinical_status     VARCHAR(16),
    verification_status VARCHAR(16),
    order_num           INTEGER,
    demo_session_id     UUID             NOT NULL,
    CONSTRAINT pk_conditions PRIMARY KEY (condition_id, demo_session_id),
    CONSTRAINT fk_conditions_session FOREIGN KEY (demo_session_id) REFERENCES demo_sessions (session_id)
);
COMMENT ON TABLE conditions IS 'Tier 1 — Raw diagnosis records. CSV provider_id and category columns not loaded — provider attribution available via encounter join. Never modified after load.';

CREATE TABLE medications (
    medication_id       VARCHAR(32)      NOT NULL,
    patient_id          VARCHAR(32)      NOT NULL,
    organization_id     VARCHAR(16)      NOT NULL,
    encounter_id        VARCHAR(32),
    code                VARCHAR(16)      NOT NULL,
    code_type           VARCHAR(8)       NOT NULL DEFAULT 'rxnorm',
    drug_name           VARCHAR(128),
    drug_class          VARCHAR(64),
    drug_sub_class      VARCHAR(64),
    status              VARCHAR(16),
    date_written        VARCHAR(8),
    demo_session_id     UUID             NOT NULL,
    CONSTRAINT pk_medications PRIMARY KEY (medication_id, demo_session_id),
    CONSTRAINT fk_medications_session FOREIGN KEY (demo_session_id) REFERENCES demo_sessions (session_id)
);
COMMENT ON TABLE medications IS 'Tier 1 — Raw medication records. CSV prescriber_id and drug_name_generic not loaded — prescriber available via encounter join. Never modified after load.';

CREATE TABLE observations (
    observation_id      VARCHAR(32)      NOT NULL,
    patient_id          VARCHAR(32)      NOT NULL,
    organization_id     VARCHAR(16)      NOT NULL,
    encounter_id        VARCHAR(32),
    category            VARCHAR(32)      NOT NULL,
    effective_date      VARCHAR(8)       NOT NULL,
    effective_time      VARCHAR(4),
    code                VARCHAR(16)      NOT NULL,
    code_type           VARCHAR(8)       NOT NULL DEFAULT 'loinc',
    value               VARCHAR(32)      NOT NULL,
    value_units         VARCHAR(16),
    status              VARCHAR(16)      NOT NULL,
    source              VARCHAR(32)      NOT NULL,
    interpretation      VARCHAR(32),
    demo_session_id     UUID             NOT NULL,
    CONSTRAINT pk_observations PRIMARY KEY (observation_id, demo_session_id),
    CONSTRAINT fk_observations_session FOREIGN KEY (demo_session_id) REFERENCES demo_sessions (session_id),
    CONSTRAINT chk_observations_source CHECK (source IN ('ehr', 'derived_from_cgm', 'derived_from_device'))
);
COMMENT ON TABLE observations IS 'Tier 1 — Raw observations. interpretation is VARCHAR(32) to support HL7 codes (L,N,H,A) and CGM metric labels (TIR, GMI, WEAR_TIME, TBR_L1, TBR_L2). Never modified after load.';

CREATE TABLE cgm_readings (
    record_id               UUID             NOT NULL DEFAULT gen_random_uuid(),
    patient_id              VARCHAR(32)      NOT NULL,
    user_id                 VARCHAR(64)      NOT NULL,
    system_time             TIMESTAMPTZ      NOT NULL,
    display_time            TIMESTAMPTZ      NOT NULL,
    transmitter_id          VARCHAR(64),
    transmitter_ticks       BIGINT           NOT NULL,
    value                   INTEGER,
    status                  VARCHAR(8),
    trend                   VARCHAR(24),
    trend_rate              DOUBLE PRECISION,
    unit                    VARCHAR(8)       NOT NULL DEFAULT 'mg/dL',
    display_device          VARCHAR(16)      NOT NULL,
    transmitter_generation  VARCHAR(16)      NOT NULL,
    demo_session_id         UUID             NOT NULL,
    CONSTRAINT pk_cgm_readings PRIMARY KEY (record_id, demo_session_id),
    CONSTRAINT fk_cgm_readings_session FOREIGN KEY (demo_session_id) REFERENCES demo_sessions (session_id)
);
COMMENT ON TABLE cgm_readings IS 'Tier 1 — Raw CGM readings. user_id is VARCHAR(64) for UUID-format Bug 1 values. PK is composite — datasets share record_ids. CSV has no patient_id column; loader maps user_id to patient_id. CSV record_type and rate_unit not loaded. Never modified after load.';

CREATE TABLE cgm_window_metadata (
    patient_id              VARCHAR(32)      NOT NULL,
    reference_date          DATE             NOT NULL,
    analysis_window_start   DATE             NOT NULL,
    analysis_window_end     DATE             NOT NULL,
    window_days             INTEGER          NOT NULL,
    expected_readings       INTEGER          NOT NULL,
    actual_readings         INTEGER          NOT NULL,
    temporal_density        DOUBLE PRECISION NOT NULL,
    demo_session_id         UUID             NOT NULL,
    CONSTRAINT pk_cgm_window_metadata PRIMARY KEY (patient_id, demo_session_id),
    CONSTRAINT fk_cgm_window_metadata_session FOREIGN KEY (demo_session_id) REFERENCES demo_sessions (session_id)
);
COMMENT ON TABLE cgm_window_metadata IS 'Tier 1 — Pre-computed CGM analysis window statistics. One row per CGM patient per session.';

CREATE TABLE bp_readings (
    record_id           UUID             NOT NULL DEFAULT gen_random_uuid(),
    patient_id          VARCHAR(32)      NOT NULL,
    device_id           VARCHAR(64)      NOT NULL,
    device_type         VARCHAR(16)      NOT NULL DEFAULT 'bp_cuff',
    timestamp_utc       TIMESTAMPTZ      NOT NULL,
    timestamp_local     TIMESTAMPTZ      NOT NULL,
    value_primary       DOUBLE PRECISION NOT NULL,
    value_secondary     INTEGER,
    unit                VARCHAR(8)       NOT NULL DEFAULT 'mmHg',
    demo_session_id     UUID             NOT NULL,
    CONSTRAINT pk_bp_readings PRIMARY KEY (record_id, demo_session_id),
    CONSTRAINT fk_bp_readings_session FOREIGN KEY (demo_session_id) REFERENCES demo_sessions (session_id)
);
COMMENT ON TABLE bp_readings IS 'Tier 1 — Raw BP readings. PK composite — datasets share record_ids. CSV systolic_bp→value_primary, diastolic_bp→value_secondary. CSV manufacturer, measurement_type, pulse not loaded. Never modified after load.';

CREATE TABLE weight_readings (
    record_id           UUID             NOT NULL DEFAULT gen_random_uuid(),
    patient_id          VARCHAR(32)      NOT NULL,
    device_id           VARCHAR(64)      NOT NULL,
    device_type         VARCHAR(16)      NOT NULL DEFAULT 'connected_scale',
    timestamp_utc       TIMESTAMPTZ      NOT NULL,
    timestamp_local     TIMESTAMPTZ      NOT NULL,
    value_primary       DOUBLE PRECISION NOT NULL,
    value_secondary     INTEGER,
    unit                VARCHAR(8)       NOT NULL DEFAULT 'kg',
    demo_session_id     UUID             NOT NULL,
    CONSTRAINT pk_weight_readings PRIMARY KEY (record_id, demo_session_id),
    CONSTRAINT fk_weight_readings_session FOREIGN KEY (demo_session_id) REFERENCES demo_sessions (session_id)
);
COMMENT ON TABLE weight_readings IS 'Tier 1 — Raw weight readings. PK composite — datasets share record_ids. CSV value→value_primary. value_secondary always NULL. CSV manufacturer, measurement_type not loaded. Never modified after load.';
