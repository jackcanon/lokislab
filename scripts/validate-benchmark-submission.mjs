#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const file = process.argv[2];

if (!file) {
  console.error('Usage: node scripts/validate-benchmark-submission.mjs <submission.json>');
  process.exit(2);
}

const errors = [];
const warnings = [];
const privacyFlags = [];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const addError = (path, message) => errors.push({ path, message });
const addWarning = (path, message) => warnings.push({ path, message });

function requireObject(value, path) {
  if (!isObject(value)) {
    addError(path, 'must be an object');
    return false;
  }
  return true;
}

function requireString(value, path) {
  if (typeof value !== 'string' || value.trim() === '') {
    addError(path, 'must be a non-empty string');
    return false;
  }
  return true;
}

function requireBoolean(value, path) {
  if (typeof value !== 'boolean') {
    addError(path, 'must be a boolean');
    return false;
  }
  return true;
}

function requireNonNegativeNumber(value, path) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    addError(path, 'must be a finite number greater than or equal to zero');
    return false;
  }
  return true;
}

function requireDateTime(value, path) {
  if (requireString(value, path) && Number.isNaN(Date.parse(value))) {
    addError(path, 'must be an ISO 8601 date-time');
  }
}

function validateScore(value, path, capable, skipped) {
  if (!capable || skipped) {
    if (value !== null) addError(path, 'must be null when the run is not capable or is skipped');
    return;
  }
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    addError(path, 'must be an integer from 1 to 5 for a capable run');
  }
}

