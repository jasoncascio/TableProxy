/**
 * Fake SpreadsheetApp (plus Logger, Browser, MailApp) for testing TableProxy
 * without a live Google account.
 *
 * Design rules, learned from what the original src/simulation-utils.js got wrong:
 *
 * - FAITHFUL FAILURE. Where real Sheets throws, this throws. Where real Sheets
 *   returns null, this returns null. getSheetByName() and getRangeByName()
 *   returning null (rather than throwing) is not a detail — library code that
 *   assumes a throw is silently broken in production, and the old fake hid it.
 *
 * - NO DOM. The HTML renderer lives in ./render-html.js and is opt-in.
 *
 * - COUNTED CALLS. Every method that would be a network round-trip in real
 *   Apps Script is counted. Apps Script performance is round-trip count and
 *   almost nothing else, so this is what makes performance assertable.
 *
 * Not modeled: quotas, execution timeouts, LockService, concurrent edits,
 * formulas/recalculation, merged-cell geometry beyond an explicit flag,
 * and permissions. Tests must not pretend otherwise.
 */

import { ATTRIBUTES } from './attributes.js';
import { SheetData } from './sheet-data.js';

export class CallStats {
  constructor() {
    this.counts = new Map();
  }

  record(method) {
    this.counts.set(method, (this.counts.get(method) ?? 0) + 1);
    return this;
  }

  get(method) {
    return this.counts.get(method) ?? 0;
  }

  /** Total round-trips recorded. */
  total() {
    let sum = 0;
    for (const count of this.counts.values()) {
      sum += count;
    }
    return sum;
  }

  snapshot() {
    return Object.fromEntries([...this.counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }

  reset() {
    this.counts.clear();
    return this;
  }
}

function columnLetter(columnIndex) {
  let index = columnIndex;
  let letters = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    index = Math.floor((index - remainder) / 26);
  }
  return letters;
}

class FakeRange {
  constructor(sheet, startRow, startColumn, numRows, numColumns) {
    this.sheetRef = sheet;
    this.data = sheet.data;
    this.stats = sheet.stats;
    this.startRow = startRow;
    this.startColumn = startColumn;
    this.numRows = numRows;
    this.numColumns = numColumns;
    this.merged = false;
    // Validate eagerly, as real getRange() does.
    this.data.assertInGrid(startRow, startColumn, numRows, numColumns);
  }

  getSheet() {
    return this.sheetRef;
  }

  getRow() {
    return this.startRow;
  }

  getRowIndex() {
    return this.startRow;
  }

  getColumn() {
    return this.startColumn;
  }

  getColumnIndex() {
    return this.startColumn;
  }

  getNumRows() {
    return this.numRows;
  }

  getNumColumns() {
    return this.numColumns;
  }

  getLastRow() {
    return this.startRow + this.numRows - 1;
  }

  getLastColumn() {
    return this.startColumn + this.numColumns - 1;
  }

  getA1Notation() {
    const start = `${columnLetter(this.startColumn)}${this.startRow}`;
    if (this.numRows === 1 && this.numColumns === 1) {
      return start;
    }
    return `${start}:${columnLetter(this.getLastColumn())}${this.getLastRow()}`;
  }

  isPartOfMerge() {
    return this.merged;
  }

  getValue() {
    this.stats.record('Range.getValue');
    return this.data.read('value', this.startRow, this.startColumn, 1, 1)[0][0];
  }

  setValue(input) {
    this.stats.record('Range.setValue');
    const grid = Array.from({ length: this.numRows }, () =>
      Array.from({ length: this.numColumns }, () => input),
    );
    this.data.write('value', this.startRow, this.startColumn, grid);
    return this;
  }
}

// Generate the nine get*/set* attribute accessor pairs from one table.
for (const { name, getter, setter } of ATTRIBUTES) {
  FakeRange.prototype[getter] = function readAttribute() {
    this.stats.record(`Range.${getter}`);
    return this.data.read(name, this.startRow, this.startColumn, this.numRows, this.numColumns);
  };

  FakeRange.prototype[setter] = function writeAttribute(incoming) {
    this.stats.record(`Range.${setter}`);
    if (!Array.isArray(incoming) || !Array.isArray(incoming[0])) {
      throw new Error(`${setter} expects a two-dimensional array`);
    }
    const shape = `${incoming.length}x${incoming[0].length}`;
    const expected = `${this.numRows}x${this.numColumns}`;
    if (shape !== expected) {
      throw new Error(
        `The number of rows in the data does not match the number of rows in the range. ` +
          `Range is ${expected}, data is ${shape}.`,
      );
    }
    this.data.write(name, this.startRow, this.startColumn, incoming);
    return this;
  };
}

class FakeSheet {
  constructor(name, data, stats, spreadsheet) {
    this.name = name;
    this.data = data;
    this.stats = stats;
    this.spreadsheet = spreadsheet;
    this.columnWidths = new Map();
  }

