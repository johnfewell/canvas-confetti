const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["src/confetti.ts"],
    bundle: true,
    outfile: "dist/confetti.js",
    format: "esm",
    target: ["es2015"],
    sourcemap: true,
  })
  .catch(() => process.exit(1));
