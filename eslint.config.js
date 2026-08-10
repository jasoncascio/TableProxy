import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

/**
 * ESLint 10 flat config.
 *
 * The old setup ran eslint as a webpack pre-loader with `failOnError: false`,
 * which meant lint problems were printed and then ignored. Linting is now a
 * separate, blocking `npm run lint`.
 *
 * airbnb-base is gone: it has no flat-config support and its stylistic rules
 * are entirely superseded by Prettier here.
 */

/** Apps Script services this library touches or may touch. */
const appsScriptGlobals = {
  SpreadsheetApp: 'readonly',
  DriveApp: 'readonly',
  GmailApp: 'readonly',
  MailApp: 'readonly',
  CalendarApp: 'readonly',
  DocumentApp: 'readonly',
  FormApp: 'readonly',
  Logger: 'readonly',
  Browser: 'readonly',
  Session: 'readonly',
  Utilities: 'readonly',
  UrlFetchApp: 'readonly',
  PropertiesService: 'readonly',
  CacheService: 'readonly',
  LockService: 'readonly',
  ScriptApp: 'readonly',
  HtmlService: 'readonly',
  CardService: 'readonly',
  Drive: 'readonly',
  Gmail: 'readonly',
  Slides: 'readonly',
  OAuth1: 'readonly',
  OAuth2: 'readonly',
  FirebaseApp: 'readonly',
};

export default [
  {
    // attic/ holds a historical artifact kept byte-identical to its 2019
    // original. It is not built, shipped or tested, and it would fail every
    // rule here — which is rather the point.
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'data/**', 'attic/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...appsScriptGlobals,
        // Provided by the bundler's global shim, used for the entry points.
        global: 'writable',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^unused' }],
      'no-param-reassign': 'off',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['test/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...appsScriptGlobals,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^unused' }],
    },
  },
  prettier,
];
