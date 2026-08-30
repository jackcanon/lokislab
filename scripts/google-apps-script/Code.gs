/**
 * Loki's Lab benchmark review queue automation.
 *
 * Paste this file into the Apps Script project attached to the private
 * Google Form response spreadsheet. Run installOrRepairTrigger once.
 */

const REVIEW_SPREADSHEET_ID = '1z-4dsjSnQcXDymM8Aso2JtPQ3DgCG97CW8n9qAGhtzU';
const REVIEW_SHEET_NAME = 'Form Responses 1';
const PUBLIC_FEED_VERSION = '1.0';

const REVIEW_HEADERS = Object.freeze({
  submissionId: 'Submission ID',
  contributorName: 'Contributor name (optional)',
  jsonFile: 'Benchmark result JSON',
  status: 'Review Status',
  jsonValidation: 'JSON Validation',
  privacyReview: 'Privacy Review',
  evidenceReview: 'Evidence Review',
  reviewer: 'Reviewer',
  reviewNotes: 'Review Notes',
  lastReviewed: 'Last Reviewed',
  leaderboardReady: 'Leaderboard Ready',
  publicResultUrl: 'Public Result URL',
});

const PUBLIC_STATUSES = Object.freeze(['Unverified', 'Verified']);
const PUBLIC_EVIDENCE_STATES = Object.freeze(['Not requested', 'Accepted']);

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
    .filter(
      (trigger) => trigger.getHandlerFunction() === 'onBenchmarkFormSubmit',
    )
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('onBenchmarkFormSubmit')
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();

  console.log('The benchmark form trigger is installed.');
}

function onBenchmarkFormSubmit(event) {
  if (!event || !event.range)
    throw new Error('A spreadsheet form-submit event is required.');
  reviewSubmissionRow_(event.range.getSheet(), event.range.getRow());
}

/**
 * Public, read-only leaderboard endpoint for the website.
 *
 * Deploy this project as a web app that executes as the owner. The response is
 * an allowlisted projection: it never includes email, timestamps, internal
 * review notes, private evidence links, or raw benchmark output.
 */
function doGet() {
  try {
    return jsonResponse_(buildPublicLeaderboardFeed_());
  } catch (error) {
    console.error(error);
    return jsonResponse_({
      feed_version: PUBLIC_FEED_VERSION,
      generated_at: new Date().toISOString(),
      entries: [],
      error: 'Leaderboard feed is temporarily unavailable.',
    });
  }
}

function previewPublicLeaderboardFeed() {
  const feed = buildPublicLeaderboardFeed_();
  console.log(JSON.stringify(feed, null, 2));
  return `Public leaderboard contains ${feed.entries.length} eligible entr${feed.entries.length === 1 ? 'y' : 'ies'}.`;
}

