# Design notes

This was my first real development project. I wrote it in 2019 to force myself deeper into
JavaScript than my work required, with no formal background — I had never read anything on design
patterns and didn't know the names for most of what I was doing.

These notes cover the decisions that shaped it, why the constraints of the platform pushed them that
way, and where they turned out to be wrong. The mistakes are here too; they're the more useful half.

---

## The central idea: formatting is data

A spreadsheet cell isn't just a value. It has a background, a font color, a note, a number format.
People encode real meaning in those — a highlighted row _means_ something, a note _is_ a field —
but every Sheets library I found treated them as presentation, if it handled them at all.

So the model here is that a cell has nine **attributes** and `value` is merely the default one:

```js
row.status.value; // 'overdue'
row.status.background; // '#FFB4B4'
row.status.note; // 'Flagged by the nightly sweep'
```

Read, written, and filtered identically. `SUPPORTED_ATTRIBUTES` in `src/CONSTANTS.js` is the list,
and it flows through everything downstream — the accessors, the proxy, the payload — so the nine are
never special-cased individually.

The practical payoff is that "find every row somebody manually highlighted" is an ordinary query
rather than a feature someone has to add.

## The record proxy

`src/record-proxy.js` builds an object where each column is a small object whose attributes are
`defineProperty` getter/setter pairs closing over `(attribute, columnIndex)`. Reading a property
pulls from the current row; assigning writes through.

```js
recordProxy[column][attribute] -> get: dataController.getColumnByIndex(attribute, columnIndex)
                                  set: dataController.updateColumnByIndex(attribute, columnIndex, v)
```

The proxy is built **once per query** and re-pointed at each row as the cursor advances, rather than
being rebuilt per row. That mattered: it defines one property per column per requested attribute, so
a 50-column sheet costs 50 definitions for a query touching only `value` and up to 450 if all nine
are in play. Rebuilding that for each of 5,000 rows would have dominated the run.

That optimization has a consequence I don't think I fully appreciated at the time. **Every row in a
query sees the same object.** Not an equivalent one — the same one:

```js
const seen = [];
table.select((r) => {
  seen.push(r);
  return false;
});

seen.length; // 3
seen.every((o) => o === seen[0]); // true
```

Which means anything you keep a reference to during a query is a live view of wherever the cursor
happens to be now, not the row you saw it on. That's why `process-query.js` snapshots with
`clone(recordProxy)` before pushing a result. Drop that single call and every record returned from a
query would report the last row's data, three times over — a bug that would look like a data problem
rather than an aliasing problem, and would be miserable to find.

Records also carry a reserved `' index '` property holding their row index, defined before the
columns are. The leading and trailing spaces are the point: header names are trimmed on the way in,
so no real column can produce that string. It's a namespace reserved by picking a key the data
can't generate. Convention rather than enforcement — but it costs nothing and it works.

It's built from `defineProperty` because Rhino had no `Proxy`. Apps Script's V8 runtime has `Proxy`
now, and a trap-based version would be shorter and handle columns that appear at runtime. I've kept
the original — it works, it's covered by tests, and it's what the project actually is.

## The same trick, one level up: named ranges

`getNamedRangesObject` in `src/sheets-utilities.js` applies the identical idea at a different scale.
Instead of columns on a row, it turns every **named range in the spreadsheet** into a property on a
plain object:

```js
const config = U.getNamedRangesObject();

config.taxRate; // 0.08   — reads the cell, right now
config.taxRate = 0.11; // writes it
```

A "Settings" sheet with named cells becomes a config object. No loading step, no sync step, no stale
copy to invalidate — the object _is_ the sheet.

Two details worth pointing at. First, the accessor adapts to the range's shape, decided once when
the object is built rather than on every access:

```js
if (getShape(range) === '1x1' || range.isPartOfMerge()) {
  getter = () => range.getValue(); // scalar
} else {
  getter = () => range.getValues(); // 2d array
}
```

