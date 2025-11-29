# Archia Integration (Draft)

This document describes how the Oros DQ Demo talks to Archia's agentic backend.

## Endpoints (planned)

- `POST /archia/agent`
  - Used for agentic fallback when pipeline steps (Ingestion, Translation, Normalization) encounter errors.

- `POST /archia/query`
  - Used for Ask-Anything NLP analytics in the Analytics step.

Detailed request/response schemas will be added as we finalize each step and analytics behavior.