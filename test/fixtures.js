/**
 * Shared sheet fixtures.
 *
 * `basicSheet` keeps the same shape the original simulation used (C1..C5
 * headers over five data rows) so behavior pinned here is comparable to what
 * the 2019 browser harness exercised.
 */

import { installFakes } from './fakes/index.js';

export const HEADER_ANCHOR = 'HEADER_ANCHOR';

export function basicValues() {
  return [
    ['C1', 'C2', 'C3', 'C4', 'C5'],
    ['2-1 Value', '2-2 Value', '2-3 Value', '2-4 Value', '2-5 Value'],
    ['3-1 Value', '3-2 Value', '3-3 Value', '3-4 Value', '3-5 Value'],
    ['4-1 Value', '4-2 Value', '4-3 Value', '4-4 Value', '4-5 Value'],
    ['5-1 Value', '5-2 Value', '5-3 Value', '5-4 Value', '5-5 Value'],
    ['6-1 Value', '6-2 Value', '6-3 Value', '6-4 Value', '6-5 Value'],
  ];
}

/**
 * A sheet whose header row is row 1 (no anchor token).
 */
export function installBasicSheet(overrides = {}) {
  return installFakes({
    sheets: {
      Test: {
        values: basicValues(),
        ...overrides,
      },
    },
    activeSheetName: 'Test',
  });
}

/**
 * A sheet with two leading junk rows and a header row marked by a note
 * containing HEADER_ANCHOR, exercising the headerAnchorToken path.
 */
export function installAnchoredSheet() {
  const values = [['Some title', '', '', '', ''], ['', '', '', '', ''], ...basicValues()];
  const notes = values.map((row) => row.map(() => ''));
  notes[2][0] = `${HEADER_ANCHOR} do not edit`;

  return installFakes({
    sheets: {
      Test: {
        values,
        attributes: { note: notes },
      },
    },
    activeSheetName: 'Test',
  });
}

/**
 * A wide/tall sheet for round-trip cost assertions.
 */
export function installLargeSheet({ rows = 200, columns = 10 } = {}) {
  const header = Array.from({ length: columns }, (unused, c) => `col${c + 1}`);
  const body = Array.from({ length: rows }, (unused, r) =>
    Array.from({ length: columns }, (unused2, c) => `r${r + 1}c${c + 1}`),
  );
  return installFakes({
    sheets: { Test: { values: [header, ...body] } },
    activeSheetName: 'Test',
  });
}
