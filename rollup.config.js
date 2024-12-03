var typescript = require("rollup-plugin-typescript2");
var nodeResolve = require("@rollup/plugin-node-resolve").nodeResolve;
var commonjs = require("@rollup/plugin-commonjs");

module.exports = {
  input: "src/confetti.ts",
  output: [
    {
      file: "dist/fesm2020/canvas-confetti-ts.mjs",
      format: "es",
      sourcemap: true,
    },
    {
      file: "dist/esm2020/canvas-confetti-ts.mjs",
      format: "es",
      sourcemap: true,
    },
    {
      file: "dist/fesm2015/canvas-confetti-ts.mjs",
      format: "es",
      sourcemap: true,
    },
  ],
  external: ["@angular/core"],
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript({
      tsconfig: "tsconfig.json",
      declaration: true,
      declarationDir: "dist/types",
      exclude: ["node_modules", "**/*.spec.ts"],
    }),
  ],
};
