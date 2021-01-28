const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

const outputFileName = './dist/lint.js';

module.exports = {
  mode: 'production',
  target: 'node',
  entry: './src/lint.ts',
  output: {
    path: path.resolve(path.dirname(outputFileName)),
    filename: path.basename(outputFileName),
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: { configFile: 'tsconfig.json' },
          },
          { loader: 'shebang-loader' },
        ],
      },
    ],
  },
  plugins: [
    new webpack.BannerPlugin({ banner: '#!/usr/bin/env node', raw: true }),
    function () {
      this.hooks.done.tap('chmod', () => {
        fs.chmodSync(path.resolve(outputFileName), '755');
      });
    },
  ],
  optimization: { minimize: false },
  externals: { typescript: 'commonjs typescript' },
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