function scanPrivacy(value, path = '$') {
  if (typeof value === 'string') {
    const checks = [
      ['email address', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
      ['macOS user path', /\/Users\/[^/\s]+/i],
      ['Linux user path', /\/home\/[^/\s]+/i],
      ['Windows user path', /[A-Z]:\\Users\\[^\\\s]+/i],
      ['private IPv4 address', /\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3})\b/],
      ['credential-like value', /(?:api[_-]?key|authorization|bearer|password|secret)\s*[:=]\s*[^\s,}]{6,}/i]
    ];
    for (const [kind, pattern] of checks) {
      if (pattern.test(value)) privacyFlags.push({ path, kind });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`));
    return;
  }

  if (isObject(value)) {
    for (const [key, item] of Object.entries(value)) scanPrivacy(item, `${path}.${key}`);
  }
}

function looksLikeLegacyResult(value) {
  return isObject(value) && ['model', 'machine', 'category', 'test_id', 'capable', 'raw_output'].every((key) => key in value);
}

function validateSubmission(value) {
  if (!requireObject(value, '$')) return;

  if (looksLikeLegacyResult(value)) {
    addWarning('$', 'legacy single-result JSON detected; wrap all three runs in the v1 submission envelope');
    requireString(value.model, '$.model');
    requireString(value.machine, '$.machine');
    requireString(value.category, '$.category');
    requireString(value.test_id, '$.test_id');
    requireBoolean(value.capable, '$.capable');
    if (typeof value.raw_output !== 'string') addError('$.raw_output', 'must be a string');
    return;
  }

  if (value.schema_version !== '1.0') addError('$.schema_version', 'must equal "1.0"');
  if (requireString(value.submission_id, '$.submission_id') && !/^LL-[A-Z0-9][A-Z0-9-]{5,63}$/.test(value.submission_id)) {
    addError('$.submission_id', 'must start with LL- and contain 6–64 uppercase letters, numbers, or hyphens after the prefix');
  }
  requireDateTime(value.created_at, '$.created_at');

  if (requireObject(value.suite, '$.suite')) {
    requireString(value.suite.id, '$.suite.id');
    requireString(value.suite.version, '$.suite.version');
  }

  if (requireObject(value.harness, '$.harness')) {
    requireString(value.harness.name, '$.harness.name');
    requireString(value.harness.version, '$.harness.version');
    requireString(value.harness.profile, '$.harness.profile');
  }

  if (requireObject(value.system, '$.system')) {
    requireString(value.system.computer_description, '$.system.computer_description');
    if (!['macOS', 'Linux', 'Windows'].includes(value.system.os)) addError('$.system.os', 'must be macOS, Linux, or Windows');
    requireString(value.system.os_version, '$.system.os_version');
    if (!['arm64', 'x86_64'].includes(value.system.architecture)) addError('$.system.architecture', 'must be arm64 or x86_64');
    if (typeof value.system.memory_gb !== 'number' || value.system.memory_gb <= 0) addError('$.system.memory_gb', 'must be greater than zero');
  }

  if (requireObject(value.model, '$.model')) {
    requireString(value.model.runtime, '$.model.runtime');
    requireString(value.model.name, '$.model.name');
    requireString(value.model.version, '$.model.version');
  }

  const configurationTypes = new Set([
    'publisher_recommended',
    'lokis_lab_tuned',
    'custom_quantization',
    'custom_context_or_tools',
    'other_custom'
  ]);
  if (requireObject(value.configuration, '$.configuration')) {
    if (!configurationTypes.has(value.configuration.type)) addError('$.configuration.type', 'is not a supported configuration type');
    requireObject(value.configuration.settings, '$.configuration.settings');
  }

  if (!Array.isArray(value.runs) || value.runs.length === 0) {
    addError('$.runs', 'must contain at least one run');
    return;
  }

  const runKeys = new Set();
  const countsByTest = new Map();

  value.runs.forEach((run, index) => {
    const path = `$.runs[${index}]`;
    if (!requireObject(run, path)) return;
    requireString(run.test_id, `${path}.test_id`);
    requireString(run.category, `${path}.category`);
    if (!Number.isInteger(run.run_number) || run.run_number < 1 || run.run_number > 3) addError(`${path}.run_number`, 'must be 1, 2, or 3');
    requireBoolean(run.capable, `${path}.capable`);
    requireBoolean(run.skipped, `${path}.skipped`);
    validateScore(run.quality, `${path}.quality`, run.capable, run.skipped);
    validateScore(run.accuracy, `${path}.accuracy`, run.capable, run.skipped);
    requireNonNegativeNumber(run.speed_seconds, `${path}.speed_seconds`);
    requireNonNegativeNumber(run.total_wall_seconds, `${path}.total_wall_seconds`);
    if (typeof run.raw_output !== 'string') addError(`${path}.raw_output`, 'must be a string');
    if (typeof run.notes !== 'string') addError(`${path}.notes`, 'must be a string');
    requireDateTime(run.tested_at, `${path}.tested_at`);

    const key = `${run.test_id}#${run.run_number}`;
    if (runKeys.has(key)) addError(path, `duplicates ${key}`);
    runKeys.add(key);
    if (!run.skipped) countsByTest.set(run.test_id, (countsByTest.get(run.test_id) ?? 0) + 1);
  });

  for (const [testId, count] of countsByTest) {
    if (count !== 3) addWarning('$.runs', `test ${testId} has ${count} applicable run(s); official comparisons require exactly 3`);
  }
}

let data;
try {
  data = JSON.parse(await readFile(file, 'utf8'));
} catch (error) {
  console.log(JSON.stringify({ decision: 'invalid', errors: [{ path: '$', message: error.message }], warnings, privacy_flags: privacyFlags }, null, 2));
  process.exit(1);
}

validateSubmission(data);
scanPrivacy(data);

const decision = errors.length > 0
  ? 'invalid'
  : privacyFlags.length > 0
    ? 'privacy_blocked'
    : warnings.length > 0
      ? 'under_review'
      : 'valid';

console.log(JSON.stringify({
  decision,
  schema_version: data?.schema_version ?? null,
  submission_id: data?.submission_id ?? null,
  run_count: Array.isArray(data?.runs) ? data.runs.length : looksLikeLegacyResult(data) ? 1 : 0,
  errors,
  warnings,
  privacy_flags: privacyFlags
}, null, 2));

process.exit(decision === 'valid' ? 0 : decision === 'under_review' ? 3 : 1);
