# TableProxy

A Google Apps Script library for querying and updating Google Sheets, where **cell formatting is
data too**.

Most Sheets ORMs give you cell values. TableProxy treats a cell's background, font color, note,
number format, and font styling as first-class attributes you can read, filter on, and write —
using the same syntax you use for values.

```js
// Highlight every overdue invoice in red, and note why.
table.update((row) => {
  if (row.dueDate.value < new Date() && row.status.value !== 'paid') {
    row.status.background = TP.FAILURE;
    row.status.fontweight = 'bold';
    row.status.note = 'Flagged by the nightly sweep';
  }
});
```

Nothing here is a separate "formatting API" bolted on the side. `row.status.value` and
`row.status.background` are the same kind of thing.

---

## Install

TableProxy is an Apps Script library. Add it by script ID from **Editor → Libraries**, or build and
push it into your own project:

```bash
npm ci
npm run build     # -> dist/TableProxy-1.0.0.js
npm run upload    # clasp push
```

Then, in your script:

```js
$initTableProxy('TP'); // registers the global; name it whatever you like
const table = TP.mount('Invoices');
```

`mount()` takes a sheet name, or an options object:

```js
const table = TP.mount({
  spreadsheetId: '1abc...', // omit to use the active spreadsheet
  sheetName: 'Invoices',
  readLevel: TP.RT,
  writeLevel: TP.WT,
});
```

## The core idea: attributes

Every column on a record exposes nine attributes, each backed by the corresponding Sheets getter and
setter:

| Attribute      | Sheets methods                          |
| -------------- | --------------------------------------- |
| `value`        | `getValues` / `setValues`               |
| `background`   | `getBackgrounds` / `setBackgrounds`     |
| `fontcolor`    | `getFontColors` / `setFontColors`       |
| `note`         | `getNotes` / `setNotes`                 |
| `fontsize`     | `getFontSizes` / `setFontSizes`         |
| `fontstyle`    | `getFontStyles` / `setFontStyles`       |
| `fontfamily`   | `getFontFamilies` / `setFontFamilies`   |
| `fontweight`   | `getFontWeights` / `setFontWeights`     |
| `numberformat` | `getNumberFormats` / `setNumberFormats` |

They are readable _and_ queryable, so "find every row someone manually highlighted" is a normal
query rather than a special case:

```js
const flagged = table.select((row) => row.status.background === TP.WARNING, true).getRecords();
```

## Querying

`select` narrows the cursor; `update` mutates in place; both are chainable.

```js
table
  .select((row) => row.region.value === 'West')
  .select((row) => row.amount.value > 1000)
  .update((row) => {
    row.amount.numberformat = TP.NP2;
  });

table.getSelectedIndices(); // zero-based row indices
table.selectionLength();
table.getUnique('region'); // distinct values in a column
table.getUnique('region', 'background'); // ...or in any attribute
```

Queries receive the record as the first argument and the row index as the second. `this` is bound to
the record as well, so `function (r) { return this.x.value }` works too.

Records can also be written back in bulk, matched on an id column:

```js
table.writeRecords([{ id: { value: 'INV-1001' }, status: { value: 'paid' } }]);
```

## Performance: read and write levels

Apps Script performance is almost entirely a function of **how many times you cross the
JavaScript/Sheets boundary**. Reading a thousand cells in one call is fast; reading them one at a
time is not. TableProxy makes that cost an explicit setting rather than an accident.

```js
table.setReadLevel(TP.RT); // RT = whole table in one read (default), RR = row at a time
table.setWriteLevel(TP.WT); // WC = per cell (default), WR = per row, WT = one flush at the end
```

Sheets calls made when updating a 200-row sheet, counted by the test suite's instrumented fake:

| Write level         | 1 column per row | 3 columns per row |
| ------------------- | ---------------: | ----------------: |
| `WT` (whole table)  |            **4** |             **4** |
| `WR` (row by row)   |              402 |               402 |
| `WC` (cell by cell) |              402 |              1202 |

