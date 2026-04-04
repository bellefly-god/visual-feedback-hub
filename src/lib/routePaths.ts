export const DEMO_PROJECT_ID = "demo-project";
export const DEMO_REVIEW_TOKEN = "demo-token";

export const routePaths = {
  home: "/",
  upload: "/upload",
  dashboard: "/dashboard",
  editorLegacy: "/editor",
  reviewLegacy: "/review",
  editor: (projectId: string) => `/editor/${projectId}`,
  review: (token: string) => `/review/${token}`,
} as const;
