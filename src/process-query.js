/**
 * processQuery - a function that executes interactions with sheet data
 * @return {QueryReturn}
 */

import QueryDriver from './query-driver.js';
import SheetAccessor from './sheet-accessor.js';
import DataController from './data-controller.js';
import MainCursor from './main-cursor.js';
import { getRecordProxy, writeToRecordProxy } from './record-proxy.js';
import clone from './clone.js';
import { inArray } from './utilities.js';
import {
  INDEX_PROP,
  OP_UNIQUE,
  OP_SELECT,
  OP_UPDATE,
  OP_WRITE_RECORDS,
  SUPPORTED_OPS,
} from './CONSTANTS.js';

export default function processQuery(core, queryDriver) {
  if (!(queryDriver instanceof QueryDriver)) {
    throw new Error(`queryProcessor requires a QueryDriver instance.`);
  }
  if (!(core.sheetAccessor instanceof SheetAccessor)) {
    throw new Error(`queryProcessor requires a SheetAccessor instance.`);
  }
  if (!(core.mainCursor instanceof MainCursor)) {
    throw new Error(`queryProcessor requires a MainCursor instance.`);
  }
  if (!inArray(queryDriver.type, SUPPORTED_OPS)) {
    throw new Error(`queryDriver had invalid type "${queryDriver.type}"`);
  }

  /**
   * Build dataController
   */
  const dataController = new DataController(
    core.sheetAccessor,
    core.instanceOptions,
    queryDriver.requestedAttributesSet,
  );

  /**
   * Build recordProxy
   */
  const recordProxy = getRecordProxy(core, dataController, queryDriver.requestedAttributesSet);

  /**
   * Bind query to recordProxy
   */
  const query = queryDriver.query.bind(recordProxy);

  /**
   * Build evaluator function based on options.
   */
  if (inArray(queryDriver.type, [OP_UNIQUE, OP_SELECT, OP_UPDATE])) {
    const evaluator = (function getEvaluator() {
      let e;
      if (queryDriver.withSelect) {
        if (queryDriver.returnWithRecords) {
          e = (index) => {
            dataController.setRowIndex(index);
            if (query(recordProxy, index)) {
              queryDriver.pushResult(index, clone(recordProxy));
              if (dataController.wasRowUpdated()) {
                queryDriver.updatedRecordIndices.push(index);
              }
            }
          };
        } else {
          e = (index) => {
            dataController.setRowIndex(index);
            if (query(recordProxy, index)) {
              queryDriver.pushResult(index);
              if (dataController.wasRowUpdated()) {
                queryDriver.updatedRecordIndices.push(index);
              }
            }
          };
        }
      } else {
        e = (index) => {
          dataController.setRowIndex(index);
          query(recordProxy, index);
          if (dataController.wasRowUpdated()) {
            queryDriver.updatedRecordIndices.push(index);
          }
        };
      }
      return e;
    })();

    core.mainCursor.indices.forEach((index) => {
      evaluator(index);
    });
  }

  if (inArray(queryDriver.type, [OP_WRITE_RECORDS])) {
    let matchCol;
    let matchAttr;
    let dataIndex;

    if (queryDriver.usesIndexProp) {
      matchCol = INDEX_PROP;
      matchAttr = null;
      dataIndex = dataController.getDataIndex();
    } else {
      matchCol = queryDriver.matchColumnName;
      matchAttr = queryDriver.matchAttributeName;
      dataIndex = dataController.getDataIndex(matchCol, matchAttr);

      if (!dataIndex.isUnique) {
        throw new Error(`update failed because ${matchCol}.${matchAttr} is not a unique index.`);
      }
    }

    queryDriver.recordObjectsToWrite.forEach((record, index) => {
      let localIndex;
      if (!Object.prototype.hasOwnProperty.call(record, matchCol)) {
        queryDriver.pushError(index, `input at index ${index} missing "${matchCol}" column.`);
        return;
      }

      if (matchAttr) {
        if (!Object.prototype.hasOwnProperty.call(record[matchCol], matchAttr)) {
          queryDriver.pushError(index, `input at index ${index} missing "${matchAttr}" attribute.`);
          return;
        }
        localIndex = dataIndex.get(record[matchCol][matchAttr]);
      } else {
        localIndex = dataIndex.get(record[matchCol]);
      }
      // Row index 0 is falsy but legitimate, so test for absence explicitly.
      if (localIndex === undefined) {
        queryDriver.pushWarning(index, `input at index ${index} had no match.`);
        return;
      }

      dataController.setRowIndex(localIndex);

      if (queryDriver.returnWithRecords) {
        queryDriver.pushResult(localIndex, clone(writeToRecordProxy(recordProxy, record)));
      } else {
        writeToRecordProxy(recordProxy, record);
        queryDriver.pushResult(localIndex);
      }
    });
  }

  /**
   * capWrite the iteration
   */
  dataController.capWrite();

  /**
   * write the resultSet to the cursor if needed
   */
  if (core.instanceOptions.autoResizeColumns) {
    core.sheetAccessor.resizeColumns();
  }

  /**
   * stop the timer and return
   */
  return queryDriver.done();
}
