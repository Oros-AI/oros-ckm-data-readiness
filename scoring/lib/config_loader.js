// scoring/lib/config_loader.js
// Loads condition-module config files into the database at engine startup.
//
// Responsibility (Condition Module Schema §1, §4; ADR Decision 2):
//   - Read conditions/<condition>/<condition>.config.json
//   - Validate structure + canonical enumerations (application layer of the
//     dual-enforcement pattern, Condition Module Schema §3.2 / CLAUDE.md §13)
//   - Write condition_modules + use_case_specifications, with the config
//     sections stored verbatim as JSONB (Schema §4.2)
//
// Idempotent per config PK (condition_id, use_case_name) — NOT session-scoped.
// Config tables persist across demo resets as governance artifacts.
//
// Writes are wrapped in a single transaction: a validation failure (or any DB
// error) rolls the whole load back, so a bad config never leaves a
// half-populated config layer.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default conditions/ at repo root; overridable for testing.
const CONDITIONS_DIR = process.env.CKM_CONDITIONS_DIR
  ? path.resolve(process.env.CKM_CONDITIONS_DIR)
  : path.resolve(__dirname, '../../conditions');

// Built check implementations live here; a referenced check with no file yet
// is a warning (the checks land in 7d–7f), never a hard error.
const CHECKS_DIR = path.resolve(__dirname, '../checks');

// ---------------------------------------------------------------------------
// Canonical enumerations — MUST mirror the V010 CHECK lists exactly.
//   USE_CASE_CATEGORY  → ck_use_case_specifications_category
//   PATHWAY_RESULT     → ck_use_case_pathway_results_pathway_result
//   RESPONSIBLE_ROLE   → ck_remediation_work_items_responsible_role
// PRIORITY has no DB CHECK (used as a score weight) but is validated here per
// the locked 7b decision. If any V010 list changes, change it here too.
// ---------------------------------------------------------------------------
const SUPPORTED_SCHEMA_VERSION = '0.1';

const USE_CASE_CATEGORY = ['risk_stratification', 'care_coordination_delivery', 'vbc_reporting'];
const PATHWAY_RESULT = ['primary_pass', 'fallback_pass', 'no_valid_pathway'];
const RESPONSIBLE_ROLE = [
  'Primary Care Site',
  'Specialty Partner',
  'Regional Data Node',
  'Technology Vendor',
  'Program Coordinator',
  'Network/Payer',
  'Policy/Regulatory',
];
const PRIORITY = ['High', 'Medium', 'Low'];

// computation is OPTIONAL: absent computation = boolean/pathway-only module;
// readiness derives from pathway results alone, no continuous score
// (7c finding, 2026-07-06).
const USE_CASE_SECTIONS = [
  'population_definition',
  'variable_pathways',
  'variables',
  'output_definition',
];

class ConfigValidationError extends Error {
  constructor(messages) {
    super(`Config validation failed (${messages.length} issue(s)):\n  - ${messages.join('\n  - ')}`);
    this.name = 'ConfigValidationError';
    this.messages = messages;
  }
}

// Located prefix: [condition › use_case › check › field]
function loc(parts) {
  return `[${parts.filter((p) => p !== undefined && p !== null && p !== '').join(' › ')}]`;
}

function checkEnum(value, allowed, parts, errors) {
  if (!allowed.includes(value)) {
    errors.push(`${loc(parts)} invalid value ${JSON.stringify(value)} — allowed: ${allowed.join(', ')}`);
  }
}

function requireField(obj, field, parts, errors) {
  if (obj == null || obj[field] === undefined || obj[field] === null) {
    errors.push(`${loc([...parts, field])} missing required field`);
    return false;
  }
  return true;
}

