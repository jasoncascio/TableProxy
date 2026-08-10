/**
 * InstanceOptions - instance options class
 * @return {InstanceOptions}
 */

import { AttributesSet } from './data-payload.js';
import {
  VALID_READ_LEVELS,
  READ_LEVEL_ROW,
  DEFAULT_READ_LEVEL,
  WRITE_LEVEL_TABLE,
  WRITE_LEVEL_ROW,
  VALID_WRITE_LEVELS,
  DEFAULT_WRITE_LEVEL,
  DEFAULT_ATTRIBUTE,
  SUPPORTED_ATTRIBUTES,
} from './CONSTANTS.js';
import {
  isString,
  isArray,
  isBoolean,
  isObject,
  inArray,
  isFunction,
  isNumeric,
  isDate1,
} from './utilities.js';
import { log, isSupportedType } from './sheets-utilities.js';
import clone from './clone.js';

export default class InstanceOptions {
  constructor(sheetNameOrOptions, headerAnchorToken) {
    this.pvt_spreadsheetId = null;
    this.pvt_sheetName = null;
    this.pvt_headerAnchorToken = null;
    this.pvt_exportAttributes = new AttributesSet();
    this.pvt_readLevel = DEFAULT_READ_LEVEL;
    this.pvt_writeLevel = DEFAULT_WRITE_LEVEL;
    this.pvt_autoResizeColumns = false;
    this.pvt_computedProperties = {};
    this.pvt_idColumnName = null;
    this.pvt_idAttributeName = DEFAULT_ATTRIBUTE;
    this.pvt_columnFilter = [];
    this.pvt_applyColumnFilter = false;
    this.pvt_spreadsheet = null;
    this.pvt_sheet = null;

    this.headerAnchorToken = headerAnchorToken;
    this.processInput(sheetNameOrOptions);
  }

  set headerAnchorToken(input) {
    if (this.pvt_headerAnchorToken !== null) {
      throw new Error(`headerAnchorToken can only be set once.`);
    }
    if (input && !isString(input)) {
      throw new TypeError(`headerAnchorToken must be a string.`);
    }
    this.pvt_headerAnchorToken = input || null;
  }

  get headerAnchorToken() {
    return this.pvt_headerAnchorToken;
  }

  get spreadsheetId() {
    return this.pvt_spreadsheetId;
  }

  set spreadsheetId(input) {
    if (!isString(input) && !isNumeric(input)) {
      throw new TypeError(`invalid spreadsheetId.`);
    }
    if (this.pvt_spreadsheet) {
      throw new Error(
        `spreadsheetId was already set to ${this.pvt_spreadsheetId} and cannot be changed.`,
      );
    }
    if (input === 'TPACTIVE') {
      this.pvt_spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    } else {
      this.pvt_spreadsheet = SpreadsheetApp.openById(input);
    }
    this.pvt_spreadsheetId = input;
  }

  get sheetName() {
    return this.pvt_sheetName;
  }

  set sheetName(input) {
    if (!isString(input)) {
      throw new TypeError(`sheetName must be a string.`);
    }
    if (this.pvt_sheet) {
      throw new Error(`sheetName was already set to ${this.pvt_sheetName} and cannot be changed.`);
    }
    let sheet;
    try {
      sheet = this.pvt_spreadsheet.getSheetByName(input);
    } catch (e) {
      throw new Error(`set sheetName exception: ${e}.`, { cause: e });
    }
    // getSheetByName returns null for an unknown name rather than throwing.
    // Without this check the failure surfaced much later as a null dereference
    // inside SheetAccessor ("Cannot read properties of null").
    if (!sheet) {
      throw new Error(`sheet named "${input}" does not exist in this spreadsheet.`);
    }
    this.pvt_sheet = sheet;
    this.pvt_sheetName = input;
  }

  get columnFilter() {
    return clone(this.pvt_columnFilter);
  }

  /**
   * @desc Setting a filter REPLACES the previous one. The array branch used to
   * @desc append while the scalar branch replaced, so calling this twice with
   * @desc arrays silently accumulated columns.
   */
  set columnFilter(input) {
    if (isArray(input)) {
      this.pvt_columnFilter = clone(input)
        .filter((i) => isSupportedType(i))
        .map((i) => (isString(i) ? i.trim() : i));
    } else if (isSupportedType(input)) {
      this.pvt_columnFilter = [isString(input) ? input.trim() : input];
    }
    this.pvt_applyColumnFilter = this.pvt_columnFilter.length > 0;
  }

  get applyColumnFilter() {
    return this.pvt_applyColumnFilter;
  }

  exportWithAllAttributes() {
    return this.pvt_exportAttributes.withAll();
  }

  get exportAttributes() {
    return this.pvt_exportAttributes;
  }

