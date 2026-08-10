/**
 * Round-trip cost.
 *
 * In Apps Script, wall-clock time is dominated by calls across the
 * JavaScript/Sheets boundary, not by CPU. These tests pin how many such calls
 * each strategy makes, so the read/write-level design has evidence behind it
 * and so performance regressions are caught rather than argued about.
 *
 * Counts come from the instrumented fake (test/fakes/spreadsheet-app.js).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../src/index.js';
import { installFakes } from './fakes/index.js';
import { installLargeSheet } from './fixtures.js';

const ROWS = 200;

function mount(sheetNameOrOptions = 'Test', anchor) {
  return global.TP.mount(sheetNameOrOptions, anchor);
}

// TP carries the exported constants (WC/WR/WT/RT/RR), so it has to exist
// before any test body reads them as arguments.
beforeEach(() => {
  global.$initTableProxy('TP');
});

describe('write level cost, 200 rows', () => {
  let env;

  beforeEach(() => {
    env = installLargeSheet({ rows: ROWS, columns: 5 });
  });

  function updateEveryRow(writeLevel) {
    const table = mount().setWriteLevel(writeLevel);
    env.stats.reset();
    table.update((r) => {
      r.col2.value = 'changed';
    });
    return env.stats;
  }

  it('WRITE_LEVEL_CELL costs one setValues per changed cell', () => {
    const stats = updateEveryRow(global.TP.WC);
    expect(stats.get('Range.setValues')).toBe(ROWS);
  });

  it('WRITE_LEVEL_ROW costs one setValues per changed row', () => {
    const stats = updateEveryRow(global.TP.WR);
    expect(stats.get('Range.setValues')).toBe(ROWS);
  });

  it('WRITE_LEVEL_TABLE costs a single setValues for the whole update', () => {
    const stats = updateEveryRow(global.TP.WT);
    expect(stats.get('Range.setValues')).toBe(1);
  });

  it('WRITE_LEVEL_TABLE is dramatically cheaper overall than WRITE_LEVEL_CELL', () => {
    const cellCost = updateEveryRow(global.TP.WC).total();
    installLargeSheet({ rows: ROWS, columns: 5 });
    const tableCost = updateEveryRow(global.TP.WT).total();
    expect(tableCost).toBeLessThan(cellCost / 10);
  });
});

describe('getDataRange amplification', () => {
  let env;

  beforeEach(() => {
    env = installLargeSheet({ rows: ROWS, columns: 5 });
  });

  // Previously each per-row write re-invoked sheet.getDataRange() inside
  // range.getRow() purely to re-learn a column count that cannot change during
  // the loop, costing 200+ extra round trips here. SheetAccessor now caches the
  // shape and invalidates it on insert/delete.
  it('does not re-read the data range per row under WRITE_LEVEL_ROW', () => {
    const table = mount().setWriteLevel(global.TP.WR);
    env.stats.reset();
    table.update((r) => {
      r.col2.value = 'changed';
    });
    expect(env.stats.get('Sheet.getDataRange')).toBe(0);
  });

  it('keeps WRITE_LEVEL_ROW cheaper than WRITE_LEVEL_CELL for a multi-column update', () => {
    const rowTable = mount().setWriteLevel(global.TP.WR);
    env.stats.reset();
    rowTable.update((r) => {
      r.col2.value = 'a';
      r.col3.value = 'b';
      r.col4.value = 'c';
    });
    const rowCost = env.stats.total();

    const cellEnv = installLargeSheet({ rows: ROWS, columns: 5 });
    const cellTable = mount().setWriteLevel(global.TP.WC);
    cellEnv.stats.reset();
    cellTable.update((r) => {
      r.col2.value = 'a';
      r.col3.value = 'b';
      r.col4.value = 'c';
    });
    expect(rowCost).toBeLessThan(cellEnv.stats.total());
  });

  it('reads the whole table with a bounded number of round trips under table read/write', () => {
    const table = mount().setWriteLevel(global.TP.WT);
    env.stats.reset();
    table.update((r) => {
      r.col2.value = 'changed';
    });
    // One payload read + one flush, not a per-row cost.
    expect(env.stats.get('Range.getValues')).toBeLessThan(10);
    expect(env.stats.get('Range.setValues')).toBe(1);
  });
});

describe('headerAnchorToken scan cost', () => {
  function installAnchored({ rows, anchorRow }) {
    const values = [['col1', 'col2', 'col3']];
    for (let i = 1; i < rows; i += 1) {
      values.push([`r${i}a`, `r${i}b`, `r${i}c`]);
    }
    values[anchorRow] = ['C1', 'C2', 'C3'];
    const notes = values.map((row) => row.map(() => ''));
    notes[anchorRow][0] = 'HEADER_ANCHOR';
    return installFakes({
      sheets: { Test: { values, attributes: { note: notes } } },
      activeSheetName: 'Test',
    });
  }

  // This used to issue one getRange().getNotes() PER ROW until the token was
  // found — 41 round trips here, and one per row in the whole sheet on a miss.
  // It is now a single read scanned in memory.
  it('costs exactly one getNotes regardless of where the anchor sits', () => {
    const env = installAnchored({ rows: 100, anchorRow: 40 });
    env.stats.reset();
    mount('Test', 'HEADER_ANCHOR');
    expect(env.stats.get('Range.getNotes')).toBe(1);
  });

  it('still costs one getNotes when the token is never found', () => {
    const env = installAnchored({ rows: 100, anchorRow: 40 });
    env.stats.reset();
    mount('Test', 'TOKEN_THAT_IS_NOT_PRESENT');
    expect(env.stats.get('Range.getNotes')).toBe(1);
  });

  it('finds the anchor at the correct row and column', () => {
    installAnchored({ rows: 100, anchorRow: 40 });
    const table = mount('Test', 'HEADER_ANCHOR');
    expect(table.getHeaderRow()).toEqual(['C1', 'C2', 'C3']);
  });

  it('costs nothing extra when no anchor token is supplied', () => {
    const env = installAnchored({ rows: 100, anchorRow: 40 });
    env.stats.reset();
    mount('Test');
    expect(env.stats.get('Range.getNotes')).toBe(0);
  });
});
