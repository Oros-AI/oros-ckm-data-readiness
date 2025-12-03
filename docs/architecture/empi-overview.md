# EMPI & Patient Identity Overview (Draft)

## 1. Purpose

This document outlines how Oros will handle **patient identity** across:

- Demo mode (synthetic data only)
- MVP with real HIE data
- Future PHI-enabled AI mode

It focuses on the **Enterprise Master Patient Index (EMPI)** concept and how we manage patient identifiers inside the Oros platform, independently of any single source system (HIE, EHR, registry, etc.).

---

## 2. Key Concepts

### 2.1 EMPI (Enterprise Master Patient Index)

An EMPI is a **canonical, cross-system view of a person**, typically expressed as:

- a **stable internal patient ID** (e.g. `oros_patient_id`)
- a set of **linked source identifiers**:
  - HIE IDs
  - EHR MRNs
  - Registry IDs (e.g., T1DX)
  - Local clinic IDs

### 2.2 Internal Patient ID

Oros maintains its own **internal, stable ID** per patient:

- Does *not* change if:
  - a clinic changes EHR
  - an HIE changes its internal ID scheme
- Is used throughout Oros:
  - for normalized records
  - for enrichment & risk scores
  - for analytics and cohort definitions
  - for agentic insights

We can name this consistently, e.g.:

- `oros_patient_id` (UUID-style, globally unique)

---

## 3. Demo Mode (Synthetic Data Only)

In demo mode:

- All patients are **synthetic**.
- We can safely:
  - Generate simple internal IDs (e.g., `demo-patient-001`, `demo-patient-002`)
  - Ignore complex matching rules
- Identity is **local to the synthetic dataset**:
  - No external HIE or MRN mapping
  - No cross-system record linkage needed

**Goal in demo mode**:  
Exercise the *shape* of EMPI-related tables and flows, not the full matching logic.

---

## 4. MVP Mode (Real HIE Data, Deterministic Only)

When we start ingesting real CCDs from HIEs/clinics:

### 4.1 Inbound Identifiers

Each incoming record may contain:

- HIE-level patient ID(s)
- One or more MRNs (clinic / hospital level)
- Possibly a T1DX or registry ID (future)
- Demographics (name, DOB, sex, address, etc.)

### 4.2 Identity Strategy (First MVP)

For the **first MVP**, we assume:

- One HIE (e.g. LACIE) is the primary source.
- The HIE already performs **patient matching**.
- Oros treats HIE patient ID as the **starting point** and maps it to `oros_patient_id`.

A simple initial strategy:

1. Compute or assign `oros_patient_id` per distinct HIE patient ID.
2. Store **source identifier mappings** in a dedicated table.
3. Use `oros_patient_id` everywhere else in the pipeline and analytics.

### 4.3 Data Model (High-Level)

Proposed tables (conceptual):

- `empi_patient`
  - `oros_patient_id` (PK)
  - person-level demographics (for reference / QA)
  - creation/update timestamps

- `empi_identifier`
  - `id`
  - `oros_patient_id` (FK)
  - `source_system` (e.g., `LACIE`, `CMH_EHR`, `T1DX`)
  - `source_patient_id` (e.g., HIE ID, MRN, registry ID)
  - `status` (active, merged, retired)

- `empi_audit_log` (future)
  - record of merges/splits, manual overrides, and steward decisions

Other tables (e.g. `patient_record`, `enriched_record`) will reference `oros_patient_id`.

---

## 5. Matching Logic & Stewardship

### 5.1 Matching Logic

In early MVP:

- Oros **defers** heavy-duty matching to:
  - the HIE, or
  - an external EMPI service (if one exists)
- Oros assumes upstream patient IDs are already reasonably matched.

Later, we may add:

- Local matching rules (e.g., deterministic + probabilistic)
- Conflict flags (suspected duplicates, suspected splits)
- Hooks for a dedicated EMPI engine (open source or commercial)

### 5.2 Stewardship

Any **manual merges/splits** (if added later) should:

- Be logged in `empi_audit_log`
- Reference:
  - who made the change,
  - why (reason, source),
  - what changed (IDs involved, timestamps)

This becomes important for:

- Governance
- Clinical safety
- Post-hoc analysis of data quality

---

## 6. Relationship to Archia Runtime

### 6.1 Demo Mode

- Archia sees synthetic identifiers (e.g., `demo-patient-001`).
- Identity complexity is not relevant; the focus is on:
  - field-level errors,
  - normalization issues,
  - data quality explanations.

### 6.2 MVP / PHI Mode

When real PHI is involved:

- **All patient identity logic lives inside Oros**, close to Postgres.
- Archia:
  - should not need full PHI for most tasks,
  - may receive only:
    - hashes,
    - internal IDs,
    - or de-identified aggregates.

If we ask Archia to reason about EMPI issues (possible duplicates/merges), the backend must:

- Carefully control what identity attributes are exposed,
- Maintain a strict log of requests/responses for audit.

---

## 7. Where EMPI Fits in the Pipeline

The EMPI layer conceptually sits **between**:

- Ingestion/translation/normalization of individual CCDs, and
- Persistence/enrichment/analytics across patients.

Simplified flow:

1. **Ingest CCD** → parse patient identifiers & demographics.
2. **Resolve to `oros_patient_id`** via EMPI mappings.
3. **Store normalized records** keyed by `oros_patient_id`.
4. **Run enrichment and analytics** on patient-level aggregates.

This ensures:

- All downstream metrics, scores, and cohorts are defined on **stable patient identities**, not transient MRNs/HIE IDs.

---

## 8. Summary

- Demo mode: EMPI is minimal (synthetic IDs), but schema foundation can be exercised.
- MVP: EMPI strategy is **HIE-first**, with `oros_patient_id` as the internal stable key.
- Future: Richer matching, audit logging, and possibly external EMPI engines can be layered on.
- Archia: Primarily operates on **clinical and data quality context**, with minimal exposure to raw patient identifiers, especially in PHI mode.

