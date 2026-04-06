import { MousePointer2, MessageCircle, PenTool, ArrowUpRight, Square, Highlighter, Type, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";
import { annotationTools, type AnnotationToolId } from "@/components/feedback/annotationTools";

interface AnnotationToolbarProps {
  activeTool: AnnotationToolId;
  onToolChange?: (tool: AnnotationToolId) => void;
}

const iconByTool: Record<AnnotationToolId, ComponentType<{ className?: string }>> = {
  select: MousePointer2,
  pin: MessageCircle,
  pen: PenTool,
  arrow: ArrowUpRight,
  rectangle: Square,
  highlight: Highlighter,
  text: Type,
  voice: Mic,
};

const disabledTools = new Set<AnnotationToolId>(["voice", "pen", "text"]);

export function AnnotationToolbar({ activeTool: controlledTool, onToolChange }: AnnotationToolbarProps) {
  const setTool = (tool: AnnotationToolId) => {
    if (disabledTools.has(tool)) {
      return;
    }

    onToolChange?.(tool);
  };

  return (
    <div className="inline-flex items-center gap-px rounded-lg bg-muted/60 p-0.5">
      {annotationTools.map((tool) => {
        const Icon = iconByTool[tool.id];

        return (
          <button
            key={tool.id}
            disabled={disabledTools.has(tool.id)}
            onClick={() => setTool(tool.id)}
            title={disabledTools.has(tool.id) ? `${tool.label} (coming soon)` : tool.label}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-100",
              disabledTools.has(tool.id) && "cursor-not-allowed opacity-45",
              controlledTool === tool.id
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
