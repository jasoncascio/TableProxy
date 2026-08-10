/**
 * Build for Google Apps Script.
 *
 * Apps Script's V8 runtime executes modern JavaScript natively, so there is no
 * transpilation step — Babel was removed. A bundler is still required for one
 * reason only: V8 in Apps Script does not support ES modules, so the import
 * graph has to be flattened into a single script.
 *
 * gas-webpack-plugin turns the `global.$initTableProxy = ...` assignments in
 * src/index.js into the top-level function declarations that Apps Script needs
 * in order to see them as callable entry points.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import GasPlugin from 'gas-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';

const require = createRequire(import.meta.url);
const { version } = require('./package.json');
const dirname = path.dirname(fileURLToPath(import.meta.url));
const destination = path.resolve(dirname, 'dist');

export default {
  mode: 'production',
  context: dirname,
  entry: './src/index.js',
  target: ['web', 'es2020'],
  output: {
    filename: `TableProxy-${version}.js`,
    path: destination,
    library: { type: 'this' },
    environment: {
      arrowFunction: true,
      const: true,
      destructuring: true,
      forOf: true,
      templateLiteral: true,
      // Apps Script V8 does NOT support these, so webpack must not emit them.
      dynamicImport: false,
      module: false,
    },
  },
  resolve: {
    extensions: ['.js'],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // Property mangling would rename the sheet-attribute accessors that
          // the record proxy defines dynamically, and function-name mangling
          // would break the Apps Script entry points.
          mangle: false,
          keep_fnames: true,
          compress: {
            properties: false,
          },
          format: {
            beautify: true,
            comments: false,
          },
        },
      }),
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: path.resolve(dirname, 'appsscript.json'), to: destination }],
    }),
    new GasPlugin({ comment: false }),
  ],
  performance: {
    hints: false,
  },
};
