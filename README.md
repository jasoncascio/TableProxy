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

## Mounting

`mount()` takes a sheet name (plus an optional header anchor token), or an options object:

```js
const table = TP.mount('Invoices');
const table = TP.mount('Invoices', 'HEADER_ANCHOR');

const table = TP.mount({
  spreadsheetId: '1abc...', // omit to use the active spreadsheet
  sheetName: 'Invoices', // omit to use the active sheet
  readLevel: TP.RT,
  writeLevel: TP.WT,
  columnFilter: ['id', 'status'],
  exportAttributes: [TP.AV, TP.AB],
  computedProperties: {
    total() {
      return this.qty.value * this.price.value;
    },
  },
  idAttributeName: TP.AV,
  autoResizeColumns: false,
});
```

Most of these can also be changed after mounting, with the matching `set*` method — the option name
and the setter name agree (`columnFilter` ↔ `setColumnFilter`). The three that identify the sheet —
`spreadsheetId`, `sheetName`, `headerAnchorToken` — are fixed once mounted.

| Option               | Type                        | Default            | What it does                                                                                     |
| -------------------- | --------------------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| `spreadsheetId`      | string                      | active spreadsheet | Which spreadsheet to open.                                                                       |
| `sheetName`          | string                      | active sheet       | Which sheet to mount. Throws if the name doesn't exist.                                          |
| `headerAnchorToken`  | string                      | `null`             | Note token marking the header cell. Can only be set once.                                        |
| `readLevel`          | `TP.RT` / `TP.RR`           | `TP.RT`            | Whole table per read, or one row at a time.                                                      |
| `writeLevel`         | `TP.WC` / `TP.WR` / `TP.WT` | `TP.WC`            | Write per cell, per row, or once at the end.                                                     |
| `columnFilter`       | string \| array             | `[]` (all)         | Restrict records to these columns.                                                               |
| `exportAttributes`   | string \| array             | `['value']`        | Attributes `getExportObject()` fetches. **Replaces** the set — include `'value'` if you want it. |
| `computedProperties` | object of functions         | `{}`               | Derived columns. See below.                                                                      |
| `idAttributeName`    | attribute name              | `'value'`          | Which attribute of the id column `writeRecords` matches on.                                      |
| `autoResizeColumns`  | boolean                     | `false`            | Auto-resize every column after each operation.                                                   |

`idColumnName` — the column `writeRecords` matches on — takes the first header cell when you don't
name one.

Invalid values are rejected at set time, not at use time: a bad `readLevel`, a non-boolean
`autoResizeColumns`, or a non-function computed property all throw immediately.

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