function buildPublicLeaderboardFeed_() {
  const spreadsheet = SpreadsheetApp.openById(REVIEW_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(REVIEW_SHEET_NAME);
  if (!sheet)
    throw new Error(`Review sheet ${REVIEW_SHEET_NAME} was not found.`);

  const columns = headerMap_(sheet);
  requireColumns_(columns);
  const entries = [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return emptyPublicLeaderboardFeed_();
  const rows = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getDisplayValues();

  rows.forEach((rowValues, index) => {
    const row = index + 2;
    const formSubmissionId = displayValue_(
      rowValues,
      columns,
      REVIEW_HEADERS.submissionId,
    );
    if (!formSubmissionId) return;

    const gate = publicationGate_(rowValues, columns);
    if (!gate.allowed) return;

    try {
      const parsed = JSON.parse(
        loadUploadedJson_(
          sheet.getRange(row, columns[REVIEW_HEADERS.jsonFile]),
        ),
      );
      const validation = validateSubmission_(parsed, formSubmissionId);
      const privacyFlags = scanPrivacy_(parsed);

      // Publication re-validates the file instead of trusting review cells alone.
      if (
        validation.errors.length ||
        validation.warnings.length ||
        privacyFlags.length
      ) {
        console.warn(`Row ${row} was excluded by publication-time validation.`);
        return;
      }

      entries.push(publicLeaderboardEntry_(rowValues, columns, parsed));
    } catch (error) {
      console.warn(
        `Row ${row} was excluded because its public projection failed: ${error.message}`,
      );
    }
  });

  entries.sort(
    (left, right) =>
      right.score - left.score ||
      left.median_seconds - right.median_seconds ||
      left.submission_id.localeCompare(right.submission_id),
  );

  return {
    feed_version: PUBLIC_FEED_VERSION,
    generated_at: new Date().toISOString(),
    suite_comparability:
      'Entries must be filtered to the same suite ID and version before comparison.',
    entries,
  };
}

function publicationGate_(rowValues, columns) {
  const value = (header) => displayValue_(rowValues, columns, header);
  const status = value(REVIEW_HEADERS.status);
  const reasons = [];

  if (!PUBLIC_STATUSES.includes(status)) reasons.push('status');
  if (value(REVIEW_HEADERS.jsonValidation) !== 'Valid') reasons.push('json');
  if (value(REVIEW_HEADERS.privacyReview) !== 'Clear') reasons.push('privacy');
  if (!PUBLIC_EVIDENCE_STATES.includes(value(REVIEW_HEADERS.evidenceReview)))
    reasons.push('evidence');
  if (value(REVIEW_HEADERS.leaderboardReady).toUpperCase() !== 'TRUE')
    reasons.push('leaderboard_ready');

  return { allowed: reasons.length === 0, status, reasons };
}

function publicLeaderboardEntry_(rowValues, columns, data) {
  const applicableRuns = data.runs.filter((run) => !run.skipped);
  if (!applicableRuns.length)
    throw new Error('No applicable runs are available.');

  const tests = applicableRuns.reduce((groups, run) => {
    groups[run.test_id] = groups[run.test_id] || [];
    groups[run.test_id].push(run);
    return groups;
  }, {});
  const testGroups = Object.values(tests);
  const runScores = applicableRuns.map((run) =>
    run.capable ? ((run.quality + run.accuracy) / 10) * 100 : 0,
  );
  const medianSeconds = median_(applicableRuns.map((run) => run.speed_seconds));
  const publicResultUrl = displayValue_(
    rowValues,
    columns,
    REVIEW_HEADERS.publicResultUrl,
  );

  return {
    submission_id: data.submission_id,
    contributor:
      displayValue_(rowValues, columns, REVIEW_HEADERS.contributorName) || null,
    verification_status: displayValue_(
      rowValues,
      columns,
      REVIEW_HEADERS.status,
    ),
    suite: { id: data.suite.id, version: data.suite.version },
    harness: {
      name: data.harness.name,
      version: data.harness.version,
      profile: data.harness.profile,
    },
    system: {
      computer_description: data.system.computer_description,
      os: data.system.os,
      os_version: data.system.os_version,
      architecture: data.system.architecture,
      cpu: data.system.cpu || null,
      gpu: data.system.gpu || null,
      memory_gb: data.system.memory_gb,
    },
    model: {
      runtime: data.model.runtime,
      name: data.model.name,
      version: data.model.version,
    },
    configuration: {
      type: data.configuration.type,
      label: configurationLabel_(data.configuration.type),
    },
    score: Math.round(
      runScores.reduce((sum, score) => sum + score, 0) / runScores.length,
    ),
    passed: testGroups.filter(
      (runs) => runs.length === 3 && runs.every((run) => run.capable),
    ).length,
    total: testGroups.length,
    median_seconds: Math.round(medianSeconds * 10) / 10,
    public_result_url: /^https?:\/\//i.test(publicResultUrl)
      ? publicResultUrl
      : null,
  };
}

function displayValue_(rowValues, columns, header) {
  return String(rowValues[columns[header] - 1] || '').trim();
}

function emptyPublicLeaderboardFeed_() {
  return {
    feed_version: PUBLIC_FEED_VERSION,
    generated_at: new Date().toISOString(),
    suite_comparability:
      'Entries must be filtered to the same suite ID and version before comparison.',
    entries: [],
  };
}

function configurationLabel_(type) {
  return (
    {
      publisher_recommended: 'Publisher recommended',
      lokis_lab_tuned: "Loki's Lab tuned",
      custom_quantization: 'Custom quantization',
      custom_context_or_tools: 'Custom context or tools',
      other_custom: 'Other custom configuration',
    }[type] || 'Custom configuration'
  );
}

function median_(values) {
  const sorted = values.slice().sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
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
    lastReviewed: new Date(),
  });

  const formSubmissionId = String(
    sheet.getRange(row, columns[REVIEW_HEADERS.submissionId]).getDisplayValue(),
  ).trim();
  const duplicateRows = duplicateSubmissionRows_(
    sheet,
    columns[REVIEW_HEADERS.submissionId],
    row,
    formSubmissionId,
  );
  const errors = [];
  const warnings = [];
  let privacyFlags = [];
  let parsed;

  if (!formSubmissionId) errors.push('The Form submission ID is blank.');
  if (duplicateRows.length)
    errors.push(
      `Duplicate submission ID also appears on row(s) ${duplicateRows.join(', ')}.`,
    );

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
  const status =
    errors.length || warnings.length || privacyFlags.length
      ? 'Under review'
      : 'Unverified';
  const summary = [
    ...errors.map((message) => `ERROR: ${message}`),
    ...warnings.map((message) => `WARNING: ${message}`),
    ...privacyFlags.map((flag) => `PRIVACY: ${flag.kind} at ${flag.path}`),
  ];

  if (!summary.length)
    summary.push(
      'Schema-valid, three-run complete, and no obvious private data detected. Manual verification is still required.',
    );

  writeReview_(sheet, row, columns, {
    status,
    jsonValidation,
    privacyReview,
    leaderboardReady: false,
    lastReviewed: new Date(),
  });

  sheet
    .getRange(row, columns[REVIEW_HEADERS.reviewNotes])
    .setNote(summary.join('\n').slice(0, 5000));
}

