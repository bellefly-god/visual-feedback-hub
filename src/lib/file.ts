import type { AssetType } from "@/types/feedback";

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

const imageMimePattern = /^image\/(png|jpe?g|webp|gif|bmp|svg\+xml)$/i;

function hasExtension(name: string, extensions: string[]): boolean {
  const lower = name.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || hasExtension(file.name, [".pdf"]);
}

function isImage(file: File): boolean {
  return imageMimePattern.test(file.type) || hasExtension(file.name, [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg"]);
}

function isLikelyScreenshot(file: File): boolean {
  const lower = file.name.toLowerCase();
  return (
    isImage(file) &&
    (lower.includes("screenshot") ||
      lower.includes("screen shot") ||
      lower === "image.png" ||
      lower.startsWith("pasted image") ||
      lower.includes("截屏") ||
      lower.includes("截图"))
  );
}

export function detectAssetType(file: File): AssetType {
  if (isPdf(file)) {
    return "pdf";
  }

  if (isLikelyScreenshot(file)) {
    return "screenshot";
  }

  return "image";
}

export function validateUploadFile(file: File): string | null {
  if (!isPdf(file) && !isImage(file)) {
    return "Only PNG/JPG/WebP/GIF/BMP/SVG images and PDF files are supported.";
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return "File is too large. Maximum size is 25MB.";
  }

  return null;
}
