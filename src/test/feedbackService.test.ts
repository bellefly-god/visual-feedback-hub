import { beforeEach, describe, expect, it } from "vitest";
import { feedbackService } from "@/services/feedbackService";

const STORAGE_KEY = "feedbackmark.store.v1";

describe("feedbackService", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("updates comment status with valid transition", async () => {
    const nextComments = await feedbackService.updateCommentStatus("c1", "fixed");
    const updated = nextComments.find((comment) => comment.id === "c1");

    expect(updated?.status).toBe("fixed");
  });

  it("rejects invalid status transition", async () => {
    await expect(feedbackService.updateCommentStatus("c2", "pending")).rejects.toThrow(
      "INVALID_STATUS_TRANSITION",
    );
  });

  it("adds reviewer reply to active comment thread", async () => {
    const before = await feedbackService.listComments("1");
    const beforeTarget = before.find((comment) => comment.id === "c1");
    const beforeCount = beforeTarget?.replies.length ?? 0;

    const nextComments = await feedbackService.addReply({
      commentId: "c1",
      authorName: "Reviewer",
      content: "Please also align the top spacing.",
    });

    const updated = nextComments.find((comment) => comment.id === "c1");
    expect(updated?.replies.length).toBe(beforeCount + 1);
  });
});
