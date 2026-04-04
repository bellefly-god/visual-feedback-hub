import { describe, expect, it } from "vitest";
import { canTransitionStatus, deriveProjectStatus } from "@/lib/status";

describe("status rules", () => {
  it("derives pending when at least one comment is pending", () => {
    expect(deriveProjectStatus(["approved", "pending"])).toBe("pending");
  });

  it("derives fixed when no pending and at least one fixed", () => {
    expect(deriveProjectStatus(["fixed", "approved"])).toBe("fixed");
  });

  it("derives approved when all comments are approved", () => {
    expect(deriveProjectStatus(["approved", "approved"])).toBe("approved");
  });

  it("accepts valid transitions", () => {
    expect(canTransitionStatus("pending", "fixed")).toBe(true);
    expect(canTransitionStatus("fixed", "approved")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransitionStatus("approved", "pending")).toBe(false);
    expect(canTransitionStatus("approved", "fixed")).toBe(false);
  });
});