function validateCheck(chk, parentParts, errors, warnings) {
  const checkName = chk?.check_name ?? '(unnamed check)';
  const p = [...parentParts, checkName];

  if (requireField(chk, 'check_name', parentParts, errors)) {
    // Unbuilt-check reference → warning (implementations arrive in 7d–7f).
    const file = path.join(CHECKS_DIR, `${chk.check_name}.js`);
    if (!fs.existsSync(file)) {
      warnings.push(
        `${loc(p)} references check "${chk.check_name}" with no implementation yet ` +
          `(scoring/checks/${chk.check_name}.js) — expected until 7d–7f`,
      );
    }
  }

  if (requireField(chk, 'priority', p, errors)) {
    checkEnum(chk.priority, PRIORITY, [...p, 'priority'], errors);
  }

  const role = chk?.remediation_defaults?.responsible_role;
  if (role === undefined || role === null) {
    errors.push(`${loc([...p, 'remediation_defaults', 'responsible_role'])} missing required field`);
  } else {
    checkEnum(role, RESPONSIBLE_ROLE, [...p, 'remediation_defaults', 'responsible_role'], errors);
  }
}

/**
 * Validate one parsed config. Throws ConfigValidationError listing every
 * located problem found. Returns { warnings } on success.
 */
function validateConfig(config, fileName) {
  const errors = [];
  const warnings = [];
  const conditionId = config?.condition?.condition_id ?? `(file ${fileName})`;

  // schema_version mismatch → fail loud; the rest of the shape assumes 0.1.
  if (config?.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    throw new ConfigValidationError([
      `${loc([conditionId, 'schema_version'])} unsupported schema_version ` +
        `${JSON.stringify(config?.schema_version)} — this loader supports only ` +
        `"${SUPPORTED_SCHEMA_VERSION}"`,
    ]);
  }

  if (requireField(config, 'condition', [conditionId], errors) && config.condition) {
    requireField(config.condition, 'condition_id', [conditionId], errors);
    requireField(config.condition, 'display_name', [conditionId], errors);
  }

  if (!Array.isArray(config.use_cases) || config.use_cases.length === 0) {
    errors.push(`${loc([conditionId, 'use_cases'])} must be a non-empty array`);
  } else {
    for (const uc of config.use_cases) {
      const ucName = uc?.use_case_name ?? '(unnamed use case)';
      const p = [conditionId, ucName];

      requireField(uc, 'use_case_name', p, errors);
      requireField(uc, 'display_name', p, errors);
      if (requireField(uc, 'use_case_category', p, errors)) {
        checkEnum(uc.use_case_category, USE_CASE_CATEGORY, [...p, 'use_case_category'], errors);
      }
      for (const section of USE_CASE_SECTIONS) {
        requireField(uc, section, p, errors);
      }

      const resultValues = uc?.variable_pathways?.result_values;
      if (Array.isArray(resultValues)) {
        resultValues.forEach((v) =>
          checkEnum(v, PATHWAY_RESULT, [...p, 'variable_pathways', 'result_values'], errors),
        );
      }

      if (Array.isArray(uc.eligibility_checks)) {
        for (const chk of uc.eligibility_checks) validateCheck(chk, p, errors, warnings);
      }

      if (Array.isArray(uc.variables)) {
        for (const v of uc.variables) {
          const vName = v?.variable_name ?? '(unnamed variable)';
          if (Array.isArray(v.checks)) {
            for (const chk of v.checks) validateCheck(chk, [...p, vName], errors, warnings);
          }
        }
      }
    }
  }

  if (errors.length) throw new ConfigValidationError(errors);
  return { warnings };
}

function discoverConfigFiles() {
  if (!fs.existsSync(CONDITIONS_DIR)) {
    throw new Error(`Conditions directory not found: ${CONDITIONS_DIR}`);
  }
  const files = [];
  for (const entry of fs.readdirSync(CONDITIONS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(CONDITIONS_DIR, entry.name);
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.config.json')) files.push(path.join(dir, f));
    }
  }
  return files.sort();
}

