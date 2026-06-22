-- =============================================================================
-- V010__condition_modules.sql
-- RUN AGAINST: ckm_readiness database
-- Adds the condition-module config layer and pathway-result runtime output for
-- the Step 7 scoring engine, plus a retrofit CHECK closing a V006 gap.
--
-- Adds:
--   1. condition_modules        — config-layer, one row per loaded condition
--   2. use_case_specifications  — config-layer, one row per use case (FK → above)
--   3. use_case_pathway_results — Tier 3 runtime output, session-aware
--   4. Retrofit CHECK on remediation_work_items.responsible_role (added VALID)
--   5. Five indexes (FKs + demo_session_id columns, per Data Model §11)
--
-- Run AFTER V001–V009. Pre-migration gate (spec §2) must pass first:
--   18 tables, pgcrypto enabled, composite UNIQUE/PK on
--   patients(patient_id, demo_session_id), zero non-conforming responsible_role.
-- Derived from: Oros - CKM Data Readiness - V010 Migration Spec §3–§4.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- CONFIG LAYER — condition_modules
-- Not session-scoped. Populated by the config loader at app startup. No FKs out.
-- ---------------------------------------------------------------------------

CREATE TABLE condition_modules (
    condition_id    VARCHAR(32)  NOT NULL,
    display_name    VARCHAR(128) NOT NULL,
    description     TEXT,
    schema_version  VARCHAR(16)  NOT NULL,
    config_json     JSONB        NOT NULL,
    loaded_at       TIMESTAMPTZ  NOT NULL,
    CONSTRAINT pk_condition_modules PRIMARY KEY (condition_id)
);


-- ---------------------------------------------------------------------------
-- CONFIG LAYER — use_case_specifications
-- Not session-scoped. FK → condition_modules (ON DELETE RESTRICT).
-- CHECK on use_case_category.
-- ---------------------------------------------------------------------------

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
        REFERENCES condition_modules (condition_id)
        ON DELETE RESTRICT,
    CONSTRAINT ck_use_case_specifications_category
        CHECK (use_case_category IN (
            'risk_stratification',
            'care_coordination_delivery',
            'vbc_reporting'
        ))
);


-- ---------------------------------------------------------------------------
-- TIER 3 RUNTIME — use_case_pathway_results
-- Session-aware. One row per patient × use case × session.
-- Three FKs (composite patient, use case, session) per the V009 Tier 3 pattern.
-- ---------------------------------------------------------------------------

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
        REFERENCES patients (patient_id, demo_session_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_use_case_pathway_results_use_case
        FOREIGN KEY (use_case_name)
        REFERENCES use_case_specifications (use_case_name)
        ON DELETE RESTRICT,
    CONSTRAINT fk_use_case_pathway_results_session
        FOREIGN KEY (demo_session_id)
        REFERENCES demo_sessions (session_id)
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
            OR (pathway_result IN ('primary_pass', 'fallback_pass')
                AND active_pathway_id IS NOT NULL)
        )
);


-- ---------------------------------------------------------------------------
-- RETROFIT — remediation_work_items.responsible_role CHECK
-- Closes the V006 gap (column declared VARCHAR(32) NOT NULL, no value list).
-- Added VALID (no NOT VALID): spec §2.4 confirmed zero non-conforming rows.
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- INDEXES (spec §4) — FKs and demo_session_id columns (Data Model §11)
-- condition_modules: PK is sufficient; no FKs out.
-- ---------------------------------------------------------------------------

-- use_case_specifications
CREATE INDEX idx_use_case_specifications_condition_id
    ON use_case_specifications (condition_id);

-- use_case_pathway_results
CREATE INDEX idx_use_case_pathway_results_patient_usecase_session
    ON use_case_pathway_results (patient_id, use_case_name, demo_session_id);

CREATE INDEX idx_use_case_pathway_results_demo_session_id
    ON use_case_pathway_results (demo_session_id);

CREATE INDEX idx_use_case_pathway_results_organization
    ON use_case_pathway_results (organization_id, demo_session_id);

CREATE INDEX idx_use_case_pathway_results_use_case_name
    ON use_case_pathway_results (use_case_name);
