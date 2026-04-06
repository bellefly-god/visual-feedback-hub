import { MousePointer2, MessageCircle, ArrowUpRight, Square, Highlighter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";
import type { AnnotationToolId } from "@/components/feedback/annotationTools";
import {
  ANNOTATION_COLOR_PALETTE,
  sanitizeAnnotationColor,
} from "@/features/editor/shared/colors/annotationColor";

interface AnnotationToolbarProps {
  activeTool: AnnotationToolId;
  selectedColor?: string;
  onToolChange?: (tool: AnnotationToolId) => void;
  onColorChange?: (color: string) => void;
}

const iconByTool: Record<AnnotationToolId, ComponentType<{ className?: string }>> = {
  select: MousePointer2,
  pin: MessageCircle,
  arrow: ArrowUpRight,
  rectangle: Square,
  highlight: Highlighter,
  pen: Square,
  text: Square,
  voice: Square,
};

const editorTools: Array<{ id: AnnotationToolId; label: string }> = [
  { id: "select", label: "Select" },
  { id: "pin", label: "Pin" },
  { id: "arrow", label: "Arrow" },
  { id: "rectangle", label: "Rectangle" },
  { id: "highlight", label: "Highlight" },
];
const colorEnabledTools = new Set<AnnotationToolId>(["pin", "arrow", "rectangle", "highlight"]);

export function AnnotationToolbar({
  activeTool: controlledTool,
  selectedColor,
  onToolChange,
  onColorChange,
}: AnnotationToolbarProps) {
  const currentColor = sanitizeAnnotationColor(selectedColor);
  const canPickColor = colorEnabledTools.has(controlledTool);

  const setTool = (tool: AnnotationToolId) => {
    onToolChange?.(tool);
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card px-1.5 py-1 shadow-sm">
      <div className="inline-flex items-center gap-1 rounded-lg bg-muted/50 p-0.5">
        {editorTools.map((tool) => {
          const Icon = iconByTool[tool.id];

          return (
            <button
              key={tool.id}
              onClick={() => setTool(tool.id)}
              title={tool.label}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-all duration-100",
                controlledTool === tool.id
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "hover:border-border hover:bg-muted hover:text-foreground",
              )}
              aria-pressed={controlledTool === tool.id}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>

      <div className={cn("inline-flex items-center gap-1 rounded-lg border border-border/70 px-1 py-1", !canPickColor && "opacity-45")}>
        {ANNOTATION_COLOR_PALETTE.map((color) => {
          const isActive = currentColor === color;
          return (
            <button
              key={color}
              type="button"
              title={canPickColor ? `Annotation color ${color}` : "Select a drawing tool first"}
              disabled={!canPickColor || !onColorChange}
              onClick={() => onColorChange?.(color)}
              className={cn(
                "h-5 w-5 rounded-full border transition-all",
                isActive ? "border-foreground scale-105" : "border-border/70 hover:scale-105",
              )}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
    </div>
  );
}
