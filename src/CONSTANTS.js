/**
 * CONSTANTS - various constants
 */

/**
 * Exposed constants
 */
export const C = {
  $: ' index ',
  // Read Levels
  RT: 'READ_LEVEL_TABLE',
  RR: 'READ_LEVEL_ROW',
  // Write Levels
  WC: 'WRITE_LEVEL_CELL',
  WR: 'WRITE_LEVEL_ROW',
  WT: 'WRITE_LEVEL_TABLE',
  // Positional
  T: 'TOP',
  B: 'BOTTOM',
  // Data Attributes
  AV: 'value',
  AB: 'background',
  AC: 'fontcolor',
  AN: 'note',
  AZ: 'fontsize',
  AS: 'fontstyle',
  AF: 'fontfamily',
  AW: 'fontweight',
  AD: 'numberformat',
  // Canned formats for convenience
  DS: 'mm/dd/yy',
  DST: 'mm/dd/yy h:mm',
  NINT: '#,##0',
  NP1: '#,##0.0',
  NP2: '#,##0.00',
  // Canned colors for convenience
  SUCCESS: '#DFFFB4',
  FAILURE: '#FFB4B4',
  WARNING: '#FFDDB4',
  RED: 'red',
  WHITE: 'white',
  BLUE: 'blue',
  GREEN: 'green',
  ORANGE: 'orange',
  BLACK: 'black',
  GREY: 'grey',
  YELLOW: 'yellow',
  LIGHT_GREY: '#E5DEDE',
};

/**
 * Internally used constants
 */
export const INDEX_PROP = C.$;

export const READ_LEVEL_TABLE = C.RT;
export const READ_LEVEL_ROW = C.RR;
export const VALID_READ_LEVELS = [C.RT, C.RR];
export const DEFAULT_READ_LEVEL = C.RT;

export const WRITE_LEVEL_CELL = C.WC;
export const WRITE_LEVEL_ROW = C.WR;
export const WRITE_LEVEL_TABLE = C.WT;
export const VALID_WRITE_LEVELS = [C.WC, C.WR, C.WT];
export const DEFAULT_WRITE_LEVEL = C.WC;

export const SUPPORTED_ATTRIBUTES = [C.AV, C.AB, C.AC, C.AN, C.AZ, C.AS, C.AF, C.AW, C.AD];
export const DEFAULT_ATTRIBUTE = C.AV;
export const ATTR_NOTE = C.AN;

export const TOP = C.T;
export const BOTTOM = C.B;

export const OP_UNIQUE = 'UNIQUE';
export const OP_SELECT = 'SELECT';
export const OP_UPDATE = 'UPDATE';
export const OP_WRITE_RECORDS = 'WRITE_RECORDS';
export const SUPPORTED_OPS = [OP_UNIQUE, OP_SELECT, OP_UPDATE, OP_WRITE_RECORDS];
