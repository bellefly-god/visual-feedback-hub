export const annotationTools = [
  { id: "select", label: "Select" },
  { id: "pin", label: "Pin" },
  { id: "arrow", label: "Arrow" },
  { id: "rectangle", label: "Rectangle" },
  { id: "highlight", label: "Highlight" },
  { id: "text", label: "Text" },
  { id: "voice", label: "Voice" },
] as const;

export type AnnotationToolId = (typeof annotationTools)[number]["id"];

export const drawableTools: AnnotationToolId[] = ["pin", "arrow", "rectangle", "highlight"];
