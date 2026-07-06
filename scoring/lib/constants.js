// scoring/lib/constants.js
// Shared constants for the deterministic scoring engine.

// The synthetic dataset's canonical reference date (Synthetic Dataset Spec —
// EHR data spans 2022-01-01 to 2024-12-31; the CGM analysis window ends
// 2024-11-14, the cgm_window_metadata default). All date-anchored checks
// (recency lookbacks, temporal-density windows, qualifying-encounter windows)
// anchor to this date, NEVER to NOW() — the data is historical, so a real-time
// anchor would wrongly find zero recent records. Production replaces this with
// a real evaluation-run date.
export const EVALUATION_DATE = '2024-11-14';
