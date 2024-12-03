# Canvas Confetti TypeScript 🎉

A TypeScript-first fork of [canvas-confetti](https://github.com/catdad/canvas-confetti) with modern ES module support.

## Why This Fork?

This fork modernizes the original canvas-confetti library by:

- Converting to TypeScript for better type safety and IDE support
- Using ES modules as the primary distribution format
- Modernizing the build system with esbuild
- Providing better development tooling

## Installation

```bash
npm install @fewell/canvas-confetti-ts
```

## Usage

### ES Modules (Recommended)

```typescript
import confetti from "@fewell/canvas-confetti-ts";

// Basic usage
confetti();

// With options
confetti({
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
});

// Custom shapes and emojis
import { shapeFromText } from "@fewell/canvas-confetti-ts";

const emoji = shapeFromText({
  text: "🎉",
  scalar: 1.5,
});

confetti({
  shapes: [emoji],
  particleCount: 30,
  scalar: 2,
  spread: 45,
});
```

### CommonJS

```javascript
const confetti = require("canvas-confetti");
confetti();
```

### Browser

```html
<script type="module">
  import confetti from "https://cdn.jsdelivr.net/npm/canvas-confetti/dist/confetti.js";
  confetti();
</script>
```

## API

### Options

```typescript
interface Options {
  particleCount?: number; // Number of confetti particles (default: 50)
  angle?: number; // Angle in degrees (default: 90)
  spread?: number; // How far particles spread (default: 45)
  startVelocity?: number; // Initial velocity (default: 45)
  decay?: number; // How quickly particles slow down (default: 0.9)
  gravity?: number; // Gravity force (default: 1)
  drift?: number; // Horizontal drift (default: 0)
  ticks?: number; // Animation length (default: 200)
  origin?: {
    // Starting position
    x?: number; // Horizontal position (0-1)
    y?: number; // Vertical position (0-1)
  };
  colors?: string[]; // Array of hex colors
  shapes?: Shape[]; // Array of shapes ('square', 'circle', or custom)
  scalar?: number; // Size scaling factor (default: 1)
  zIndex?: number; // Z-index for the canvas (default: 100)
}
```

### Custom Shapes

```typescript
// Create text/emoji shapes
const shape = shapeFromText({
  text: "🎉", // Any text or emoji
  scalar: 1.5, // Size scaling
  color: "#ff0000", // Optional color
  fontFamily: "Arial", // Optional font
});

// Create path shapes
const shape = shapeFromPath({
  path: "M0 0h1v1h-1z", // SVG path
  matrix: new DOMMatrix(), // Optional transform
});
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Most modern browsers that support Canvas

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Credits

This project is a TypeScript fork of [canvas-confetti](https://github.com/catdad/canvas-confetti) by [Kiril Vatev](https://github.com/catdad).

## License

ISC License - See LICENSE file

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
