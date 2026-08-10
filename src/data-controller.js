/**
 * DataController class
 * @param {Object} sheetAccessor - SheetAccessor instance
 * @param {Object} instanceOptions - InstanceOptions instance
 * @param {Object} requestedAttributesSet - AttributesSet instance
 */

import SheetAccessor from './sheet-accessor.js';
import InstanceOptions from './instance-options.js';
import { AttributesSet } from './data-payload.js';
import {
  READ_LEVEL_ROW,
  READ_LEVEL_TABLE,
  WRITE_LEVEL_CELL,
  WRITE_LEVEL_ROW,
  WRITE_LEVEL_TABLE,
  ATTR_NOTE,
} from './CONSTANTS.js';

export default class DataController {
  constructor(sheetAccessor, instanceOptions, requestedAttributesSet) {
    if (!(sheetAccessor instanceof SheetAccessor)) {
      throw new TypeError(`DataController requires an instance of SheetAccessor.`);
    }
    if (!(instanceOptions instanceof InstanceOptions)) {
      throw new TypeError(`DataController requires an instance of InstanceOptions.`);
    }
    if (!(requestedAttributesSet instanceof AttributesSet)) {
      throw new TypeError(`DataController requires an instance of AttributesSet.`);
    }

    this.readLevel = instanceOptions.readLevel;
    this.writeLevel = instanceOptions.writeLevel;
    this.headerAnchorToken = instanceOptions.headerAnchorToken;
    this.sheetAccessor = sheetAccessor;
    this.rowIndex = null;
    /**
     * Where the current row lives INSIDE dataPayload. Under READ_LEVEL_TABLE
     * the payload holds the whole sheet, so this equals rowIndex. Under
     * READ_LEVEL_ROW the payload holds a single row, so it is always 0.
     * Every write path used to index the payload by the absolute rowIndex,
     * which dereferenced undefined in row-read mode and made that mode
     * readable but completely unwritable.
     */
    this.payloadRowIndex = null;
    this.requestedAttributesSet = requestedAttributesSet;
    this.changedAttributes = new AttributesSet();
    this.dataPayload = null;
    this.rowUpdated = false;

    /**
     * I hate this, but figured it could do away with a lot of potential if evaluations.
     */
    this.setRowIndex = null;
    if (this.readLevel === READ_LEVEL_ROW && this.writeLevel === WRITE_LEVEL_ROW) {
      this.setRowIndex = this.setRowIndex1;
    } else if (this.readLevel === READ_LEVEL_ROW && this.writeLevel !== WRITE_LEVEL_ROW) {
      this.setRowIndex = this.setRowIndex2;
    } else if (this.readLevel !== READ_LEVEL_ROW && this.writeLevel === WRITE_LEVEL_ROW) {
      this.setRowIndex = this.setRowIndex3;
    } else {
      this.setRowIndex = this.setRowIndexBase;
    }

    this.updateColumnByIndex = null;
    if (this.headerAnchorToken && this.writeLevel === WRITE_LEVEL_CELL) {
      this.updateColumnByIndex = this.updateColumnByIndex1;
    } else if (this.headerAnchorToken && this.writeLevel !== WRITE_LEVEL_CELL) {
      this.updateColumnByIndex = this.updateColumnByIndex2;
    } else if (!this.headerAnchorToken && this.writeLevel === WRITE_LEVEL_CELL) {
      this.updateColumnByIndex = this.updateColumnByIndex3;
    } else {
      this.updateColumnByIndex = this.updateColumnByIndex4;
    }

    this.getColumnByIndex = null;
    if (this.readLevel === READ_LEVEL_ROW) {
      this.getColumnByIndex = this.getColumnByIndex1;
    } else {
      this.getColumnByIndex = this.getColumnByIndex2;
    }

    /**
     * Initialize the data payload.
     */
    if (this.readLevel === READ_LEVEL_TABLE) {
      this.dataPayload = sheetAccessor.getDataPayload(requestedAttributesSet);
    }
  }

  getColumnByIndex1(attribute, columnIndex) {
    return this.dataPayload.dataObject[attribute][0][columnIndex];
  }

