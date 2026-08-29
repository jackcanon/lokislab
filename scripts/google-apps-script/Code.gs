/**
 * Loki's Lab benchmark review queue automation.
 *
 * Paste this file into the Apps Script project attached to the private
 * Google Form response spreadsheet. Run installOrRepairTrigger once.
 */

const REVIEW_HEADERS = Object.freeze({
  submissionId: 'Submission ID',
  jsonFile: 'Benchmark result JSON',
  status: 'Review Status',
  jsonValidation: 'JSON Validation',
  privacyReview: 'Privacy Review',
  evidenceReview: 'Evidence Review',
  reviewer: 'Reviewer',
  reviewNotes: 'Review Notes',
  lastReviewed: 'Last Reviewed',
  leaderboardReady: 'Leaderboard Ready',
  publicResultUrl: 'Public Result URL'
});

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Loki's Lab")
    .addItem('Validate selected submission', 'validateSelectedSubmission')
    .addItem('Install or repair form trigger', 'installOrRepairTrigger')
    .addToUi();
}

function installOrRepairTrigger() {
  const spreadsheet = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'onBenchmarkFormSubmit')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('onBenchmarkFormSubmit')
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();

  SpreadsheetApp.getUi().alert('The benchmark form trigger is installed.');
}

function onBenchmarkFormSubmit(event) {
  if (!event || !event.range) throw new Error('A spreadsheet form-submit event is required.');
  reviewSubmissionRow_(event.range.getSheet(), event.range.getRow());
}

function validateSelectedSubmission() {
  const range = SpreadsheetApp.getActiveRange();
  if (!range || range.getRow() < 2) {
    SpreadsheetApp.getUi().alert('Select a response row first.');
    return;
  }

  reviewSubmissionRow_(range.getSheet(), range.getRow());
  SpreadsheetApp.getUi().alert(`Row ${range.getRow()} has been checked.`);
}

function reviewSubmissionRow_(sheet, row) {
  const columns = headerMap_(sheet);
  requireColumns_(columns);

  writeReview_(sheet, row, columns, {
    status: 'Validating',
    jsonValidation: 'Pending',
    privacyReview: 'Pending',
    evidenceReview: 'Not requested',
    leaderboardReady: false,
    lastReviewed: new Date()
  });

  const formSubmissionId = String(sheet.getRange(row, columns[REVIEW_HEADERS.submissionId]).getDisplayValue()).trim();
  const duplicateRows = duplicateSubmissionRows_(sheet, columns[REVIEW_HEADERS.submissionId], row, formSubmissionId);
  const errors = [];
  const warnings = [];
  let privacyFlags = [];
  let parsed;

  if (!formSubmissionId) errors.push('The Form submission ID is blank.');
  if (duplicateRows.length) errors.push(`Duplicate submission ID also appears on row(s) ${duplicateRows.join(', ')}.`);

  try {
    const fileCell = sheet.getRange(row, columns[REVIEW_HEADERS.jsonFile]);
    parsed = JSON.parse(loadUploadedJson_(fileCell));
    const result = validateSubmission_(parsed, formSubmissionId);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    privacyFlags = scanPrivacy_(parsed);
  } catch (error) {
    errors.push(error.message);
  }

  const jsonValidation = errors.length ? 'Invalid' : 'Valid';
  const privacyReview = privacyFlags.length ? 'Blocked' : 'Clear';
  const status = errors.length || warnings.length || privacyFlags.length ? 'Under review' : 'Unverified';
  const summary = [
    ...errors.map((message) => `ERROR: ${message}`),
    ...warnings.map((message) => `WARNING: ${message}`),
    ...privacyFlags.map((flag) => `PRIVACY: ${flag.kind} at ${flag.path}`)
  ];

  if (!summary.length) summary.push('Schema-valid, three-run complete, and no obvious private data detected. Manual verification is still required.');

  writeReview_(sheet, row, columns, {
    status,
    jsonValidation,
    privacyReview,
    leaderboardReady: false,
    lastReviewed: new Date()
  });

  sheet.getRange(row, columns[REVIEW_HEADERS.reviewNotes]).setNote(summary.join('\n').slice(0, 5000));
}

function headerMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  return headers.reduce((map, header, index) => {
    if (header) map[header] = index + 1;
    return map;
  }, {});
}

function requireColumns_(columns) {
  const missing = Object.values(REVIEW_HEADERS).filter((header) => !columns[header]);
  if (missing.length) throw new Error(`Missing review column(s): ${missing.join(', ')}`);
}

