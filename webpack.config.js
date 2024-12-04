var path = require("path");
var TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "./src/confetti.ts",
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, "dist/bundles"),
    filename: "canvas-confetti-ts.umd.js",
    library: "canvasConfetti",
    libraryTarget: "umd",
    umdNamedDefine: true,
    globalObject: "window",
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            pure_getters: true,
            unsafe: true,
            unsafe_comps: true,
          },
        },
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.json",
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  externals: {
    "@angular/core": {
      root: "ng.core",
      commonjs: "@angular/core",
      commonjs2: "@angular/core",
      amd: "@angular/core",
    },
  },
};
