/**
 * MainCursor
 * @desc This is the heart of selection state handling
 * @desc Under current implementation, there should be only be one MainCursor for a TableProxy Instance
 * @constructor MainCursor
 * @return {MainCursor}
 */

import { KeyedMap } from './keyed-map.js';
import SheetAccessor from './sheet-accessor.js';
import { AttributesSet } from './data-payload.js';
import QueryDriver from './query-driver.js';
import { isNumeric, typeTag } from './utilities.js';

export default class MainCursor extends KeyedMap {
  constructor(sheetAccessor) {
    super();
    if (!(sheetAccessor instanceof SheetAccessor)) {
      throw new TypeError(`MainCursor constructor requires a SheetAccessor.`);
    }
    this.sheetAccessor = sheetAccessor;
    this.attributesSet = new AttributesSet();
    this.dirty = true;
    this.flush();
  }

  get indices() {
    return this.keys();
  }

  get isDirty() {
    return this.dirty;
  }

  /**
   * @desc Without this setter, `mainCursor.isDirty = true` throws in strict
   * @desc mode. index.js does exactly that in update, writeRecords,
   * @desc setColumnFilter and setComputedProperties.
   */
  set isDirty(input) {
    this.dirty = input === true;
  }

  flush() {
    this.attributesSet.flush();
    this.dirty = true;
    return this.clear().copyItems(this.sheetAccessor.getAllRecordIndexer());
  }

  setToIndices(indices) {
    this.dirty = true;
    const indexer = new KeyedMap();
    indices.forEach((i, ind) => {
      if (isNumeric(i)) {
        indexer.set(i);
      } else {
        throw new Error(
          `setToIndices can accept only numbers. Recieved ${typeTag(i)} at position ${ind}`,
        );
      }
    });
    return this.clear().copyItems(indexer);
  }

  setToSelected() {
    this.attributesSet.flush();
    this.dirty = true;
    return this.clear().copyItems(this.sheetAccessor.getSelectedRecordIndexer());
  }

  updateAttributesSet(attributesSet) {
    if (!(attributesSet instanceof AttributesSet)) {
      throw new TypeError('updateAttributesSet accepts AttributesSet input.');
    }
    this.attributesSet.copyValues(attributesSet);
    return this;
  }

  consumeReturn(queryReturn) {
    if (!(queryReturn instanceof QueryDriver)) {
      throw new TypeError('consumeSelections accepts QueryDriver input.');
    }
    this.dirty = !queryReturn.returnWithRecords;
    this.attributesSet.copyValues(queryReturn.requestedAttributesSet);
    this.clear().copyItems(queryReturn.resultSet);
    return this;
  }
}
