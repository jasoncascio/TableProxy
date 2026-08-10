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

It's built from `defineProperty` because Rhino had no `Proxy`. Apps Script's V8 runtime has `Proxy`
now, and a trap-based version would be shorter and handle columns that appear at runtime. I've kept
the original — it works, it's covered by tests, and it's what the project actually is.

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

I'd still make the same call. The alternative is asking callers to declare their attributes up
front, and they would get it wrong constantly, in the direction of silently reading nothing.

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

## What held up

The parts I'd keep unchanged: attributes as first-class data, the record proxy, and making batching
an explicit setting rather than a guess. The 2026 modernization replaced the containers, the
toolchain and a pile of bugs, but the shape of the thing is the same, because that part was right.