  getName() {
    return this.name;
  }

  getParent() {
    return this.spreadsheet;
  }

  getMaxRows() {
    return this.data.maxRows;
  }

  getMaxColumns() {
    return this.data.maxColumns;
  }

  /**
   * Real arity: (row, col) -> 1x1, (row, col, numRows) -> numRows x 1,
   * (row, col, numRows, numColumns) -> numRows x numColumns.
   */
  getRange(startRow, startColumn, numRows, numColumns) {
    this.stats.record('Sheet.getRange');
    return new FakeRange(
      this,
      startRow,
      startColumn,
      numRows === undefined ? 1 : numRows,
      numColumns === undefined ? 1 : numColumns,
    );
  }

  getDataRange() {
    this.stats.record('Sheet.getDataRange');
    const { numRows, numColumns } = this.data.getDataExtent();
    return new FakeRange(this, 1, 1, numRows, numColumns);
  }

  getLastRow() {
    this.stats.record('Sheet.getLastRow');
    return this.data.getDataExtent().numRows;
  }

  getLastColumn() {
    this.stats.record('Sheet.getLastColumn');
    return this.data.getDataExtent().numColumns;
  }

  insertRows(rowPosition, howMany = 1) {
    this.stats.record('Sheet.insertRows');
    this.data.insertRows(rowPosition, howMany);
    return this;
  }

  insertRowBefore(rowPosition) {
    this.stats.record('Sheet.insertRowBefore');
    this.data.insertRows(rowPosition, 1);
    return this;
  }

  insertRowAfter(rowPosition) {
    this.stats.record('Sheet.insertRowAfter');
    this.data.insertRows(rowPosition + 1, 1);
    return this;
  }

  deleteRow(rowPosition) {
    this.stats.record('Sheet.deleteRow');
    this.data.deleteRows(rowPosition, 1);
    return this;
  }

  deleteRows(rowPosition, howMany = 1) {
    this.stats.record('Sheet.deleteRows');
    this.data.deleteRows(rowPosition, howMany);
    return this;
  }

  autoResizeColumn(columnPosition) {
    this.stats.record('Sheet.autoResizeColumn');
    this.columnWidths.set(columnPosition, 'auto');
    return this;
  }

  setColumnWidth(columnPosition, width) {
    this.stats.record('Sheet.setColumnWidth');
    this.columnWidths.set(columnPosition, width);
    return this;
  }

  getSelection() {
    this.stats.record('Sheet.getSelection');
    return this.spreadsheet.getSelection();
  }
}

class FakeRangeList {
  constructor(ranges) {
    this.ranges = ranges;
  }

  getRanges() {
    return this.ranges;
  }
}

class FakeSelection {
  constructor(rangeList) {
    this.rangeList = rangeList;
  }

  getActiveRangeList() {
    return this.rangeList;
  }

  getActiveRange() {
    return this.rangeList.getRanges()[0] ?? null;
  }
}

class FakeSpreadsheet {
  constructor(id, stats) {
    this.id = id;
    this.stats = stats;
    /** @type {Map<string, FakeSheet>} */
    this.sheets = new Map();
    this.activeSheetName = null;
    this.namedRanges = new Map();
    /** @type {Array<[string, number, number, number, number]>} */
    this.selectionSpecs = [];
  }

  addSheet(name, sheetDataConfig) {
    const sheet = new FakeSheet(name, new SheetData(sheetDataConfig), this.stats, this);
    this.sheets.set(name, sheet);
    if (this.activeSheetName === null) {
      this.activeSheetName = name;
    }
    return sheet;
  }

