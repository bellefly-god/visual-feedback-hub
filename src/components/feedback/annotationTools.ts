export const annotationTools = [
  { id: "select", label: "Select" },
  { id: "pin", label: "Comment" },
  { id: "pen", label: "Pen" },
  { id: "arrow", label: "Arrow" },
  { id: "rectangle", label: "Rectangle" },
  { id: "text", label: "Text" },
  { id: "highlight", label: "Highlight" },
  { id: "voice", label: "Voice" },
] as const;

export type AnnotationToolId = (typeof annotationTools)[number]["id"];

export const drawableTools: AnnotationToolId[] = ["pen", "arrow", "rectangle", "highlight", "text"];
