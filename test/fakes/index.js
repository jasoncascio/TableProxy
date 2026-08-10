/**
 * Installs the fake Apps Script globals.
 *
 * This replaces the old IS_TEST_MODE mechanism, which required editing a
 * constant in src/CONSTANTS.js and rebuilding in order to run anything, and
 * which shipped 566 lines of test doubles inside the production bundle.
 *
 * Library code now references SpreadsheetApp / Logger / Browser / MailApp as
 * bare globals, exactly as idiomatic Apps Script does. Tests install fakes onto
 * globalThis before importing the code under test.
 */

import { createFakeEnvironment } from './spreadsheet-app.js';

const GLOBAL_NAMES = ['SpreadsheetApp', 'Logger', 'Browser', 'MailApp'];

let installed = null;

/**
 * @param {object} [config] forwarded to createFakeEnvironment
 * @returns {object} the environment handle (stats, spreadsheet, logs, ...)
 */
export function installFakes(config) {
  const environment = createFakeEnvironment(config);
  for (const name of GLOBAL_NAMES) {
    globalThis[name] = environment[name];
  }
  installed = environment;
  return environment;
}

export function uninstallFakes() {
  for (const name of GLOBAL_NAMES) {
    delete globalThis[name];
  }
  installed = null;
}

export function currentEnvironment() {
  if (!installed) {
    throw new Error('no fake environment installed — call installFakes() first');
  }
  return installed;
}

export { createFakeEnvironment } from './spreadsheet-app.js';
export { CallStats } from './spreadsheet-app.js';
export { SheetData } from './sheet-data.js';
export { renderSheetHtml } from './render-html.js';
export { ATTRIBUTES, ATTRIBUTE_NAMES, defaultFor } from './attributes.js';
