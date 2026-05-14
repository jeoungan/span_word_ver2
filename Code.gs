const SPREADSHEET_ID = '1qka77lQ0uxjsF8KW7ZCznsp9lY8bKuonkJLyva-G1CQ';
const SHEET_NAME = 'word_memory_span_ver2';
const HEADERS = [
  'participant_id',
  'trial_number',
  'practice_or_main',
  'condition',
  'stimulus_sequence',
  'response_sequence',
  'reaction_time_ms',
  'partial_accuracy',
  'incorrect_positions',
  'pos1_exact_accuracy',
  'pos1_partial_accuracy',
  'pos2_exact_accuracy',
  'pos2_partial_accuracy',
  'pos3_exact_accuracy',
  'pos3_partial_accuracy',
  'pos4_exact_accuracy',
  'pos4_partial_accuracy',
  'pos5_exact_accuracy',
  'pos5_partial_accuracy',
  'pos6_exact_accuracy',
  'pos6_partial_accuracy',
  'device_type',
  'timestamp',
];

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const rows = Array.isArray(payload) ? payload : payload.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return json_({ status: 'error', message: 'No rows received' });
    }

    const sheet = getOrCreateSheet_();
    ensureHeader_(sheet);

    const values = rows.map((row) => HEADERS.map((header) => String(row[header] ?? '')));
    const range = sheet.getRange(sheet.getLastRow() + 1, 1, values.length, HEADERS.length);
    range.setNumberFormat('@');
    range.setValues(values);

    return json_({ status: 'success', appended: values.length });
  } catch (error) {
    return json_({ status: 'error', message: error.message });
  }
}

function doGet() {
  return json_({ status: 'ready', sheet: SHEET_NAME });
}

function doOptions() {
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}

function parsePayload_(e) {
  if (e && e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  return e.parameter || {};
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeader_(sheet) {
  const existing =
    sheet.getLastColumn() > 0
      ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0]
      : [];
  const hasHeader = HEADERS.every((header, index) => existing[index] === header);

  if (!hasHeader) {
    sheet.clear();
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, HEADERS.length).setBackground('#dceeff');
  }

  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 1), HEADERS.length).setNumberFormat('@');
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