function headerMap_(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  return headers.reduce((map, header, index) => {
    if (header) map[header] = index + 1;
    return map;
  }, {});
}

function requireColumns_(columns) {
  const missing = Object.values(REVIEW_HEADERS).filter(
    (header) => !columns[header],
  );
  if (missing.length)
    throw new Error(`Missing review column(s): ${missing.join(', ')}`);
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
    publicResultUrl: REVIEW_HEADERS.publicResultUrl,
  };

  Object.entries(values).forEach(([key, value]) => {
    if (mapping[key])
      sheet.getRange(row, columns[mapping[key]]).setValue(value);
  });
}

function duplicateSubmissionRows_(sheet, column, currentRow, submissionId) {
  if (!submissionId || sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, column, sheet.getLastRow() - 1, 1)
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
  if (!match)
    throw new Error('The uploaded Google Drive file ID could not be found.');

  const file = DriveApp.getFileById(match[0]);
  if (file.getSize() > 10 * 1024 * 1024)
    throw new Error('The uploaded file exceeds the 10 MB form limit.');
  return file.getBlob().getDataAsString('UTF-8');
}

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

  const legacyKeys = [
    'model',
    'machine',
    'category',
    'test_id',
    'capable',
    'raw_output',
  ];
  if (
    legacyKeys.every((key) => Object.prototype.hasOwnProperty.call(data, key))
  ) {
    warnings.push(
      'Legacy single-result JSON detected; wrap all three runs in the v1 submission envelope.',
    );
    return { errors, warnings };
  }

  if (data.schema_version !== '1.0')
    errors.push('schema_version must equal 1.0.');
  requiredText(data.submission_id, 'submission_id');
  if (data.submission_id && data.submission_id !== formSubmissionId)
    errors.push(
      'The Form submission ID does not match the JSON submission_id.',
    );
  if (!/^LL-[A-Z0-9][A-Z0-9-]{5,63}$/.test(data.submission_id || ''))
    errors.push('submission_id has an unsupported format.');
  if (!data.created_at || Number.isNaN(Date.parse(data.created_at)))
    errors.push('created_at must be an ISO 8601 date-time.');

  [
    ['suite', ['id', 'version']],
    ['harness', ['name', 'version', 'profile']],
    ['model', ['runtime', 'name', 'version']],
  ].forEach(([group, fields]) => {
    if (!isObject(data[group])) errors.push(`${group} must be an object.`);
    else
      fields.forEach((field) =>
        requiredText(data[group][field], `${group}.${field}`),
      );
  });

  if (!isObject(data.system)) errors.push('system must be an object.');
  else {
    requiredText(
      data.system.computer_description,
      'system.computer_description',
    );
    requiredText(data.system.os_version, 'system.os_version');
    if (!['macOS', 'Linux', 'Windows'].includes(data.system.os))
      errors.push('system.os must be macOS, Linux, or Windows.');
    if (!['arm64', 'x86_64'].includes(data.system.architecture))
      errors.push('system.architecture must be arm64 or x86_64.');
    if (
      !(typeof data.system.memory_gb === 'number' && data.system.memory_gb > 0)
    )
      errors.push('system.memory_gb must be greater than zero.');
  }

  const configTypes = [
    'publisher_recommended',
    'lokis_lab_tuned',
    'custom_quantization',
    'custom_context_or_tools',
    'other_custom',
  ];
  if (!isObject(data.configuration))
    errors.push('configuration must be an object.');
  else {
    if (!configTypes.includes(data.configuration.type))
      errors.push('configuration.type is not supported.');
    if (!isObject(data.configuration.settings))
      errors.push('configuration.settings must be an object.');
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
    if (![1, 2, 3].includes(run.run_number))
      errors.push(`${path}.run_number must be 1, 2, or 3.`);
    if (typeof run.capable !== 'boolean')
      errors.push(`${path}.capable must be a boolean.`);
    if (typeof run.skipped !== 'boolean')
      errors.push(`${path}.skipped must be a boolean.`);
    ['speed_seconds', 'total_wall_seconds'].forEach((field) => {
      if (
        !(
          typeof run[field] === 'number' &&
          Number.isFinite(run[field]) &&
          run[field] >= 0
        )
      )
        errors.push(`${path}.${field} must be non-negative.`);
    });
    ['quality', 'accuracy'].forEach((field) => {
      const score = run[field];
      if (
        run.capable &&
        !run.skipped &&
        !(Number.isInteger(score) && score >= 1 && score <= 5)
      )
        errors.push(`${path}.${field} must be 1–5 for a capable run.`);
      if ((!run.capable || run.skipped) && score !== null)
        errors.push(`${path}.${field} must be null when incapable or skipped.`);
    });
    if (typeof run.raw_output !== 'string')
      errors.push(`${path}.raw_output must be a string.`);
    if (typeof run.notes !== 'string')
      errors.push(`${path}.notes must be a string.`);
    if (!run.tested_at || Number.isNaN(Date.parse(run.tested_at)))
      errors.push(`${path}.tested_at must be an ISO 8601 date-time.`);

    const key = `${run.test_id}#${run.run_number}`;
    if (runKeys.has(key)) errors.push(`${path} duplicates ${key}.`);
    runKeys.add(key);
    if (!run.skipped) counts[run.test_id] = (counts[run.test_id] || 0) + 1;
  });

  Object.entries(counts).forEach(([testId, count]) => {
    if (count !== 3)
      warnings.push(
        `Test ${testId} has ${count} applicable run(s); official comparisons require exactly 3.`,
      );
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
    [
      'private IPv4 address',
      /\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3})\b/,
    ],
    [
      'credential-like value',
      /(?:api[_-]?key|authorization|bearer|password|secret)\s*[:=]\s*[^\s,}]{6,}/i,
    ],
  ];

  const visit = (value, path) => {
    if (typeof value === 'string') {
      checks.forEach(([kind, pattern]) => {
        if (pattern.test(value)) flags.push({ path, kind });
      });
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) =>
        visit(item, `${path}.${key}`),
      );
    }
  };

  visit(data, '$');
  return flags;
}
