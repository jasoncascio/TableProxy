/**
 * The read-level x write-level matrix.
 *
 * DataController pre-binds a strategy for setRowIndex / updateColumnByIndex /
 * getColumnByIndex at construction (src/data-controller.js:46-72) to keep
 * branching out of the per-row loop. Six combinations, none previously tested.
 *
 * Read levels:  TABLE (read whole sheet once)  ROW (read one row at a time)
 * Write levels: CELL (write on every assignment)  ROW (flush per row)  TABLE (flush once)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../src/index.js';
import { installBasicSheet } from './fixtures.js';

let env;

beforeEach(() => {
  env = installBasicSheet();
  global.$initTableProxy('TP');
});

function mount() {
  return global.TP.mount('Test');
}

function valueAt(row, column) {
  return env.sheetData('Test').read('value', row, column, 1, 1)[0][0];
}

describe('READ_LEVEL_TABLE', () => {
  it('reads correct cell values', () => {
    const seen = [];
    mount()
      .setReadLevel(global.TP.RT)
      .select((r) => {
        seen.push(r.C1.value);
        return false;
      });
    expect(seen).toEqual(['2-1 Value', '3-1 Value', '4-1 Value', '5-1 Value', '6-1 Value']);
  });

  it('WRITE_LEVEL_CELL writes each assignment straight through', () => {
    mount()
      .setReadLevel(global.TP.RT)
      .setWriteLevel(global.TP.WC)
      .update((r) => {
        r.C2.value = `${r.C1.value}!`;
      });
    expect(valueAt(2, 2)).toBe('2-1 Value!');
    expect(valueAt(6, 2)).toBe('6-1 Value!');
  });

  it('WRITE_LEVEL_ROW flushes a row at a time', () => {
    mount()
      .setReadLevel(global.TP.RT)
      .setWriteLevel(global.TP.WR)
      .update((r) => {
        r.C2.value = `${r.C1.value}!`;
      });
    expect(valueAt(2, 2)).toBe('2-1 Value!');
    expect(valueAt(6, 2)).toBe('6-1 Value!');
  });

  it('WRITE_LEVEL_TABLE flushes once at the end', () => {
    mount()
      .setReadLevel(global.TP.RT)
      .setWriteLevel(global.TP.WT)
      .update((r) => {
        r.C2.value = `${r.C1.value}!`;
      });
    expect(valueAt(2, 2)).toBe('2-1 Value!');
    expect(valueAt(6, 2)).toBe('6-1 Value!');
  });
});

describe('READ_LEVEL_ROW', () => {
  it('reads correct cell values', () => {
    const seen = [];
    mount()
      .setReadLevel(global.TP.RR)
      .select((r) => {
        seen.push(r.C1.value);
        return false;
      });
    expect(seen).toEqual(['2-1 Value', '3-1 Value', '4-1 Value', '5-1 Value', '6-1 Value']);
  });

  it('WRITE_LEVEL_CELL writes each assignment straight through', () => {
    mount()
      .setReadLevel(global.TP.RR)
      .setWriteLevel(global.TP.WC)
      .update((r) => {
        r.C2.value = `${r.C1.value}!`;
      });
    expect(valueAt(2, 2)).toBe('2-1 Value!');
    expect(valueAt(6, 2)).toBe('6-1 Value!');
  });

  it('WRITE_LEVEL_ROW flushes a row at a time', () => {
    mount()
      .setReadLevel(global.TP.RR)
      .setWriteLevel(global.TP.WR)
      .update((r) => {
        r.C2.value = `${r.C1.value}!`;
      });
    expect(valueAt(2, 2)).toBe('2-1 Value!');
    expect(valueAt(6, 2)).toBe('6-1 Value!');
  });

  it('writes each row to its own position, not a neighbour', () => {
    mount()
      .setReadLevel(global.TP.RR)
      .setWriteLevel(global.TP.WR)
      .update((r) => {
        r.C2.value = r.C1.value;
      });
    for (let row = 2; row <= 6; row += 1) {
      expect(valueAt(row, 2)).toBe(valueAt(row, 1));
    }
  });

  it('downgrades WRITE_LEVEL_TABLE to WRITE_LEVEL_ROW', () => {
    const table = mount().setReadLevel(global.TP.RR).setWriteLevel(global.TP.WT);
    expect(table.getOptions().writeLevel).toBe(global.TP.WR);
  });
});

describe('level validation', () => {
  it('rejects an unknown read level', () => {
    expect(() => mount().setReadLevel('NOPE')).toThrow(/readLevel must be one of/);
  });

  it('rejects an unknown write level', () => {
    expect(() => mount().setWriteLevel('NOPE')).toThrow(/writeLevel must be one of/);
  });
});
