// Type definitions
export interface PathShape {
  type: "path";
  path: string;
  matrix: number[];
}

export interface BitmapShape {
  type: "bitmap";
  bitmap: ImageBitmap;
  matrix: number[];
}

export type Shape = "square" | "circle" | "star" | PathShape | BitmapShape;

export interface Origin {
  x?: number;
  y?: number;
}

export interface Options {
  angle?: number;
  colors?: string[];
  decay?: number;
  disableForReducedMotion?: boolean;
  drift?: number;
  gravity?: number;
  origin?: Origin;
  particleCount?: number;
  scalar?: number;
  shapes?: Shape[];
  spread?: number;
  startVelocity?: number;
  ticks?: number;
  zIndex?: number;
  x?: number;
  y?: number;
  flat?: boolean;
}

export interface GlobalOptions {
  disableForReducedMotion?: boolean;
  resize?: boolean;
  useWorker?: boolean;
}

export type Reset = () => void;

export interface CreateTypes {
  (options?: Options): Promise<null> | null;
  reset: Reset;
}

declare global {
  interface Window {
    Promise: PromiseConstructor;
    OffscreenCanvas: typeof OffscreenCanvas;
    OffscreenCanvasRenderingContext2D: typeof OffscreenCanvasRenderingContext2D;
  }
}

// Implementation
const canUseWorker = !!(
  typeof Worker !== "undefined" &&
  typeof Blob !== "undefined" &&
  typeof Promise !== "undefined" &&
  typeof OffscreenCanvas !== "undefined" &&
  typeof OffscreenCanvasRenderingContext2D !== "undefined" &&
  typeof HTMLCanvasElement !== "undefined" &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen !==
    "undefined" &&
  typeof URL !== "undefined" &&
  typeof URL.createObjectURL !== "undefined"
);

const canUsePaths =
  typeof Path2D === "function" && typeof DOMMatrix === "function";

const canDrawBitmap = (() => {
  if (typeof OffscreenCanvas === "undefined") return false;
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext(
    "2d"
  ) as OffscreenCanvasRenderingContext2D | null;
  if (!ctx) return false;
  ctx.fillRect(0, 0, 1, 1);
  const bitmap = canvas.transferToImageBitmap();
  try {
    ctx.createPattern(bitmap, "no-repeat");
    return true;
  } catch (e) {
    return false;
  }
})();

interface RGB {
  r: number;
  g: number;
  b: number;
}

const defaults: Required<Options> = {
  particleCount: 50,
  angle: 90,
  spread: 45,
  startVelocity: 45,
  decay: 0.9,
  gravity: 1,
  drift: 0,
  ticks: 200,
  x: 0.5,
  y: 0.5,
  shapes: ["square", "circle"] as ("square" | "circle")[],
  zIndex: 100,
  colors: [
    "#26ccff",
    "#a25afd",
    "#ff5e7e",
    "#88ff5a",
    "#fcff42",
    "#ffa62d",
    "#ff36ff",
  ],
  disableForReducedMotion: false,
  scalar: 1,
  flat: false,
  origin: { x: undefined, y: undefined },
};

interface Particle {
  x: number;
  y: number;
  wobble: number;
  wobbleSpeed: number;
  velocity: number;
  angle2D: number;
  tiltAngle: number;
  color: RGB;
  shape: Shape;
  tick: number;
  totalTicks: number;
  decay: number;
  drift: number;
  random: number;
  tiltSin: number;
  tiltCos: number;
  wobbleX: number;
  wobbleY: number;
  gravity: number;
  ovalScalar: number;
  scalar: number;
  flat: boolean;
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let animationFrame: number | null = null;

function createCanvas(): HTMLCanvasElement {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0px";
    canvas.style.left = "0px";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "999999";
    document.body.appendChild(canvas);
  }
  return canvas;
}

function setCanvasSize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function createParticle(options: Required<Options>): Particle {
  const radAngle = options.angle * (Math.PI / 180);
  const radSpread = options.spread * (Math.PI / 180);

  return {
    x: options.x,
    y: options.y,
    wobble: Math.random() * 10,
    wobbleSpeed: Math.min(0.11, Math.random() * 0.1 + 0.05),
    velocity:
      options.startVelocity * 0.5 + Math.random() * options.startVelocity,
    angle2D: -radAngle + (0.5 * radSpread - Math.random() * radSpread),
    tiltAngle: (Math.random() * (0.75 - 0.25) + 0.25) * Math.PI,
    color: {
      r: parseInt(
        options.colors[Math.floor(Math.random() * options.colors.length)].slice(
          1,
          3
        ),
        16
      ),
      g: parseInt(
        options.colors[Math.floor(Math.random() * options.colors.length)].slice(
          3,
          5
        ),
        16
      ),
      b: parseInt(
        options.colors[Math.floor(Math.random() * options.colors.length)].slice(
          5,
          7
        ),
        16
      ),
    },
    shape: options.shapes[Math.floor(Math.random() * options.shapes.length)],
    tick: 0,
    totalTicks: options.ticks,
    decay: options.decay,
    drift: options.drift,
    random: Math.random() + 2,
    tiltSin: 0,
    tiltCos: 0,
    wobbleX: 0,
    wobbleY: 0,
    gravity: options.gravity * 3,
    ovalScalar: 0.6,
    scalar: options.scalar,
    flat: options.flat,
  };
}

