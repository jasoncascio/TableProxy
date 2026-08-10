/**
 * End-to-end behavior of the mounted TableProxy API, exercised through the
 * fake SpreadsheetApp. This is the safety net for everything else.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../src/index.js';
import { installBasicSheet, installAnchoredSheet, HEADER_ANCHOR } from './fixtures.js';

let env;

function mount(sheetNameOrOptions = 'Test', headerAnchorToken) {
  global.$initTableProxy('TP');
  return global.TP.mount(sheetNameOrOptions, headerAnchorToken);
}

describe('mount', () => {
  beforeEach(() => {
    env = installBasicSheet();
  });

  it('exposes the header row as a copy', () => {
    const table = mount();
    const header = table.getHeaderRow();
    header[0] = 'mutated';
    expect(table.getHeaderRow()[0]).toBe('C1');
  });

  it('defaults the id column to the first header cell', () => {
    expect(mount().getOptions().idColumnName).toBe('C1');
  });

  it('accepts an options object', () => {
    const table = mount({ sheetName: 'Test', autoResizeColumns: false });
    expect(table.getOptions().sheetName).toBe('Test');
  });

  it('keeps an idColumnName passed in the options object', () => {
    // The default-id guard tested a property that never existed, so the first
    // header cell overwrote whatever was passed here.
    expect(mount({ sheetName: 'Test', idColumnName: 'C3' }).getOptions().idColumnName).toBe('C3');
  });

  it('matches writeRecords on an idColumnName from the options object', () => {
    mount({ sheetName: 'Test', idColumnName: 'C3' }).writeRecords([
      { C3: { value: '4-3 Value' }, C4: { value: 'BY OPTION' } },
    ]);
    expect(env.sheetData('Test').read('value', 4, 4, 1, 1)).toEqual([['BY OPTION']]);
  });

  it('does not expose a sheet name setter', () => {
    // It could only ever throw: mount has already resolved the sheet.
    expect(mount().setSheetName).toBeUndefined();
  });

  it('rejects a sheet with duplicate headers', () => {
    installBasicSheet({
      values: [
        ['A', 'B', 'A'],
        ['1', '2', '3'],
      ],
    });
    expect(() => mount()).toThrow(/duplicate column headers/);
  });

  it('rejects mounting with no argument', () => {
    global.$initTableProxy('TP');
    expect(() => global.TP.mount()).toThrow(/TableProxy.mount failed/);
  });

  it('surfaces a usable error for an unknown sheet name', () => {
    global.$initTableProxy('TP');
    expect(() => global.TP.mount('NoSuchSheet')).toThrow();
  });
});

describe('select', () => {
  beforeEach(() => {
    env = installBasicSheet();
  });

  it('selects every data row when the query always matches', () => {
    const table = mount().select((r) => r.C1.value !== undefined);
    expect(table.getSelectedIndices()).toEqual([1, 2, 3, 4, 5]);
  });

  it('filters rows by cell value', () => {
    const table = mount().select((r) => r.C1.value === '3-1 Value');
    expect(table.getSelectedIndices()).toEqual([2]);
  });

  it('can return one-indexed positions', () => {
    const table = mount().select((r) => r.C1.value === '3-1 Value');
    expect(table.getSelectedIndices(true)).toEqual([3]);
  });

  it('binds the record proxy to `this` inside the query', () => {
    const table = mount().select(function query() {
      return this.C2.value === '4-2 Value';
    });
    expect(table.getSelectedIndices()).toEqual([3]);
  });

  it('passes the row index as the second query argument', () => {
    const seen = [];
    mount().select((r, index) => {
      seen.push(index);
      return false;
    });
    expect(seen).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns records when asked', () => {
    const table = mount().select((r) => r.C1.value === '3-1 Value', true);
    const records = table.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].C1.value).toBe('3-1 Value');
  });

  it('records operation metadata in getLastResults', () => {
    const results = mount()
      .select((r) => r.C1.value === '3-1 Value')
      .getLastResults();
    const asObject = Object.fromEntries(results);
    expect(asObject.operation).toBe('select');
    expect(asObject.completed).toBe(true);
    expect(asObject['selected count']).toBe(1);
  });

  it('narrows the selection when chained', () => {
    const table = mount()
      .select((r) => r.C1.value !== '2-1 Value')
      .select((r) => r.C1.value !== '3-1 Value');
    expect(table.getSelectedIndices()).toEqual([3, 4, 5]);
  });
});

describe('update', () => {
  beforeEach(() => {
    env = installBasicSheet();
  });

  it('writes a value through the record proxy', () => {
    mount().update((r) => {
      if (r.C1.value === '3-1 Value') {
        r.C2.value = 'CHANGED';
      }
    });
    expect(env.sheetData('Test').read('value', 3, 2, 1, 1)).toEqual([['CHANGED']]);
  });

  it('writes a background through the record proxy', () => {
    mount().update((r) => {
      if (r.C1.value === '3-1 Value') {
        r.C3.background = '#ff0000';
      }
    });
    expect(env.sheetData('Test').read('background', 3, 3, 1, 1)).toEqual([['#ff0000']]);
  });

  it('writes several attributes on the same cell', () => {
    mount().update((r) => {
      if (r.C1.value === '2-1 Value') {
        r.C2.value = 'V';
        r.C2.fontweight = 'bold';
        r.C2.note = 'a note';
        r.C2.numberformat = '#,##0.00';
      }
    });
    const data = env.sheetData('Test');
    expect(data.read('value', 2, 2, 1, 1)).toEqual([['V']]);
    expect(data.read('fontweight', 2, 2, 1, 1)).toEqual([['bold']]);
    expect(data.read('note', 2, 2, 1, 1)).toEqual([['a note']]);
    expect(data.read('numberformat', 2, 2, 1, 1)).toEqual([['#,##0.00']]);
  });

  it('reports updated row indices', () => {
    const results = Object.fromEntries(
      mount()
        .update((r) => {
          if (r.C1.value !== '2-1 Value') {
            r.C2.value = 'x';
          }
        })
        .getLastResults(),
    );
    expect(results['updated row count']).toBe(4);
    expect(results['updated row indices']).toEqual([2, 3, 4, 5]);
  });

  it('only updates rows in the current selection', () => {
    mount()
      .select((r) => r.C1.value === '3-1 Value')
      .update((r) => {
        r.C2.value = 'ONLY';
      });
    const data = env.sheetData('Test');
    expect(data.read('value', 3, 2, 1, 1)).toEqual([['ONLY']]);
    expect(data.read('value', 2, 2, 1, 1)).toEqual([['2-2 Value']]);
  });
});

describe('getUnique', () => {
  beforeEach(() => {
    env = installFixtureWithRepeats();
  });

  function installFixtureWithRepeats() {
    return installBasicSheet({
      values: [
        ['name', 'team'],
        ['a', 'red'],
        ['b', 'blue'],
        ['c', 'red'],
        ['d', 'blue'],
      ],
    });
  }

  it('returns distinct values for a column', () => {
    expect(mount().getUnique('team')).toEqual(['red', 'blue']);
  });

  it('rejects an unknown column', () => {
    expect(() => mount().getUnique('nope')).toThrow(/invalid columnName/);
  });

  it('rejects an unsupported attribute', () => {
    expect(() => mount().getUnique('team', 'bogus')).toThrow(/invalid attribute/);
  });

  it('reads a non-value attribute', () => {
    expect(mount().getUnique('team', 'fontweight')).toEqual(['normal']);
  });
});

describe('writeRecords', () => {
  beforeEach(() => {
    env = installBasicSheet();
  });

  it('matches on the default id column and writes', () => {
    mount().writeRecords([{ C1: { value: '4-1 Value' }, C3: { value: 'WRITTEN' } }]);
    expect(env.sheetData('Test').read('value', 4, 3, 1, 1)).toEqual([['WRITTEN']]);
  });

  it('matches on an explicit column', () => {
    mount().writeRecords([{ C2: { value: '5-2 Value' }, C3: { value: 'BY C2' } }], 'C2');
    expect(env.sheetData('Test').read('value', 5, 3, 1, 1)).toEqual([['BY C2']]);
  });

  it('reports a warning when no row matches', () => {
    const results = Object.fromEntries(
      mount()
        .writeRecords([{ C1: { value: 'does not exist' }, C2: { value: 'x' } }])
        .getLastResults(),
    );
    expect(results.warnings).toHaveLength(1);
  });

  it('reports an error when the match column is missing from the input', () => {
    const results = Object.fromEntries(
      mount()
        .writeRecords([{ C2: { value: 'x' } }])
        .getLastResults(),
    );
    expect(results.errors).toHaveLength(1);
  });
});

describe('insertRow / deleteRow', () => {
  beforeEach(() => {
    env = installBasicSheet();
  });

  it('inserts a blank row directly under the header for TOP', () => {
    const table = mount();
    table.insertRow(global.TP.T);
    const data = env.sheetData('Test');
    expect(data.read('value', 2, 1, 1, 1)).toEqual([['']]);
    expect(data.read('value', 3, 1, 1, 1)).toEqual([['2-1 Value']]);
  });

  it('inserts at the bottom for BOTTOM', () => {
    const table = mount();
    table.insertRow(global.TP.B);
    expect(env.sheetData('Test').read('value', 7, 1, 1, 1)).toEqual([['']]);
  });

  it('deletes a row by 1-based position', () => {
    mount().deleteRow(3);
    expect(env.sheetData('Test').read('value', 3, 1, 1, 1)).toEqual([['4-1 Value']]);
  });

  it('refuses to delete the header row', () => {
    expect(() => mount().deleteRow(1)).toThrow(/unable to delete the header row/);
  });
});

describe('setRows', () => {
  beforeEach(() => {
    env = installBasicSheet();
  });

  it('selects by zero-based index', () => {
    const table = mount().setRows([1, 3]);
    expect(table.getSelectedIndices()).toEqual([1, 3]);
    expect(table.selectionLength()).toBe(2);
  });

  it('round-trips 1-based positions with getSelectedIndices', () => {
    // The oneIndexed flag added one instead of subtracting it, so it moved the
    // selection away from the rows the caller named.
    const table = mount().setRows([3, 4], true);
    expect(table.getSelectedIndices(true)).toEqual([3, 4]);
    expect(table.getSelectedIndices()).toEqual([2, 3]);
  });

  it('updates only the rows named by position', () => {
    mount()
      .setRows([4], true)
      .update((r) => {
        r.C2.value = 'ROW 4';
      });
    const data = env.sheetData('Test');
    expect(data.read('value', 4, 2, 1, 1)).toEqual([['ROW 4']]);
    expect(data.read('value', 3, 2, 1, 1)).toEqual([['3-2 Value']]);
  });

  it('rejects non-numeric input', () => {
    expect(() => mount().setRows(['2'])).toThrow(/only numbers/);
  });
});

describe('column filter and computed properties', () => {
  beforeEach(() => {
    env = installBasicSheet();
  });

  it('restricts the record proxy to filtered columns', () => {
    const table = mount()
      .setColumnFilter(['C1', 'C2'])
      .select((r) => r.C1.value === '2-1 Value', true);
    const record = table.getRecords()[0];
    expect(Object.keys(record).sort()).toEqual([' index ', 'C1', 'C2']);
  });

  it('exposes computed properties on the record', () => {
    const table = mount()
      .setComputedProperties({
        combined() {
          return `${this.C1.value}|${this.C2.value}`;
        },
      })
      .select((r) => r.C1.value === '2-1 Value', true);
    expect(table.getRecords()[0].combined.value).toBe('2-1 Value|2-2 Value');
  });
});

describe('headerAnchorToken', () => {
  beforeEach(() => {
    env = installAnchoredSheet();
  });

  it('locates the header row from a note anchor', () => {
    const table = mount('Test', HEADER_ANCHOR);
    expect(table.getHeaderRow()).toEqual(['C1', 'C2', 'C3', 'C4', 'C5']);
  });

  it('selects only rows below the anchored header', () => {
    const table = mount('Test', HEADER_ANCHOR).select((r) => r.C1.value !== '');
    expect(table.getSelectedIndices()).toEqual([3, 4, 5, 6, 7]);
  });
});
