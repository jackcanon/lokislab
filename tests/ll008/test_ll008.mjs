// LL-008 verification: execute the ACTUAL review-queue logic from Code.gs
// against sample submissions. Apps Script-specific globals (SpreadsheetApp etc.)
// are only used inside trigger functions; the pure validators below are copied
// verbatim from scripts/google-apps-script/Code.gs and run in Node.

// ---- verbatim extraction from Code.gs ----
function validateSubmission_(data, formSubmissionId) {
  const errors = [];
  const warnings = [];
  const isObject = (value) =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
  const requiredText = (value, path) => {
    if (typeof value !== 'string' || !value.trim())
      errors.push(`${path} must be a non-empty string.`);
  };
  if (!isObject(data))
    return { errors: ['The JSON root must be an object.'], warnings };
  const legacyKeys = ['model', 'machine', 'category', 'test_id', 'capable', 'raw_output'];
  if (legacyKeys.every((key) => Object.prototype.hasOwnProperty.call(data, key))) {
    warnings.push('Legacy single-result JSON detected; wrap all three runs in the v1 submission envelope.');
    return { errors, warnings };
  }
  if (data.schema_version !== '1.0') errors.push('schema_version must equal 1.0.');
  requiredText(data.submission_id, 'submission_id');
  if (data.submission_id && data.submission_id !== formSubmissionId)
    errors.push('The Form submission ID does not match the JSON submission_id.');
  if (!/^LL-[A-Z0-9][A-Z0-9-]{5,63}$/.test(data.submission_id || ''))
    errors.push('submission_id has an unsupported format.');
  if (!data.created_at || Number.isNaN(Date.parse(data.created_at)))
    errors.push('created_at must be an ISO 8601 date-time.');
  [['suite', ['id', 'version']], ['harness', ['name', 'version', 'profile']], ['model', ['runtime', 'name', 'version']]].forEach(([group, fields]) => {
    if (!isObject(data[group])) errors.push(`${group} must be an object.`);
    else fields.forEach((field) => requiredText(data[group][field], `${group}.${field}`));
  });
  if (!isObject(data.system)) errors.push('system must be an object.');
  else {
    requiredText(data.system.computer_description, 'system.computer_description');
    requiredText(data.system.os_version, 'system.os_version');
    if (!['macOS', 'Linux', 'Windows'].includes(data.system.os)) errors.push('system.os must be macOS, Linux, or Windows.');
    if (!['arm64', 'x86_64'].includes(data.system.architecture)) errors.push('system.architecture must be arm64 or x86_64.');
    if (!(typeof data.system.memory_gb === 'number' && data.system.memory_gb > 0)) errors.push('system.memory_gb must be greater than zero.');
  }
  const configTypes = ['publisher_recommended', 'lokis_lab_tuned', 'custom_quantization', 'custom_context_or_tools', 'other_custom'];
  if (!isObject(data.configuration)) errors.push('configuration must be an object.');
  else {
    if (!configTypes.includes(data.configuration.type)) errors.push('configuration.type is not supported.');
    if (!isObject(data.configuration.settings)) errors.push('configuration.settings must be an object.');
  }
  if (!Array.isArray(data.runs) || !data.runs.length) { errors.push('runs must contain at least one run.'); return { errors, warnings }; }
  const runKeys = new Set();
  const counts = {};
  data.runs.forEach((run, index) => {
    const path = `runs[${index}]`;
    if (!isObject(run)) { errors.push(`${path} must be an object.`); return; }
    requiredText(run.test_id, `${path}.test_id`);
    requiredText(run.category, `${path}.category`);
    if (![1, 2, 3].includes(run.run_number)) errors.push(`${path}.run_number must be 1, 2, or 3.`);
    if (typeof run.capable !== 'boolean') errors.push(`${path}.capable must be a boolean.`);
    if (typeof run.skipped !== 'boolean') errors.push(`${path}.skipped must be a boolean.`);
    ['speed_seconds', 'total_wall_seconds'].forEach((field) => {
      if (!(typeof run[field] === 'number' && Number.isFinite(run[field]) && run[field] >= 0)) errors.push(`${path}.${field} must be non-negative.`);
    });
    ['quality', 'accuracy'].forEach((field) => {
      const score = run[field];
      if (run.capable && !run.skipped && !(Number.isInteger(score) && score >= 1 && score <= 5)) errors.push(`${path}.${field} must be 1–5 for a capable run.`);
      if ((!run.capable || run.skipped) && score !== null) errors.push(`${path}.${field} must be null when incapable or skipped.`);
    });
    if (typeof run.raw_output !== 'string') errors.push(`${path}.raw_output must be a string.`);
    if (typeof run.notes !== 'string') errors.push(`${path}.notes must be a string.`);
    if (!run.tested_at || Number.isNaN(Date.parse(run.tested_at))) errors.push(`${path}.tested_at must be an ISO 8601 date-time.`);
    const key = `${run.test_id}#${run.run_number}`;
    if (runKeys.has(key)) errors.push(`${path} duplicates ${key}.`);
    runKeys.add(key);
    if (!run.skipped) counts[run.test_id] = (counts[run.test_id] || 0) + 1;
  });
  Object.entries(counts).forEach(([testId, count]) => {
    if (count !== 3) warnings.push(`Test ${testId} has ${count} applicable run(s); official comparisons require exactly 3.`);
  });
  return { errors, warnings };
}

