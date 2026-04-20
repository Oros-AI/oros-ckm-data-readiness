-- =============================================================================
-- V001__extensions_and_setup.sql
-- RUN AGAINST: ckm_readiness database
-- Enables required PostgreSQL extensions
-- =============================================================================

-- Required for gen_random_uuid() used on all UUID primary keys
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Required for GIN index on fhir_bundles.bundle_content (JSONB full-text search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
