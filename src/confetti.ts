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
  color: string;
  shape: Shape;
  tick: number;
  x: number;
  y: number;
  velocity: number;
  angle: number;
  wobble: number;
  wobbleSpeed: number;
  decay: number;
  gravity: number;
  drift: number;
  scalar: number;
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
  const color =
    options.colors[Math.floor(Math.random() * options.colors.length)];
  const shape =
    options.shapes[Math.floor(Math.random() * options.shapes.length)];

  return {
    color,
    shape,
    tick: 0,
    x: options.x,
    y: options.y,
    velocity: options.startVelocity * 0.5,
    angle: options.angle + randomInRange(-options.spread, options.spread),
    wobble: Math.random() * 10,
    wobbleSpeed: 0.1 + Math.random() * 0.1,
    decay: options.decay,
    gravity: options.gravity,
    drift: options.drift,
    scalar: options.scalar,
  };
}

function updateParticle(particle: Particle): boolean {
  particle.tick += 1;
  particle.x += Math.cos(particle.angle) * particle.velocity + particle.drift;
  particle.y += Math.sin(particle.angle) * particle.velocity + particle.gravity;
  particle.velocity *= particle.decay;
  particle.wobble += particle.wobbleSpeed;

  return particle.tick < 200 && particle.y < window.innerHeight;
}

function drawParticle(particle: Particle) {
  if (!ctx) return;

  const { x, y, wobble, color, shape, scalar } = particle;
  const rotation = wobble + Math.PI / 2;
  const size = 5 * scalar;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.fillStyle = color;
  ctx.beginPath();

  if (shape === "circle") {
    ctx.arc(0, 0, size, 0, Math.PI * 2);
  } else if (shape === "square") {
    ctx.rect(-size, -size, size * 2, size * 2);
  } else if (shape === "star") {
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5;
      const x1 = Math.cos(angle) * size;
      const y1 = Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
    }
    ctx.closePath();
  }

  ctx.fill();
  ctx.restore();
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

  const newParticles = Array.from({ length: mergedOptions.particleCount }, () =>
    createParticle(mergedOptions)
  );

  particles.push(...newParticles);

  if (!animationFrame) {
    animationFrame = requestAnimationFrame(animate);
  }

  return Promise.resolve(undefined);
}

export const reset: Reset = () => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  if (canvas) {
    document.body.removeChild(canvas);
    canvas = null;
    ctx = null;
  }
  particles = [];
};

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

export function create(
  canvas?: HTMLCanvasElement,
  globalOptions: GlobalOptions = {}
): CreateTypes {
  let currentCanvas: HTMLCanvasElement | undefined = canvas;
  let currentCtx: CanvasRenderingContext2D | null = null;
  let particleCanvas: HTMLCanvasElement | null = null;
  let particleCtx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let particles: Particle[] = [];
  let worker: Worker | null = null;

  const { resize = false, useWorker = false } = globalOptions;

  function setCanvasSize() {
    if (!currentCanvas || !resize) return;
    currentCanvas.width = window.innerWidth;
    currentCanvas.height = window.innerHeight;
  }

  function initCanvas() {
    if (!currentCanvas) {
      currentCanvas = document.createElement("canvas");
      currentCanvas.style.position = "fixed";
      currentCanvas.style.top = "0px";
      currentCanvas.style.left = "0px";
      currentCanvas.style.pointerEvents = "none";
      currentCanvas.style.zIndex = "999999";
      document.body.appendChild(currentCanvas);
    }

    if (!currentCtx) {
      currentCtx = currentCanvas.getContext("2d");
    }

    setCanvasSize();

    if (resize) {
      window.addEventListener("resize", setCanvasSize);
    }

    return currentCtx;
  }

  function createParticles(options: Required<Options>): Particle[] {
    return Array.from({ length: options.particleCount }, () =>
      createParticle(options)
    );
  }

  function animate() {
    if (!currentCtx || !currentCanvas) return;

    currentCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
    particles = particles.filter((particle) => {
      if (updateParticle(particle)) {
        drawParticle(particle);
        return true;
      }
      return false;
    });

    if (particles.length) {
      animationFrame = requestAnimationFrame(animate);
    }
  }

  const instance = (options?: Options): Promise<null> | null => {
    if (
      globalOptions.disableForReducedMotion &&
      window.matchMedia("(prefers-reduced-motion)").matches
    ) {
      return Promise.resolve(null);
    }

    const mergedOptions: Required<Options> = {
      ...defaults,
      ...options,
    };

    if (!currentCtx && !initCanvas()) {
      return null;
    }

    const newParticles = createParticles(mergedOptions);
    particles.push(...newParticles);

    if (!animationFrame) {
      animationFrame = requestAnimationFrame(animate);
    }

    return Promise.resolve(null);
  };

  instance.reset = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    if (worker) {
      worker.terminate();
      worker = null;
    }

    if (currentCanvas && !canvas) {
      document.body.removeChild(currentCanvas);
    }

    if (resize) {
      window.removeEventListener("resize", setCanvasSize);
    }

    particles = [];
    currentCanvas = canvas;
    currentCtx = null;
  };

  return instance;
}

export default confetti;
