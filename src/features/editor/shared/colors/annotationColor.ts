export const DEFAULT_ANNOTATION_COLOR = "#2563eb";

export const ANNOTATION_COLOR_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#dc2626",
  "#a21caf",
  "#0f766e",
  "#111827",
] as const;

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function normalizeHexColor(input?: string): string | null {
  if (!input) {
    return null;
  }

  const value = input.trim();
  const shortHexMatch = value.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHexMatch) {
    const [r, g, b] = shortHexMatch[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  const fullHexMatch = value.match(/^#([0-9a-fA-F]{6})$/);
  if (fullHexMatch) {
    return `#${fullHexMatch[1].toLowerCase()}`;
  }

  return null;
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${clampByte(r).toString(16).padStart(2, "0")}${clampByte(g)
    .toString(16)
    .padStart(2, "0")}${clampByte(b).toString(16).padStart(2, "0")}`;
}

export function sanitizeAnnotationColor(color?: string): string {
  return normalizeHexColor(color) ?? DEFAULT_ANNOTATION_COLOR;
}

export function toRgba(color: string, alpha: number): string {
  const safe = sanitizeAnnotationColor(color);
  const rgb = hexToRgb(safe);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function adjustColor(color: string, delta: number): string {
  const safe = sanitizeAnnotationColor(color);
  const rgb = hexToRgb(safe);

  return rgbToHex(rgb.r + delta, rgb.g + delta, rgb.b + delta);
}
