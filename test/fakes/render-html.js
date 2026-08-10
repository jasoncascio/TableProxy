/**
 * Optional debugging helper, salvaged from the original src/test.html harness.
 *
 * Renders a SheetData to an HTML table so a failing test's sheet state can be
 * eyeballed. Pure string output — no DOM dependency, so it works in Node.
 *
 * Usage in a failing test:
 *   import { writeFileSync } from 'node:fs';
 *   writeFileSync('/tmp/sheet.html', renderSheetHtml(env.sheetData('Test')));
 */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {import('./sheet-data.js').SheetData} sheetData
 * @param {object} [options]
 * @param {number} [options.maxRows] cap output height (defaults to data extent)
 * @param {number} [options.maxColumns] cap output width (defaults to data extent)
 */
export function renderSheetHtml(sheetData, options = {}) {
  const extent = sheetData.getDataExtent();
  const rows = options.maxRows ?? extent.numRows;
  const columns = options.maxColumns ?? extent.numColumns;

  const grids = Object.fromEntries(
    [
      'value',
      'background',
      'fontcolor',
      'fontfamily',
      'fontsize',
      'fontstyle',
      'fontweight',
      'note',
    ].map((name) => [name, sheetData.gridFor(name)]),
  );

  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    const row = [];
    for (let c = 0; c < columns; c += 1) {
      const style = [
        `background-color:${grids.background[r][c]}`,
        `color:${grids.fontcolor[r][c]}`,
        `font-family:${grids.fontfamily[r][c]}`,
        `font-size:${grids.fontsize[r][c]}px`,
        `font-style:${grids.fontstyle[r][c]}`,
        `font-weight:${grids.fontweight[r][c]}`,
        'padding:4px 8px',
        'border:1px solid #ccc',
      ].join(';');
      const note = grids.note[r][c];
      const marker = note ? ` <abbr title="${escapeHtml(note)}">*</abbr>` : '';
      row.push(`<td style="${style}">${escapeHtml(grids.value[r][c])}${marker}</td>`);
    }
    cells.push(`<tr>${row.join('')}</tr>`);
  }

  return [
    '<!doctype html><meta charset="utf-8">',
    '<table style="border-collapse:collapse;font:13px system-ui">',
    cells.join(''),
    '</table>',
  ].join('');
}
