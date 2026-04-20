-- =============================================================================
-- V007__tier4_readiness_and_fhir.sql
-- RUN AGAINST: ckm_readiness database
-- Creates Tier 4 tables: use_case_readiness and fhir_bundles.
--
-- use_case_readiness: Aggregated readiness status per patient per use case.
--   A use case is READY only when ALL required variables are READY.
--   A single failing required variable makes the use case NOT_READY.
--
-- fhir_bundles: FHIR R4 bundles stored as JSONB. POC is self-contained —
--   no separate FHIR server required. Enables VBC reporting and care
--   coordination use cases.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 7.1 use_case_readiness
-- One row per patient per use case per session.
-- Computed from variable_readiness_scores.
-- Tier 4 stores ALL evaluated patients including blocked/partial — UI shows
-- the full remediation arc, not just READY patients.
-- ---------------------------------------------------------------------------
CREATE TABLE use_case_readiness (
    readiness_id            UUID            NOT NULL DEFAULT gen_random_uuid(),
    patient_id              VARCHAR(32)     NOT NULL,
    use_case_name           VARCHAR(64)     NOT NULL,   -- 'diabetes_risk_stratification' | 'vbc_access_ckm' etc.
    overall_status          VARCHAR(16)     NOT NULL,   -- 'READY' | 'PARTIALLY_READY' | 'NOT_READY'
    fitness_score           DOUBLE PRECISION NOT NULL,  -- weighted aggregate across required variables; 0–1
    required_variables      TEXT[]          NOT NULL,   -- variable names required for this use case
    blocking_variables      TEXT[],                     -- required variables currently NOT_READY; NULL if all pass
    partial_variables       TEXT[],                     -- required variables currently PARTIALLY_READY
    organization_id         VARCHAR(16)     NOT NULL,   -- carried for multi-site readiness comparisons in UI
    derived_from_patch_id   UUID,                       -- FK → patch_records.patch_id; populated when this readiness
                                                        -- record was generated after an approved patch was applied.
                                                        -- Enables end-to-end provenance: raw record → patch → re-scored readiness.
    evaluated_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    demo_session_id         UUID            NOT NULL,

    CONSTRAINT pk_use_case_readiness PRIMARY KEY (readiness_id),
    CONSTRAINT fk_use_case_readiness_session FOREIGN KEY (demo_session_id)
        REFERENCES demo_sessions (session_id),
    CONSTRAINT fk_use_case_readiness_patch FOREIGN KEY (derived_from_patch_id)
        REFERENCES patch_records (patch_id),
    CONSTRAINT chk_use_case_readiness_status CHECK (
        overall_status IN ('READY', 'PARTIALLY_READY', 'NOT_READY')
    ),
    CONSTRAINT chk_use_case_readiness_fitness CHECK (
        fitness_score >= 0 AND fitness_score <= 1
    )
);

COMMENT ON TABLE use_case_readiness IS
    'Tier 4a — Use-case-level readiness per patient per session. '
    'READY only when ALL required variables are READY — a single failing required variable = NOT_READY. '
    'Stores all evaluated patients including blocked/partial — UI shows full remediation arc. '
    'derived_from_patch_id links to the patch that triggered re-scoring, enabling end-to-end provenance. '
    'OMOP/FHIR generation for external analytics restricted to patients meeting minimum thresholds.';


-- ---------------------------------------------------------------------------
-- 8.2 fhir_bundles
-- FHIR R4 bundles stored as JSONB. Self-contained POC — no separate FHIR server.
-- Pre-generated for Dataset A (clean). Live generation from Dataset B/C is
-- an agentic phase capability, not a requirement for the deterministic demo.
-- ---------------------------------------------------------------------------
CREATE TABLE fhir_bundles (
    bundle_id           UUID            NOT NULL DEFAULT gen_random_uuid(),
    patient_id          VARCHAR(32)     NOT NULL,
    organization_id     VARCHAR(16)     NOT NULL,
    use_case            VARCHAR(32)     NOT NULL,   -- 'vbc_access_ckm' | 'care_coordination'
    resource_type       VARCHAR(32)     NOT NULL,   -- Patient | Observation | Condition | MedicationRequest | Encounter | DiagnosticReport
    bundle_content      JSONB           NOT NULL,   -- full FHIR R4 Bundle JSON
    generated_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    demo_session_id     UUID            NOT NULL,

    CONSTRAINT pk_fhir_bundles PRIMARY KEY (bundle_id),
    CONSTRAINT fk_fhir_bundles_session FOREIGN KEY (demo_session_id)
        REFERENCES demo_sessions (session_id),
    CONSTRAINT chk_fhir_bundles_resource_type CHECK (
        resource_type IN ('Patient', 'Observation', 'Condition', 'MedicationRequest', 'Encounter', 'DiagnosticReport')
    )
);

COMMENT ON TABLE fhir_bundles IS
    'Tier 4b — FHIR R4 bundles stored as JSONB. One bundle per patient per use case per resource type. '
    'POC is self-contained — no separate FHIR server required. '
    'Pre-generated for Dataset A. Live generation from Dataset B/C is an agentic phase capability. '
    'GIN index on bundle_content supports full-text search for the Ad Hoc Query tab.';
