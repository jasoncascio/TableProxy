/**
 * Backing store for the fake Sheet.
 *
 * Modeling notes — where this is deliberately faithful to real Google Sheets,
 * because the previous simulation got these wrong and hid real bugs:
 *
 * 1. GRID SIZE vs DATA EXTENT are different things. A sheet has a grid
 *    (maxRows x maxColumns, 1000x26 by default in the real product) and a data
 *    extent (the bounding box of cells that actually contain something).
 *    getRange() addresses the GRID. getDataRange() returns the EXTENT.
 *    Requesting a range inside the grid but outside the extent is legal and
 *    returns default/empty cells.
 *
 * 2. READING OUT OF RANGE THROWS. The old fake silently grew the sheet to fit
 *    any request, which meant off-by-one bugs in the library under test could
 *    never surface. Real Sheets throws; so does this.
 *
 * 3. WRITES MUST MATCH THE RANGE SHAPE exactly. Real Sheets throws otherwise.
 *
 * 4. Data extent is the bounding box of cells with a non-empty VALUE.
 *    Real Sheets also extends the extent for some formatting-only cells; that
 *    nuance is NOT modeled. Tests that depend on it would be lying either way.
 *
 * All row/column arguments on the public methods are 1-BASED, matching the
 * real API. Internal arrays are 0-based.
 */

import { ATTRIBUTE_NAMES, defaultFor } from './attributes.js';

const DEFAULT_SLACK_ROWS = 100;
const DEFAULT_SLACK_COLUMNS = 10;

function buildGrid(rows, columns, fill) {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => fill));
}

function isBlank(value) {
  return value === '' || value === null || value === undefined;
}

export class SheetData {
  /**
   * @param {object} config
   * @param {Array<Array<*>>} [config.values] seed values, row-major, row 0 = first sheet row
   * @param {object} [config.attributes] optional seeds keyed by attribute name
   * @param {number} [config.maxRows] grid height; defaults to seed height + slack
   * @param {number} [config.maxColumns] grid width; defaults to seed width + slack
   */
  constructor({ values = [['']], attributes = {}, maxRows, maxColumns } = {}) {
    const seedRows = values.length;
    const seedColumns = values.reduce((widest, row) => Math.max(widest, row.length), 0) || 1;

    this.maxRows = maxRows ?? seedRows + DEFAULT_SLACK_ROWS;
    this.maxColumns = maxColumns ?? seedColumns + DEFAULT_SLACK_COLUMNS;

    if (this.maxRows < seedRows || this.maxColumns < seedColumns) {
      throw new Error(
        `seed data (${seedRows}x${seedColumns}) does not fit the requested grid ` +
          `(${this.maxRows}x${this.maxColumns})`,
      );
    }

    /** @type {Map<string, Array<Array<*>>>} */
    this.grids = new Map();
    for (const attributeName of ATTRIBUTE_NAMES) {
      const grid = buildGrid(this.maxRows, this.maxColumns, defaultFor(attributeName));
      const seed = attributeName === 'value' ? values : attributes[attributeName];
      if (seed) {
        seed.forEach((row, rowIndex) => {
          row.forEach((cell, columnIndex) => {
            grid[rowIndex][columnIndex] = cell;
          });
        });
      }
      this.grids.set(attributeName, grid);
    }
  }

  gridFor(attributeName) {
    const grid = this.grids.get(attributeName);
    if (!grid) {
      throw new Error(`unknown attribute "${attributeName}"`);
    }
    return grid;
  }

  /**
   * Bounding box of cells holding a non-empty value.
   * An entirely empty sheet reports 1x1, matching real getDataRange().
   */
  getDataExtent() {
    const values = this.gridFor('value');
    let lastRow = 0;
    let lastColumn = 0;
    values.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        if (!isBlank(cell)) {
          lastRow = Math.max(lastRow, rowIndex + 1);
          lastColumn = Math.max(lastColumn, columnIndex + 1);
        }
      });
    });
    return { numRows: Math.max(lastRow, 1), numColumns: Math.max(lastColumn, 1) };
  }

  assertInGrid(startRow, startColumn, numRows, numColumns) {
    if (!Number.isInteger(startRow) || !Number.isInteger(startColumn)) {
      throw new Error(
        `The coordinates of the range are outside the dimensions of the sheet. ` +
          `(row=${startRow}, column=${startColumn})`,
      );
    }
    if (startRow < 1 || startColumn < 1 || numRows < 1 || numColumns < 1) {
      throw new Error(
        `The coordinates or dimensions of the range are invalid. ` +
          `(row=${startRow}, column=${startColumn}, numRows=${numRows}, numColumns=${numColumns})`,
      );
    }
    if (startRow + numRows - 1 > this.maxRows || startColumn + numColumns - 1 > this.maxColumns) {
      throw new Error(
        `The coordinates or dimensions of the range are outside the sheet ` +
          `(${this.maxRows}x${this.maxColumns}). Requested ${startRow},${startColumn} ` +
          `for ${numRows}x${numColumns}.`,
      );
    }
  }

  /** Returns a fresh 2D copy, as real Sheets does. */
  read(attributeName, startRow, startColumn, numRows, numColumns) {
    this.assertInGrid(startRow, startColumn, numRows, numColumns);
    const grid = this.gridFor(attributeName);
    const out = [];
    for (let r = 0; r < numRows; r += 1) {
      const row = [];
      for (let c = 0; c < numColumns; c += 1) {
        row.push(grid[startRow - 1 + r][startColumn - 1 + c]);
      }
      out.push(row);
    }
    return out;
  }

  write(attributeName, startRow, startColumn, incoming) {
    if (!Array.isArray(incoming) || !Array.isArray(incoming[0])) {
      throw new Error(`setter expects a two-dimensional array`);
    }
    const numRows = incoming.length;
    const numColumns = incoming[0].length;
    this.assertInGrid(startRow, startColumn, numRows, numColumns);
    const grid = this.gridFor(attributeName);
    incoming.forEach((row, r) => {
      if (row.length !== numColumns) {
        throw new Error(`setter received a ragged array at row ${r}`);
      }
      row.forEach((cell, c) => {
        grid[startRow - 1 + r][startColumn - 1 + c] = cell;
      });
    });
    return this;
  }

  /** Inserts blank rows before `position` (1-based). Grid grows. */
  insertRows(position, howMany) {
    if (position < 1 || position > this.maxRows + 1) {
      throw new Error(`insertRows position ${position} is out of bounds`);
    }
    for (const attributeName of ATTRIBUTE_NAMES) {
      const grid = this.gridFor(attributeName);
      const blanks = buildGrid(howMany, this.maxColumns, defaultFor(attributeName));
      grid.splice(position - 1, 0, ...blanks);
    }
    this.maxRows += howMany;
    return this;
  }

  /** Deletes rows starting at `position` (1-based). Grid shrinks. */
  deleteRows(position, howMany) {
    if (position < 1 || position + howMany - 1 > this.maxRows) {
      throw new Error(`deleteRows(${position}, ${howMany}) is out of bounds`);
    }
    for (const attributeName of ATTRIBUTE_NAMES) {
      this.gridFor(attributeName).splice(position - 1, howMany);
    }
    this.maxRows -= howMany;
    return this;
  }
}
