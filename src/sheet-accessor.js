/**
 * SheetAccessor - a class used to access ranges, and get/set attributes
 * @return {SheetAccessor}
 */

import InstanceOptions from './instance-options.js';
import { KeyedMap, getDuplicates } from './keyed-map.js';
import { isNumeric, inArray } from './utilities.js';
import { getSelectedRowIndices } from './sheets-utilities.js';
import { DataPayload, AttributesSet } from './data-payload.js';
import clone from './clone.js';
import { TOP, DEFAULT_ATTRIBUTE, SUPPORTED_ATTRIBUTES } from './CONSTANTS.js';

export default class SheetAccessor {
  constructor(instanceOptions) {
    if (!(instanceOptions instanceof InstanceOptions)) {
      throw new TypeError(`DataController requires an instance of InstanceOptions object.`);
    }

    this.sheet = instanceOptions.sheet;
    this.range = {};
    this.value = {};
    this.background = {};
    this.fontcolor = {};
    this.note = {};
    this.fontfamily = {};
    this.fontsize = {};
    this.fontstyle = {};
    this.fontweight = {};
    this.numberformat = {};
    this.headerRowIndex = 0;
    this.headerColumnIndex = 0;
    this.headerRow = null;
    this.getColumnIndex = null;
    this.columnExists = null;
    this.getAllRecordIndexer = null;
    this.getSelectedRecordIndexer = null;
    this.resizeColumns = null;
    this.getDataPayload = null;
    this.insertRows = null;
    this.deleteRows = null;
    this.getHeaderRow = null;
    this.getDataIndex = null;

    /**
     * Cached sheet shape.
     * @desc getDataRange() is a round trip to the Sheets service. The old code
     * @desc called it inside range.getRow() and range.getColumn(), so a
     * @desc row-at-a-time write paid an extra round trip per row purely to
     * @desc re-learn a column count that cannot change mid-iteration.
     * @desc Invalidated by insertRow/deleteRow below.
     */
    this.shape = null;
    this.getShape = () => {
      if (this.shape === null) {
        const dataRange = this.sheet.getDataRange();
        this.shape = {
          numRows: dataRange.getNumRows(),
          numColumns: dataRange.getNumColumns(),
        };
      }
      return this.shape;
    };
    this.invalidateShape = () => {
      this.shape = null;
      return this;
    };

    /**
     * find headerRowIndex, headerColumnIndex if headerAnchorToken
     * @desc One getNotes() for the whole sheet, scanned in memory. This used to
     * @desc issue one getRange().getNotes() PER ROW until the token was found,
     * @desc so a miss cost one round trip for every row in the sheet.
     */
    if (instanceOptions.headerAnchorToken) {
      const allNotes = this.sheet.getDataRange().getNotes();
      const { headerAnchorToken } = instanceOptions;
      findAnchor: for (let rowIndex = 0; rowIndex < allNotes.length; rowIndex += 1) {
        const noteRow = allNotes[rowIndex];
        for (let columnIndex = 0; columnIndex < noteRow.length; columnIndex += 1) {
          if (noteRow[columnIndex].indexOf(headerAnchorToken) !== -1) {
            this.headerRowIndex = rowIndex;
            this.headerColumnIndex = columnIndex;
            break findAnchor;
          }
        }
      }
    }

    /**
     * set headerRow
     */
    this.headerRow = this.sheet.getDataRange().getValues()[this.headerRowIndex];
    const duplicates = getDuplicates(this.headerRow);
    if (duplicates.length > 0) {
      throw new Error(
        `Sheet "${this.sheet.getName()}" has duplicate column headers... ${duplicates.join(', ')}`,
      );
    }

    /**
     * flesh out range retrievers
     */
    this.range = {
      getCell: (rowIndex, columnIndex) => {
        return this.sheet.getRange(rowIndex + 1, columnIndex + 1);
      },
      getRow: (rowIndex) => {
        return this.sheet.getRange(rowIndex + 1, 1, 1, this.getShape().numColumns);
      },
      getColumn: (columnIndex, startRowIndex) => {
        const startRowIndx = isNumeric(startRowIndex) ? startRowIndex : 0;
        return this.sheet.getRange(
          startRowIndx + 1,
          columnIndex + 1,
          this.getShape().numRows - startRowIndx,
          1,
        );
      },
      getAll: (startRowIndex, startColumnIndex) => {
        const shape = this.getShape();
        const startRowIndx = isNumeric(startRowIndex) ? startRowIndex : 0;
        const startColumnIndx = isNumeric(startColumnIndex) ? startColumnIndex : 0;

        return this.sheet.getRange(
          startRowIndx + 1,
          startColumnIndx + 1,
          shape.numRows - startRowIndx,
          shape.numColumns - startColumnIndx,
        );
      },
      getAllRecords: () => {
        return this.range.getAll(this.headerRowIndex + 1, 0);
      },
      getRecordsColumn: (columnIndex) => {
        return this.range.getColumn(columnIndex, this.headerRowIndex + 1);
      },
    };

    /**
     * flesh out attribute accessors
     */
    const mapping = {
      value: { get: 'getValues', set: 'setValues' },
      background: { get: 'getBackgrounds', set: 'setBackgrounds' },
      fontcolor: { get: 'getFontColors', set: 'setFontColors' },
      note: { get: 'getNotes', set: 'setNotes' },
      fontfamily: { get: 'getFontFamilies', set: 'setFontFamilies' },
      fontsize: { get: 'getFontSizes', set: 'setFontSizes' },
      fontstyle: { get: 'getFontStyles', set: 'setFontStyles' },
      fontweight: { get: 'getFontWeights', set: 'setFontWeights' },
      numberformat: { get: 'getNumberFormats', set: 'setNumberFormats' },
    };
    Object.keys(mapping).forEach((attribute) => {
      this[attribute] = {};
      const getSetMapping = mapping[attribute];
      Object.keys(getSetMapping).forEach((getSet) => {
        Object.keys(this.range).forEach((rangeMethodName) => {
          this[attribute][getSet + rangeMethodName.substr(3)] = (...args) => {
            const rangeMethod = this.range[rangeMethodName];
            const range = rangeMethod(...args);
            if (args.length !== 0) {
              return range[getSetMapping[getSet]](...args.splice(rangeMethod.length, args.length));
            }
            return range[getSetMapping[getSet]]();
          };
        });
      });
    });

    /**
     * flesh out getColumnIndex, columnExists getDefaultIdColumn getHeaderRow methods
     */
    this.getColumnIndex = (columnName) => {
      return this.headerRow.indexOf(columnName);
    };
    this.columnExists = (columnName) => {
      return this.getColumnIndex(columnName) !== -1;
    };
    this.getDefaultIdColumn = () => {
      return this.headerRow[this.headerColumnIndex];
    };
    this.getHeaderRow = () => {
      return clone(this.headerRow);
    };

    /**
     * flesh out getAllRecordIndexer and getSelectedRecordIndexer method
     */
    this.getAllRecordIndexer = () => {
      const indexer = new KeyedMap();
      const { numRows } = this.getShape();
      let i = this.headerRowIndex + 1;
      while (i < numRows) {
        indexer.set(i);
        i += 1;
      }
      return indexer;
    };
    this.getSelectedRecordIndexer = () => {
      return getSelectedRowIndices().reduce((indexer, i) => {
        indexer.set(i);
        return indexer;
      }, new KeyedMap());
    };

    /**
     * flesh out autoResizeColumns method
     */
    this.resizeColumns = () => {
      this.headerRow.forEach((columnName, index) => {
        this.sheet.autoResizeColumn(index + 1);
      });
    };

    /**
     * flesh out getDataPayload method
     */
    this.getDataPayload = (requestedAttributesSet, rowIndex) => {
      if (!(requestedAttributesSet instanceof AttributesSet)) {
        throw new TypeError(`getDataPayload expects an AttributesSet instance.`);
      }
      return new DataPayload(
        requestedAttributesSet.values.reduce((dataObject, attribute) => {
          if (isNumeric(rowIndex)) {
            dataObject[attribute] = this[attribute].getRow(rowIndex);
          } else {
            dataObject[attribute] = this[attribute].getAll();
          }
          return dataObject;
        }, {}),
        this.headerRowIndex,
        this.headerColumnIndex,
        this.headerRow,
      );
    };

    /**
     * flesh out insertRows and deleteRows
     */
    this.insertRow = (topOrBottom) => {
      const position = topOrBottom === TOP ? this.headerRowIndex + 1 : this.getShape().numRows;
      this.sheet.insertRowAfter(position);
      this.invalidateShape();
      return position;
    };

    this.deleteRow = (rowPosition) => {
      const position = rowPosition === undefined ? this.getShape().numRows : rowPosition;
      this.sheet.deleteRow(position);
      this.invalidateShape();
      return position;
    };

    /**
     * flesh out getDataIndex
     */

    this.getFullDataIndex = (columnName, attribute, oneIndexed) => {
      let dataIndex;
      const offset = oneIndexed === true ? 1 : 0;

      if (columnName === undefined && attribute === undefined) {
        dataIndex = this.getAllRecordIndexer();
        dataIndex.isUnique = true;
      } else {
        const attr = attribute === undefined ? DEFAULT_ATTRIBUTE : attribute;
        const columnIndex = this.getHeaderRow().indexOf(columnName);

        if (columnIndex === -1) {
          throw new Error(`failed to get dataIndex on invalid column ${columnName}.`);
        }
        if (!inArray(attr, SUPPORTED_ATTRIBUTES)) {
          throw new Error(`failed to get dataIndex on invalid attribute ${attribute}.`);
        }

        const data = this[attr].getRecordsColumn(columnIndex);
        const dataLength = data.length;
        dataIndex = new KeyedMap();
        data.forEach((item, rowIndex) => {
          dataIndex.set(item[0], rowIndex + this.headerRowIndex + 1 + offset);
        });
        dataIndex.isUnique = dataIndex.length === dataLength;
      }

      return dataIndex;
    };
  }
}