function writeReview_(sheet, row, columns, values) {
  const mapping = {
    status: REVIEW_HEADERS.status,
    jsonValidation: REVIEW_HEADERS.jsonValidation,
    privacyReview: REVIEW_HEADERS.privacyReview,
    evidenceReview: REVIEW_HEADERS.evidenceReview,
    reviewer: REVIEW_HEADERS.reviewer,
    lastReviewed: REVIEW_HEADERS.lastReviewed,
    leaderboardReady: REVIEW_HEADERS.leaderboardReady,
    publicResultUrl: REVIEW_HEADERS.publicResultUrl
  };

  Object.entries(values).forEach(([key, value]) => {
    if (mapping[key]) sheet.getRange(row, columns[mapping[key]]).setValue(value);
  });
}

function duplicateSubmissionRows_(sheet, column, currentRow, submissionId) {
  if (!submissionId || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, column, sheet.getLastRow() - 1, 1)
    .getDisplayValues()
    .flat()
    .map((value, index) => ({ value: String(value).trim(), row: index + 2 }))
    .filter((entry) => entry.row !== currentRow && entry.value === submissionId)
    .map((entry) => entry.row);
}

function loadUploadedJson_(cell) {
  const richText = cell.getRichTextValue();
  let url = richText && richText.getLinkUrl();

  if (!url && richText) {
    const linkedRun = richText.getRuns().find((run) => run.getLinkUrl());
    if (linkedRun) url = linkedRun.getLinkUrl();
  }

  if (!url) {
    const displayed = String(cell.getDisplayValue()).trim();
    if (/^https?:\/\//i.test(displayed)) url = displayed;
  }

  if (!url) throw new Error('The uploaded JSON file link could not be read.');
  const match = url.match(/[-\w]{25,}/);
  if (!match) throw new Error('The uploaded Google Drive file ID could not be found.');

  const file = DriveApp.getFileById(match[0]);
  if (file.getSize() > 10 * 1024 * 1024) throw new Error('The uploaded file exceeds the 10 MB form limit.');
  return file.getBlob().getDataAsString('UTF-8');
}

function validateSubmission_(data, formSubmissionId) {
  const errors = [];
  const warnings = [];
  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const requiredText = (value, path) => {
    if (typeof value !== 'string' || !value.trim()) errors.push(`${path} must be a non-empty string.`);
  };

  if (!isObject(data)) return { errors: ['The JSON root must be an object.'], warnings };

  const legacyKeys = ['model', 'machine', 'category', 'test_id', 'capable', 'raw_output'];
  if (legacyKeys.every((key) => Object.prototype.hasOwnProperty.call(data, key))) {
    warnings.push('Legacy single-result JSON detected; wrap all three runs in the v1 submission envelope.');
    return { errors, warnings };
  }

  if (data.schema_version !== '1.0') errors.push('schema_version must equal 1.0.');
  requiredText(data.submission_id, 'submission_id');
  if (data.submission_id && data.submission_id !== formSubmissionId) errors.push('The Form submission ID does not match the JSON submission_id.');
  if (!/^LL-[A-Z0-9][A-Z0-9-]{5,63}$/.test(data.submission_id || '')) errors.push('submission_id has an unsupported format.');
  if (!data.created_at || Number.isNaN(Date.parse(data.created_at))) errors.push('created_at must be an ISO 8601 date-time.');

  [['suite', ['id', 'version']], ['harness', ['name', 'version', 'profile']], ['model', ['runtime', 'name', 'version']]]
    .forEach(([group, fields]) => {
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

  if (!Array.isArray(data.runs) || !data.runs.length) {
    errors.push('runs must contain at least one run.');
    return { errors, warnings };
  }

  const runKeys = new Set();
  const counts = {};
  data.runs.forEach((run, index) => {
    const path = `runs[${index}]`;
    if (!isObject(run)) {
      errors.push(`${path} must be an object.`);
      return;
    }
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
    ['macOS user path', /\/Users\/[^/\s]+/i],
    ['Linux user path', /\/home\/[^/\s]+/i],
    ['Windows user path', /[A-Z]:\\Users\\[^\\\s]+/i],
    ['private IPv4 address', /\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3})\b/],
    ['credential-like value', /(?:api[_-]?key|authorization|bearer|password|secret)\s*[:=]\s*[^\s,}]{6,}/i]
  ];

  const visit = (value, path) => {
    if (typeof value === 'string') {
      checks.forEach(([kind, pattern]) => {
        if (pattern.test(value)) flags.push({ path, kind });
      });
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => visit(item, `${path}.${key}`));
    }
  };

  visit(data, '$');
  return flags;
}
