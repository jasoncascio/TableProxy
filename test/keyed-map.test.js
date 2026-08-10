/**
 * Spec for KeyedMap / UniqueKeySet.
 *
 * This is the same contract the 2019 hand-rolled Map/Set satisfied, minus the
 * parts that were dead code or outright broken. It is what made replacing the
 * shims with native-Map-backed containers safe.
 *
 * The Date cases are the important ones: the old implementation compared Dates
 * BY VALUE as an accident of using keys as object property names, and Sheets
 * hands back Date objects for date cells. A bare native Map would have compared
 * them by identity and silently broken date-column matching.
 */

import { describe, it, expect } from 'vitest';
import {
  KeyedMap,
  UniqueKeySet,
  removeDuplicates,
  getDuplicates,
  testUnique,
} from '../src/keyed-map.js';

describe('KeyedMap — key types', () => {
  it('stores and retrieves string keys', () => {
    const map = new KeyedMap();
    map.set('alpha', 1);
    expect(map.has('alpha')).toBe(true);
    expect(map.get('alpha')).toBe(1);
    expect(map.length).toBe(1);
  });

  it('keeps number and string keys distinct', () => {
    const map = new KeyedMap();
    map.set(1, 'number one');
    map.set('1', 'string one');
    expect(map.get(1)).toBe('number one');
    expect(map.get('1')).toBe('string one');
    expect(map.length).toBe(2);
  });

  it('keeps boolean and string keys distinct', () => {
    const map = new KeyedMap();
    map.set(true, 'boolean').set('true', 'string');
    expect(map.get(true)).toBe('boolean');
    expect(map.get('true')).toBe('string');
    expect(map.length).toBe(2);
  });

  it('stores date keys', () => {
    const map = new KeyedMap();
    const when = new Date('2019-05-17T00:00:00Z');
    map.set(when, 'launch');
    expect(map.get(when)).toBe('launch');
  });

  it('treats two equal-valued Date objects as the same key', () => {
    const map = new KeyedMap();
    map.set(new Date('2019-05-17T00:00:00Z'), 'first');
    map.set(new Date('2019-05-17T00:00:00Z'), 'second');
    expect(map.length).toBe(1);
    expect(map.get(new Date('2019-05-17T00:00:00Z'))).toBe('second');
  });

  it('keeps Dates for different instants distinct', () => {
    const map = new KeyedMap();
    map.set(new Date('2019-05-17T00:00:00Z'), 'a');
    map.set(new Date('2020-05-17T00:00:00Z'), 'b');
    expect(map.length).toBe(2);
  });

  it('returns the original Date object from keys(), not the normalized form', () => {
    const when = new Date('2019-05-17T00:00:00Z');
    const map = new KeyedMap();
    map.set(when, 1);
    expect(map.keys()[0]).toBeInstanceOf(Date);
    expect(map.keys()[0].getTime()).toBe(when.getTime());
  });

  it('rejects object and array keys', () => {
    const map = new KeyedMap();
    expect(() => map.set({}, 'nope')).toThrow(TypeError);
    expect(() => map.set([], 'nope')).toThrow(TypeError);
    expect(() => map.set(null, 'nope')).toThrow(TypeError);
  });
});

