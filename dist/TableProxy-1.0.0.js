function asName() {}

function TableProxy() {}

function $initTableProxy() {}

function $initUtils() {}

(() => {
    "use strict";
    (function() {
        if ("object" == typeof globalThis) return globalThis;
        try {
            return this || new Function("return this")();
        } catch (e) {
            if ("object" == typeof window) return window;
        }
    })();
    let __webpack_exports__ = {};
    const typeTag = input => Object.prototype.toString.call(input), isDate1 = input => "[object Date]" === typeTag(input), isArray = input => "[object Array]" === typeTag(input), isString = input => "[object String]" === typeTag(input), isNumeric = input => "[object Number]" === typeTag(input), isFunction = input => "[object Function]" === typeTag(input), isObject = input => "[object Object]" === typeTag(input) && null != input, isBoolean = input => "[object Boolean]" === typeTag(input), isNull = input => null === input, isUndefined = input => void 0 === input, inArray = (needle, haystack) => -1 !== haystack.indexOf(needle), getType = input => {
        const ts = typeTag(input);
        let type;
        switch (ts) {
          case "[object Boolean]":
          case "[object String]":
          case "[object Number]":
          case "[object Array]":
          case "[object Function]":
          case "[object Date]":
          case "[object Undefined]":
          case "[object Null]":
            type = ts;
            break;

          case "[object Object]":
            type = isNull(input) ? "[object Null]" : isUndefined(input) ? "[object Undefined]" : "[object Object]";
            break;

          default:
            throw new Error(`getType resolved to unknown for ${input}`);
        }
        return type;
    }, getTimeStamp = precision => {
        const time = (new Date).getTime();
        return precision ? time.toFixed(precision) : time;
    }, getTimeDiff = (oldTime, precision) => {
        const newTime = getTimeStamp();
        return precision ? (newTime - oldTime).toFixed(precision) : newTime - oldTime;
    }, strContains = (string, test) => {
        let contains = !1;
        return (isArray(test) ? test : [ test ]).forEach(t => {
            -1 !== string.indexOf(t) && (contains = !0);
        }), contains;
    }, getTokens = (tokenizedString, onlyFieldNames) => {
        const tokenList = tokenizedString.match(/({{![^{}]*}})/gm);
        if (!0 === onlyFieldNames) for (let i = 0; i < tokenList.length; i += 1) tokenList[i] = tokenList[i].replace("{{!", "").replace("}}", "");
        return tokenList;
    };
    function normalizeKey(key) {
        switch (typeTag(key)) {
          case "[object String]":
            return `s:${key}`;

          case "[object Number]":
            return `n:${key}`;

          case "[object Boolean]":
            return `b:${key}`;

          case "[object Date]":
            return `d:${key.getTime()}`;

          default:
            throw new TypeError(`KeyedMap can't accept ${typeTag(key)} keys.`);
        }
    }
    class KeyedMap {
        constructor(input) {
            if (this.entriesByKey = new Map, null != input) if (input instanceof KeyedMap) this.copyItems(input); else if (Array.isArray(input)) input.forEach(item => this.set(item, !0)); else {
                if ("[object Object]" !== typeTag(input)) throw new Error(`${typeTag(input)} not valid input for KeyedMap constructor.`);
                Object.keys(input).forEach(key => this.set(key, input[key]));
            }
        }
        has(key) {
            return this.entriesByKey.has(normalizeKey(key));
        }
        set(key, value) {
            return this.entriesByKey.set(normalizeKey(key), {
                key,
                value
            }), this;
        }
        get(key) {
            const entry = this.entriesByKey.get(normalizeKey(key));
            return void 0 === entry ? void 0 : entry.value;
        }
        delete(key) {
            return this.entriesByKey.delete(normalizeKey(key));
        }
        keys() {
            return [ ...this.entriesByKey.values() ].map(entry => entry.key);
        }
        values() {
            return [ ...this.entriesByKey.values() ].map(entry => entry.value);
        }
        entries() {
            return [ ...this.entriesByKey.values() ].map(entry => [ entry.key, entry.value ]);
        }
        clear() {
            return this.entriesByKey.clear(), this;
        }
        forEach(callback) {
            this.entries().forEach(([key, value]) => callback(value, key, this));
        }
        copyItems(other) {
            if (!(other instanceof KeyedMap)) throw new TypeError("copyItems accepts only KeyedMap input.");
            return other.entries().forEach(([key, value]) => this.set(key, value)), this;
        }
        get empty() {
            return 0 === this.entriesByKey.size;
        }
        get length() {
            return this.entriesByKey.size;
        }
    }
    class UniqueKeySet extends KeyedMap {
        push(item) {
            return !this.has(item) && (this.set(item), !0);
        }
        remove(item) {
            return this.delete(item), this;
        }
        flush() {
            return this.clear();
        }
        forEach(callback) {
            this.keys().forEach(key => callback(key));
        }
        copyValues(input) {
            if (!(input instanceof UniqueKeySet)) throw new TypeError("copyValues accepts only UniqueKeySet input.");
            return input.keys().forEach(key => this.push(key)), this;
        }
        hasSame(input) {
            if (!(input instanceof UniqueKeySet)) throw new TypeError("hasSame expects a UniqueKeySet instance.");
            return this.length === input.length && this.keys().every(key => input.has(key));
        }
        get values() {
            return this.keys();
        }
    }
    function getDuplicates(...args) {
        const items = Array.isArray(args[0]) ? args[0] : args, seen = new KeyedMap, duplicates = new KeyedMap;
        return items.forEach(item => {
            seen.has(item) ? duplicates.set(item) : seen.set(item);
        }), duplicates.keys();
    }
    const C = {
        $: " index ",
        RT: "READ_LEVEL_TABLE",
        RR: "READ_LEVEL_ROW",
        WC: "WRITE_LEVEL_CELL",
        WR: "WRITE_LEVEL_ROW",
        WT: "WRITE_LEVEL_TABLE",
        T: "TOP",
        B: "BOTTOM",
        AV: "value",
        AB: "background",
        AC: "fontcolor",
        AN: "note",
        AZ: "fontsize",
        AS: "fontstyle",
        AF: "fontfamily",
        AW: "fontweight",
        AD: "numberformat",
        DS: "mm/dd/yy",
        DST: "mm/dd/yy h:mm",
        NINT: "#,##0",
        NP1: "#,##0.0",
        NP2: "#,##0.00",
        SUCCESS: "#DFFFB4",
        FAILURE: "#FFB4B4",
        WARNING: "#FFDDB4",
        RED: "red",
        WHITE: "white",
        BLUE: "blue",
        GREEN: "green",
        ORANGE: "orange",
        BLACK: "black",
        GREY: "grey",
        YELLOW: "yellow",
        LIGHT_GREY: "#E5DEDE"
    }, INDEX_PROP = C.$, READ_LEVEL_TABLE = C.RT, READ_LEVEL_ROW = C.RR, VALID_READ_LEVELS = [ C.RT, C.RR ], DEFAULT_READ_LEVEL = C.RT, WRITE_LEVEL_CELL = C.WC, WRITE_LEVEL_ROW = C.WR, WRITE_LEVEL_TABLE = C.WT, VALID_WRITE_LEVELS = [ C.WC, C.WR, C.WT ], DEFAULT_WRITE_LEVEL = C.WC, SUPPORTED_ATTRIBUTES = [ C.AV, C.AB, C.AC, C.AN, C.AZ, C.AS, C.AF, C.AW, C.AD ], DEFAULT_ATTRIBUTE = C.AV, ATTR_NOTE = C.AN, TOP = C.T, SUPPORTED_OPS = [ "UNIQUE", "SELECT", "UPDATE", "WRITE_RECORDS" ];
    class DataPayload {
        constructor(dataObject, headerRowIndex, headerColumnIndex, headerRow) {
            this.dataObject = dataObject, this.headerRowIndex = headerRowIndex, this.headerColumnIndex = headerColumnIndex, 
            this.headerRow = headerRow;
        }
        getDataIndex(columnName, attribute) {
            const dataIndex = new KeyedMap;
            if (void 0 === columnName && void 0 === attribute) this.dataObject[DEFAULT_ATTRIBUTE].forEach((row, index) => {
                dataIndex.set(index, index);
            }), dataIndex.isUnique = !0; else {
                const attr = void 0 === attribute ? Object.keys(this.dataObject)[0] : attribute, columnIndex = this.headerRow.indexOf(columnName);
                if (-1 === columnIndex) throw new Error(`failed to get dataIndex on invalid column ${columnName}.`);
                if (!inArray(attr, Object.keys(this.dataObject))) throw new Error(`failed to get dataIndex on invalid attribute ${attribute}.`);
                const dataLength = this.dataObject[attr].length;
                for (let i = this.headerRowIndex + 1; i < dataLength; i += 1) dataIndex.set(this.dataObject[attr][i][columnIndex], i);
                dataIndex.isUnique = dataIndex.length === dataLength - this.headerRowIndex - 1;
            }
            return dataIndex;
        }
    }
    class AttributesSet extends UniqueKeySet {
        push(attribute) {
            if (!inArray(attribute, SUPPORTED_ATTRIBUTES)) throw new Error(`${attribute} is not a supported attribute.`);
            return this.set(attribute);
        }
        withAll() {
            return SUPPORTED_ATTRIBUTES.forEach(attribute => {
                this.push(attribute);
            }), this;
        }
    }
    const getSheetsObjectType = input => {
        if (null !== input && "object" == typeof input) return isFunction(input.getA1Notation) ? "Range" : isFunction(input.getSheets) ? "Spreadsheet" : isFunction(input.getRange) && isFunction(input.getName) ? "Sheet" : void 0;
    }, isSheet = input => "Sheet" === getSheetsObjectType(input), isRange = input => "Range" === getSheetsObjectType(input), isSupportedType = input => -1 !== [ "[object String]", "[object Number]", "[object Date]", "[object Boolean]" ].indexOf(typeTag(input)), getShape = input => {
        if (isArray(input)) {
            if (isArray(input[0])) return `${input.length}x${input[0].length}`;
            throw new Error("getShape called on non-2d array");
        }
        if (isRange(input)) return `${input.getNumRows()}x${input.getNumColumns()}`;
        throw new Error("getShape called on data with type which does not have meaningful 2d shape.");
    }, log = input => {
        Logger.log(input);
    }, getSelectedRowIndices = () => Object.keys(SpreadsheetApp.getActiveSheet().getSelection().getActiveRangeList().getRanges().reduce((a, r) => {
        const sr = r.getRow() - 1, er = sr + r.getNumRows();
        for (let i = sr; i < er; i += 1) a[i] = !0;
        return a;
    }, {})).map(k => Number(k)), getSpreadsheet = spreadsheetId => spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet(), Utils = {
        getSheetsObjectType,
        isSpreadsheet: input => "Spreadsheet" === getSheetsObjectType(input),
        isSheet,
        isRange,
        isSupportedType,
        getSelectedRowIndices,
        sendEmail: (to, subject, body, htmlBody) => {
            const msgObj = {
                to: isArray(to) ? to.join(",") : to,
                subject,
                body
            };
            return void 0 !== htmlBody && (msgObj.htmlBody = htmlBody), MailApp.sendEmail(msgObj);
        },
        getSpreadsheet,
        getSheetIndex: (sheetName, spreadsheetId) => {
            const sheets = getSpreadsheet(spreadsheetId).getSheets();
            for (let i = 0; i < sheets.length; i += 1) if (sheets[i].getName() === sheetName) return i;
            return -1;
        },
        getSheet: sheetOrSheetName => {
            if (!isString(sheetOrSheetName)) {
                if (isSheet(sheetOrSheetName)) return sheetOrSheetName;
                throw new Error(`getSheet called with invalid sheetOrSheetName data type: "${getSheetsObjectType(sheetOrSheetName)}".`);
            }
            try {
                return ((sheetName, spreadsheetId) => {
                    const sheet = getSpreadsheet(spreadsheetId).getSheetByName(sheetName);
                    if (!sheet) throw new Error(`getSheetByName was unable to find a sheet with name "${sheetName}"`);
                    return sheet;
                })(sheetOrSheetName);
            } catch (e) {
                throw new Error(`getSheet could not retrieve sheet with name "${sheetOrSheetName}".`, {
                    cause: e
                });
            }
        },
        getShape,
        namedRangeExists: (namedRange, spreadsheetId) => null != getSpreadsheet(spreadsheetId).getRangeByName(namedRange),
        getValueByName: (namedRange, spreadsheetId) => {
            const range = getSpreadsheet(spreadsheetId).getRangeByName(namedRange);
            if (!range) throw new Error(`getValueByName failed because the namedRange "${namedRange}" does not exist.`);
            return "1x1" === getShape(range) ? range.getValues()[0][0] : range.getValues();
        },
        updateValueByName: (namedRange, value, spreadsheetId) => {
            const range = getSpreadsheet(spreadsheetId).getRangeByName(namedRange);
            if (!range) throw new Error(`updateValueByName failed because the namedRange "${namedRange}" does not exist.`);
            if (!range.isPartOfMerge()) {
                let updVal = value;
                switch (getType(value)) {
                  case "[object String]":
                  case "[object Number]":
                  case "[object Boolean]":
                  case "[object Date]":
                    updVal = [ [ value ] ];
                    break;

                  case "[object Array]":
                    break;

                  default:
                    throw new Error("updateValueByName - input value is neither an array or a string");
                }
                if (updVal.length !== range.getNumRows()) throw new Error("value is not of the same size as the namedRange: row count incorrect");
                if (updVal[0].length !== range.getNumColumns()) throw new Error("value is not of the same size as the namedRange: column count problem");
                return range.setValues(updVal);
            }
            if (!isString(value)) throw new Error("updateValueByName - range to update is merged, update value must be a string.");
            return range.setValue(value), !0;
        },
        getCoordinatesByName: (namedRange, spreadsheetId) => {
            const range = getSpreadsheet(spreadsheetId).getRangeByName(namedRange);
            if (!range) throw new Error("getCoordinatesByName failed - input range does not exist.");
            return {
                startRow: range.getRow(),
                endRow: range.getLastRow(),
                startCol: range.getColumn(),
                endCol: range.getLastColumn()
            };
        },
        getNamedRangesObject: spreadsheetId => getSpreadsheet(spreadsheetId).getNamedRanges().reduce((retObj, namedRange) => {
            const range = namedRange.getRange();
            let getter, setter;
            return "1x1" === getShape(range) || range.isPartOfMerge() ? (getter = () => range.getValue(), 
            setter = input => range.setValue(input)) : (getter = () => range.getValues(), setter = input => range.setValues(input)), 
            Object.defineProperty(retObj, namedRange.getName(), {
                enumerable: !0,
                configurable: !1,
                get: getter,
                set: setter
            }), retObj;
        }, {}),
        isDate1,
        isArray,
        isString,
        isNumeric,
        isFunction,
        isObject,
        isBoolean,
        isNull,
        isUndefined,
        inArray,
        getType,
        toBool: value => {
            switch (isString(value) ? value.toLowerCase() : value) {
              case !0:
              case "true":
              case 1:
              case "1":
              case "on":
              case "yes":
                return !0;

              default:
                return !1;
            }
        },
        firstToUpper: string => string.charAt(0).toUpperCase() + string.slice(1),
        getTimeStamp,
        getTimeDiff,
        isJson: str => {
            if (!isString(str)) return !1;
            try {
                JSON.parse(str);
            } catch {
                return !1;
            }
            return !0;
        },
        toJson: obj => JSON.stringify(obj).replace(/\\n/g, "\\n").replace(/\\'/g, "\\'").replace(/\\"/g, '\\"').replace(/\\&/g, "\\&").replace(/\\r/g, "\\r").replace(/\\t/g, "\\t").replace(/\\b/g, "\\b").replace(/\\f/g, "\\f"),
        isEmail: email => /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(email).toLowerCase()),
        tokenInterpolate: (tokenizedString, record) => {
            const tokenList = getTokens(tokenizedString);
            let result = tokenizedString;
            for (let i = 0; i < tokenList.length; i += 1) try {
                result = result.replace(tokenList[i], tokenList[i].replace("{{!", "").replace("}}", "").split(".").reduce((o, j) => o[j], record));
            } catch (e) {
                throw new Error(`tokenInterpolate failed "${tokenList[i]}" not in ${JSON.stringify(record)}`, {
                    cause: e
                });
            }
            return result;
        },
        getTokens,
        removeDuplicates: function removeDuplicates(array) {
            return new KeyedMap(array).keys();
        },
        getDuplicates,
        testUnique: function testUnique(...args) {
            return 0 === getDuplicates(Array.isArray(args[0]) ? args[0] : args).length;
        }
    };
    function clone(input) {
        let copy;
        const toStringType = typeTag(input);
        switch (toStringType) {
          case "[object Undefined]":
          case "[object Null]":
          case "[object Number]":
          case "[object String]":
          case "[object Boolean]":
            copy = input;
            break;

          case "[object Array]":
            copy = input.map(i => clone(i));
            break;

          case "[object Object]":
            null == input ? copy = input : (copy = {}, Object.keys(input).forEach(property => {
                copy[property] = clone(input[property]);
            }));
            break;

          case "[object Date]":
            copy = new Date, copy.setTime(input.getTime());
            break;

          default:
            throw new TypeError(`Unable to clone: object type ${toStringType} is unsupported.`);
        }
        return copy;
    }
    class InstanceOptions {
        constructor(sheetNameOrOptions, headerAnchorToken) {
            this.pvt_spreadsheetId = null, this.pvt_sheetName = null, this.pvt_headerAnchorToken = null, 
            this.pvt_exportAttributes = new AttributesSet, this.pvt_readLevel = DEFAULT_READ_LEVEL, 
            this.pvt_writeLevel = DEFAULT_WRITE_LEVEL, this.pvt_autoResizeColumns = !1, this.pvt_computedProperties = {}, 
            this.pvt_idColumnName = null, this.pvt_idAttributeName = DEFAULT_ATTRIBUTE, this.pvt_columnFilter = [], 
            this.pvt_applyColumnFilter = !1, this.pvt_spreadsheet = null, this.pvt_sheet = null, 
            this.headerAnchorToken = headerAnchorToken, this.processInput(sheetNameOrOptions);
        }
        set headerAnchorToken(input) {
            if (null !== this.pvt_headerAnchorToken) throw new Error("headerAnchorToken can only be set once.");
            if (input && !isString(input)) throw new TypeError("headerAnchorToken must be a string.");
            this.pvt_headerAnchorToken = input || null;
        }
        get headerAnchorToken() {
            return this.pvt_headerAnchorToken;
        }
        get spreadsheetId() {
            return this.pvt_spreadsheetId;
        }
        set spreadsheetId(input) {
            if (!isString(input) && !isNumeric(input)) throw new TypeError("invalid spreadsheetId.");
            if (this.pvt_spreadsheet) throw new Error(`spreadsheetId was already set to ${this.pvt_spreadsheetId} and cannot be changed.`);
            this.pvt_spreadsheet = "TPACTIVE" === input ? SpreadsheetApp.getActiveSpreadsheet() : SpreadsheetApp.openById(input), 
            this.pvt_spreadsheetId = input;
        }
        get sheetName() {
            return this.pvt_sheetName;
        }
        set sheetName(input) {
            if (!isString(input)) throw new TypeError("sheetName must be a string.");
            if (this.pvt_sheet) throw new Error(`sheetName was already set to ${this.pvt_sheetName} and cannot be changed.`);
            let sheet;
            try {
                sheet = this.pvt_spreadsheet.getSheetByName(input);
            } catch (e) {
                throw new Error(`set sheetName exception: ${e}.`, {
                    cause: e
                });
            }
            if (!sheet) throw new Error(`sheet named "${input}" does not exist in this spreadsheet.`);
            this.pvt_sheet = sheet, this.pvt_sheetName = input;
        }
        get columnFilter() {
            return clone(this.pvt_columnFilter);
        }
        set columnFilter(input) {
            isArray(input) ? this.pvt_columnFilter = clone(input).filter(i => isSupportedType(i)).map(i => isString(i) ? i.trim() : i) : isSupportedType(input) && (this.pvt_columnFilter = [ isString(input) ? input.trim() : input ]), 
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
            const attributes = isArray(input) ? input : [ input ];
            this.pvt_exportAttributes.flush(), attributes.forEach(attribute => {
                void 0 !== attribute && this.pvt_exportAttributes.push(attribute);
            });
        }
        get readLevel() {
            return this.pvt_readLevel;
        }
        set readLevel(input) {
            if (!inArray(input, VALID_READ_LEVELS)) throw new Error(`readLevel must be one of ${VALID_READ_LEVELS.toString()} received ${input}`);
            this.pvt_readLevel = input;
        }
        get writeLevel() {
            return this.pvt_readLevel === READ_LEVEL_ROW && this.pvt_writeLevel === WRITE_LEVEL_TABLE && (log("Note: write level changed to row from table because read level is row."), 
            this.pvt_writeLevel = WRITE_LEVEL_ROW), this.pvt_writeLevel;
        }
        set writeLevel(input) {
            if (!inArray(input, VALID_WRITE_LEVELS)) throw new Error(`writeLevel must be one of ${VALID_WRITE_LEVELS.toString()} received ${input}`);
            this.pvt_writeLevel = input;
        }
        get autoResizeColumns() {
            return this.pvt_autoResizeColumns;
        }
        set autoResizeColumns(input) {
            if (!isBoolean(input)) throw new TypeError("autoResizeColumns must be a boolean.");
            this.pvt_autoResizeColumns = input;
        }
        get computedProperties() {
            return this.pvt_computedProperties;
        }
        set computedProperties(input) {
            if (!isObject(input)) throw new TypeError("computedProperties must be an object.");
            Object.keys(input).forEach(key => {
                if (!isFunction(input[key])) throw new Error("non-function provided for computedProperty value.");
            }), this.pvt_computedProperties = input;
        }
        get idColumnName() {
            return this.pvt_idColumnName;
        }
        set idColumnName(input) {
            if (!isString(input) && !isNumeric(input) && !isDate1(input)) throw new TypeError("idColumnName value must be string, number, date.");
            this.pvt_idColumnName = isString(input) ? input.trim() : input;
        }
        get idAttributeName() {
            return this.pvt_idAttributeName;
        }
        set idAttributeName(input) {
            if (!isString(input)) throw new TypeError("idAttributeName must be a string.");
            if (!inArray(input, SUPPORTED_ATTRIBUTES)) throw new Error(`${input} is not a valid idAttributeName.`);
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
            const errMsg = "requires a string sheetName or an options object which at least define a valid sheetName";
            if (null == sheetNameOrOptions) throw new Error(errMsg);
            if (isString(sheetNameOrOptions)) this.spreadsheetId = "TPACTIVE", this.sheetName = sheetNameOrOptions; else {
                if (!isObject(sheetNameOrOptions)) throw new Error(errMsg);
                sheetNameOrOptions.spreadsheetId ? this.spreadsheetId = sheetNameOrOptions.spreadsheetId : this.spreadsheetId = "TPACTIVE", 
                Object.keys(sheetNameOrOptions).forEach(key => {
                    -1 === key.indexOf("pvt_") && -1 === key.indexOf("spreadsheetId") && (this[key] = sheetNameOrOptions[key]);
                }), this.sheet || (this.sheetName = this.pvt_spreadsheet.getActiveSheet().getName());
            }
            return this;
        }
        getSettingsExport() {
            const retObj = {};
            return retObj.spreadsheetId = this.spreadsheetId, retObj.sheetName = this.sheetName, 
            retObj.headerAnchorToken = this.headerAnchorToken, retObj.exportAttributes = this.exportAttributes.values, 
            retObj.writeLevel = this.writeLevel, retObj.autoResizeColumns = this.autoResizeColumns, 
            retObj.computedProperties = this.computedProperties, retObj.idColumnName = this.idColumnName, 
            retObj.idAttributeName = this.idAttributeName, this.applyColumnFilter && (retObj.columnFilter = clone(this.columnFilter)), 
            retObj;
        }
    }
    class SheetAccessor {
        constructor(instanceOptions) {
            if (!(instanceOptions instanceof InstanceOptions)) throw new TypeError("DataController requires an instance of InstanceOptions object.");
            if (this.sheet = instanceOptions.sheet, this.range = {}, this.value = {}, this.background = {}, 
            this.fontcolor = {}, this.note = {}, this.fontfamily = {}, this.fontsize = {}, this.fontstyle = {}, 
            this.fontweight = {}, this.numberformat = {}, this.headerRowIndex = 0, this.headerColumnIndex = 0, 
            this.headerRow = null, this.getColumnIndex = null, this.columnExists = null, this.getAllRecordIndexer = null, 
            this.getSelectedRecordIndexer = null, this.resizeColumns = null, this.getDataPayload = null, 
            this.insertRows = null, this.deleteRows = null, this.getHeaderRow = null, this.getDataIndex = null, 
            this.shape = null, this.getShape = () => {
                if (null === this.shape) {
                    const dataRange = this.sheet.getDataRange();
                    this.shape = {
                        numRows: dataRange.getNumRows(),
                        numColumns: dataRange.getNumColumns()
                    };
                }
                return this.shape;
            }, this.invalidateShape = () => (this.shape = null, this), instanceOptions.headerAnchorToken) {
                const allNotes = this.sheet.getDataRange().getNotes(), {headerAnchorToken} = instanceOptions;
                findAnchor: for (let rowIndex = 0; rowIndex < allNotes.length; rowIndex += 1) {
                    const noteRow = allNotes[rowIndex];
                    for (let columnIndex = 0; columnIndex < noteRow.length; columnIndex += 1) if (-1 !== noteRow[columnIndex].indexOf(headerAnchorToken)) {
                        this.headerRowIndex = rowIndex, this.headerColumnIndex = columnIndex;
                        break findAnchor;
                    }
                }
            }
            this.headerRow = this.sheet.getDataRange().getValues()[this.headerRowIndex];
            const duplicates = getDuplicates(this.headerRow);
            if (duplicates.length > 0) throw new Error(`Sheet "${this.sheet.getName()}" has duplicate column headers... ${duplicates.join(", ")}`);
            this.range = {
                getCell: (rowIndex, columnIndex) => this.sheet.getRange(rowIndex + 1, columnIndex + 1),
                getRow: rowIndex => this.sheet.getRange(rowIndex + 1, 1, 1, this.getShape().numColumns),
                getColumn: (columnIndex, startRowIndex) => {
                    const startRowIndx = isNumeric(startRowIndex) ? startRowIndex : 0;
                    return this.sheet.getRange(startRowIndx + 1, columnIndex + 1, this.getShape().numRows - startRowIndx, 1);
                },
                getAll: (startRowIndex, startColumnIndex) => {
                    const shape = this.getShape(), startRowIndx = isNumeric(startRowIndex) ? startRowIndex : 0, startColumnIndx = isNumeric(startColumnIndex) ? startColumnIndex : 0;
                    return this.sheet.getRange(startRowIndx + 1, startColumnIndx + 1, shape.numRows - startRowIndx, shape.numColumns - startColumnIndx);
                },
                getAllRecords: () => this.range.getAll(this.headerRowIndex + 1, 0),
                getRecordsColumn: columnIndex => this.range.getColumn(columnIndex, this.headerRowIndex + 1)
            };
            const mapping = {
                value: {
                    get: "getValues",
                    set: "setValues"
                },
                background: {
                    get: "getBackgrounds",
                    set: "setBackgrounds"
                },
                fontcolor: {
                    get: "getFontColors",
                    set: "setFontColors"
                },
                note: {
                    get: "getNotes",
                    set: "setNotes"
                },
                fontfamily: {
                    get: "getFontFamilies",
                    set: "setFontFamilies"
                },
                fontsize: {
                    get: "getFontSizes",
                    set: "setFontSizes"
                },
                fontstyle: {
                    get: "getFontStyles",
                    set: "setFontStyles"
                },
                fontweight: {
                    get: "getFontWeights",
                    set: "setFontWeights"
                },
                numberformat: {
                    get: "getNumberFormats",
                    set: "setNumberFormats"
                }
            };
            Object.keys(mapping).forEach(attribute => {
                this[attribute] = {};
                const getSetMapping = mapping[attribute];
                Object.keys(getSetMapping).forEach(getSet => {
                    Object.keys(this.range).forEach(rangeMethodName => {
                        this[attribute][getSet + rangeMethodName.substr(3)] = (...args) => {
                            const rangeMethod = this.range[rangeMethodName], range = rangeMethod(...args);
                            return 0 !== args.length ? range[getSetMapping[getSet]](...args.splice(rangeMethod.length, args.length)) : range[getSetMapping[getSet]]();
                        };
                    });
                });
            }), this.getColumnIndex = columnName => this.headerRow.indexOf(columnName), this.columnExists = columnName => -1 !== this.getColumnIndex(columnName), 
            this.getDefaultIdColumn = () => this.headerRow[this.headerColumnIndex], this.getHeaderRow = () => clone(this.headerRow), 
            this.getAllRecordIndexer = () => {
                const indexer = new KeyedMap, {numRows} = this.getShape();
                let i = this.headerRowIndex + 1;
                for (;i < numRows; ) indexer.set(i), i += 1;
                return indexer;
            }, this.getSelectedRecordIndexer = () => getSelectedRowIndices().reduce((indexer, i) => (indexer.set(i), 
            indexer), new KeyedMap), this.resizeColumns = () => {
                this.headerRow.forEach((columnName, index) => {
                    this.sheet.autoResizeColumn(index + 1);
                });
            }, this.getDataPayload = (requestedAttributesSet, rowIndex) => {
                if (!(requestedAttributesSet instanceof AttributesSet)) throw new TypeError("getDataPayload expects an AttributesSet instance.");
                return new DataPayload(requestedAttributesSet.values.reduce((dataObject, attribute) => (isNumeric(rowIndex) ? dataObject[attribute] = this[attribute].getRow(rowIndex) : dataObject[attribute] = this[attribute].getAll(), 
                dataObject), {}), this.headerRowIndex, this.headerColumnIndex, this.headerRow);
            }, this.insertRow = topOrBottom => {
                const position = topOrBottom === TOP ? this.headerRowIndex + 1 : this.getShape().numRows;
                return this.sheet.insertRowAfter(position), this.invalidateShape(), position;
            }, this.deleteRow = rowPosition => {
                const position = void 0 === rowPosition ? this.getShape().numRows : rowPosition;
                return this.sheet.deleteRow(position), this.invalidateShape(), position;
            }, this.getFullDataIndex = (columnName, attribute, oneIndexed) => {
                let dataIndex;
                const offset = !0 === oneIndexed ? 1 : 0;
                if (void 0 === columnName && void 0 === attribute) dataIndex = this.getAllRecordIndexer(), 
                dataIndex.isUnique = !0; else {
                    const attr = void 0 === attribute ? DEFAULT_ATTRIBUTE : attribute, columnIndex = this.getHeaderRow().indexOf(columnName);
                    if (-1 === columnIndex) throw new Error(`failed to get dataIndex on invalid column ${columnName}.`);
                    if (!inArray(attr, SUPPORTED_ATTRIBUTES)) throw new Error(`failed to get dataIndex on invalid attribute ${attribute}.`);
                    const data = this[attr].getRecordsColumn(columnIndex), dataLength = data.length;
                    dataIndex = new KeyedMap, data.forEach((item, rowIndex) => {
                        dataIndex.set(item[0], rowIndex + this.headerRowIndex + 1 + offset);
                    }), dataIndex.isUnique = dataIndex.length === dataLength;
                }
                return dataIndex;
            };
        }
    }
    class Timer {
        constructor(text, suppressLogStart) {
            if (!isString(text)) throw new Error("Timer requires text.");
            this.text = text, this.startTime = getTimeStamp(), this.duration = null, !0 !== suppressLogStart && log(`${this.text} operation started`);
        }
        getStartTime() {
            return this.startTime;
        }
        getDuration() {
            return this.duration;
        }
        getText() {
            return this.text;
        }
        stop(text) {
            const endText = isString(text) ? `\n${text}` : "";
            return this.duration = getTimeDiff(this.startTime, 0), log(`${this.text} operation completed in ${this.duration}ms${endText}`), 
            this.duration;
        }
    }
    class QueryDriver {
        constructor(type, noteForLogging) {
            this.type = type.toUpperCase(), this.query = () => !0, this.returnWithRecords = !1, 
            this.withSelect = !1, this.requestedAttributesSet = new AttributesSet, this.matchColumnName = null, 
            this.matchAttributeName = null, this.recordObjectsToWrite = null, this.usesIndexProp = !1, 
            this.otherResults = new KeyedMap, this.noteForLogging = noteForLogging, this.timer = new Timer(`${this.getTimerText()}`), 
            this.resultSet = new KeyedMap, this.errors = new KeyedMap, this.warnings = new KeyedMap, 
            this.updatedRecordIndices = [];
        }
        getTimerText() {
            let text = this.type;
            return text += this.noteForLogging ? ` (${this.noteForLogging})` : "", text;
        }
        setQuery(query) {
            if (!isFunction(query)) throw new TypeError("query must be a function.");
            this.query = query;
            const queryAsString = query.toString();
            return SUPPORTED_ATTRIBUTES.forEach(attribute => {
                const re1 = new RegExp(`[[]{1}['|"]{1}${attribute}['|"]{1}[]]{1}`, "g"), re2 = new RegExp(`[.]{1}${attribute}[^a-zA-Z0-9]`, "g");
                (re1.test(queryAsString) || re2.test(queryAsString)) && this.requestedAttributesSet.push(attribute);
            }), this;
        }
        setReturnWithRecords(bool) {
            return this.returnWithRecords = !0 === bool, this;
        }
        setWithSelect(bool) {
            return this.withSelect = !0 === bool, this;
        }
        setRecordObjectsToWrite(arrayOfRecords) {
            if (!isArray(arrayOfRecords)) throw new TypeError("expecting an array of record objects.");
            Object.prototype.hasOwnProperty.call(arrayOfRecords[0], INDEX_PROP) && (this.usesIndexProp = !0), 
            arrayOfRecords.forEach((record, index) => {
                if (!isObject(record)) throw new TypeError(`record object array contained ${typeTag(record)} at index ${index}.`);
            });
            const json = JSON.stringify(arrayOfRecords);
            return SUPPORTED_ATTRIBUTES.forEach(attribute => {
                new RegExp(`"${attribute}":`, "g").test(json) && this.requestedAttributesSet.push(attribute);
            }), this.recordObjectsToWrite = arrayOfRecords, this;
        }
        getRecordObjectsToWrite() {
            return this.recordObjectsToWrite;
        }
        addAttributes(attributesSet) {
            if (attributesSet) {
                if (!(attributesSet instanceof AttributesSet)) throw new TypeError("setRequestedAttributes accepts AttributeSet instances.");
                this.requestedAttributesSet.copyValues(attributesSet);
            }
            return this;
        }
        addAttribute(attribute) {
            if (!inArray(attribute, SUPPORTED_ATTRIBUTES)) throw new TypeError(`invalid attribute ${attribute}`);
            return this.requestedAttributesSet.push(attribute), this;
        }
        setMatchColumnName(columnName) {
            return this.matchColumnName = columnName.trim(), this;
        }
        setMatchAttributeName(attribute) {
            return this.matchAttributeName = attribute.trim(), this;
        }
        get resultCount() {
            return this.resultSet.length;
        }
        get updatedCount() {
            return this.updatedRecordIndices.length;
        }
        get updatedIndices() {
            return this.updatedRecordIndices.map(i => i);
        }
        pushResult(index, record) {
            return this.resultSet.set(index, record), this;
        }
        pushWarning(index, content) {
            return this.warnings.set(index, content), this;
        }
        pushError(index, content) {
            return this.errors.set(index, content), this;
        }
        done() {
            return this.timer.stop(this.query.toString()), this;
        }
    }
    class MainCursor extends KeyedMap {
        constructor(sheetAccessor) {
            if (super(), !(sheetAccessor instanceof SheetAccessor)) throw new TypeError("MainCursor constructor requires a SheetAccessor.");
            this.sheetAccessor = sheetAccessor, this.attributesSet = new AttributesSet, this.dirty = !0, 
            this.flush();
        }
        get indices() {
            return this.keys();
        }
        get isDirty() {
            return this.dirty;
        }
        set isDirty(input) {
            this.dirty = !0 === input;
        }
        flush() {
            return this.attributesSet.flush(), this.dirty = !0, this.clear().copyItems(this.sheetAccessor.getAllRecordIndexer());
        }
        setToIndices(indices) {
            this.dirty = !0;
            const indexer = new KeyedMap;
            return indices.forEach((i, ind) => {
                if (!isNumeric(i)) throw new Error(`setToIndices can accept only numbers. Recieved ${typeTag(i)} at position ${ind}`);
                indexer.set(i);
            }), this.clear().copyItems(indexer);
        }
        setToSelected() {
            return this.attributesSet.flush(), this.dirty = !0, this.clear().copyItems(this.sheetAccessor.getSelectedRecordIndexer());
        }
        updateAttributesSet(attributesSet) {
            if (!(attributesSet instanceof AttributesSet)) throw new TypeError("updateAttributesSet accepts AttributesSet input.");
            return this.attributesSet.copyValues(attributesSet), this;
        }
        consumeReturn(queryReturn) {
            if (!(queryReturn instanceof QueryDriver)) throw new TypeError("consumeSelections accepts QueryDriver input.");
            return this.dirty = !queryReturn.returnWithRecords, this.attributesSet.copyValues(queryReturn.requestedAttributesSet), 
            this.clear().copyItems(queryReturn.resultSet), this;
        }
    }
    class DataController {
        constructor(sheetAccessor, instanceOptions, requestedAttributesSet) {
            if (!(sheetAccessor instanceof SheetAccessor)) throw new TypeError("DataController requires an instance of SheetAccessor.");
            if (!(instanceOptions instanceof InstanceOptions)) throw new TypeError("DataController requires an instance of InstanceOptions.");
            if (!(requestedAttributesSet instanceof AttributesSet)) throw new TypeError("DataController requires an instance of AttributesSet.");
            this.readLevel = instanceOptions.readLevel, this.writeLevel = instanceOptions.writeLevel, 
            this.headerAnchorToken = instanceOptions.headerAnchorToken, this.sheetAccessor = sheetAccessor, 
            this.rowIndex = null, this.payloadRowIndex = null, this.requestedAttributesSet = requestedAttributesSet, 
            this.changedAttributes = new AttributesSet, this.dataPayload = null, this.rowUpdated = !1, 
            this.setRowIndex = null, this.readLevel === READ_LEVEL_ROW && this.writeLevel === WRITE_LEVEL_ROW ? this.setRowIndex = this.setRowIndex1 : this.readLevel === READ_LEVEL_ROW && this.writeLevel !== WRITE_LEVEL_ROW ? this.setRowIndex = this.setRowIndex2 : this.readLevel !== READ_LEVEL_ROW && this.writeLevel === WRITE_LEVEL_ROW ? this.setRowIndex = this.setRowIndex3 : this.setRowIndex = this.setRowIndexBase, 
            this.updateColumnByIndex = null, this.headerAnchorToken && this.writeLevel === WRITE_LEVEL_CELL ? this.updateColumnByIndex = this.updateColumnByIndex1 : this.headerAnchorToken && this.writeLevel !== WRITE_LEVEL_CELL ? this.updateColumnByIndex = this.updateColumnByIndex2 : this.headerAnchorToken || this.writeLevel !== WRITE_LEVEL_CELL ? this.updateColumnByIndex = this.updateColumnByIndex4 : this.updateColumnByIndex = this.updateColumnByIndex3, 
            this.getColumnByIndex = null, this.readLevel === READ_LEVEL_ROW ? this.getColumnByIndex = this.getColumnByIndex1 : this.getColumnByIndex = this.getColumnByIndex2, 
            this.readLevel === READ_LEVEL_TABLE && (this.dataPayload = sheetAccessor.getDataPayload(requestedAttributesSet));
        }
        getColumnByIndex1(attribute, columnIndex) {
            return this.dataPayload.dataObject[attribute][0][columnIndex];
        }
        getColumnByIndex2(attribute, columnIndex) {
            return this.dataPayload.dataObject[attribute][this.payloadRowIndex][columnIndex];
        }
        updateColumnByIndex1(attribute, columnIndex, updatedValue) {
            if (attribute === ATTR_NOTE && -1 !== updatedValue.indexOf(this.headerAnchorToken)) throw new Error(`${updatedValue} is a reserved value row ${this.rowIndex + 1}, column ${columnIndex + 1}.`);
            return this.rowUpdated = !0, this.dataPayload.dataObject[attribute][this.payloadRowIndex][columnIndex] = updatedValue, 
            this.sheetAccessor[attribute].setCell(this.rowIndex, columnIndex, [ [ updatedValue ] ]), 
            this;
        }
        updateColumnByIndex2(attribute, columnIndex, updatedValue) {
            if (attribute === ATTR_NOTE && -1 !== updatedValue.indexOf(this.headerAnchorToken)) throw new Error(`${updatedValue} is a reserved value row ${this.rowIndex + 1}, column ${columnIndex + 1}.`);
            return this.rowUpdated = !0, this.dataPayload.dataObject[attribute][this.payloadRowIndex][columnIndex] = updatedValue, 
            this.changedAttributes.push(attribute), this;
        }
        updateColumnByIndex3(attribute, columnIndex, updatedValue) {
            return this.rowUpdated = !0, this.dataPayload.dataObject[attribute][this.payloadRowIndex][columnIndex] = updatedValue, 
            this.sheetAccessor[attribute].setCell(this.rowIndex, columnIndex, [ [ updatedValue ] ]), 
            this;
        }
        updateColumnByIndex4(attribute, columnIndex, updatedValue) {
            return this.rowUpdated = !0, this.dataPayload.dataObject[attribute][this.payloadRowIndex][columnIndex] = updatedValue, 
            this.changedAttributes.push(attribute), this;
        }
        setRowIndex1(rowIndex) {
            return null !== this.rowIndex && this.writeCurrentRow(), this.dataPayload = this.sheetAccessor.getDataPayload(this.requestedAttributesSet, rowIndex), 
            this.setRowIndexBase(rowIndex);
        }
        setRowIndex2(rowIndex) {
            return this.dataPayload = this.sheetAccessor.getDataPayload(this.requestedAttributesSet, rowIndex), 
            this.setRowIndexBase(rowIndex);
        }
        setRowIndex3(rowIndex) {
            return null !== this.rowIndex && this.writeCurrentRow(), this.setRowIndexBase(rowIndex);
        }
        setRowIndexBase(rowIndex) {
            return this.rowUpdated = !1, this.rowIndex = rowIndex, this.payloadRowIndex = this.readLevel === READ_LEVEL_ROW ? 0 : rowIndex, 
            this;
        }
        getRowIndex() {
            return this.rowIndex;
        }
        wasRowUpdated() {
            return this.rowUpdated;
        }
        writeCurrentRow() {
            return this.changedAttributes.forEach(attribute => {
                this.sheetAccessor[attribute].setRow(this.rowIndex, [ this.dataPayload.dataObject[attribute][this.payloadRowIndex] ]);
            }), this.changedAttributes.flush(), this;
        }
        capWrite() {
            this.rowUpdated = !1, this.writeLevel === WRITE_LEVEL_TABLE && (this.changedAttributes.forEach(attribute => {
                this.dataPayload.dataObject[attribute].splice(0, this.sheetAccessor.headerRowIndex + 1), 
                this.sheetAccessor[attribute].setAllRecords(this.dataPayload.dataObject[attribute]);
            }), this.changedAttributes.flush()), this.writeLevel === WRITE_LEVEL_ROW && this.writeCurrentRow();
        }
        getDataIndex(columnName, attribute) {
            return this.dataPayload.getDataIndex(columnName, attribute);
        }
    }
    function writeToRecordProxy(recordProxy, updateObject) {
        return Object.keys(recordProxy).forEach(columnName => {
            Object.prototype.hasOwnProperty.call(updateObject, columnName) && Object.assign(recordProxy[columnName], updateObject[columnName]);
        }), recordProxy;
    }
    function processQuery(core, queryDriver) {
        if (!(queryDriver instanceof QueryDriver)) throw new Error("queryProcessor requires a QueryDriver instance.");
        if (!(core.sheetAccessor instanceof SheetAccessor)) throw new Error("queryProcessor requires a SheetAccessor instance.");
        if (!(core.mainCursor instanceof MainCursor)) throw new Error("queryProcessor requires a MainCursor instance.");
        if (!inArray(queryDriver.type, SUPPORTED_OPS)) throw new Error(`queryDriver had invalid type "${queryDriver.type}"`);
        const dataController = new DataController(core.sheetAccessor, core.instanceOptions, queryDriver.requestedAttributesSet), recordProxy = function getRecordProxy(core, dataController, requestedAttributesSet) {
            if (!(core.sheetAccessor instanceof SheetAccessor)) throw new Error("getRecordProxy requires a SheetAccessor instance.");
            if (!(core.instanceOptions instanceof InstanceOptions)) throw new Error("getRecordProxy requires an InstanceOptions instance.");
            if (!(dataController instanceof DataController)) throw new Error("getRecordProxy requires a DataController instance.");
            if (!(requestedAttributesSet instanceof AttributesSet)) throw new Error("getRecordProxy requires an AttributesSet instance for input parameter requestedAttributesSet.");
            const {columnFilter, applyColumnFilter} = core.instanceOptions;
            let columnIsValid;
            columnIsValid = applyColumnFilter ? function testColumn(column) {
                return null != column && !!inArray(column, columnFilter);
            } : function testColumn(column) {
                return null != column;
            };
            const recordProxy = {};
            Object.defineProperty(recordProxy, INDEX_PROP, {
                enumerable: !0,
                get: () => dataController.getRowIndex()
            }), core.sheetAccessor.headerRow.forEach((column, columnIndex) => {
                if (columnIsValid(column)) {
                    const columnProxy = {};
                    requestedAttributesSet.forEach(attribute => {
                        Object.defineProperty(columnProxy, attribute, {
                            enumerable: !0,
                            get: () => dataController.getColumnByIndex(attribute, columnIndex),
                            set: input => {
                                dataController.updateColumnByIndex(attribute, columnIndex, input);
                            }
                        });
                    }), recordProxy[column] = columnProxy;
                }
            });
            try {
                Object.keys(core.instanceOptions.computedProperties).forEach(key => {
                    recordProxy[key] = Object.defineProperty({}, "value", {
                        enumerable: !0,
                        get: core.instanceOptions.computedProperties[key].bind(recordProxy)
                    });
                });
            } catch (e) {
                throw new Error(`there was a problem creating a record proxy with the specified computedProperties: ${e}`, {
                    cause: e
                });
            }
            return recordProxy;
        }(core, dataController, queryDriver.requestedAttributesSet), query = queryDriver.query.bind(recordProxy);
        if (inArray(queryDriver.type, [ "UNIQUE", "SELECT", "UPDATE" ])) {
            const evaluator = function getEvaluator() {
                let e;
                return e = queryDriver.withSelect ? queryDriver.returnWithRecords ? index => {
                    dataController.setRowIndex(index), query(recordProxy, index) && (queryDriver.pushResult(index, clone(recordProxy)), 
                    dataController.wasRowUpdated() && queryDriver.updatedRecordIndices.push(index));
                } : index => {
                    dataController.setRowIndex(index), query(recordProxy, index) && (queryDriver.pushResult(index), 
                    dataController.wasRowUpdated() && queryDriver.updatedRecordIndices.push(index));
                } : index => {
                    dataController.setRowIndex(index), query(recordProxy, index), dataController.wasRowUpdated() && queryDriver.updatedRecordIndices.push(index);
                }, e;
            }();
            core.mainCursor.indices.forEach(index => {
                evaluator(index);
            });
        }
        if (inArray(queryDriver.type, [ "WRITE_RECORDS" ])) {
            let matchCol, matchAttr, dataIndex;
            if (queryDriver.usesIndexProp) matchCol = INDEX_PROP, matchAttr = null, dataIndex = dataController.getDataIndex(); else if (matchCol = queryDriver.matchColumnName, 
            matchAttr = queryDriver.matchAttributeName, dataIndex = dataController.getDataIndex(matchCol, matchAttr), 
            !dataIndex.isUnique) throw new Error(`update failed because ${matchCol}.${matchAttr} is not a unique index.`);
            queryDriver.recordObjectsToWrite.forEach((record, index) => {
                let localIndex;
                if (Object.prototype.hasOwnProperty.call(record, matchCol)) {
                    if (matchAttr) {
                        if (!Object.prototype.hasOwnProperty.call(record[matchCol], matchAttr)) return void queryDriver.pushError(index, `input at index ${index} missing "${matchAttr}" attribute.`);
                        localIndex = dataIndex.get(record[matchCol][matchAttr]);
                    } else localIndex = dataIndex.get(record[matchCol]);
                    void 0 !== localIndex ? (dataController.setRowIndex(localIndex), queryDriver.returnWithRecords ? queryDriver.pushResult(localIndex, clone(writeToRecordProxy(recordProxy, record))) : (writeToRecordProxy(recordProxy, record), 
                    queryDriver.pushResult(localIndex))) : queryDriver.pushWarning(index, `input at index ${index} had no match.`);
                } else queryDriver.pushError(index, `input at index ${index} missing "${matchCol}" column.`);
            });
        }
        return dataController.capWrite(), core.instanceOptions.autoResizeColumns && core.sheetAccessor.resizeColumns(), 
        queryDriver.done();
    }
    function runQuery(core, query, withSelect, returnWithRecords, attributesSet) {
        return processQuery(core, new QueryDriver("SELECT").setQuery(query).addAttributes(attributesSet).setReturnWithRecords(returnWithRecords).setWithSelect(withSelect));
    }
    function runObjUpdate(core, records, matchColumnName, matchAttributeName) {
        const matchColName = matchColumnName || core.instanceOptions.idColumnName;
        if (-1 === core.sheetAccessor.getColumnIndex(matchColName)) throw new Error(`update failed: ${matchColumnName} is an invalid column name.`);
        const matchAttrName = matchAttributeName || core.instanceOptions.idAttributeName;
        if (!inArray(matchAttrName, SUPPORTED_ATTRIBUTES)) throw new Error(`update failed: ${matchAttrName} is an invalid attribute name.`);
        return processQuery(core, new QueryDriver("WRITE_RECORDS").setReturnWithRecords(!0).setMatchColumnName(matchColName).setMatchAttributeName(matchAttrName).setRecordObjectsToWrite(records));
    }
    const TableProxy = () => ((target, source, propsWritable) => {
        const writable = !0 === propsWritable;
        return Object.keys(source).forEach(sProp => {
            Object.defineProperty(target, sProp, {
                enumerable: !0,
                configurable: !1,
                writable,
                value: source[sProp]
            });
        }), target;
    })({
        mount: function mount(sheetNameOrOptions, headerAnchorToken) {
            try {
                const instanceOptions = new InstanceOptions(sheetNameOrOptions, headerAnchorToken), sheetAccessor = new SheetAccessor(instanceOptions), mainCursor = new MainCursor(sheetAccessor), lastResults = new KeyedMap, core = {
                    instanceOptions,
                    sheetAccessor,
                    mainCursor
                };
                instanceOptions.uniqueIdColumnName || (instanceOptions.idColumnName = sheetAccessor.getDefaultIdColumn());
                const api = {};
                return Object.defineProperty(api, "select", {
                    enumerable: !0,
                    value: (query, withRecords) => {
                        const timer = new Timer("API select"), queryReturn = runQuery(core, query, !0, withRecords);
                        return mainCursor.consumeReturn(queryReturn), lastResults.clear().set("operation", "select").set("completed", !0).set("selected count", queryReturn.resultCount).set("updated row count", queryReturn.updatedCount).set("updated row indices", queryReturn.updatedIndices).set("duration", timer.stop()), 
                        api;
                    }
                }), Object.defineProperty(api, "update", {
                    enumerable: !0,
                    value: (query, withRecords) => {
                        const timer = new Timer("API update"), queryReturn = runQuery(core, query, !1, withRecords);
                        return mainCursor.isDirty = !0, lastResults.clear().set("operation", "update").set("completed", !0).set("updated row count", queryReturn.updatedCount).set("updated row indices", queryReturn.updatedIndices).set("duration", timer.stop()), 
                        api;
                    }
                }), Object.defineProperty(api, "writeRecords", {
                    enumerable: !0,
                    value: (records, matchColumnName, matchAttributeName) => {
                        const timer = new Timer("API writeRecords"), queryReturn = runObjUpdate(core, records, matchColumnName, matchAttributeName);
                        return mainCursor.isDirty = !0, lastResults.clear().set("operation", "writeRecords").set("completed", !0).set("updated", queryReturn.resultSet.entries()).set("warnings", queryReturn.warnings.entries()).set("errors", queryReturn.errors.entries()).set("duration", timer.stop()), 
                        api;
                    }
                }), Object.defineProperty(api, "writeCursor", {
                    enumerable: !0,
                    value: () => {
                        const timer = new Timer("API writeCursor"), queryReturn = runObjUpdate(core, api.getRecords());
                        return lastResults.clear().set("operation", "writeCursor").set("completed", !0).set("updated", queryReturn.resultSet.entries()).set("warnings", queryReturn.warnings.entries()).set("errors", queryReturn.errors.entries()).set("duration", timer.stop()), 
                        api;
                    }
                }), Object.defineProperty(api, "getRecords", {
                    enumerable: !0,
                    value: () => {
                        const timer = new Timer("API getRecords");
                        if (mainCursor.isDirty) {
                            const queryReturn = runQuery(core, () => !0, !0, !0, mainCursor.attributesSet);
                            mainCursor.consumeReturn(queryReturn);
                        }
                        return lastResults.clear().set("operation", "getRecords").set("completed", !0).set("count", mainCursor.length).set("duration", timer.stop()), 
                        mainCursor.values();
                    }
                }), Object.defineProperty(api, "getUnique", {
                    enumerable: !0,
                    value: (columnName, attribute) => {
                        const timer = new Timer("API getUnique"), uniqueValues = function getUnique(core, columnName, attribute) {
                            if (!core.sheetAccessor.columnExists(columnName)) throw new Error(`unique method failed: invalid columnName ${columnName}`);
                            if (attribute && !inArray(attribute, SUPPORTED_ATTRIBUTES)) throw new Error(`unique method failed: invalid attribute: ${attribute}`);
                            const attr = attribute || DEFAULT_ATTRIBUTE, aggregator = new UniqueKeySet;
                            return processQuery(core, new QueryDriver("UNIQUE", `column:"${columnName}",attribute:"${attr}"`).setQuery(r => {
                                aggregator.push(r[columnName][attr]);
                            }).addAttribute(attr)), aggregator.values;
                        }(core, columnName, attribute);
                        return lastResults.clear().set("operation", "getUnique").set("completed", !0).set("count", uniqueValues.length).set("duration", timer.stop()), 
                        uniqueValues;
                    }
                }), Object.defineProperty(api, "flush", {
                    enumerable: !0,
                    value: () => {
                        const timer = new Timer("API flush");
                        return mainCursor.flush(), lastResults.clear().set("operation", "flush").set("completed", !0).set("duration", timer.stop()), 
                        api;
                    }
                }), Object.defineProperty(api, "insertRow", {
                    enumerable: !0,
                    value: (topOrBottom, dataObject) => {
                        const timer = new Timer("API insertRow"), position = function insertRow(core, topOrBottom, dataObject) {
                            if (dataObject && !isObject(dataObject)) throw new TypeError(`insertRow only accepts objects. Type ${getType(dataObject)} invalid`);
                            const position = core.sheetAccessor.insertRow(topOrBottom);
                            return dataObject && (dataObject[INDEX_PROP] = position, runObjUpdate(core, [ dataObject ])), 
                            position;
                        }(core, topOrBottom, dataObject);
                        return mainCursor.flush(), lastResults.clear().set("operation", "insertRow").set("@ position", position).set("completed", !0).set("duration", timer.stop()), 
                        api;
                    }
                }), Object.defineProperty(api, "deleteRow", {
                    enumerable: !0,
                    value: rowPosition => {
                        const timer = new Timer("API insertRow"), position = function deleteRow(core, rowPosition) {
                            if (rowPosition - 1 <= core.sheetAccessor.headerRowIndex) throw new Error("unable to delete the header row.");
                            return core.sheetAccessor.deleteRow(rowPosition);
                        }(core, rowPosition);
                        return mainCursor.flush(), lastResults.clear().set("operation", "deleteRow").set("@ position", position).set("completed", !0).set("duration", timer.stop()), 
                        api;
                    }
                }), Object.defineProperty(api, "getExportObject", {
                    enumerable: !0,
                    value: rawDataOnly => {
                        const timer = new Timer("API getExportObject"), exportObject = function getExportObject(core, rawDataOnly) {
                            let selected;
                            return selected = !0 === rawDataOnly ? core.mainCursor.keys() : core.mainCursor.isDirty || !core.mainCursor.attributesSet.hasSame(core.instanceOptions.exportAttributes) ? runQuery(core, () => !0, !0, !0, core.instanceOptions.exportAttributes).resultSet.values() : clone(core.mainCursor.values()), 
                            {
                                computedProperties: Object.keys(core.instanceOptions.computedProperties),
                                selected,
                                rawData: !!rawDataOnly && core.sheetAccessor.getDataPayload(core.instanceOptions.exportAttributes)
                            };
                        }(core, rawDataOnly);
                        return lastResults.clear().set("operation", "getExportObject").set("completed", !0).set("duration", timer.stop()), 
                        exportObject;
                    }
                }), Object.defineProperty(api, "loadSelectedRows", {
                    enumerable: !0,
                    value: attrSet => {
                        const timer = new Timer("API loadSelectedRows"), reqAttSet = (new AttributesSet).push(DEFAULT_ATTRIBUTE);
                        return void 0 !== attrSet && (isArray(attrSet) ? attrSet : [ attrSet ]).forEach(attr => {
                            reqAttSet.push(attr);
                        }), mainCursor.setToSelected(), mainCursor.updateAttributesSet(reqAttSet), lastResults.clear().set("operation", "loadSelectedRows").set("count", mainCursor.length).set("res", mainCursor.entries()).set("completed", !0).set("duration", timer.stop()), 
                        api;
                    }
                }), Object.defineProperty(api, "setRows", {
                    enumerable: !0,
                    value: (indices, oneIndexed) => {
                        const offset = !0 === oneIndexed ? 1 : 0;
                        return mainCursor.setToIndices((isArray(indices) ? indices : [ indices ]).map(index => index + offset)), 
                        api;
                    }
                }), Object.defineProperty(api, "getSelectedIndices", {
                    enumerable: !0,
                    value: asPos => !0 === asPos ? mainCursor.keys().map(i => i + 1) : mainCursor.keys()
                }), Object.defineProperty(api, "selectionLength", {
                    enumerable: !0,
                    value: () => mainCursor.length
                }), Object.defineProperty(api, "getFullDataIndex", {
                    enumerable: !0,
                    value: (columnName, attribute, oneIndexed) => {
                        const timer = new Timer("API getDataIndex"), dataIndex = sheetAccessor.getFullDataIndex(columnName, attribute, oneIndexed);
                        return lastResults.clear().set("operation", "getFullDataIndex").set("oneIndexed", !0 === oneIndexed).set("length", dataIndex.length).set("unique", dataIndex.isUnique).set("completed", !0).set("duration", timer.stop()), 
                        dataIndex;
                    }
                }), Object.defineProperty(api, "getHeaderRow", {
                    enumerable: !0,
                    value: () => sheetAccessor.getHeaderRow()
                }), Object.defineProperty(api, "getOptions", {
                    enumerable: !0,
                    value: () => instanceOptions.getSettingsExport()
                }), Object.defineProperty(api, "getLastResults", {
                    enumerable: !0,
                    value: () => lastResults.entries()
                }), Object.defineProperties(api, {
                    setSheetName: {
                        enumerable: !0,
                        value: input => (instanceOptions.sheetName = input, api)
                    },
                    setColumnFilter: {
                        enumerable: !0,
                        value: input => (mainCursor.isDirty = !0, instanceOptions.columnFilter = input, 
                        api)
                    },
                    getColumnFilter: {
                        enumerable: !0,
                        value: () => instanceOptions.columnFilter
                    },
                    setExportAttributes: {
                        enumerable: !0,
                        value: input => (instanceOptions.exportAttributes = input, api)
                    },
                    exportWithAllAttributes: {
                        enumerable: !0,
                        value: () => (instanceOptions.exportWithAllAttributes(), api)
                    },
                    setReadLevel: {
                        enumerable: !0,
                        value: input => (instanceOptions.readLevel = input, api)
                    },
                    setWriteLevel: {
                        enumerable: !0,
                        value: input => (instanceOptions.writeLevel = input, api)
                    },
                    setAutoResizeColumns: {
                        enumerable: !0,
                        value: input => (instanceOptions.autoResizeColumns = input, api)
                    },
                    setComputedProperties: {
                        enumerable: !0,
                        value: input => (mainCursor.isDirty = !0, instanceOptions.computedProperties = input, 
                        api)
                    },
                    setIdColumnName: {
                        enumerable: !0,
                        value: input => (instanceOptions.idColumnName = input, api)
                    },
                    setIdAttributeName: {
                        enumerable: !0,
                        value: input => (instanceOptions.idAttributeName = input, api)
                    }
                }), api;
            } catch (e) {
                throw new Error(`TableProxy.mount failed: ${e}`, {
                    cause: e
                });
            }
        },
        Timer,
        strContains
    }, C);
    globalThis.$initTableProxy = function $initTableProxy(asName) {
        asName && !globalThis[asName] ? globalThis[asName] = TableProxy() : globalThis.TableProxy || (globalThis.TableProxy = TableProxy());
    };
    globalThis.$initUtils = function $initUtils(asName) {
        asName ? globalThis[asName] = Utils : globalThis.TableProxy = Utils;
    };
    const __webpack_export_target__ = this;
    for (var __webpack_i__ in __webpack_exports__) __webpack_export_target__[__webpack_i__] = __webpack_exports__[__webpack_i__];
    __webpack_exports__.__esModule && Object.defineProperty(__webpack_export_target__, "__esModule", {
        value: !0
    });
})();