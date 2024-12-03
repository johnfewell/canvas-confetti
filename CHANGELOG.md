# Changelog

## [1.0.0] - 2023-12-03

### Initial Fork Release

This is a TypeScript fork of [canvas-confetti](https://github.com/catdad/canvas-confetti) v1.9.3.

### Added

- Full TypeScript support with type definitions
- Better IDE support with TypeScript
- ES module support for modern bundlers
- Development server with hot reload
- Improved documentation with TypeScript examples

### Changed

- Converted library to TypeScript
- Changed to ES modules as the default format
- Updated build system to use esbuild
- Modernized build process
- Updated dependencies

### Migration from canvas-confetti

If you're migrating from the original canvas-confetti:

```diff
- const confetti = require('canvas-confetti');
+ import confetti from '@fewell/canvas-confetti-ts';

- confetti.Promise = MyPromise; // No longer needed
```

For CommonJS environments:

```javascript
const confetti = require("@fewell/canvas-confetti-ts").default;
```
