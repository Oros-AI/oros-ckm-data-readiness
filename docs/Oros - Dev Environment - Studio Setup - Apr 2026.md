# Oros - Dev Environment - Studio Setup - Apr 2026

**Machine:** Mac Studio (oros-studio)  
**Role:** Persistent compute and execution node  
**MacBook:** Control interface and local development  
**Last updated:** 2026-04-05

---

## 1. System Overview

```
MacBook (control)  ──SSH via Tailscale──▶  Mac Studio (execution)
                                                    │
                                          /Volumes/OrosFast (4TB)
                                                    │
                                          workspace/
                                          ├── data/
                                          ├── projects/
                                          └── _ops/
```

**Access:** `ssh studio` from MacBook terminal (Warp)  
**Network:** Ethernet via Netgear switch, 2.5Gb. Tailscale for remote access.  
**Storage:**  
- Internal SSD: macOS + applications only  
- OrosFast (4TB): ALL workspace, repos, datasets, experiments  
- OrosBackup (20TB): Time Machine encrypted backup only  

---

## 2. OrosFast Directory Structure

```
/Volumes/OrosFast/workspace/
├── _ops/
│   └── skills/
│       ├── google-drive-maintenance.SKILL.md
│       └── thread-maintenance.SKILL.md
├── data/
│   └── ckm-readiness/
│       └── synthetic/
│           ├── dataset_a_clean/       ← 10 CSV files, Dataset A
│           ├── dataset_b_buggy/       ← 10 CSV files + bug reconciliation doc
│           └── dataset_c_remediated/  ← 10 CSV files, Dataset C
└── projects/
    └── ckm-readiness/
        ├── migrations/                ← V000–V009 SQL migration files
        └── oros-ckm-data-readiness/   ← anchor repo (cloned from GitHub)
```

---

## 3. Core Tools Installed

### Studio
- macOS (Apple Silicon)
- tmux — persistent terminal sessions (critical for long-running operations)
- Node.js / npm — v25.8.1
- Git — SSH configured for GitHub
- psql (PostgreSQL 18.3 via Homebrew) — Neon database client
- Warp — terminal (Warpify SSH + tmux warpification enabled)
- htop, CleanShot, Rectangle

### MacBook
- Warp — terminal (control interface)
- TablePlus (free) — database GUI
- Cursor — code editor (used for .env file editing)
- CleanShot, Rectangle, Raycast

---

## 4. GitHub Configuration

**Organization:** Oros-AI  
**Anchor repo:** `oros-ckm-data-readiness`  
**Active branch:** `ckm-poc-build` (default branch)  
**Main branch:** `main` — stable releases only, merge at milestones  

**Studio SSH key:** Added to GitHub (dom-oros account) as "oros-studio" on 2026-04-04  
**Key location:** `~/.ssh/id_ed25519` (ed25519 type)

**Clone location:**
```
/Volumes/OrosFast/workspace/projects/ckm-readiness/oros-ckm-data-readiness/
```

**Git identity configured:**
```bash
git config --global user.name "Dominique Pahud"
git config --global user.email "dom@oros.ai"
```

**Access notes:**
- Sivaram has admin access to Oros-AI org — to be reviewed post-build
- Dhaval has access to hdp-poc-backend repo only
- hdp-poc-backend is the reference repo (Sivaram/Dhaval build) — not the anchor

---

## 5. Neon Database

**Project:** ckm-readiness (console.neon.tech)  
**Database:** ckm_readiness  
**Branch:** production (default, active)  
**Plan:** Launch (usage-based, ~$15/month)

**Schema:** 18 tables across 4 tiers, 34 FK constraints, all indexes  
See `Oros - CKM Data Readiness - Data Model.docx` for full schema.

**Connection strings** (stored in 1Password):
- `Neon - ckm_readiness - DIRECT` — direct connection, no pooler. Use for migrations and data loading.
- `Neon - ckm_readiness - Pooler` — pooler connection. Use for app queries.

**Environment variable** (set in `~/.zshrc` on Studio):
```bash
export CKM_DIRECT="postgresql://neondb_owner:PASSWORD@ep-autumn-dream-ad1au28g.c-2.us-east-1.aws.neon.tech/ckm_readiness?sslmode=require&channel_binding=require"
```

