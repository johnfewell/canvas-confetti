declare module "@fewell/canvas-confetti-ts" {
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
    (options?: Options): Promise<undefined> | null;
    reset: Reset;
  }

  const confetti: CreateTypes;
  export default confetti;

  export interface ShapeFromTextOptions {
    text: string;
    scalar?: number;
    size?: number;
  }

  export function shapeFromText(options: ShapeFromTextOptions): Shape;
}
