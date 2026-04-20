-- =============================================================================
-- V002__demo_sessions.sql
-- RUN AGAINST: ckm_readiness database
-- Creates the demo_sessions table.
--
-- Every record in Tiers 1–4 carries a demo_session_id that links back here.
-- This is what enables demo resets: deleting by session_id clears all derived
-- data without touching the source CSV files on disk.
-- =============================================================================

CREATE TABLE demo_sessions (
    session_id      UUID            NOT NULL DEFAULT gen_random_uuid(),
    dataset_state   VARCHAR(8)      NOT NULL,       -- 'A', 'B', or 'C'
    audience_type   VARCHAR(32),                    -- 'NCQA', 'ACO', 'Clinician', 'Admin', 'Funder'
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      VARCHAR(64),
    notes           TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_demo_sessions PRIMARY KEY (session_id),
    CONSTRAINT chk_demo_sessions_dataset_state CHECK (dataset_state IN ('A', 'B', 'C'))
);

COMMENT ON TABLE demo_sessions IS
    'One row per demo run. All Tier 1–4 records carry demo_session_id. '
    'Reset by setting is_active = FALSE and deleting session-scoped records in reverse tier order.';
