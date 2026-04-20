-- =============================================================================
-- V000__create_database.sql
-- RUN THIS FIRST — against the default 'neondb' database connection
-- Creates the ckm_readiness database for the CKM Data Readiness POC
-- =============================================================================
-- 
-- HOW TO RUN:
--   psql '<your-neondb-connection-string>' -f V000__create_database.sql
--
-- After this runs, switch your connection string to use 'ckm_readiness'
-- (replace 'neondb' with 'ckm_readiness' in the connection string)
-- Then run V001 through V008 against that new database.
-- =============================================================================

CREATE DATABASE ckm_readiness;
