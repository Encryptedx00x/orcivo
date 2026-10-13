export const LOGO_OUTPUT_WIDTH = 1024;
export const LOGO_OUTPUT_HEIGHT = 512;

export interface LogoCropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const round = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

/** Calculates the source rectangle rendered into the fixed 2:1 logo frame. */
export function calculateLogoCrop(
  sourceWidth: number,
  sourceHeight: number,
  zoom: number,
  positionX: number,
  positionY: number,
): LogoCropRect {
  if (sourceWidth <= 0 || sourceHeight <= 0) throw new Error('Dimensões de logo inválidas.');
  const safeZoom = clamp(zoom, 1, 3);
  const outputAspect = LOGO_OUTPUT_WIDTH / LOGO_OUTPUT_HEIGHT;
  const sourceAspect = sourceWidth / sourceHeight;
  const baseWidth = sourceAspect >= outputAspect ? sourceHeight * outputAspect : sourceWidth;
  const baseHeight = sourceAspect >= outputAspect ? sourceHeight : sourceWidth / outputAspect;
  const sw = baseWidth / safeZoom;
  const sh = baseHeight / safeZoom;
  const px = (clamp(positionX, -1, 1) + 1) / 2;
  const py = (clamp(positionY, -1, 1) + 1) / 2;
  return {
    sx: round((sourceWidth - sw) * px),
    sy: round((sourceHeight - sh) * py),
    sw: round(sw),
    sh: round(sh),
  };
}
