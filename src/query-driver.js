/**
 * QueryDriver class
 * @return {Object}
 */

import { INDEX_PROP, SUPPORTED_ATTRIBUTES } from './CONSTANTS.js';
import { KeyedMap } from './keyed-map.js';
import { AttributesSet } from './data-payload.js';
import Timer from './timer.js';
import { isFunction, inArray, isArray, isObject, typeTag } from './utilities.js';

export default class QueryDriver {
  constructor(type, noteForLogging) {
    this.type = type.toUpperCase();
    this.query = () => true;
    this.returnWithRecords = false;
    this.withSelect = false;
    this.requestedAttributesSet = new AttributesSet();
    this.matchColumnName = null;
    this.matchAttributeName = null;
    this.recordObjectsToWrite = null;
    this.usesIndexProp = false;
    this.otherResults = new KeyedMap();
    this.noteForLogging = noteForLogging;

    this.timer = new Timer(`${this.getTimerText()}`);
    this.resultSet = new KeyedMap();
    this.errors = new KeyedMap();
    this.warnings = new KeyedMap();
    this.updatedRecordIndices = [];
  }

  getTimerText() {
    let text = this.type;
    text += this.noteForLogging ? ` (${this.noteForLogging})` : '';
    return text;
  }

  setQuery(query) {
    if (!isFunction(query)) {
      throw new TypeError('query must be a function.');
    }
    this.query = query;
    const queryAsString = query.toString();
    SUPPORTED_ATTRIBUTES.forEach((attribute) => {
      const re1 = new RegExp(`[[]{1}['|"]{1}${attribute}['|"]{1}[]]{1}`, 'g');
      const re2 = new RegExp(`[.]{1}${attribute}[^a-zA-Z0-9]`, 'g');
      if (re1.test(queryAsString) || re2.test(queryAsString)) {
        this.requestedAttributesSet.push(attribute);
      }
    });
    return this;
  }

  setReturnWithRecords(bool) {
    this.returnWithRecords = bool === true;
    return this;
  }

  setWithSelect(bool) {
    this.withSelect = bool === true;
    return this;
  }

  setRecordObjectsToWrite(arrayOfRecords) {
    if (!isArray(arrayOfRecords)) {
      throw new TypeError(`expecting an array of record objects.`);
    }
    if (Object.prototype.hasOwnProperty.call(arrayOfRecords[0], INDEX_PROP)) {
      this.usesIndexProp = true;
    }
    arrayOfRecords.forEach((record, index) => {
      if (!isObject(record)) {
        throw new TypeError(`record object array contained ${typeTag(record)} at index ${index}.`);
      }
    });
    const json = JSON.stringify(arrayOfRecords);
    SUPPORTED_ATTRIBUTES.forEach((attribute) => {
      if (new RegExp(`"${attribute}":`, 'g').test(json)) {
        this.requestedAttributesSet.push(attribute);
      }
    });
    this.recordObjectsToWrite = arrayOfRecords;
    return this;
  }

  getRecordObjectsToWrite() {
    return this.recordObjectsToWrite;
  }

  addAttributes(attributesSet) {
    if (attributesSet) {
      if (!(attributesSet instanceof AttributesSet)) {
        throw new TypeError(`setRequestedAttributes accepts AttributeSet instances.`);
      }
      this.requestedAttributesSet.copyValues(attributesSet);
    }
    return this;
  }

  addAttribute(attribute) {
    if (!inArray(attribute, SUPPORTED_ATTRIBUTES)) {
      throw new TypeError(`invalid attribute ${attribute}`);
    }
    this.requestedAttributesSet.push(attribute);
    return this;
  }

  setMatchColumnName(columnName) {
    this.matchColumnName = columnName.trim();
    return this;
  }

  setMatchAttributeName(attribute) {
    this.matchAttributeName = attribute.trim();
    return this;
  }

  get resultCount() {
    return this.resultSet.length;
  }

  get updatedCount() {
    return this.updatedRecordIndices.length;
  }

  get updatedIndices() {
    return this.updatedRecordIndices.map((i) => i);
  }

  pushResult(index, record) {
    this.resultSet.set(index, record);
    return this;
  }

  pushWarning(index, content) {
    this.warnings.set(index, content);
    return this;
  }

  pushError(index, content) {
    this.errors.set(index, content);
    return this;
  }

  done() {
    this.timer.stop(this.query.toString());
    return this;
  }
}