  getId() {
    return this.id;
  }

  getName() {
    return `Fake Spreadsheet ${this.id}`;
  }

  getSheets() {
    this.stats.record('Spreadsheet.getSheets');
    return [...this.sheets.values()];
  }

  /** Real behavior: returns null when no sheet matches. It does NOT throw. */
  getSheetByName(name) {
    this.stats.record('Spreadsheet.getSheetByName');
    return this.sheets.get(name) ?? null;
  }

  getActiveSheet() {
    this.stats.record('Spreadsheet.getActiveSheet');
    return this.sheets.get(this.activeSheetName) ?? null;
  }

  setActiveSheet(sheet) {
    this.activeSheetName = typeof sheet === 'string' ? sheet : sheet.getName();
    return this;
  }

  /** Real behavior: returns null when the named range does not exist. */
  getRangeByName(name) {
    this.stats.record('Spreadsheet.getRangeByName');
    const spec = this.namedRanges.get(name);
    if (!spec) {
      return null;
    }
    const sheet = this.sheets.get(spec.sheetName);
    const range = sheet.getRange(spec.startRow, spec.startColumn, spec.numRows, spec.numColumns);
    range.merged = spec.merged === true;
    return range;
  }

  getNamedRanges() {
    this.stats.record('Spreadsheet.getNamedRanges');
    return [...this.namedRanges.keys()].map((name) => ({
      getName: () => name,
      getRange: () => this.getRangeByName(name),
    }));
  }

  defineNamedRange(name, spec) {
    this.namedRanges.set(name, spec);
    return this;
  }

  getSelection() {
    const ranges = this.selectionSpecs.map(
      ([sheetName, startRow, startColumn, numRows, numColumns]) =>
        this.sheets.get(sheetName).getRange(startRow, startColumn, numRows, numColumns),
    );
    return new FakeSelection(new FakeRangeList(ranges));
  }

  setSelection(specs) {
    this.selectionSpecs = specs;
    return this;
  }
}

/**
 * Builds the fake global environment.
 *
 * @param {object} config
 * @param {object} config.sheets map of sheetName -> SheetData config
 * @param {string} [config.activeSheetName]
 * @param {string} [config.spreadsheetId]
 * @returns {object} handle with the globals plus test controls
 */
export function createFakeEnvironment({
  sheets = { Test: { values: [['']] } },
  activeSheetName,
  spreadsheetId = 'FAKE_SPREADSHEET_ID',
} = {}) {
  const stats = new CallStats();
  const spreadsheet = new FakeSpreadsheet(spreadsheetId, stats);

  for (const [name, config] of Object.entries(sheets)) {
    spreadsheet.addSheet(name, config);
  }
  if (activeSheetName) {
    spreadsheet.setActiveSheet(activeSheetName);
  }

  const logs = [];
  const messageBoxes = [];
  const sentMail = [];

  const SpreadsheetApp = {
    getActiveSpreadsheet: () => {
      stats.record('SpreadsheetApp.getActiveSpreadsheet');
      return spreadsheet;
    },
    getActiveSheet: () => {
      stats.record('SpreadsheetApp.getActiveSheet');
      return spreadsheet.getActiveSheet();
    },
    openById: (id) => {
      stats.record('SpreadsheetApp.openById');
      if (id !== spreadsheetId) {
        // Matches the real error surface for an unopenable id.
        throw new Error(
          `Unexpected error while getting the method or property openById on object SpreadsheetApp.`,
        );
      }
      return spreadsheet;
    },
    flush: () => {
      stats.record('SpreadsheetApp.flush');
    },
  };

  const Logger = {
    log: (message) => {
      logs.push(message);
    },
  };

  const Browser = {
    msgBox: (message) => {
      messageBoxes.push(message);
      return 'ok';
    },
  };

  const MailApp = {
    sendEmail: (options) => {
      sentMail.push(options);
    },
  };

  return {
    SpreadsheetApp,
    Logger,
    Browser,
    MailApp,
    spreadsheet,
    stats,
    logs,
    messageBoxes,
    sentMail,
    sheetData: (name) => spreadsheet.sheets.get(name).data,
    setSelection: (specs) => spreadsheet.setSelection(specs),
  };
}

export { FakeRange, FakeSheet, FakeSpreadsheet };
