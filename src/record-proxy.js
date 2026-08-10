/**
 * Returns a Record Proxy Object
 * @param {Object} sheetAccessor - SheetAccessor instance
 * @param {Object} dataController - DataController instance
 * @param {Object} instanceOptions - InstanceOptions instance
 * @param {Object} requestedAttributesSet - AttributesSet instance
 * @return {Object} record proxy
 */

import SheetAccessor from './sheet-accessor.js';
import DataController from './data-controller.js';
import InstanceOptions from './instance-options.js';
import { AttributesSet } from './data-payload.js';
import { inArray } from './utilities.js';
import { INDEX_PROP } from './CONSTANTS.js';

export function getRecordProxy(core, dataController, requestedAttributesSet) {
  if (!(core.sheetAccessor instanceof SheetAccessor)) {
    throw new Error(`getRecordProxy requires a SheetAccessor instance.`);
  }
  if (!(core.instanceOptions instanceof InstanceOptions)) {
    throw new Error(`getRecordProxy requires an InstanceOptions instance.`);
  }
  if (!(dataController instanceof DataController)) {
    throw new Error(`getRecordProxy requires a DataController instance.`);
  }
  if (!(requestedAttributesSet instanceof AttributesSet)) {
    throw new Error(
      `getRecordProxy requires an AttributesSet instance for input parameter requestedAttributesSet.`,
    );
  }

  const { columnFilter, applyColumnFilter } = core.instanceOptions;

  let columnIsValid;
  if (applyColumnFilter) {
    columnIsValid = function testColumn(column) {
      if (column === null || column === undefined) {
        return false;
      }
      if (!inArray(column, columnFilter)) {
        return false;
      }
      return true;
    };
  } else {
    columnIsValid = function testColumn(column) {
      if (column === null || column === undefined) {
        return false;
      }
      return true;
    };
  }

  const recordProxy = {};

  Object.defineProperty(recordProxy, INDEX_PROP, {
    enumerable: true,
    get: () => {
      return dataController.getRowIndex();
    },
  });

  core.sheetAccessor.headerRow.forEach((column, columnIndex) => {
    if (columnIsValid(column)) {
      const columnProxy = {};
      requestedAttributesSet.forEach((attribute) => {
        Object.defineProperty(columnProxy, attribute, {
          enumerable: true,
          get: () => {
            return dataController.getColumnByIndex(attribute, columnIndex);
          },
          set: (input) => {
            dataController.updateColumnByIndex(attribute, columnIndex, input);
          },
        });
      });

      recordProxy[column] = columnProxy;
    }
  });

  try {
    Object.keys(core.instanceOptions.computedProperties).forEach((key) => {
      recordProxy[key] = Object.defineProperty({}, 'value', {
        enumerable: true,
        get: core.instanceOptions.computedProperties[key].bind(recordProxy),
      });
    });
  } catch (e) {
    throw new Error(
      `there was a problem creating a record proxy with the specified computedProperties: ${e}`,
      { cause: e },
    );
  }

  return recordProxy;
}

export function writeToRecordProxy(recordProxy, updateObject) {
  Object.keys(recordProxy).forEach((columnName) => {
    if (Object.prototype.hasOwnProperty.call(updateObject, columnName)) {
      Object.assign(recordProxy[columnName], updateObject[columnName]);
    }
  });
  return recordProxy;
}
