# attic

Kept for the record. **Nothing here is used, built, linted, tested, or shipped.**

## `map-unique-2019.js`

The hand-rolled `Map` and `UniqueSet` that this library ran on from 2019 until 2026. Replaced by
`src/keyed-map.js`.

It exists because Google Apps Script ran on **Rhino**, which had no native `Map` and no native `Set`.
There was nothing to import, so I wrote them.

The file is **byte-identical** to the original — no reformatting, no lint fixes, no tidying. It still
contains the bare `toString.call()` calls that only work in sloppy mode, and a stray
`Browser.msgBox(key)` left in an error path from a debugging session seven years ago. Verify with:

```bash
git show master:src/map-unique.js | sha256sum
sha256sum attic/map-unique-2019.js
```

### What it shows

Four platform constraints and the four workarounds they forced, all visible in the first fifty lines:

| Constraint                                 | What it produced                                                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No `Map`, so keys became object properties | `pvt_strings` / `pvt_numbers` / `pvt_booleans` / `pvt_dates` — keys partitioned by type, because a plain object stringifies every key it is given and `1` would otherwise collide with `'1'` |
| Objects had no guaranteed key order        | `pvt_keys`, a parallel array maintained by hand to preserve insertion order                                                                                                                  |
| No `Set`                                   | `UniqueSet extends Map`, with values simply left undefined                                                                                                                                   |
| No cheap key removal                       | `delete()` does `pvt_keys.indexOf(key)` — O(n)                                                                                                                                               |

Its own header comment conceded it was "about 10 times slower than native JS Map."

### Why it isn't just a curiosity

Partitioning keys by type meant they were used as **object property names**, so they were
stringified. Two different `Date` objects for the same instant therefore produced the same key and
compared **equal**.

Native `Map` compares object keys by identity, so it does the opposite. Sheets hands back real
`Date` objects for date-formatted cells, and `writeRecords` matches rows on exactly those values — so
replacing this class with a bare `new Map()` would have silently broken every match on a date column,
with no error to follow.

`src/keyed-map.js` normalizes keys to tagged primitives over a native `Map` specifically to preserve
that behavior. An accident of this implementation turned out to be load-bearing, which is the whole
argument for reading old code before replacing it.

See the "The shims" section of [DESIGN.md](../DESIGN.md) for the longer version.
