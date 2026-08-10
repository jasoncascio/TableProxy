/**
 * Map/Unique Set handling
 * @desc Map originally created to handle creating unique lists.
 * @desc Using indexOf to prevent duplicates is much faster for <3700 items
 * @desc Using Map shim is much slower
 */

/**
 * Map - same api as native Map plus a few other computed properties
 * @desc Supports ONLY String, Number, Date, Boolean - the types that sheets supports
 * @desc Could be enhanced for regexp, if needed.
 * @desc Handling objects & arrays keys is not possible.
 * @desc Is about 10 times slower than native JS Map for about 100,000 elements
 * @desc Suffers indexOf slowness for key deletion
 * @constructor Map
 * @return {Map}
 */
export class Map {
  constructor(input) {
    Object.defineProperties(this, {
      pvt_strings: {
        enumerable: false,
        writable: true,
        value: {}
      },
      pvt_numbers: {
        enumerable: false,
        writable: true,
        value: {}
      },
      pvt_booleans: {
        enumerable: false,
        writable: true,
        value: {}
      },
      pvt_dates: {
        enumerable: false,
        writable: true,
        value: {}
      },
      pvt_keys: {
        enumerable: false,
        writable: true,
        value: []
      },
      pvt_get_container: {
        enumerable: false,
        writable: false,
        value: key => {
          let result;
          switch (toString.call(key)) {
            case '[object Number]':
              result = this.pvt_numbers;
              break;
            case '[object String]':
              result = this.pvt_strings;
              break;
            case '[object Date]':
              result = this.pvt_dates;
              break;
            case '[object Boolean]':
              result = this.pvt_booleans;
              break;
            default:
              Browser.msgBox(key);
              throw new TypeError(`Map can't accept ${toString.call(key)} keys.`);
          }
          return result;
        }
      }
    });

    if (input !== undefined && input !== null) {
      if (toString.call(input) === '[object Array]') {
        input.forEach(item => {
          this.set(item, true);
        });
      } else if (toString.call(input) === '[object Object]') {
        Object.keys(input).forEach(key => {
          this.set([key, input[key]]);
        });
      } else if (input instanceof Map) {
        input.entries().forEach(entry => {
          this.set(entry[0], entry[1]);
        });
      } else {
        throw new Error(`${toString.call(input)} not valid input for Map constructor.`);
      }
    }
  }

  has(key) {
    return Object.prototype.hasOwnProperty.call(this.pvt_get_container(key), key);
  }

  set(key, value) {
    if (!this.has(key)) {
      this.pvt_keys.push(key);
    }
    this.pvt_get_container(key)[key] = value;
    return this;
  }

  get(key) {
    return this.pvt_get_container(key)[key];
  }

  delete(key) {
    const indexOf = this.pvt_keys.indexOf(key);
    if (indexOf !== -1) {
      this.pvt_keys.splice(indexOf, 1);
      delete this.pvt_get_container(key)[key];
    }
    return indexOf !== -1;
  }

  get del() {
    return this.delete;
  }

  keys() {
    const keys = [];
    this.pvt_keys.forEach(key => {
      keys.push(key);
    });
    return keys;
  }

  values() {
    const result = [];
    this.pvt_keys.forEach(key => {
      result.push(this.get(key));
    });
    return result;
  }

  entries() {
    const result = [];
    this.pvt_keys.forEach(key => {
      result.push([key, this.get(key)]);
    });
    return result;
  }

  clear() {
    this.pvt_strings = {};
    this.pvt_numbers = {};
    this.pvt_dates = {};
    this.pvt_booleans = {};
    this.pvt_keys = [];
    return this;
  }

  forEach(callback) {
    this.pvt_keys.forEach(key => {
      callback(this.get(key), key, this);
    });
  }

  copyItems(map) {
    if (!(map instanceof Map)) {
      throw new TypeError('copyItems accepts only Map input.');
    }
    map.entries().forEach(entry => {
      this.set(entry[0], entry[1]);
    });
    return this;
  }

  getShallowClone() {
    const clone = Object.create(this);
    this.pvt_keys.forEach(key => {
      clone.set(key, this.get(key));
    });
    return clone;
  }

  get stringKeyCount() {
    return Object.keys(this.pvt_strings).length;
  }

  get numberKeyCount() {
    return Object.keys(this.pvt_numbers).length;
  }

  get dateKeyCount() {
    return Object.keys(this.pvt_dates).length;
  }

  get booleanKeyCount() {
    return Object.keys(this.pvt_booleans).length;
  }

  get keyTypes() {
    const result = [];
    if (this.stringKeyCount > 0) {
      result.push('strings');
    }
    if (this.numberKeyCount > 0) {
      result.push('numbers');
    }
    if (this.dateKeyCount > 0) {
      result.push('dates');
    }
    if (this.booleanKeyCount > 0) {
      result.push('boolean');
    }
    return result;
  }

  get keyTypesPure() {
    return this.keyTypes.length < 2;
  }

  get empty() {
    return this.length === 0;
  }

  get length() {
    return this.pvt_keys.length;
  }
}

export class UniqueSet extends Map {
  push(item) {
    let ret = true;
    if (this.has(item)) {
      ret = false;
    } else {
      this.set(item);
    }
    return ret;
  }

  remove(item) {
    this.delete(item);
    return this;
  }

  flush() {
    return this.clear();
  }

  forEach(callback) {
    this.pvt_keys.forEach(key => {
      callback(key);
    });
  }

  copyValues(input) {
    if (!(input instanceof UniqueSet)) {
      throw new TypeError('copyValues accepts only UniqueSet input.');
    }
    input.keys().forEach(key => {
      this.push(key);
    });
    return this;
  }

  hasSame(input) {
    if (!(input instanceof UniqueSet)) {
      throw new TypeError('hasSame expects a UniqueSet instance.');
    }
    let hasSame = true;
    if (this.length !== input.length) {
      hasSame = false;
    }
    const thisValues = this.values.sort();
    const inputValues = input.values.sort();
    thisValues.forEach((value, index) => {
      if (value !== inputValues[index]) {
        hasSame = false;
      }
    });
    return hasSame;
  }

  getClone() {
    const clone = Object.create(this);
    this.pvt_keys.forEach(key => {
      clone.push(key);
    });
    return clone;
  }

  get values() {
    return this.keys();
  }
}

/**
 * removeDuplicates - returns an array less its duplicates
 * @desc Uses Map
 * @return {array}
 */
export function removeDuplicates(array) {
  const c = new Map();
  array.forEach(v => {
    c.set(v);
  });
  return c.keys();
}

/**
 * getDuplicates - returns an UniqueSet of duplicates
 * @desc Uses Map
 * @return {Map}
 */
export function getDuplicates(...args) {
  const d = new Map();
  const i = toString.call(args[0]) === '[object Array]' ? args[0] : args;
  const t = new Map();
  i.forEach(v => {
    if (!t.has(v)) {
      t.set(v);
    } else {
      d.set(v);
    }
  });
  return d.keys();
}

/**
 * testUnique - determines if a set of items is unique
 * @desc Uses getDuplicates
 * @return {boolean}
 */
export function testUnique(...args) {
  let r;
  if (toString.call(args[0]) === '[object Array]') {
    r = getDuplicates(args[0]).length === 0;
  } else {
    r = getDuplicates(args).length === 0;
  }
  return r;
}
