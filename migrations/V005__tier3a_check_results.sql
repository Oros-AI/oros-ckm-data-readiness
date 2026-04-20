-- =============================================================================
-- V005__tier3a_check_results.sql
-- RUN AGAINST: ckm_readiness database
-- Creates Tier 3a tables: check_results and variable_readiness_scores.
--
-- check_results: One row per check per patient per session.
-- variable_readiness_scores: Aggregated from check_results. One row per patient
--   per variable per session.
--
-- The agentic infrastructure never receives raw data — only check result records.
-- Each check result is ~200 bytes. Token cost scales with number of checks, not
-- number of raw records.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 4.1 check_results
-- Atomic unit of readiness evaluation. One row per check per patient.
-- check_name values must match the Technical Specification check registry exactly.
-- ---------------------------------------------------------------------------
CREATE TABLE check_results (
    check_result_id     UUID            NOT NULL DEFAULT gen_random_uuid(),
    patient_id          VARCHAR(32)     NOT NULL,
    organization_id     VARCHAR(16)     NOT NULL,   -- ORG001–ORG003
    check_name          VARCHAR(64)     NOT NULL,   -- from Tech Spec check registry
    variable_name       VARCHAR(64)     NOT NULL,   -- e.g. 'CGM Glucose', 'Blood Pressure'
    check_scope         VARCHAR(16)     NOT NULL,   -- 'ehr' | 'device' | 'use_case'
    check_layer         VARCHAR(8),                 -- 'layer1'–'layer5'; NULL for device_* checks
    priority            VARCHAR(8)      NOT NULL,   -- 'High' | 'Medium' | 'Low'
    status              VARCHAR(16)     NOT NULL,   -- 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_APPLICABLE'
    score               DOUBLE PRECISION,           -- 0–1; NULL if check is binary
    threshold           DOUBLE PRECISION,           -- threshold value for this check
    observed_value      TEXT,                       -- the actual value that triggered the result
    window_days         INTEGER,                    -- analysis window used; NULL for non-temporal checks
    evaluated_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    demo_session_id     UUID            NOT NULL,

    CONSTRAINT pk_check_results PRIMARY KEY (check_result_id),
    CONSTRAINT fk_check_results_session FOREIGN KEY (demo_session_id)
        REFERENCES demo_sessions (session_id),
    CONSTRAINT chk_check_results_scope CHECK (
        check_scope IN ('ehr', 'device', 'use_case')
    ),
    CONSTRAINT chk_check_results_priority CHECK (
        priority IN ('High', 'Medium', 'Low')
    ),
    CONSTRAINT chk_check_results_status CHECK (
        status IN ('PASS', 'FAIL', 'PARTIAL', 'NOT_APPLICABLE')
    ),
    CONSTRAINT chk_check_results_score CHECK (
        score IS NULL OR (score >= 0 AND score <= 1)
    )
);

COMMENT ON TABLE check_results IS
    'Tier 3a — One check result per check per patient per session. '
    'check_name must match the Technical Specification check registry exactly. '
    'The agentic layer receives these records, not raw data.';


-- ---------------------------------------------------------------------------
-- 4.2 variable_readiness_scores
-- Aggregated from check_results. One row per patient per variable per session.
-- technical_score = weighted average of layer1–layer3 checks for this variable.
-- readiness_score = weighted average of layer4–layer5 and device checks.
-- ---------------------------------------------------------------------------
CREATE TABLE variable_readiness_scores (
    score_id            UUID            NOT NULL DEFAULT gen_random_uuid(),
    patient_id          VARCHAR(32)     NOT NULL,
    variable_name       VARCHAR(64)     NOT NULL,   -- e.g. 'CGM Glucose', 'Blood Pressure'
    technical_score     DOUBLE PRECISION NOT NULL,  -- weighted avg of layer1–layer3; range 0–1
    readiness_score     DOUBLE PRECISION NOT NULL,  -- weighted avg of layer4–layer5 + device; range 0–1
    overall_status      VARCHAR(16)     NOT NULL,   -- 'READY' | 'PARTIALLY_READY' | 'NOT_READY'
    blocking_checks     TEXT[],                     -- array of check_names currently FAIL for this variable
    organization_id     VARCHAR(16)     NOT NULL,   -- carried for UI grouping without join
    scored_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    demo_session_id     UUID            NOT NULL,

    CONSTRAINT pk_variable_readiness_scores PRIMARY KEY (score_id),
    CONSTRAINT fk_variable_readiness_scores_session FOREIGN KEY (demo_session_id)
        REFERENCES demo_sessions (session_id),
    CONSTRAINT chk_variable_readiness_scores_status CHECK (
        overall_status IN ('READY', 'PARTIALLY_READY', 'NOT_READY')
    ),
    CONSTRAINT chk_variable_readiness_scores_technical CHECK (
        technical_score >= 0 AND technical_score <= 1
    ),
    CONSTRAINT chk_variable_readiness_scores_readiness CHECK (
        readiness_score >= 0 AND readiness_score <= 1
    )
);

COMMENT ON TABLE variable_readiness_scores IS
    'Tier 3a — Aggregated variable readiness. One row per patient per variable per session. '
    'Rolls up check_results into technical_score (layer1–3) and readiness_score (layer4–5 + device). '
    'organization_id carried directly to avoid joins in UI grouping and multi-site filtering.';