  set exportAttributes(input) {
    const attributes = isArray(input) ? input : [input];
    this.pvt_exportAttributes.flush();
    attributes.forEach((attribute) => {
      if (attribute !== undefined) {
        this.pvt_exportAttributes.push(attribute);
      }
    });
  }

  get readLevel() {
    return this.pvt_readLevel;
  }

  set readLevel(input) {
    if (!inArray(input, VALID_READ_LEVELS)) {
      throw new Error(`readLevel must be one of ${VALID_READ_LEVELS.toString()} received ${input}`);
    }
    this.pvt_readLevel = input;
  }

  get writeLevel() {
    if (this.pvt_readLevel === READ_LEVEL_ROW && this.pvt_writeLevel === WRITE_LEVEL_TABLE) {
      log(`Note: write level changed to row from table because read level is row.`);
      this.pvt_writeLevel = WRITE_LEVEL_ROW;
    }
    return this.pvt_writeLevel;
  }

  set writeLevel(input) {
    if (!inArray(input, VALID_WRITE_LEVELS)) {
      throw new Error(
        `writeLevel must be one of ${VALID_WRITE_LEVELS.toString()} received ${input}`,
      );
    }
    this.pvt_writeLevel = input;
  }

  get autoResizeColumns() {
    return this.pvt_autoResizeColumns;
  }

  set autoResizeColumns(input) {
    if (!isBoolean(input)) {
      throw new TypeError(`autoResizeColumns must be a boolean.`);
    }
    this.pvt_autoResizeColumns = input;
  }

  get computedProperties() {
    return this.pvt_computedProperties;
  }

  set computedProperties(input) {
    if (!isObject(input)) {
      throw new TypeError(`computedProperties must be an object.`);
    }
    Object.keys(input).forEach((key) => {
      if (!isFunction(input[key])) {
        throw new Error(`non-function provided for computedProperty value.`);
      }
    });
    this.pvt_computedProperties = input;
  }

  get idColumnName() {
    return this.pvt_idColumnName;
  }

  set idColumnName(input) {
    if (!isString(input) && !isNumeric(input) && !isDate1(input)) {
      throw new TypeError(`idColumnName value must be string, number, date.`);
    }
    this.pvt_idColumnName = isString(input) ? input.trim() : input;
  }

  get idAttributeName() {
    return this.pvt_idAttributeName;
  }

  set idAttributeName(input) {
    if (!isString(input)) {
      throw new TypeError(`idAttributeName must be a string.`);
    }
    if (!inArray(input, SUPPORTED_ATTRIBUTES)) {
      throw new Error(`${input} is not a valid idAttributeName.`);
    }
    this.pvt_idAttributeName = input;
  }

  get sheet() {
    return this.pvt_sheet;
  }

  get spreadsheet() {
    return this.pvt_spreadsheet;
  }

  processInput(sheetNameOrOptions) {
    this.pvt_exportAttributes.push(DEFAULT_ATTRIBUTE);
    const errMsg =
      'requires a string sheetName or an options object which at least define a valid sheetName';

    if (sheetNameOrOptions === undefined || sheetNameOrOptions === null) {
      throw new Error(errMsg);
    }

    if (isString(sheetNameOrOptions)) {
      this.spreadsheetId = 'TPACTIVE';
      this.sheetName = sheetNameOrOptions;
    } else if (isObject(sheetNameOrOptions)) {
      if (sheetNameOrOptions.spreadsheetId) {
        this.spreadsheetId = sheetNameOrOptions.spreadsheetId;
      } else {
        this.spreadsheetId = 'TPACTIVE';
      }
      Object.keys(sheetNameOrOptions).forEach((key) => {
        if (key.indexOf('pvt_') === -1 && key.indexOf('spreadsheetId') === -1) {
          this[key] = sheetNameOrOptions[key];
        }
      });
      if (!this.sheet) {
        this.sheetName = this.pvt_spreadsheet.getActiveSheet().getName();
      }
    } else {
      throw new Error(errMsg);
    }

    return this;
  }

  getSettingsExport() {
    const retObj = {};
    retObj.spreadsheetId = this.spreadsheetId;
    retObj.sheetName = this.sheetName;
    retObj.headerAnchorToken = this.headerAnchorToken;
    retObj.exportAttributes = this.exportAttributes.values;
    retObj.writeLevel = this.writeLevel;
    retObj.autoResizeColumns = this.autoResizeColumns;
    retObj.computedProperties = this.computedProperties;
    retObj.idColumnName = this.idColumnName;
    retObj.idAttributeName = this.idAttributeName;
    if (this.applyColumnFilter) {
      retObj.columnFilter = clone(this.columnFilter);
    }
    return retObj;
  }
}
