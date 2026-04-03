export interface Comment {
  id: string;
  author: string;
  avatar: string;
  message: string;
  status: "pending" | "fixed" | "approved";
  x: number;
  y: number;
  pinNumber: number;
  replies: { author: string; avatar: string; message: string; createdAt: string }[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  fileType: "image" | "pdf" | "screenshot";
  thumbnail: string;
  date: string;
  commentCount: number;
  status: "pending" | "fixed" | "approved";
}

export const mockComments: Comment[] = [
  {
    id: "1",
    author: "Sarah Chen",
    avatar: "SC",
    message: "The hero headline feels too small on desktop. Can we bump it up to 56px?",
    status: "pending",
    x: 32,
    y: 18,
    pinNumber: 1,
    replies: [
      { author: "Alex Rivera", avatar: "AR", message: "Agreed — I'll update the font size in the next pass.", createdAt: "2 hours ago" },
    ],
    createdAt: "3 hours ago",
  },
  {
    id: "2",
    author: "Mark Johnson",
    avatar: "MJ",
    message: "Love the color palette here. Let's keep this as-is.",
    status: "approved",
    x: 65,
    y: 42,
    pinNumber: 2,
    replies: [],
    createdAt: "5 hours ago",
  },
  {
    id: "3",
    author: "Emily Watson",
    avatar: "EW",
    message: "This CTA button needs more contrast. The current shade blends with the background.",
    status: "fixed",
    x: 48,
    y: 72,
    pinNumber: 3,
    replies: [
      { author: "Sarah Chen", avatar: "SC", message: "Fixed! Changed to the primary indigo.", createdAt: "1 hour ago" },
    ],
    createdAt: "6 hours ago",
  },
  {
    id: "4",
    author: "Alex Rivera",
    avatar: "AR",
    message: "Can we add a subtle shadow to these cards? They feel a bit flat right now.",
    status: "pending",
    x: 78,
    y: 55,
    pinNumber: 4,
    replies: [],
    createdAt: "1 day ago",
  },
];

export const mockProjects: Project[] = [
  { id: "1", name: "Homepage Redesign v2", fileType: "screenshot", thumbnail: "", date: "Mar 28, 2026", commentCount: 12, status: "pending" },
  { id: "2", name: "Mobile App Onboarding", fileType: "image", thumbnail: "", date: "Mar 25, 2026", commentCount: 8, status: "approved" },
  { id: "3", name: "Brand Guidelines PDF", fileType: "pdf", thumbnail: "", date: "Mar 22, 2026", commentCount: 5, status: "fixed" },
  { id: "4", name: "Landing Page A/B Test", fileType: "screenshot", thumbnail: "", date: "Mar 20, 2026", commentCount: 3, status: "pending" },
  { id: "5", name: "Email Template Review", fileType: "image", thumbnail: "", date: "Mar 18, 2026", commentCount: 15, status: "approved" },
  { id: "6", name: "Product Shots — Spring", fileType: "image", thumbnail: "", date: "Mar 15, 2026", commentCount: 7, status: "pending" },
];
