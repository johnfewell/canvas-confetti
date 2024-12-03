// Type definitions
export interface PathShape {
  type: "path";
  path: string;
  matrix: DOMMatrix;
}

export interface BitmapShape {
  type: "bitmap";
  bitmap: ImageBitmap;
  matrix: DOMMatrix;
}

export type Shape = PathShape | BitmapShape | "square" | "circle" | "star";

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
  typeof window !== "undefined" &&
  "Worker" in window &&
  "Blob" in window &&
  "Promise" in window &&
  "OffscreenCanvas" in window &&
  "OffscreenCanvasRenderingContext2D" in window &&
  "HTMLCanvasElement" in window &&
  "transferControlToOffscreen" in HTMLCanvasElement.prototype &&
  "URL" in window &&
  "createObjectURL" in URL
);

const canUsePaths =
  typeof Path2D === "function" && typeof DOMMatrix === "function";

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
  shapes: ["square", "circle"],
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
  origin: { x: 0.5, y: 0.5 },
};

interface Particle {
  x: number;
  y: number;
  wobble: number;
  wobbleSpeed: number;
  velocity: number;
  angle2D: number;
  tiltAngle: number;
  color: string;
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
  flat?: boolean;
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
    color: options.colors[Math.floor(Math.random() * options.colors.length)],
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

function drawParticle(particle: Particle) {
  if (!ctx) return;

  const progress = particle.tick / particle.totalTicks;
  const x1 = particle.x + particle.random * particle.tiltCos;
  const y1 = particle.y + particle.random * particle.tiltSin;
  const x2 = particle.wobbleX + particle.random * particle.tiltCos;
  const y2 = particle.wobbleY + particle.random * particle.tiltSin;

  ctx.fillStyle = `rgba(${hexToRgb(particle.color).join(",")},${1 - progress})`;
  ctx.beginPath();

  if (particle.shape === "circle") {
    const radiusX = Math.abs(x2 - x1) * particle.ovalScalar;
    const radiusY = Math.abs(y2 - y1) * particle.ovalScalar;
    ctx.ellipse(
      particle.x,
      particle.y,
      radiusX,
      radiusY,
      (Math.PI / 10) * particle.wobble,
      0,
      Math.PI * 2
    );
  } else if (particle.shape === "star") {
    let rotation = (Math.PI / 2) * 3;
    const innerRadius = 4 * particle.scalar;
    const outerRadius = 8 * particle.scalar;
    let x = particle.x;
    let y = particle.y;
    let spikes = 5;
    const step = Math.PI / spikes;

    while (spikes--) {
      x = particle.x + Math.cos(rotation) * outerRadius;
      y = particle.y + Math.sin(rotation) * outerRadius;
      ctx.lineTo(x, y);
      rotation += step;

      x = particle.x + Math.cos(rotation) * innerRadius;
      y = particle.y + Math.sin(rotation) * innerRadius;
      ctx.lineTo(x, y);
      rotation += step;
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
    if (updateParticle(particle)) {
      drawParticle(particle);
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

export function shapeFromPath({
  path,
  matrix,
}: {
  path: string;
  matrix?: DOMMatrix;
}): Shape {
  return {
    type: "path",
    path,
    matrix: matrix || new DOMMatrix(),
  };
}

export function shapeFromText({
  text,
  scalar = 1,
  color = "#000000",
  fontFamily = "serif",
}: {
  text: string;
  scalar?: number;
  color?: string;
  fontFamily?: string;
}): Shape {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return "square";

  const fontSize = 32;
  const padding = 2;

  tempCtx.font = `${fontSize}px ${fontFamily}`;
  const metrics = tempCtx.measureText(text);
  const width = metrics.width + padding * 2;
  const height = fontSize + padding * 2;

  tempCanvas.width = width;
  tempCanvas.height = height;

  tempCtx.font = `${fontSize}px ${fontFamily}`;
  tempCtx.fillStyle = color;
  tempCtx.textAlign = "center";
  tempCtx.textBaseline = "middle";
  tempCtx.fillText(text, width / 2, height / 2);

  if ("transferToImageBitmap" in tempCanvas) {
    const bitmap = (
      tempCanvas as unknown as { transferToImageBitmap(): ImageBitmap }
    ).transferToImageBitmap();
    const matrix = new DOMMatrix();
    matrix.scaleSelf(scalar);

    return {
      type: "bitmap",
      bitmap,
      matrix,
    };
  }

  return "square";
}

export default confetti;
