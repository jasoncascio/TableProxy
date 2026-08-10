/**
 * Single source of truth for the nine cell attributes TableProxy supports.
 *
 * `name` is the identifier TableProxy uses internally (see SUPPORTED_ATTRIBUTES
 * in src/CONSTANTS.js). `getter`/`setter` are the real Google Sheets Range
 * method names. `defaultValue` is what a never-touched cell reports.
 *
 * Defaults match what real Sheets returns for an untouched cell in a default
 * theme. `numberformat` in particular is '0.###############' (general format),
 * not an empty string.
 */
export const ATTRIBUTES = [
  { name: 'value', getter: 'getValues', setter: 'setValues', defaultValue: '' },
  {
    name: 'background',
    getter: 'getBackgrounds',
    setter: 'setBackgrounds',
    defaultValue: '#ffffff',
  },
  { name: 'fontcolor', getter: 'getFontColors', setter: 'setFontColors', defaultValue: '#000000' },
  { name: 'note', getter: 'getNotes', setter: 'setNotes', defaultValue: '' },
  { name: 'fontsize', getter: 'getFontSizes', setter: 'setFontSizes', defaultValue: 10 },
  { name: 'fontstyle', getter: 'getFontStyles', setter: 'setFontStyles', defaultValue: 'normal' },
  {
    name: 'fontfamily',
    getter: 'getFontFamilies',
    setter: 'setFontFamilies',
    defaultValue: 'Arial',
  },
  {
    name: 'fontweight',
    getter: 'getFontWeights',
    setter: 'setFontWeights',
    defaultValue: 'normal',
  },
  {
    name: 'numberformat',
    getter: 'getNumberFormats',
    setter: 'setNumberFormats',
    defaultValue: '0.###############',
  },
];

export const ATTRIBUTE_NAMES = ATTRIBUTES.map((a) => a.name);

export const ATTRIBUTE_BY_NAME = new Map(ATTRIBUTES.map((a) => [a.name, a]));

export function defaultFor(attributeName) {
  const attribute = ATTRIBUTE_BY_NAME.get(attributeName);
  if (!attribute) {
    throw new Error(`unknown attribute "${attributeName}"`);
  }
  return attribute.defaultValue;
}
