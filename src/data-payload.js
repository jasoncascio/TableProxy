/**
 * Data Payload class
 * @return {Object}
 */

import { KeyedMap, UniqueKeySet } from './keyed-map.js';
import { inArray } from './utilities.js';
import { SUPPORTED_ATTRIBUTES, DEFAULT_ATTRIBUTE } from './CONSTANTS.js';

export class DataPayload {
  constructor(dataObject, headerRowIndex, headerColumnIndex, headerRow) {
    this.dataObject = dataObject;
    this.headerRowIndex = headerRowIndex;
    this.headerColumnIndex = headerColumnIndex;
    this.headerRow = headerRow;
  }

  getDataIndex(columnName, attribute) {
    const dataIndex = new KeyedMap();

    if (columnName === undefined && attribute === undefined) {
      this.dataObject[DEFAULT_ATTRIBUTE].forEach((row, index) => {
        dataIndex.set(index, index);
      });
      dataIndex.isUnique = true;
    } else {
      const attr = attribute === undefined ? Object.keys(this.dataObject)[0] : attribute;
      const columnIndex = this.headerRow.indexOf(columnName);

      if (columnIndex === -1) {
        throw new Error(`failed to get dataIndex on invalid column ${columnName}.`);
      }
      if (!inArray(attr, Object.keys(this.dataObject))) {
        throw new Error(`failed to get dataIndex on invalid attribute ${attribute}.`);
      }

      const dataLength = this.dataObject[attr].length;
      for (let i = this.headerRowIndex + 1; i < dataLength; i += 1) {
        dataIndex.set(this.dataObject[attr][i][columnIndex], i);
      }
      dataIndex.isUnique = dataIndex.length === dataLength - this.headerRowIndex - 1;
    }

    return dataIndex;
  }
}

export class AttributesSet extends UniqueKeySet {
  push(attribute) {
    if (!inArray(attribute, SUPPORTED_ATTRIBUTES)) {
      throw new Error(`${attribute} is not a supported attribute.`);
    }
    return this.set(attribute);
  }

  withAll() {
    SUPPORTED_ATTRIBUTES.forEach((attribute) => {
      this.push(attribute);
    });
    return this;
  }
}