function scanPrivacy_(data) {
  const flags = [];
  const checks = [
    ['email address', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
    ['macOS user path', /\/Users\/[^\/\s]+/i],
    ['Linux user path', /\/home\/[^\/\s]+/i],
    ['Windows user path', /[A-Z]:\\Users\\[^\\\s]+/i],
    ['private IPv4 address', /\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3})\b/],
    ['credential-like value', /(?:api[_-]?key|authorization|bearer|password|secret)\s*[:=]\s*[^\s,}]{6,}/i],
  ];
  const visit = (value, path) => {
    if (typeof value === 'string') {
      checks.forEach(([kind, pattern]) => { if (pattern.test(value)) flags.push({ path, kind }); });
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => visit(item, `${path}.${key}`));
    }
  };
  visit(data, '$');
  return flags;
}

function publicationGate_(rowValues, columns) {
  const value = (header) => String(rowValues[columns[header] - 1] || '').trim();
  const PUBLIC_STATUSES = ['Unverified', 'Verified'];
  const PUBLIC_EVIDENCE_STATES = ['Not requested', 'Accepted'];
  const status = value('Review Status');
  const reasons = [];
  if (!PUBLIC_STATUSES.includes(status)) reasons.push('status');
  if (value('JSON Validation') !== 'Valid') reasons.push('json');
  if (value('Privacy Review') !== 'Clear') reasons.push('privacy');
  if (!PUBLIC_EVIDENCE_STATES.includes(value('Evidence Review'))) reasons.push('evidence');
  if (value('Leaderboard Ready').toUpperCase() !== 'TRUE') reasons.push('leaderboard_ready');
  return { allowed: reasons.length === 0, status, reasons };
}
// ---- end verbatim extraction ----

// ---- sample submissions ----
import { readFileSync } from 'node:fs';
const clean = JSON.parse(readFileSync(new URL('./sample_clean.json', import.meta.url), 'utf8'));
const leaky = JSON.parse(readFileSync(new URL('./sample_leaky.json', import.meta.url), 'utf8'));

const results = [];
function check(name, cond) { results.push([name, cond]); }

// 1) clean sample validates
const r1 = validateSubmission_(clean, clean.submission_id);
check('clean: schema valid (no errors)', r1.errors.length === 0);
const p1 = scanPrivacy_(clean);
check('clean: no privacy flags', p1.length === 0);

// 2) leaky sample caught
const r2 = validateSubmission_(leaky, leaky.submission_id);
const p2 = scanPrivacy_(leaky);
check('leaky: privacy flags detected', p2.length > 0);
check('leaky: email address flagged', p2.some(f => f.kind === 'email address'));
check('leaky: macOS user path flagged', p2.some(f => f.kind === 'macOS user path'));

// 3) publication gate cannot be satisfied by script alone (leaderboardReady stays false)
// Simulating a reviewed row where a human has set everything except the script never sets Leaderboard Ready.
const columns = { 'Review Status': 1, 'JSON Validation': 2, 'Privacy Review': 3, 'Evidence Review': 4, 'Leaderboard Ready': 5 };
const reviewedRow = ['Verified', 'Valid', 'Clear', 'Accepted', 'FALSE']; // script writes FALSE here
const gate = publicationGate_(reviewedRow, columns);
check('gate: blocked when Leaderboard Ready=FALSE (script cannot grant it)', gate.allowed === false && gate.reasons.includes('leaderboard_ready'));

// ---- report ----
let pass = 0;
for (const [n, c] of results) { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}`); if (c) pass++; }
console.log(`\nLL-008 logic checks: ${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