function updateParticle(particle: Particle): boolean {
  particle.x += Math.cos(particle.angle2D) * particle.velocity + particle.drift;
  particle.y +=
    Math.sin(particle.angle2D) * particle.velocity + particle.gravity;
  particle.velocity *= particle.decay;

  if (particle.flat) {
    particle.wobble = 0;
    particle.wobbleX = particle.x + 10 * particle.scalar;
    particle.wobbleY = particle.y + 10 * particle.scalar;
    particle.tiltSin = 0;
    particle.tiltCos = 0;
    particle.random = 1;
  } else {
    particle.wobble += particle.wobbleSpeed;
    particle.wobbleX =
      particle.x + 10 * particle.scalar * Math.cos(particle.wobble);
    particle.wobbleY =
      particle.y + 10 * particle.scalar * Math.sin(particle.wobble);
    particle.tiltAngle += 0.1;
    particle.tiltSin = Math.sin(particle.tiltAngle);
    particle.tiltCos = Math.cos(particle.tiltAngle);
    particle.random = Math.random() + 2;
  }

  return (
    particle.tick++ < particle.totalTicks && particle.y < window.innerHeight
  );
}

function renderParticle(
  ctx: CanvasRenderingContext2D,
  particle: Particle
): void {
  const progress = particle.tick / particle.totalTicks;
  const opacity = 1 - progress;

  const x1 = particle.x + particle.random * particle.tiltCos;
  const y1 = particle.y + particle.random * particle.tiltSin;
  const x2 = particle.wobbleX + particle.random * particle.tiltCos;
  const y2 = particle.wobbleY + particle.random * particle.tiltSin;

  ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${opacity})`;
  ctx.beginPath();

  if (typeof particle.shape === "object") {
    if (canUsePaths && particle.shape.type === "path") {
      const path2d = new Path2D(particle.shape.path);
      const t1 = new Path2D();
      t1.addPath(path2d, new DOMMatrix(particle.shape.matrix));

      const t2 = new Path2D();
      t2.addPath(
        t1,
        new DOMMatrix([
          Math.cos(particle.wobble) * Math.abs(x2 - x1) * 0.1,
          Math.sin(particle.wobble) * Math.abs(x2 - x1) * 0.1,
          -Math.sin(particle.wobble) * Math.abs(y2 - y1) * 0.1,
          Math.cos(particle.wobble) * Math.abs(y2 - y1) * 0.1,
          particle.x,
          particle.y,
        ])
      );

      ctx.fill(t2);
    } else if (particle.shape.type === "bitmap") {
      const rotation = (Math.PI / 10) * particle.wobble;
      const scaleX = Math.abs(x2 - x1) * 0.1;
      const scaleY = Math.abs(y2 - y1) * 0.1;
      const width = particle.shape.bitmap.width * particle.scalar;
      const height = particle.shape.bitmap.height * particle.scalar;

      const matrix = new DOMMatrix([
        Math.cos(rotation) * scaleX,
        Math.sin(rotation) * scaleX,
        -Math.sin(rotation) * scaleY,
        Math.cos(rotation) * scaleY,
        particle.x,
        particle.y,
      ]);

      matrix.multiplySelf(new DOMMatrix(particle.shape.matrix));

      const pattern = ctx.createPattern(particle.shape.bitmap, "no-repeat");
      if (!pattern) return;

      pattern.setTransform(matrix);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = pattern;
      ctx.fillRect(
        particle.x - width / 2,
        particle.y - height / 2,
        width,
        height
      );
      ctx.globalAlpha = 1;
    }
  } else if (particle.shape === "circle") {
    const radiusX = Math.abs(x2 - x1) * particle.ovalScalar;
    const radiusY = Math.abs(y2 - y1) * particle.ovalScalar;
    ctx.ellipse(
      particle.x,
      particle.y,
      radiusX,
      radiusY,
      (Math.PI / 10) * particle.wobble,
      0,
      2 * Math.PI
    );
  } else if (particle.shape === "star") {
    let rot = (Math.PI / 2) * 3;
    const innerRadius = 4 * particle.scalar;
    const outerRadius = 8 * particle.scalar;
    let x = particle.x;
    let y = particle.y;
    let spikes = 5;
    const step = Math.PI / spikes;

    while (spikes--) {
      x = particle.x + Math.cos(rot) * outerRadius;
      y = particle.y + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = particle.x + Math.cos(rot) * innerRadius;
      y = particle.y + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
  } else {
    // square
    ctx.moveTo(Math.floor(particle.x), Math.floor(particle.y));
    ctx.lineTo(Math.floor(particle.wobbleX), Math.floor(y1));
    ctx.lineTo(Math.floor(x2), Math.floor(y2));
    ctx.lineTo(Math.floor(x1), Math.floor(particle.wobbleY));
  }

  ctx.closePath();
  ctx.fill();
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

function animate() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter((particle) => {
    if (updateParticle(particle) && ctx) {
      renderParticle(ctx, particle);
      return true;
    }
    return false;
  });

  if (particles.length) {
    animationFrame = requestAnimationFrame(animate);
  } else {
    reset();
  }
}

function reset() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  if (canvas) {
    ctx = null;
    document.body.removeChild(canvas);
    canvas = null;
  }
  particles = [];
}

function confetti(options?: Options): Promise<undefined> | null {
  if (typeof window === "undefined") return null;

  const mergedOptions: Required<Options> = {
    ...defaults,
    ...options,
  };

  if (
    mergedOptions.disableForReducedMotion &&
    window.matchMedia("(prefers-reduced-motion)").matches
  ) {
    return Promise.resolve(undefined);
  }

  createCanvas();
  setCanvasSize();

  if (!ctx) {
    ctx = canvas?.getContext("2d") || null;
    if (!ctx) return null;
  }

  // Convert origin coordinates
  if (mergedOptions.origin) {
    mergedOptions.x = mergedOptions.origin.x || 0.5;
    mergedOptions.y = mergedOptions.origin.y || 0.5;
  }

  // Convert relative coordinates to absolute
  mergedOptions.x = mergedOptions.x * window.innerWidth;
  mergedOptions.y = mergedOptions.y * window.innerHeight;

  const newParticles = Array.from({ length: mergedOptions.particleCount }, () =>
    createParticle(mergedOptions)
  );

  particles.push(...newParticles);

  if (!animationFrame) {
    animationFrame = requestAnimationFrame(animate);
  }

  return Promise.resolve(undefined);
}

// Add reset function to confetti
confetti.reset = reset;

export function shapeFromPath(
  pathData: string | { path: string; matrix?: number[] }
): PathShape {
  if (!canUsePaths) {
    throw new Error("path confetti are not supported in this browser");
  }

  let path: string;
  let matrix: number[] | undefined;

  if (typeof pathData === "string") {
    path = pathData;
  } else {
    path = pathData.path;
    matrix = pathData.matrix;
  }

  const path2d = new Path2D(path);
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) throw new Error("Could not get canvas context");

  if (!matrix) {
    // Calculate path bounds
    const maxSize = 1000;
    let minX = maxSize;
    let minY = maxSize;
    let maxX = 0;
    let maxY = 0;

    for (let x = 0; x < maxSize; x += 2) {
      for (let y = 0; y < maxSize; y += 2) {
        if (tempCtx.isPointInPath(path2d, x, y, "nonzero")) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const maxDesiredSize = 10;
    const scale = Math.min(maxDesiredSize / width, maxDesiredSize / height);

    matrix = [
      scale,
      0,
      0,
      scale,
      -Math.round(width / 2 + minX) * scale,
      -Math.round(height / 2 + minY) * scale,
    ];
  }

  return {
    type: "path",
    path,
    matrix,
  };
}

export function shapeFromText(
  textData:
    | string
    | { text: string; scalar?: number; fontFamily?: string; color?: string }
): BitmapShape {
  let text: string;
  let scalar = 1;
  let color = "#000000";
  let fontFamily =
    '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", "Twemoji Mozilla", "system emoji", sans-serif';

  if (typeof textData === "string") {
    text = textData;
  } else {
    text = textData.text;
    scalar = textData.scalar ?? scalar;
    fontFamily = textData.fontFamily ?? fontFamily;
    color = textData.color ?? color;
  }

  const fontSize = 10 * scalar;
  const font = `${fontSize}px ${fontFamily}`;

  const canvas = new OffscreenCanvas(fontSize, fontSize);
  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
  }) as OffscreenCanvasRenderingContext2D;
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.font = font;
  const size = ctx.measureText(text);
  const width = Math.ceil(
    size.actualBoundingBoxRight + size.actualBoundingBoxLeft
  );
  const height = Math.ceil(
    size.actualBoundingBoxAscent + size.actualBoundingBoxDescent
  );

  const padding = 2;
  const x = size.actualBoundingBoxLeft + padding;
  const y = size.actualBoundingBoxAscent + padding;
  const finalWidth = width + padding * 2;
  const finalHeight = height + padding * 2;

  const finalCanvas = new OffscreenCanvas(finalWidth, finalHeight);
  const finalCtx = finalCanvas.getContext("2d", {
    willReadFrequently: true,
  }) as OffscreenCanvasRenderingContext2D;
  if (!finalCtx) throw new Error("Could not get canvas context");

  finalCtx.font = font;
  finalCtx.fillStyle = color;
  finalCtx.fillText(text, x, y);

  const scale = 1 / scalar;

  return {
    type: "bitmap",
    bitmap: finalCanvas.transferToImageBitmap(),
    matrix: [
      scale,
      0,
      0,
      scale,
      (-finalWidth * scale) / 2,
      (-finalHeight * scale) / 2,
    ],
  };
}

export default confetti;
