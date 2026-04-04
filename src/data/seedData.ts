import type {
  CommentRecord,
  ProjectRecord,
  ReplyRecord,
  ShareLinkRecord,
} from "@/types/feedback";

export interface FeedbackStore {
  projects: ProjectRecord[];
  comments: CommentRecord[];
  replies: ReplyRecord[];
  shareLinks: ShareLinkRecord[];
}

const now = "2026-04-04T00:00:00.000Z";

export const seedProjects: ProjectRecord[] = [
  {
    id: "1",
    title: "Homepage Redesign v2",
    ownerId: "owner-demo",
    assetType: "screenshot",
    assetUrl: "",
    createdAt: "2026-03-28T00:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "2",
    title: "Mobile App Onboarding",
    ownerId: "owner-demo",
    assetType: "image",
    assetUrl: "",
    createdAt: "2026-03-25T00:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "3",
    title: "Brand Guidelines PDF",
    ownerId: "owner-demo",
    assetType: "pdf",
    assetUrl: "",
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "4",
    title: "Landing Page A/B Test",
    ownerId: "owner-demo",
    assetType: "screenshot",
    assetUrl: "",
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "5",
    title: "Email Template Review",
    ownerId: "owner-demo",
    assetType: "image",
    assetUrl: "",
    createdAt: "2026-03-18T00:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "6",
    title: "Product Shots - Spring",
    ownerId: "owner-demo",
    assetType: "image",
    assetUrl: "",
    createdAt: "2026-03-15T00:00:00.000Z",
    updatedAt: now,
  },
];

export const seedComments: CommentRecord[] = [
  {
    id: "c1",
    projectId: "1",
    x: 32,
    y: 18,
    shapeType: "pin",
    content: "The hero headline feels too small on desktop. Can we bump it up to 56px?",
    status: "pending",
    authorName: "Sarah Chen",
    createdAt: "2026-04-03T09:00:00.000Z",
    updatedAt: "2026-04-03T09:00:00.000Z",
  },
  {
    id: "c2",
    projectId: "1",
    x: 65,
    y: 42,
    shapeType: "pin",
    content: "Love the color palette here. Let's keep this as-is.",
    status: "approved",
    authorName: "Mark Johnson",
    createdAt: "2026-04-03T07:00:00.000Z",
    updatedAt: "2026-04-03T07:00:00.000Z",
  },
  {
    id: "c3",
    projectId: "1",
    x: 48,
    y: 72,
    shapeType: "pin",
    content: "This CTA button needs more contrast. The current shade blends with the background.",
    status: "fixed",
    authorName: "Emily Watson",
    createdAt: "2026-04-03T06:00:00.000Z",
    updatedAt: "2026-04-03T08:00:00.000Z",
  },
  {
    id: "c4",
    projectId: "1",
    x: 78,
    y: 55,
    shapeType: "pin",
    content: "Can we add a subtle shadow to these cards? They feel a bit flat right now.",
    status: "pending",
    authorName: "Alex Rivera",
    createdAt: "2026-04-02T09:00:00.000Z",
    updatedAt: "2026-04-02T09:00:00.000Z",
  },
];

export const seedReplies: ReplyRecord[] = [
  {
    id: "r1",
    commentId: "c1",
    authorName: "Alex Rivera",
    content: "Agreed - I'll update the font size in the next pass.",
    createdAt: "2026-04-03T11:00:00.000Z",
  },
  {
    id: "r2",
    commentId: "c3",
    authorName: "Sarah Chen",
    content: "Fixed! Changed to the primary indigo.",
    createdAt: "2026-04-03T13:00:00.000Z",
  },
];

export const seedShareLinks: ShareLinkRecord[] = [
  {
    id: "s1",
    projectId: "1",
    token: "demo-token",
    isPublic: true,
    createdAt: now,
  },
  {
    id: "s2",
    projectId: "1",
    token: "share-1",
    isPublic: true,
    createdAt: now,
  },
];

export const seedStore: FeedbackStore = {
  projects: seedProjects,
  comments: seedComments,
  replies: seedReplies,
  shareLinks: seedShareLinks,
};
