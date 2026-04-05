# Persistence Strategy (Draft)

## 1. Current Decision: Neon Postgres for Demo + Early MVP

For the initial demo and early MVP, the Oros pipeline will use **Neon-hosted Postgres** as the primary persistence layer.

**Why Neon?**

- Fully managed Postgres with a simple developer experience  
- Compatible with standard Postgres drivers and ORMs  
- Fast to spin up for demo/dev environments  
- Easy to migrate later to AWS/Azure Postgres (RDS, Aurora, etc.)

The app should treat this simply as “Postgres via `DATABASE_URL`,” not as Neon-specific. That keeps the persistence layer portable.

---

## 2. Demo Mode (Synthetic Data Only)

**Environment assumptions**

- All data flowing through the pipeline is synthetic.  
- No PHI is stored in the database.  
- Archia is allowed to receive full row-level context because it is synthetic.

**Config example**

```
OROS_DATA_ENV=demo
AI_ENABLED=true
DATABASE_URL=postgres://<user>:<password>@<host>/<db>
```

**What we persist in demo mode**

- Raw / translated / normalized / enriched records  
- Data quality scores (PIQI-lite)  
- Analytics summaries  
- Optional:
  - Archia responses  
  - Agentic explanations  
  - Audit logs of agentic interactions  

This mode is optimized for shaping schema, validating query patterns, and tuning UX.

---

## 3. MVP Mode (Real HIE Data, Deterministic Only)

In the first production MVP with real CCD data:

```
OROS_DATA_ENV=prod
AI_ENABLED=false
DATABASE_URL=postgres://<user>:<password>@<host>/<db>
```

**Behavior**

- PHI is stored in Postgres.  
- Pipeline runs *purely deterministically* (no Archia calls).  
- PHI controls include encryption at rest, VPC isolation, IAM, logging.

This gives HIEs a safe MVP while preserving structure for future agentic workflows.

---

## 4. Future: PHI-Enabled AI Mode

Once compliance / BAA is in place:

- `AI_ENABLED=true`  
- Backend mediates all Archia calls  
- Backend filters/de-identifies data before calling Archia  
- Archia responses are logged into Postgres as structured audit entries  

**Important principle:**  
Postgres is the *system of record*.  
Archia is an *analyst*, never silently modifying clinical data.

---

## 5. Schema Considerations (High-Level)

Likely core tables:

- `pipeline_run` – run metadata & versioning  
- `patient_record` – merged, normalized patient-level data  
- `quality_score` – PIQI-lite scoring slices  
- `enriched_record` – derived BMI, risk scores  
- `analytics_snapshot` – precomputed dashboards  
- `agentic_audit_log` – structured AI interactions  

---

## 6. Summary

- **Demo (now):** Neon Postgres + synthetic data → fast iteration, no PHI limits  
- **MVP (next):** Deterministic-only, PHI stored safely, Archia off  
- **Future:** Backend-mediated PHI-safe AI with audit trails  
