const path = require('path');

module.exports = {
  mode: 'production',
  entry: './index.js', // Changed from './src/index.js' to './index.js'
  output: {
    filename: 'casl-bundle.js',
    path: path.resolve(__dirname), // Changed to root directory for GitHub Pages
    library: 'CASL',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: 'this',
    clean: false // Don't clean the output directory
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
    extensions: ['.js']
  }
};