  getColumnByIndex2(attribute, columnIndex) {
    return this.dataPayload.dataObject[attribute][this.payloadRowIndex][columnIndex];
  }

  updateColumnByIndex1(attribute, columnIndex, updatedValue) {
    if (attribute === ATTR_NOTE) {
      if (updatedValue.indexOf(this.headerAnchorToken) !== -1) {
        throw new Error(
          `${updatedValue} is a reserved value row ${this.rowIndex + 1}, column ${columnIndex + 1}.`,
        );
      }
    }
    this.rowUpdated = true;
    this.dataPayload.dataObject[attribute][this.payloadRowIndex][columnIndex] = updatedValue;
    this.sheetAccessor[attribute].setCell(this.rowIndex, columnIndex, [[updatedValue]]);
    return this;
  }

  updateColumnByIndex2(attribute, columnIndex, updatedValue) {
    if (attribute === ATTR_NOTE) {
      if (updatedValue.indexOf(this.headerAnchorToken) !== -1) {
        throw new Error(
          `${updatedValue} is a reserved value row ${this.rowIndex + 1}, column ${columnIndex + 1}.`,
        );
      }
    }
    this.rowUpdated = true;
    this.dataPayload.dataObject[attribute][this.payloadRowIndex][columnIndex] = updatedValue;
    this.changedAttributes.push(attribute);
    return this;
  }

  updateColumnByIndex3(attribute, columnIndex, updatedValue) {
    this.rowUpdated = true;
    this.dataPayload.dataObject[attribute][this.payloadRowIndex][columnIndex] = updatedValue;
    this.sheetAccessor[attribute].setCell(this.rowIndex, columnIndex, [[updatedValue]]);
    return this;
  }

  updateColumnByIndex4(attribute, columnIndex, updatedValue) {
    this.rowUpdated = true;
    this.dataPayload.dataObject[attribute][this.payloadRowIndex][columnIndex] = updatedValue;
    this.changedAttributes.push(attribute);
    return this;
  }

  setRowIndex1(rowIndex) {
    // Flush the PREVIOUS row before swapping in the next row's payload.
    // Doing it the other way round wrote the incoming row's data back to the
    // outgoing row's position.
    if (this.rowIndex !== null) {
      this.writeCurrentRow();
    }
    this.dataPayload = this.sheetAccessor.getDataPayload(this.requestedAttributesSet, rowIndex);
    return this.setRowIndexBase(rowIndex);
  }

  setRowIndex2(rowIndex) {
    this.dataPayload = this.sheetAccessor.getDataPayload(this.requestedAttributesSet, rowIndex);
    return this.setRowIndexBase(rowIndex);
  }

  setRowIndex3(rowIndex) {
    if (this.rowIndex !== null) {
      this.writeCurrentRow();
    }
    return this.setRowIndexBase(rowIndex);
  }

  setRowIndexBase(rowIndex) {
    this.rowUpdated = false;
    this.rowIndex = rowIndex;
    this.payloadRowIndex = this.readLevel === READ_LEVEL_ROW ? 0 : rowIndex;
    return this;
  }

  getRowIndex() {
    return this.rowIndex;
  }

  wasRowUpdated() {
    return this.rowUpdated;
  }

  writeCurrentRow() {
    this.changedAttributes.forEach((attribute) => {
      this.sheetAccessor[attribute].setRow(this.rowIndex, [
        this.dataPayload.dataObject[attribute][this.payloadRowIndex],
      ]);
    });
    this.changedAttributes.flush();
    return this;
  }

  capWrite() {
    this.rowUpdated = false;
    if (this.writeLevel === WRITE_LEVEL_TABLE) {
      this.changedAttributes.forEach((attribute) => {
        this.dataPayload.dataObject[attribute].splice(0, this.sheetAccessor.headerRowIndex + 1);
        this.sheetAccessor[attribute].setAllRecords(this.dataPayload.dataObject[attribute]);
      });
      this.changedAttributes.flush();
    }
    if (this.writeLevel === WRITE_LEVEL_ROW) {
      this.writeCurrentRow();
    }
  }

  getDataIndex(columnName, attribute) {
    return this.dataPayload.getDataIndex(columnName, attribute);
  }
}