So `config.taxRate` hands back a number while `config.rateTable` hands back a grid, which is what
you'd want in both cases. Merged ranges are folded in with the 1×1 case because `getValues()` on a
merge returns the whole block padded with blanks.

Second, the properties are `enumerable: true, configurable: false` — they show up in `Object.keys`,
but can't be deleted or redefined out from under you.

**The cost model is the interesting part, and it cuts both ways.** Measured against the fake:

| Operation                            | Round trips |
| ------------------------------------ | ----------: |
| Building the object (2 named ranges) |           6 |
| Reading one property                 |           1 |
| Reading the same property five times |           5 |
| `JSON.stringify(config)`             |           2 |

Building it reads no cell values at all — it costs one `getNamedRanges()` plus a `getRange()` each,
and nothing more. Everything is deferred to access. On a spreadsheet with forty named ranges where
you need two of them, that's the right trade by a wide margin.

But there is no caching, so reading the same property in a loop is a round trip per iteration. And
because the properties are enumerable getters, `JSON.stringify(config)` — or anything else that
walks the object — silently fires one API call per named range. It looks like touching a plain
object and it isn't. I'd add memoization with an explicit `refresh()` if I were doing it again; the
laziness is right, the absence of any cache is not.

One more caveat I only noticed while writing this up: each accessor closes over the `Range` object
resolved at build time, so it captures the range's _coordinates_. If someone redefines the named
range to point somewhere else afterwards, the object keeps writing to the old location. Rebuild it
if the sheet's structure can change underneath you.

This function was also completely dead under V8 until the 2026 pass, for a reason that had nothing
to do with it: it calls `getShape`, which calls `isRange`, which called the broken
`getSheetsObjectType`. One bad line took down one of the better ideas in the codebase, in a file two
levels away.

## Working out what to read

This is the piece I'd point at first.

Apps Script bills you in round trips. `getBackgrounds()` on a large sheet is expensive, and fetching
all nine attributes when a query only looks at `value` is eight wasted calls. But the query is an
arbitrary function — there's no way to ask it what it will touch.

So `src/query-driver.js` stringifies it and reads the source:

```js
const queryAsString = query.toString();
SUPPORTED_ATTRIBUTES.forEach((attribute) => {
  const re1 = new RegExp(`[[]{1}['|"]{1}${attribute}['|"]{1}[]]{1}`); // r['background']
  const re2 = new RegExp(`[.]{1}${attribute}[^a-zA-Z0-9]`); // r.background
  if (re1.test(queryAsString) || re2.test(queryAsString)) {
    this.requestedAttributesSet.push(attribute);
  }
});
```

Only the attributes that actually appear get fetched. On the common case — a query touching `value`
alone — that's one read instead of nine.

**It is also unmistakably a hack**, and worth being clear-eyed about. It reads source text, so it
cannot see through indirection: `r[col][attr]` with variables matches nothing. That's not
hypothetical — `getUnique` builds exactly such a query and has to call `.addAttribute(attr)`
explicitly to compensate. Anything that stringifies differently would break it.

The sharpest edge is that a query mentioning no attribute at all reads nothing at all:

```js
table.select(() => true, true).getRecords();
// -> records whose columns are empty objects. Nothing was fetched,
//    because nothing in the source said `.value`.
```

That is consistent — it fetched precisely what the query asked for, which was nothing — but it looks
like data loss. The library papers over it where it can (`loadSelectedRows` forces `value` in,
`getExportObject` passes the configured export attributes explicitly), and a "select everything"
call is exactly the case where a caller wouldn't think to mention an attribute. If I were adding one
thing here it would be a floor: never resolve to an empty attribute set, fall back to `value`.

I'd still make the same call overall. The alternative is asking callers to declare their attributes
up front, and they would get it wrong constantly — in this same direction, silently reading nothing.

## Batching: read and write levels

Rather than guess, the batching strategy is an explicit setting:

```js
table.setReadLevel(TP.RT); // whole table in one read, or RR for row at a time
table.setWriteLevel(TP.WT); // one flush at the end, or WR per row, or WC per cell
```

Measured, updating a 200-row sheet:

| Write level | 1 column | 3 columns |
| ----------- | -------: | --------: |
| `WT`        |        4 |         4 |
| `WR`        |      402 |       402 |
| `WC`        |      402 |      1202 |

`WC` scales with cells touched, `WR` with rows, `WT` is flat. They're all kept because they trade
against something real: `WC` writes immediately, so if a script hits the six-minute execution limit
partway through, the completed work has already persisted. `WT` would lose all of it.

## Choosing the strategy once

`src/data-controller.js` picks its read and write behavior at construction and stores the chosen
functions on the instance:

```js
if (this.readLevel === READ_LEVEL_ROW && this.writeLevel === WRITE_LEVEL_ROW) {
  this.setRowIndex = this.setRowIndex1;
} else if (...) {
```

The original comment above it read: _"I hate this, but figured it could do away with a lot of
potential if evaluations."_

The instinct was right — the levels can't change mid-iteration, so re-testing them per row (or per
cell, for writes) is pure waste — and hoisting a branch out of a hot loop is a reasonable thing to
want. I later learned this shape is usually called the Strategy pattern.

The discomfort in that comment was also right, for a different reason than I understood at the time.
Six numbered near-identical methods with no test coverage is a place bugs hide, and one did: the
`READ_LEVEL_ROW` write paths never worked at all. See below.

The same instinct shows up again in `process-query.js`, which builds the per-row evaluator once from
an immediately-invoked function and then loops over a closure with no branches left in it:

```js
const evaluator = (function getEvaluator() {
  if (queryDriver.withSelect) {
    if (queryDriver.returnWithRecords) {
      return (index) => {
        /* select, with records */
      };
    }
    return (index) => {
      /* select, without */
    };
  }
  return (index) => {
    /* update */
  };
})();

core.mainCursor.indices.forEach((index) => evaluator(index));
```

Two flags that are fixed for the whole run get resolved once instead of being re-tested thousands of
times. Appearing twice in unrelated files suggests it was a deliberate habit rather than a one-off.

## Generating the accessors

`src/sheet-accessor.js` builds 108 methods — nine attributes × get/set × six range shapes — from a
single nine-entry mapping table, giving `this.value.getRow(i)`, `this.background.setCell(r, c, v)`
and so on.

The awkward part is splitting the arguments, since `getCell(r, c)` takes two coordinates and
`setCell(r, c, value)` takes two plus a payload. It uses the range function's declared arity:

```js
range[method](...args.splice(rangeMethod.length, args.length));
```

`Function.length` marks the boundary between coordinates and payload. It works, and it collapses a
lot of repetition. It's also close to unreadable, and it silently depends on nobody ever giving
those range helpers a default parameter or a rest argument — either of which changes `.length` and
breaks the split with no warning. If I were writing it now I'd take the repetition.

## The cursor

`MainCursor` holds the current selection as row indices, so `select()` narrows and chains:

```js
table
  .select((row) => row.region.value === 'West')
  .select((row) => row.amount.value > 1000)
  .update((row) => {
    row.amount.numberformat = TP.NP2;
  });
```

It carries a dirty flag so records are re-read only when a mutation could have invalidated them.

## Finding the header

Real sheets have title rows, notes to colleagues, and filters above the actual header. Rather than
require the header at row 1, you can mark its first cell with a **note** containing a token:

```js
TP.mount('Invoices', 'HEADER_ANCHOR');
```

Notes are invisible to anyone reading the sheet and survive re-sorting, inserted rows, and renamed
columns — they attach to the cell, not the position. Using an existing attribute as out-of-band
metadata felt like a small trick at the time; it's held up better than most of what's here.

## What's immutable, and one thing that should have been

An instance is welded to its sheet. `spreadsheetId`, `sheetName` and `headerAnchorToken` all throw
if set twice:

```js
table.setSheetName('Other');
// Error: sheetName was already set to Invoices and cannot be changed.
```

That's deliberate, and I think right. A mounted table has a header row, a cursor full of row
indices, and a cached shape, all of which describe _that_ sheet. Re-pointing it would leave every
one of them silently wrong. Refusing is better than the alternative, which is a table that reads
from one sheet and writes to another.

The wart is that `setSheetName` is still exposed on the public API, where it can only ever throw
once mounting has happened — which is always. It's a method that cannot succeed.

The exported constants are locked down properly, via `objAssign` defining them non-writable and
non-configurable, so nobody can reassign `TP.WT` out from under the library. But there's a gap I
only found by checking the descriptors:

| Property                          | writable |
| --------------------------------- | -------- |
| `TP.WT`, `TP.RT`, `TP.SUCCESS`, … | `false`  |
| `TP.mount`                        | `true`   |
| `TP.Timer`, `TP.strContains`      | `true`   |

`objAssign(target, source)` only hardens what comes from `source`. `mount` is part of the target
object literal, so it stays an ordinary writable property. The colour constants are protected and
the entry point isn't — exactly backwards. Nothing has ever depended on it, and I've left the
behaviour alone rather than change a public contract in a documentation pass, but it's the sort of
thing that reads as intentional until you check.

## Timing everything

Every operation is wrapped in a `Timer`, and `getLastResults()` hands back what the last call did
along with how long it took:

```js
table.select((r) => r.region.value === 'West').getLastResults();
// [['operation', 'select'], ['completed', true], ['selected count', 42],
//  ['updated row count', 0], ['updated row indices', []], ['duration', 118]]
```

Apps Script kills a script at six minutes with nothing useful to say about where the time went, and
in 2019 there was no profiler worth the name. Building the measurement in — and logging the query's
own source alongside its duration, via `timer.stop(this.query.toString())` — was the only way to
find out which query was the expensive one.

It's the same reasoning that led me to instrument the test fake with API call counting during the
2026 pass, which is how every performance number in this document was produced. Measuring instead of
guessing was apparently the one good habit I had at the start.

## Patterns I didn't know I was using

I wrote all of this without having read anything about design patterns. Going back through it years
later, a lot of it has names.

That is not a claim to have invented anything. Patterns get catalogued precisely _because_ people
keep arriving at them independently — that's what makes them worth writing down. What's actually
interesting is which constraint forced which shape, and Apps Script's constraint is always the same
one: crossing into the Sheets service is expensive, so don't.

| What it's called                  | Where                                                    | What forced it                                                                  |
| --------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Virtual Proxy** / **Lazy Load** | `record-proxy.js`, `getNamedRangesObject`                | Reading a cell must not happen until somebody asks for it                       |
| **Unit of Work**                  | `WRITE_LEVEL_TABLE` — `changedAttributes` + `capWrite()` | Batch every mutation and commit once, because 200 writes cost 200 round trips   |
| **Strategy**                      | `data-controller.js` binding its methods up front        | The read/write level can't change mid-run, so don't re-test it per row          |
| **Builder**                       | `QueryDriver`'s chained `setX()` returning `this`        | A query needs assembling from several optional parts before it runs             |
| **Fluent interface**              | `select().select().update()`                             | Narrowing a selection reads better as a chain                                   |
| **Facade**                        | the `api` object from `mount()`, and `Utils`             | Hide `SheetAccessor` / `DataController` / `QueryDriver` behind something usable |
| **Adapter**                       | the 108 generated accessors                              | Turn nine differently-named Sheets method pairs into one uniform interface      |

Two more are partial matches, and the qualification matters:

- **Active Record**, sort of. `row.status.value = 'paid'` persists itself, which is the essence of
  it — but a real Active Record owns its `save()`. Here persistence is delegated to
  `DataController`, so it's a record object with write-through semantics rather than the pattern
  proper.
- **Identity Map**, loosely. `DataPayload.getDataIndex` builds a key-column → row-index lookup so
  `writeRecords` doesn't re-scan per record. It fills the same role but makes none of the guarantees
  a real Identity Map does — nothing ensures one object per row.

And the honest conclusion, which is the reason this section is worth writing at all:

**Arriving at the shape is the easy half.** What I was missing wasn't the diagram, it was the
discipline that comes with it. A Strategy implementation done properly has one interface that every
strategy satisfies; mine was six numbered methods with nothing enforcing that they behaved alike, and
two of them — the `READ_LEVEL_ROW` write paths — turned out never to have worked. A shared contract,
or simply a test per strategy, would have caught that in 2019 instead of 2026. My Unit of Work has no
transaction boundary and no rollback: if `capWrite()` fails halfway, the sheet is left half-written
and nothing knows. The literature doesn't just hand you the structure, it hands you the failure modes
other people already hit.

---

## What went wrong

The single decision that cost the most was **not writing tests**. Everything below follows from it.

**Four API methods were broken and shipped that way.** `MainCursor` had a getter for `isDirty` and
no setter, while `index.js` assigned to it in four places. In strict mode that throws. `update`,
`writeRecords`, `setColumnFilter` and `setComputedProperties` were all dead. Three of those
assignments came from the last commit I made in 2019 — a commit that was never built and never run,
which I only found out seven years later by building it.

**`READ_LEVEL_ROW` could read but never write.** In row mode the payload holds one row at index 0,
but every write strategy indexed it by the absolute sheet row number, so it dereferenced `undefined`
every time. Half the strategy matrix had never been executed.

**I parsed an error message to get a type.** `getSheetsObjectType` called a method it knew didn't
exist and scraped the type out of the exception text. That worked on Rhino, which said
`Cannot find function getGibberish in object Sheet.` V8 says `... is not a function` — no `object`
in it — so the parse returned `undefined` and the next line threw. That took `isSpreadsheet`,
`isSheet` and `isRange` down, and through `getShape`, four of the six named-range helpers with them.
The lesson isn't subtle: an error message is not an API.

**My clone methods didn't clone.** `getShallowClone` used `Object.create(this)`, which produces an
object that inherits from the original — reads pass through and writes land on the source. They were
called nowhere, which is the only reason it never surfaced.

**Some of it was just wrong.** `getSheetIndex` compared a Sheet object against a name string, so it
always returned `-1`. `namedRangeExists` tested for `undefined` where the API returns `null`, so it
always returned `true`. Ten setters returned values, which JavaScript discards.

## The shims

There was no native `Map` or `Set` on Rhino, so I wrote them. Mine partitioned keys into four plain
objects by type, kept a parallel array for insertion order, and deleted with `indexOf`. My own header
comment noted it was about ten times slower than a real `Map`.

They're gone now, but not replaced with a bare `new Map()`, and the reason is worth recording. My
version used keys as object property names, so they were stringified — which meant two `Date` objects
for the same instant collided and compared **equal**. Native `Map` compares them by identity. Sheets
returns real `Date` objects for date cells, and `writeRecords` matches rows on exactly that, so a
straight swap would have silently broken every match on a date column. `src/keyed-map.js` normalizes
keys to tagged primitives over a native `Map` to keep the old semantics.

An accident of the 2019 implementation turned out to be load-bearing. Worth remembering before
replacing anything that looks obviously outdated.

The original is kept at [`attic/map-unique-2019.js`](./attic/map-unique-2019.js), byte-identical and
excluded from the build, the linter and the tests. Four platform constraints and their four
workarounds are legible in its first fifty lines — see [`attic/README.md`](./attic/README.md). It is
also still carrying a `Browser.msgBox` I left in an error path while debugging, which is its own kind
of documentation.

## What held up

The parts I'd keep unchanged: attributes as first-class data, the record proxy, and making batching
an explicit setting rather than a guess. The 2026 modernization replaced the containers, the
toolchain and a pile of bugs, but the shape of the thing is the same, because that part was right.
