import { describe, expect, it } from "vitest";
import { detectAssetType, validateUploadFile } from "@/lib/file";

function createFile(name: string, type: string, size: number): File {
  const payload = new Uint8Array(Math.max(size, 1));
  return new File([payload], name, { type });
}

describe("file upload rules", () => {
  it("detects screenshot assets by filename", () => {
    const file = createFile("Screenshot 2026-04-04 at 12.10.01.png", "image/png", 1000);
    expect(detectAssetType(file)).toBe("screenshot");
  });

  it("accepts valid pdf uploads", () => {
    const file = createFile("spec.pdf", "application/pdf", 2000);
    expect(validateUploadFile(file)).toBeNull();
    expect(detectAssetType(file)).toBe("pdf");
  });

  it("rejects oversized uploads", () => {
    const file = createFile("large.png", "image/png", 26 * 1024 * 1024);
    expect(validateUploadFile(file)).toContain("25MB");
  });
});