Each attribute also has a two-letter constant (`TP.AV`, `TP.AB`, … see
[Constants](#constants-on-the-tp-namespace)) for the methods that take an attribute name.

They are readable _and_ queryable, so "find every row someone manually highlighted" is a normal
query rather than a special case:

```js
const flagged = table.select((row) => row.status.background === TP.WARNING, true).getRecords();
```

Alongside the columns, every record carries its zero-based row index under `TP.$` (the property is
literally named `' index '`, spaces included, so it can't collide with a real column):

```js
table.select((row) => row[TP.$] > 10);
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

`select(query, withRecords)` — pass `true` for `withRecords` to materialize the matching records
during the pass; otherwise only the indices are kept and `getRecords()` re-reads later.

> **The one thing to know about queries:** TableProxy decides which attributes to fetch by
> stringifying your query and looking for `.background`, `['note']`, and so on. It only fetches what
> the source text mentions, which is what makes a value-only query one read instead of nine — but it
> cannot see through indirection. `row[col][attr]` with variables matches nothing, and a query
> mentioning no attribute at all (`() => true`) reads nothing at all, yielding records whose columns
> are empty objects. Name the attributes literally, or pass them explicitly where a method allows it.
> [DESIGN.md](./DESIGN.md#working-out-what-to-read) covers the tradeoff.

Records can also be written back in bulk, matched on an id column:

```js
table.writeRecords([{ id: { value: 'INV-1001' }, status: { value: 'paid' } }]);
table.writeRecords(rows, 'sku', TP.AV); // ...or override the match column/attribute per call
table.writeRecords([{ [TP.$]: 12, status: { value: 'paid' } }]); // ...or match by row index
```

The match column must be unique, or the write throws. Records that don't match any row become
warnings rather than errors; records missing the match column become errors. Both come back from
`getLastResults()`. `writeCursor()` is the same operation applied to the records currently in the
cursor — mutate what `getRecords()` handed you, then push it back.

## The mounted API

Everything returned by `mount()`. Methods marked **chainable** return the table itself.

### Query and cursor

| Method                             | Returns   | Notes                                                                              |
| ---------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| `select(query, withRecords)`       | chainable | Narrows the cursor to matching rows.                                               |
| `update(query)`                    | chainable | Runs the query over the cursor for its side effects.                               |
| `getRecords()`                     | array     | The cursor's records, re-reading first if it went stale.                           |
| `getUnique(columnName, attribute)` | array     | Distinct values, `attribute` defaulting to `value`.                                |
| `setRows(indices, oneIndexed)`     | chainable | Sets the cursor to explicit row indices; pass `true` for 1-based sheet positions.  |
| `loadSelectedRows(attributes)`     | chainable | Sets the cursor to the rows highlighted in the Sheets UI; always includes `value`. |
| `flush()`                          | chainable | Resets the cursor to every record and drops the fetched attributes.                |
| `getSelectedIndices(asPos)`        | array     | Zero-based indices, or 1-based sheet positions with `true`.                        |
| `selectionLength()`                | number    | Size of the cursor.                                                                |

### Writing

| Method                                                       | Returns   | Notes                                                                  |
| ------------------------------------------------------------ | --------- | ---------------------------------------------------------------------- |
| `writeRecords(records, matchColumnName, matchAttributeName)` | chainable | Bulk write matched on an id column, or on `TP.$`.                      |
| `writeCursor()`                                              | chainable | Writes the cursor's records back.                                      |
| `insertRow(TP.T \| TP.B, dataObject)`                        | chainable | Inserts at top or bottom; optionally populates the new row.            |
| `deleteRow(rowPosition)`                                     | chainable | 1-based position; omit to delete the last row. Refuses the header row. |

### Introspection

| Method                                                | Returns  | Notes                                                                                                                                                                               |
| ----------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getHeaderRow()`                                      | array    | A copy of the header row.                                                                                                                                                           |
| `getOptions()`                                        | object   | The current settings (see below).                                                                                                                                                   |
| `getLastResults()`                                    | array    | `[key, value]` pairs describing the last operation, including its duration in ms.                                                                                                   |
| `getExportObject(rawDataOnly)`                        | object   | `{ computedProperties, selected, rawData }`, honoring `exportAttributes` and `columnFilter`. With `true`, `selected` is just indices and `rawData` carries the whole sheet payload. |
| `getFullDataIndex(columnName, attribute, oneIndexed)` | KeyedMap | Cell value → row position, with an `isUnique` flag. No arguments gives every record index. Reads one column directly, bypassing the cursor.                                         |

`getOptions()` reports `spreadsheetId`, `sheetName`, `headerAnchorToken`, `exportAttributes`,
`writeLevel`, `autoResizeColumns`, `computedProperties`, `idColumnName`, `idAttributeName`, and
`columnFilter` when one is set. `readLevel` is not included.

### Configuration

All chainable: `setColumnFilter`, `setExportAttributes`, `exportWithAllAttributes`, `setReadLevel`,
`setWriteLevel`, `setAutoResizeColumns`, `setComputedProperties`, `setIdColumnName`,
`setIdAttributeName`. Plus `getColumnFilter()`, which returns a copy.

```js
table.setColumnFilter(['id', 'status']); // limit records to these columns
table.setIdColumnName('id'); // match key for writeRecords (defaults to the first column)
table.setIdAttributeName(TP.AB); // ...matched on background instead of value
table.setExportAttributes([TP.AV, TP.AB]);
table.exportWithAllAttributes(); // all nine
table.setAutoResizeColumns(true);
```

## Constants on the `TP` namespace

`TP` carries `mount`, the `Timer` class, the `strContains` helper, and these:

| Group       | Constants                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Index prop  | `$` (`' index '`)                                                                                                                          |
| Read level  | `RT` table, `RR` row                                                                                                                       |
| Write level | `WC` cell, `WR` row, `WT` table                                                                                                            |
| Position    | `T` top, `B` bottom                                                                                                                        |
| Attributes  | `AV` value, `AB` background, `AC` fontcolor, `AN` note, `AZ` fontsize, `AS` fontstyle, `AF` fontfamily, `AW` fontweight, `AD` numberformat |
| Formats     | `DS` `mm/dd/yy`, `DST` `mm/dd/yy h:mm`, `NINT` `#,##0`, `NP1` `#,##0.0`, `NP2` `#,##0.00`                                                  |
| Colors      | `SUCCESS`, `FAILURE`, `WARNING`, plus `RED`, `WHITE`, `BLUE`, `GREEN`, `ORANGE`, `BLACK`, `GREY`, `YELLOW`, `LIGHT_GREY`                   |

They're defined with `writable: false`, so they can't be clobbered by accident.

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

## Utilities

A second bundle ships alongside the table API, independent of it — no mounting, no sheet required:

```js
$initUtils('U'); // registers the global; name it whatever you like, or `Utils` by default

U.getValueByName('CONFIG_EMAIL');
U.updateValueByName('LAST_RUN', new Date());
U.sendEmail(['a@x.com', 'b@x.com'], 'Nightly sweep', body);
```

**Sheets objects** — `getSheetsObjectType` (duck-typed: `'Spreadsheet'`, `'Sheet'`, `'Range'`, or
`undefined`), `isSpreadsheet`, `isSheet`, `isRange`, `getSpreadsheet(id)`, `getSheet(sheetOrName)`,
`getSheetIndex(name, id)`, `getShape` (`'5x3'` for a 2-D array or a Range),
`getSelectedRowIndices()`.

**Named ranges** — `namedRangeExists`, `getValueByName`, `updateValueByName` (size-checked; handles
merged cells), `getCoordinatesByName`, and `getNamedRangesObject()`, which hands back an object whose
properties read and write the ranges live:

```js
const ranges = U.getNamedRangesObject();
ranges.QUARTER = 'Q3'; // writes straight through to the sheet
```

**Types** — `isString`, `isNumeric`, `isBoolean`, `isArray`, `isObject`, `isFunction`, `isDate1`,
`isNull`, `isUndefined`, `isSupportedType` (what a cell can hold), `getType`, `inArray`, `toBool`.

**Values and text** — `firstToUpper`, `isEmail`, `isJson`, `toJson`, `getTimeStamp`, `getTimeDiff`,
and token interpolation: `getTokens('Hi {{!name.value}}')` pulls the token list,
`tokenInterpolate(template, record)` fills it from a record — dotted paths and all, so it takes
TableProxy records directly.

**Duplicates** — `removeDuplicates(array)`, `getDuplicates(array)`, `testUnique(array)`. These are
backed by the same keyed container the library uses internally, so `Date` values compare by instant
rather than by object identity.

`sendEmail(to, subject, body, htmlBody)` rounds it out; `to` accepts a string or an array.

## One table, one sheet

There is no `setSheetName()`. `mount()` resolves the sheet and `SheetAccessor` caches its header row
and shape at that moment, so a table is bound to the sheet it was mounted on for its lifetime. Mount
a second table for a second sheet — they're cheap, and they keep their own cursors.

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

Writing the API reference above found four more of exactly that kind, which is its own argument for
documenting a thing method by method: an `idColumnName` passed to `mount()` was discarded, a setter
that could only throw, an index conversion that ran backwards, and a default that overwrote the
library's own global. Each is now pinned by a test.

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

Jason Cascio — [12jac26@gmail.com](mailto:12jac26@gmail.com) · [github.com/jasoncascio](https://github.com/jasoncascio)

## License

[MIT](./LICENSE) © Jason Cascio

[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)
