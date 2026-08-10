/**
 * KeyedMap / UniqueKeySet — insertion-ordered containers keyed by the scalar
 * types a spreadsheet cell can hold.
 *
 * HISTORY: this replaces a hand-rolled Map/Set written in 2019, when Apps
 * Script still ran on Rhino and had no native Map or Set. That version
 * partitioned keys across four plain objects by type, tracked insertion order
 * in a parallel array, and deleted with indexOf (O(n)). Its own header comment
 * noted it was "about 10 times slower than native JS Map". Apps Script has run
 * V8 since 2020, so the storage is now a native Map.
 *
 * WHY THIS ISN'T JUST A BARE NATIVE Map:
 *
 *   Sheets returns real Date OBJECTS for date-formatted cells. The old
 *   implementation used keys as object property names, so they were stringified
 *   and two Dates for the same instant collided — i.e. keys compared BY VALUE.
 *   Native Map compares Dates by IDENTITY, so `map.get(new Date(x))` would
 *   never find an entry stored under a different Date object for the same
 *   instant. Since date columns are matched exactly this way by writeRecords,
 *   the value-equality semantics have to be preserved. Keys are therefore
 *   normalized to a tagged primitive before hitting the native Map.
 *
 * The type tag also fixes a latent ambiguity for free: 1 and '1' stay distinct.
 */

import { typeTag } from './utilities.js';

/**
 * @return {string} a primitive that compares equal exactly when the original
 *   keys should be considered the same key.
 */
function normalizeKey(key) {
  switch (typeTag(key)) {
    case '[object String]':
      return `s:${key}`;
    case '[object Number]':
      return `n:${key}`;
    case '[object Boolean]':
      return `b:${key}`;
    case '[object Date]':
      return `d:${key.getTime()}`;
    default:
      throw new TypeError(`KeyedMap can't accept ${typeTag(key)} keys.`);
  }
}

export class KeyedMap {
  /**
   * @param {Array|KeyedMap} [input] an array of keys (each mapped to true),
   *   or another KeyedMap to copy.
   */
  constructor(input) {
    /** @type {Map<string, {key: *, value: *}>} native Map, not a KeyedMap */
    this.entriesByKey = new Map();

    if (input === undefined || input === null) {
      return;
    }
    if (input instanceof KeyedMap) {
      this.copyItems(input);
    } else if (Array.isArray(input)) {
      input.forEach((item) => this.set(item, true));
    } else if (typeTag(input) === '[object Object]') {
      Object.keys(input).forEach((key) => this.set(key, input[key]));
    } else {
      throw new Error(`${typeTag(input)} not valid input for KeyedMap constructor.`);
    }
  }

  has(key) {
    return this.entriesByKey.has(normalizeKey(key));
  }

  set(key, value) {
    this.entriesByKey.set(normalizeKey(key), { key, value });
    return this;
  }

  get(key) {
    const entry = this.entriesByKey.get(normalizeKey(key));
    return entry === undefined ? undefined : entry.value;
  }

  delete(key) {
    return this.entriesByKey.delete(normalizeKey(key));
  }

  keys() {
    return [...this.entriesByKey.values()].map((entry) => entry.key);
  }

  values() {
    return [...this.entriesByKey.values()].map((entry) => entry.value);
  }

  entries() {
    return [...this.entriesByKey.values()].map((entry) => [entry.key, entry.value]);
  }

  clear() {
    this.entriesByKey.clear();
    return this;
  }

  forEach(callback) {
    this.entries().forEach(([key, value]) => callback(value, key, this));
  }

  copyItems(other) {
    if (!(other instanceof KeyedMap)) {
      throw new TypeError('copyItems accepts only KeyedMap input.');
    }
    other.entries().forEach(([key, value]) => this.set(key, value));
    return this;
  }

  get empty() {
    return this.entriesByKey.size === 0;
  }

  get length() {
    return this.entriesByKey.size;
  }
}

export class UniqueKeySet extends KeyedMap {
  /**
   * @return {boolean} true if the item was newly added.
   */
  push(item) {
    if (this.has(item)) {
      return false;
    }
    this.set(item);
    return true;
  }

  remove(item) {
    this.delete(item);
    return this;
  }

  flush() {
    return this.clear();
  }

  forEach(callback) {
    this.keys().forEach((key) => callback(key));
  }

  copyValues(input) {
    if (!(input instanceof UniqueKeySet)) {
      throw new TypeError('copyValues accepts only UniqueKeySet input.');
    }
    input.keys().forEach((key) => this.push(key));
    return this;
  }

  /** @return {boolean} whether both sets hold the same members. */
  hasSame(input) {
    if (!(input instanceof UniqueKeySet)) {
      throw new TypeError('hasSame expects a UniqueKeySet instance.');
    }
    if (this.length !== input.length) {
      return false;
    }
    return this.keys().every((key) => input.has(key));
  }

  get values() {
    return this.keys();
  }
}

/**
 * removeDuplicates - an array less its duplicates, first-seen order preserved.
 * @return {Array}
 */
export function removeDuplicates(array) {
  return new KeyedMap(array).keys();
}

/**
 * getDuplicates - the items appearing more than once.
 * @desc Accepts either an array or a varargs list.
 * @return {Array}
 */
export function getDuplicates(...args) {
  const items = Array.isArray(args[0]) ? args[0] : args;
  const seen = new KeyedMap();
  const duplicates = new KeyedMap();
  items.forEach((item) => {
    if (seen.has(item)) {
      duplicates.set(item);
    } else {
      seen.set(item);
    }
  });
  return duplicates.keys();
}

/**
 * testUnique - whether a set of items contains no duplicates.
 * @return {boolean}
 */
export function testUnique(...args) {
  const items = Array.isArray(args[0]) ? args[0] : args;
  return getDuplicates(items).length === 0;
}
