import { describe, it, expect, beforeEach } from 'vitest';
import { installFakes } from './fakes/index.js';
import {
  getSheetsObjectType,
  isSpreadsheet,
  isSheet,
  isRange,
  isSupportedType,
  getShape,
  getSelectedRowIndices,
  getSpreadsheet,
  getSheetIndex,
  getSheetByName,
  getSheet,
  namedRangeExists,
  getValueByName,
  updateValueByName,
  getCoordinatesByName,
  getNamedRangesObject,
  sendEmail,
} from '../src/sheets-utilities.js';

let env;

beforeEach(() => {
  env = installFakes({
    sheets: {
      Test: {
        values: [
          ['A', 'B'],
          ['1', '2'],
        ],
      },
      Other: { values: [['X'], ['9']] },
    },
    activeSheetName: 'Test',
  });
});

describe('type predicates', () => {
  it('isSupportedType accepts sheet-storable scalars', () => {
    expect(isSupportedType('a')).toBe(true);
    expect(isSupportedType(1)).toBe(true);
    expect(isSupportedType(true)).toBe(true);
    expect(isSupportedType(new Date())).toBe(true);
    expect(isSupportedType({})).toBe(false);
    expect(isSupportedType([])).toBe(false);
    expect(isSupportedType(null)).toBe(false);
  });

  it('identifies a Spreadsheet', () => {
    expect(isSpreadsheet(env.spreadsheet)).toBe(true);
  });

  it('identifies a Sheet', () => {
    expect(isSheet(env.spreadsheet.getSheetByName('Test'))).toBe(true);
  });

  it('identifies a Range', () => {
    expect(isRange(env.spreadsheet.getSheetByName('Test').getDataRange())).toBe(true);
  });

  it('returns undefined for values that are not Sheets objects', () => {
    expect(getSheetsObjectType({})).toBeUndefined();
    expect(getSheetsObjectType(null)).toBeUndefined();
    expect(getSheetsObjectType('a string')).toBeUndefined();
  });
});

describe('getShape', () => {
  it('describes a 2d array', () => {
    expect(
      getShape([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    ).toBe('2x3');
  });

  it('rejects a 1d array', () => {
    expect(() => getShape([1, 2, 3])).toThrow(/non-2d array/);
  });

  it('describes a Range', () => {
    expect(getShape(env.spreadsheet.getSheetByName('Test').getDataRange())).toBe('2x2');
  });
});

describe('sheet lookup', () => {
  it('getSpreadsheet returns the active spreadsheet without an id', () => {
    expect(getSpreadsheet()).toBe(env.spreadsheet);
  });

  it('getSheetByName finds a sheet', () => {
    expect(getSheetByName('Test').getName()).toBe('Test');
  });

  it('getSheetByName throws for an unknown sheet', () => {
    expect(() => getSheetByName('Nope')).toThrow(/unable to find a sheet/);
  });

  it('getSheet accepts a sheet name', () => {
    expect(getSheet('Test').getName()).toBe('Test');
  });

  it('getSheetIndex finds the position of a sheet', () => {
    expect(getSheetIndex('Test')).toBe(0);
    expect(getSheetIndex('Other')).toBe(1);
  });

  it('getSheetIndex reports -1 for an unknown sheet', () => {
    expect(getSheetIndex('Nope')).toBe(-1);
  });
});

describe('named ranges', () => {
  beforeEach(() => {
    env.spreadsheet.defineNamedRange('single', {
      sheetName: 'Test',
      startRow: 2,
      startColumn: 1,
      numRows: 1,
      numColumns: 1,
    });
    env.spreadsheet.defineNamedRange('block', {
      sheetName: 'Test',
      startRow: 1,
      startColumn: 1,
      numRows: 2,
      numColumns: 2,
    });
  });

  it('reads a 1x1 named range as a scalar', () => {
    expect(getValueByName('single')).toBe('1');
  });

  it('reads a block named range as a 2d array', () => {
    expect(getValueByName('block')).toEqual([
      ['A', 'B'],
      ['1', '2'],
    ]);
  });

  it('throws reading an undefined named range', () => {
    expect(() => getValueByName('nope')).toThrow(/does not exist/);
  });

  it('writes a scalar to a 1x1 named range', () => {
    updateValueByName('single', 'updated');
    expect(getValueByName('single')).toBe('updated');
  });

  it('rejects a mis-sized write', () => {
    expect(() => updateValueByName('block', [['only one']])).toThrow(/row count incorrect/);
  });

  it('reports coordinates', () => {
    expect(getCoordinatesByName('block')).toEqual({
      startRow: 1,
      endRow: 2,
      startCol: 1,
      endCol: 2,
    });
  });

  it('builds a live accessor object', () => {
    const ranges = getNamedRangesObject();
    expect(ranges.single).toBe('1');
    ranges.single = 'via accessor';
    expect(getValueByName('single')).toBe('via accessor');
  });

  it('reports an existing named range', () => {
    expect(namedRangeExists('single')).toBe(true);
  });

  it('reports a missing named range as absent', () => {
    expect(namedRangeExists('definitely-not-there')).toBe(false);
  });
});

describe('selection', () => {
  it('flattens selected ranges into zero-based row indices', () => {
    env.setSelection([
      ['Test', 2, 1, 1, 1],
      ['Test', 1, 1, 1, 2],
    ]);
    expect(getSelectedRowIndices().sort()).toEqual([0, 1]);
  });

  it('returns an empty list with no selection', () => {
    env.setSelection([]);
    expect(getSelectedRowIndices()).toEqual([]);
  });
});

describe('sendEmail', () => {
  it('joins array recipients and forwards the message', () => {
    sendEmail(['a@example.com', 'b@example.com'], 'subject', 'body');
    expect(env.sentMail).toEqual([
      { to: 'a@example.com,b@example.com', subject: 'subject', body: 'body' },
    ]);
  });

  it('includes htmlBody when supplied', () => {
    sendEmail('a@example.com', 's', 'b', '<p>b</p>');
    expect(env.sentMail[0].htmlBody).toBe('<p>b</p>');
  });
});
