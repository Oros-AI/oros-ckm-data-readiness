-- =============================================================================
-- V006__tier3b_3c_patches_and_workitems.sql
-- RUN AGAINST: ckm_readiness database
-- Creates Tier 3b (patch_records) and Tier 3c (remediation_work_items).
--
-- patch_records: AI-suggested or human-authored corrections. Requires human
--   approval before being applied. Raw data is never touched.
--
-- remediation_work_items: For issues that cannot be resolved by AI patching.
--   Routes to the responsible functional role for external action.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 5.1 patch_records
-- All patches generated and versioned by the Program Coordinator infrastructure.
-- source_record_id is TEXT (not UUID) because Tier 1 IDs vary by table format.
-- A patch is never applied to the raw record — it creates a versioned correction
-- that downstream processing uses in place of the original.
-- ---------------------------------------------------------------------------
CREATE TABLE patch_records (
    patch_id            UUID            NOT NULL DEFAULT gen_random_uuid(),
    source_record_id    TEXT            NOT NULL,   -- PK of the Tier 1 record being patched
                                                    -- TEXT not UUID — IDs vary across Tier 1 tables
    source_table        VARCHAR(32)     NOT NULL,   -- Tier 1 table containing the source record
    field_name          VARCHAR(64)     NOT NULL,   -- field being patched
    check_name          VARCHAR(64)     NOT NULL,   -- check that triggered this patch
    patch_type          VARCHAR(16)     NOT NULL,   -- 'ai_suggested' | 'human_authored'
    patch_status        VARCHAR(16)     NOT NULL DEFAULT 'proposed',
                                                    -- 'proposed' | 'approved' | 'rejected'
    original_value      TEXT            NOT NULL,   -- original field value from Tier 1; always preserved
    patch_value         TEXT,                       -- corrected value; NULL if rejected
    confidence_score    DOUBLE PRECISION,           -- AI confidence 0–1; NULL for human-authored patches
    remediation_actor   VARCHAR(32)     NOT NULL,   -- functional role: 'Program Coordinator' | 'Technology Vendor'
    phenotype           VARCHAR(64),                -- data quality category: 'Invalid Terminology Code' | 'Date Format Error' etc.
    approved_by         VARCHAR(64),                -- user ID of human approver; NULL until approved
    approved_at         TIMESTAMPTZ,                -- NULL until approved
    rejection_reason    TEXT,                       -- reason for rejection; NULL unless rejected
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    organization_id     VARCHAR(16)     NOT NULL,   -- carried for UI filtering and multi-site debugging
    demo_session_id     UUID            NOT NULL,

    CONSTRAINT pk_patch_records PRIMARY KEY (patch_id),
    CONSTRAINT fk_patch_records_session FOREIGN KEY (demo_session_id)
        REFERENCES demo_sessions (session_id),
    CONSTRAINT chk_patch_records_type CHECK (
        patch_type IN ('ai_suggested', 'human_authored')
    ),
    CONSTRAINT chk_patch_records_status CHECK (
        patch_status IN ('proposed', 'approved', 'rejected')
    ),
    CONSTRAINT chk_patch_records_confidence CHECK (
        confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)
    )
);

COMMENT ON TABLE patch_records IS
    'Tier 3b — AI-suggested or human-authored corrections. Human approval required before application. '
    'source_record_id is TEXT (not UUID) because Tier 1 record IDs use different formats across tables. '
    'Raw data is never touched — patch produces a new versioned record used downstream. '
    'Patch ownership: all patches generated and versioned by Program Coordinator infrastructure.';


-- ---------------------------------------------------------------------------
-- 6.1 remediation_work_items
-- For issues that cannot be resolved by AI-assisted patching.
-- Notifications that a stakeholder action is required outside the system.
-- ---------------------------------------------------------------------------
CREATE TABLE remediation_work_items (
    work_item_id        UUID            NOT NULL DEFAULT gen_random_uuid(),
    check_result_id     UUID            NOT NULL,   -- the check failure that triggered this item
    patient_id          VARCHAR(32)     NOT NULL,
    organization_id     VARCHAR(16)     NOT NULL,   -- carried for routing, filtering, UI grouping
    phenotype           VARCHAR(64)     NOT NULL,   -- 'Transmission Failure' | 'Missing Required Covariate' etc.
    use_case_name       VARCHAR(64),                -- use case this work item is blocking; NULL if not use-case-specific
    responsible_role    VARCHAR(32)     NOT NULL,   -- from Remediation Roles and Accountability doc
    action_required     TEXT            NOT NULL,   -- plain language description of action required
    priority            VARCHAR(8)      NOT NULL,   -- 'High' | 'Medium' | 'Low'; inherited from check priority
    status              VARCHAR(16)     NOT NULL DEFAULT 'open',
                                                    -- 'open' | 'in_progress' | 'resolved' | 'escalated'
    resolved_at         TIMESTAMPTZ,                -- NULL until resolved
    resolution_notes    TEXT,                       -- how the issue was resolved
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    demo_session_id     UUID            NOT NULL,

    CONSTRAINT pk_remediation_work_items PRIMARY KEY (work_item_id),
    CONSTRAINT fk_remediation_work_items_session FOREIGN KEY (demo_session_id)
        REFERENCES demo_sessions (session_id),
    CONSTRAINT fk_remediation_work_items_check FOREIGN KEY (check_result_id)
        REFERENCES check_results (check_result_id),
    CONSTRAINT chk_remediation_work_items_priority CHECK (
        priority IN ('High', 'Medium', 'Low')
    ),
    CONSTRAINT chk_remediation_work_items_status CHECK (
        status IN ('open', 'in_progress', 'resolved', 'escalated')
    )
);

COMMENT ON TABLE remediation_work_items IS
    'Tier 3c — Work items for issues requiring external stakeholder action (not AI-patchable). '
    'Not patches — notifications that a human outside the system must act. '
    'use_case_name makes routing context explicit for the UI and stakeholder communications. '
    'organization_id carried directly for routing and UI grouping.';