`WT` buffers the whole update and writes once — prefer it for bulk edits. `WC` writes immediately,
which is what you want when a script may time out partway and partial progress needs to persist; its
cost scales with the number of _cells_ you touch. `WR` costs one write per row no matter how many
columns you change, so it pulls ahead of `WC` as soon as you touch more than one column.

The header scan is a single read regardless of sheet size.

Trade-off worth knowing: `RR` (row-at-a-time reads) keeps memory flat on very large sheets but costs
a read per row, and it forces `WT` down to `WR`, since there is no full-table buffer to flush.

## Header discovery

By default row 1 is the header. If your sheet has titles or filters above the real header, mark the
header cell with a **note** containing a token and pass it to `mount`:

```js
const table = TP.mount('Invoices', 'HEADER_ANCHOR');
```

TableProxy finds it in a single read and treats everything below it as records.

## Computed properties

Derived columns that behave like real ones:

```js
table.setComputedProperties({
  fullName() {
    return `${this.first.value} ${this.last.value}`;
  },
});

table.select((row) => row.fullName.value.startsWith('A'), true).getRecords();
```

## Other options

```js
table.setColumnFilter(['id', 'status']); // limit records to these columns
table.setIdColumnName('id'); // match key for writeRecords (defaults to the first column)
table.setIdAttributeName('value');
table.setExportAttributes(['value', 'background']);
table.exportWithAllAttributes();
table.setAutoResizeColumns(true);
table.insertRow(TP.T); // TP.T / TP.B
table.deleteRow(5); // 1-based position
table.getLastResults(); // what the last operation did, and how long it took
```

A bundle of Sheets helpers ships alongside, under `$initUtils('U')` — named-range accessors, type
predicates, `getShape`, `sendEmail`, token interpolation, and duplicate detection.

## Development

```bash
npm ci
npm test          # vitest
npm run test:watch
npm run lint
npm run format
npm run build
npm run deploy    # test + build + clasp push
```

Tests run against a fake `SpreadsheetApp` in `test/fakes/`, so no Google account is needed. The fake
deliberately mirrors real Sheets where it matters — it throws on out-of-range reads, returns `null`
(not an error) from `getSheetByName` for a missing sheet, and counts every API call so round-trip
cost can be asserted directly.

### What the tests do and don't prove

They prove internal consistency against _modeled_ Sheets behavior. They cannot prove real-Sheets
behavior. Specifically not covered: quotas, execution timeouts, `LockService`, concurrent edits,
formula recalculation, and permissions. `getSheetsObjectType` is duck-typed rather than verified
against live service objects. Treat a green suite accordingly.

`npm audit` reports moderate advisories reachable only through `@google/clasp`'s dependency tree.
They affect the deploy tool, never the code that runs in Apps Script, and the "fix" is a downgrade to
clasp 2.

---

## History

I wrote this in 2019 as a way to push on JavaScript harder than my day-to-day required. Apps Script
still ran on Rhino then, so there was no native `Map` or `Set` — I wrote my own. I had never read a
book on design patterns and didn't know the names for anything I was doing.

It was modernized in 2026: native containers replaced the shims, Babel came out (V8 runs the source
syntax natively), the toolchain was rebuilt, and the first test suite went in. That suite immediately
found a handful of real bugs, including four API methods broken by the last commit of 2019 — a commit
that was never built and never run.

The design survived intact. The record proxy, the attribute model, and the read/write levels are
unchanged in shape, because they were the right ideas.

**[DESIGN.md](./DESIGN.md)** goes through the decisions in detail — how queries are inspected to
avoid fetching attributes they never touch, why batching is an explicit setting, and which choices
turned out to be wrong.

## Prior art

[Tamotsu](https://github.com/itmammoth/Tamotsu) is a good Sheets ORM if you only need cell values.

## Thanks

[Amit Agarwal](https://digitalinspiration.com/google-developer) — the original build setup came from
his [apps-script-starter](https://github.com/labnol/apps-script-starter).

## Contact

Jason Cascio — [12jac26@gmail.com](mailto:12jac26@gmail.com) · [github.com/jac1226](https://github.com/jac1226)

## License

[MIT](./LICENSE) © Jason Cascio

[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)
