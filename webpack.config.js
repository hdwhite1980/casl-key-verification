const path = require('path');

module.exports = {
  mode: 'production',
  entry: './index.js', // ✅ Changed from './src/index.js' to './index.js'
  output: {
    filename: 'casl-bundle.js',
    path: path.resolve(__dirname), // ✅ Changed to output in root directory
    library: 'CASL',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: 'this',
    clean: false // ✅ Don't clean output directory
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    fallback: {
      "path": false,
      "fs": false
    }
  },
  // ✅ Ignore missing optional dependencies
  ignoreWarnings: [
    {
      module: /api\.js/,
    },
  ]
};