function parseConfig(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read config file ${file}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Malformed JSON in ${file}: ${err.message}`);
  }
}

// Upserts use ON CONFLICT (PK) DO UPDATE rather than DELETE+INSERT: the
// use_case_specifications → condition_modules FK is ON DELETE RESTRICT, so
// deleting the parent on reload would be refused while child rows exist.
async function upsertConditionModule(client, config) {
  const c = config.condition;
  await client.query(
    `INSERT INTO condition_modules
       (condition_id, display_name, description, schema_version, config_json, loaded_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
     ON CONFLICT (condition_id) DO UPDATE SET
       display_name   = EXCLUDED.display_name,
       description    = EXCLUDED.description,
       schema_version = EXCLUDED.schema_version,
       config_json    = EXCLUDED.config_json,
       loaded_at      = EXCLUDED.loaded_at`,
    [c.condition_id, c.display_name, c.description ?? null, config.schema_version, JSON.stringify(config)],
  );
}

async function upsertUseCaseSpec(client, conditionId, uc) {
  await client.query(
    `INSERT INTO use_case_specifications
       (use_case_name, condition_id, use_case_category, display_name,
        population_definition, variable_pathways, variables, computation, output_definition, loaded_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, NOW())
     ON CONFLICT (use_case_name) DO UPDATE SET
       condition_id          = EXCLUDED.condition_id,
       use_case_category     = EXCLUDED.use_case_category,
       display_name          = EXCLUDED.display_name,
       population_definition = EXCLUDED.population_definition,
       variable_pathways     = EXCLUDED.variable_pathways,
       variables             = EXCLUDED.variables,
       computation           = EXCLUDED.computation,
       output_definition     = EXCLUDED.output_definition,
       loaded_at             = EXCLUDED.loaded_at`,
    [
      uc.use_case_name,
      conditionId,
      uc.use_case_category,
      uc.display_name,
      JSON.stringify(uc.population_definition),
      JSON.stringify(uc.variable_pathways),
      JSON.stringify(uc.variables),
      JSON.stringify(uc.computation),
      JSON.stringify(uc.output_definition),
    ],
  );
}

// Remove use-case rows for this condition that are no longer in the config
// (e.g. a use case was deleted from an edited config). Keeps reload faithful.
async function removeStaleUseCases(client, conditionId, currentUseCaseNames) {
  await client.query(
    'DELETE FROM use_case_specifications WHERE condition_id = $1 AND use_case_name <> ALL($2::text[])',
    [conditionId, currentUseCaseNames],
  );
}

/**
 * Discover, validate, and load all condition-module configs. All writes happen
 * in a single transaction; a validation failure on any file rolls the whole
 * load back (all-or-nothing). Returns { summary, warnings }.
 */
export async function loadConfigs({ verbose = true } = {}) {
  const files = discoverConfigFiles();
  if (files.length === 0) {
    throw new Error(`No *.config.json files found under ${CONDITIONS_DIR}`);
  }

  const allWarnings = [];
  const summary = [];

  await withTransaction(async (client) => {
    for (const file of files) {
      const config = parseConfig(file);
      const { warnings } = validateConfig(config, path.basename(file)); // throws → rollback
      allWarnings.push(...warnings);

      await upsertConditionModule(client, config);
      const useCaseNames = config.use_cases.map((u) => u.use_case_name);
      await removeStaleUseCases(client, config.condition.condition_id, useCaseNames);
      for (const uc of config.use_cases) {
        await upsertUseCaseSpec(client, config.condition.condition_id, uc);
      }
      summary.push({
        file: path.relative(CONDITIONS_DIR, file),
        conditionId: config.condition.condition_id,
        useCases: config.use_cases.map((u) => u.use_case_name),
      });
    }
  });

  if (verbose) {
    for (const w of allWarnings) console.warn(`  ⚠  ${w}`);
    for (const s of summary) {
      console.log(`  ✓  ${s.conditionId} (${s.file}) → use cases: ${s.useCases.join(', ')}`);
    }
  }
  return { summary, warnings: allWarnings };
}

// Run directly:  node scoring/lib/config_loader.js   (or: npm run load:config)
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  console.log('\n  CKM Config Loader');
  console.log('  =================');
  console.log(`  Source: ${CONDITIONS_DIR}\n`);
  loadConfigs()
    .then(async () => {
      console.log('\n  ✅ Config load complete.\n');
      await pool.end();
    })
    .catch(async (err) => {
      console.error('\n  ❌ Config load failed — no changes written (transaction rolled back).');
      console.error(`\n${err.message}\n`);
      await pool.end().catch(() => {});
      process.exit(1);
    });
}