describe('KeyedMap — core operations', () => {
  it('overwrites an existing key without growing', () => {
    const map = new KeyedMap();
    map.set('a', 1).set('a', 2);
    expect(map.get('a')).toBe(2);
    expect(map.length).toBe(1);
  });

  it('preserves insertion order', () => {
    const map = new KeyedMap();
    map.set('c', 3).set('a', 1).set('b', 2);
    expect(map.keys()).toEqual(['c', 'a', 'b']);
    expect(map.values()).toEqual([3, 1, 2]);
    expect(map.entries()).toEqual([
      ['c', 3],
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('keeps the original position when a key is overwritten', () => {
    const map = new KeyedMap();
    map.set('a', 1).set('b', 2).set('a', 99);
    expect(map.keys()).toEqual(['a', 'b']);
    expect(map.values()).toEqual([99, 2]);
  });

  it('deletes a present key and reports true', () => {
    const map = new KeyedMap();
    map.set('a', 1).set('b', 2);
    expect(map.delete('a')).toBe(true);
    expect(map.has('a')).toBe(false);
    expect(map.keys()).toEqual(['b']);
  });

  it('reports false when deleting an absent key', () => {
    expect(new KeyedMap().delete('nope')).toBe(false);
  });

  it('returns undefined for a missing key', () => {
    expect(new KeyedMap().get('nope')).toBeUndefined();
  });

  it('clears everything and stays usable', () => {
    const map = new KeyedMap();
    map.set('a', 1).clear();
    expect(map.length).toBe(0);
    expect(map.empty).toBe(true);
    map.set('b', 2);
    expect(map.get('b')).toBe(2);
  });

  it('iterates with forEach(value, key, map)', () => {
    const map = new KeyedMap();
    map.set('a', 1).set('b', 2);
    const seen = [];
    map.forEach((value, key, self) => {
      seen.push([key, value]);
      expect(self).toBe(map);
    });
    expect(seen).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('copies entries from another KeyedMap', () => {
    const source = new KeyedMap();
    source.set('a', 1).set('b', 2);
    const target = new KeyedMap();
    target.set('c', 3).copyItems(source);
    expect(target.entries()).toEqual([
      ['c', 3],
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('rejects copyItems from a non-KeyedMap', () => {
    expect(() => new KeyedMap().copyItems({})).toThrow(TypeError);
  });

  it('accepts an arbitrary ad-hoc property (used for dataIndex.isUnique)', () => {
    const map = new KeyedMap();
    map.isUnique = true;
    expect(map.isUnique).toBe(true);
  });
});

describe('KeyedMap — constructor input', () => {
  it('accepts an array, mapping each item to true', () => {
    const map = new KeyedMap(['a', 'b']);
    expect(map.keys()).toEqual(['a', 'b']);
    expect(map.get('a')).toBe(true);
  });

  // Was broken in the 2019 version: the object branch passed [key, value] as
  // the key, which the container dispatcher rejected outright.
  it('accepts a plain object as a key/value seed', () => {
    const map = new KeyedMap({ a: 1, b: 2 });
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
  });

  // Was unreachable in the 2019 version: the instanceof branch sat AFTER the
  // '[object Object]' branch, which a Map instance also matched, so copying
  // silently produced an empty map.
  it('copies another KeyedMap', () => {
    const source = new KeyedMap();
    source.set('a', 1).set('b', 2);
    const copy = new KeyedMap(source);
    expect(copy.entries()).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('produces an independent copy', () => {
    const source = new KeyedMap();
    source.set('a', 1);
    const copy = new KeyedMap(source);
    copy.set('b', 2);
    expect(source.has('b')).toBe(false);
    expect(source.length).toBe(1);
  });

  it('rejects unsupported constructor input', () => {
    expect(() => new KeyedMap(42)).toThrow();
  });

  it('treats null and undefined as empty', () => {
    expect(new KeyedMap(null).length).toBe(0);
    expect(new KeyedMap(undefined).length).toBe(0);
  });
});

describe('UniqueKeySet', () => {
  it('push returns true for new items and false for duplicates', () => {
    const set = new UniqueKeySet();
    expect(set.push('a')).toBe(true);
    expect(set.push('a')).toBe(false);
    expect(set.length).toBe(1);
  });

  it('exposes members through the values getter', () => {
    const set = new UniqueKeySet();
    set.push('a');
    set.push('b');
    expect(set.values).toEqual(['a', 'b']);
  });

  it('removes members', () => {
    const set = new UniqueKeySet();
    set.push('a');
    set.push('b');
    expect(set.remove('a').values).toEqual(['b']);
  });

  it('flushes to empty', () => {
    const set = new UniqueKeySet();
    set.push('a');
    expect(set.flush().length).toBe(0);
  });

  it('iterates keys only in forEach', () => {
    const set = new UniqueKeySet();
    set.push('a');
    set.push('b');
    const seen = [];
    set.forEach((key) => seen.push(key));
    expect(seen).toEqual(['a', 'b']);
  });

  it('copies values from another UniqueKeySet', () => {
    const source = new UniqueKeySet();
    source.push('a');
    const target = new UniqueKeySet();
    target.copyValues(source);
    expect(target.values).toEqual(['a']);
  });

  it('rejects copyValues from a non-UniqueKeySet', () => {
    expect(() => new UniqueKeySet().copyValues(new KeyedMap())).toThrow(TypeError);
  });

  it('compares membership with hasSame, order independent', () => {
    const a = new UniqueKeySet();
    a.push('x');
    a.push('y');
    const b = new UniqueKeySet();
    b.push('y');
    b.push('x');
    const c = new UniqueKeySet();
    c.push('x');

    expect(a.hasSame(b)).toBe(true);
    expect(a.hasSame(c)).toBe(false);
    expect(c.hasSame(a)).toBe(false);
  });

  it('hasSame distinguishes different members of equal size', () => {
    const a = new UniqueKeySet();
    a.push('x');
    const b = new UniqueKeySet();
    b.push('y');
    expect(a.hasSame(b)).toBe(false);
  });
});

describe('duplicate helpers', () => {
  it('removeDuplicates preserves first-seen order', () => {
    expect(removeDuplicates(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
  });

  it('getDuplicates accepts an array', () => {
    expect(getDuplicates(['a', 'b', 'a', 'c', 'c'])).toEqual(['a', 'c']);
  });

  it('getDuplicates accepts varargs', () => {
    expect(getDuplicates('a', 'b', 'a')).toEqual(['a']);
  });

  it('getDuplicates reports each duplicate once', () => {
    expect(getDuplicates(['a', 'a', 'a'])).toEqual(['a']);
  });

  it('testUnique reports uniqueness for arrays and varargs', () => {
    expect(testUnique(['a', 'b'])).toBe(true);
    expect(testUnique(['a', 'a'])).toBe(false);
    expect(testUnique('a', 'b', 'a')).toBe(false);
  });

  it('detects duplicate dates by value', () => {
    const a = new Date('2019-05-17T00:00:00Z');
    const b = new Date('2019-05-17T00:00:00Z');
    expect(testUnique([a, b])).toBe(false);
  });
});
