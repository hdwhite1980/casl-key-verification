const path = require('path');

module.exports = {
  mode: 'production',
  entry: './index.js', // ✅ Changed from './src/index.js'
  output: {
    filename: 'casl-bundle.js',
    path: path.resolve(__dirname), // ✅ Changed from 'build/js' to root
    library: 'CASL',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: 'this',
    clean: false
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
