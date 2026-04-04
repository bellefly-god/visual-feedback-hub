export const LEGACY_DEMO_PROJECT_ID = "demo-project";
export const DEMO_PROJECT_ID = "00000000-0000-0000-0000-000000000001";
export const DEMO_REVIEW_TOKEN = "demo-token";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

export function normalizeProjectId(value?: string): string {
  if (!value || value === LEGACY_DEMO_PROJECT_ID) {
    return DEMO_PROJECT_ID;
  }

  if (!isUuid(value)) {
    return DEMO_PROJECT_ID;
  }

  return value;
}

export const routePaths = {
  home: "/",
  upload: "/upload",
  dashboard: "/dashboard",
  editorLegacy: "/editor",
  reviewLegacy: "/review",
  editor: (projectId: string) => `/editor/${projectId}`,
  review: (token: string) => `/review/${token}`,
} as const;