**Active demo sessions:**
| Dataset | Session ID | Loaded |
|---------|-----------|--------|
| A | 929ce033-41e7-4516-b70c-240e07257f8d | 2026-04-05 |
| B | a40afd78-0ded-4481-8a7d-04811f4f28ed | 2026-04-05 |
| C | 44ce72be-0629-47ba-bde0-dc52c854536d | 2026-04-05 |

---

## 6. Data Loading Scripts

**Location:** `oros-ckm-data-readiness/scripts/`

**Setup (one time):**
```bash
cd /Volumes/OrosFast/workspace/projects/ckm-readiness/oros-ckm-data-readiness/scripts
npm install
cp .env.example .env
# Edit .env — add CKM_DIRECT and CKM_POOLER from 1Password
```

**Commands:**
```bash
npm run load:a      # Load Dataset A (clean)
npm run load:b      # Load Dataset B (buggy)
npm run load:c      # Load Dataset C (remediated)
npm run reset:all   # Reset all active sessions
npm run reset -- --session <uuid>   # Reset specific session
```

**Always run inside tmux for long operations:**
```bash
tmux new -s ckm-load
# run load command
# Ctrl+B then D to detach
# tmux attach -t ckm-load to reattach
```

---

## 7. Migration Files

**Location:** `/Volumes/OrosFast/workspace/projects/ckm-readiness/migrations/`

| File | Purpose |
|------|---------|
| V000 | Create ckm_readiness database (run against neondb) |
| V001 | Extensions (pgcrypto, pg_trgm) |
| V002 | demo_sessions table |
| V003 | Tier 1 raw tables (v2 — corrected PKs and field widths) |
| V004 | Tier 2 normalized_fields |
| V005 | Tier 3a check_results, variable_readiness_scores |
| V006 | Tier 3b/c patch_records, remediation_work_items |
| V007 | Tier 4 use_case_readiness, fhir_bundles |
| V008 | All indexes |
| V009 | Session-aware FK constraints |
| V010 | Condition module tables (condition_modules, use_case_specifications, use_case_pathway_results) + retrofit CHECK on remediation_work_items.responsible_role |

**To run migrations (full reset):**
```bash
# 1. Drop and recreate database
NEONDB='...' psql "$NEONDB" -c "DROP DATABASE ckm_readiness;"
NEONDB='...' psql "$NEONDB" -c "CREATE DATABASE ckm_readiness;"

# 2. Run migrations
for f in V001 V002 V003 V004 V005 V006 V007 V008 V009 V010; do
  psql "$CKM_DIRECT" -f /Volumes/OrosFast/workspace/projects/ckm-readiness/migrations/${f}__*.sql
  echo "✓ $f done"
done

# 3. Verify
psql "$CKM_DIRECT" -c "\dt"   # Should show 21 tables (18 base + 3 from V010)
```

---

## 8. tmux Usage

tmux keeps processes running on the Studio even if SSH connection drops. Essential for long data loads.

**Key commands:**
```bash
tmux new -s <name>          # Start new session
tmux attach -t <name>       # Reattach to session
tmux ls                     # List sessions
Ctrl+B then D               # Detach (leave running)
Ctrl+C                      # Stop current process
```

**Standard session names:**
- `ckm-load` — data loading operations
- `ckm-score` — scoring engine runs (Step 7)
- `dev` — general development

---

## 9. Warp Configuration

**Warpify SSH Sessions:** Enabled (Studio Warp settings → Warpify → SSH)  
**Use Tmux Warpification:** Enabled  
**Note:** Warp branch indicator not visible inside tmux sessions — expected behavior.

**SSH config** (`~/.ssh/config` on MacBook):
```
Host studio
    HostName oros-studio.tail0dbac1.ts.net
    User dom
```

---

## 10. Key Decisions

- Studio = persistent execution node. MacBook = control interface.
- One anchor repo (`oros-ckm-data-readiness`) on `ckm-poc-build` branch.
- All workspace on OrosFast — nothing mission-critical on internal SSD.
- Direct Neon connection for migrations/loading. Pooler for app queries.
- Always use tmux for operations longer than 5 minutes.
- `.env` never committed to GitHub — credentials in 1Password only.

---

## 11. Next Steps

1. ✅ Schema applied to Neon
2. ✅ All three datasets loaded and verified
3. ⬜ Scoring engine — `scoring/` folder (Step 7)
4. ⬜ Set up Claude Code on Studio for agentic operations
5. ⬜ UI/UX revamp (Step 8)
6. ⬜ Agentic layer — Claude API abstraction (Step 9)
7. ⬜ Vercel deployment (Step 10)
