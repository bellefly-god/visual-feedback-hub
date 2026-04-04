import { MousePointer2, MessageCircle, ArrowUpRight, Square, Highlighter, Type, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, type ComponentType } from "react";
import { annotationTools, type AnnotationToolId } from "@/components/feedback/annotationTools";

interface AnnotationToolbarProps {
  activeTool?: AnnotationToolId;
  onToolChange?: (tool: AnnotationToolId) => void;
}

const iconByTool: Record<AnnotationToolId, ComponentType<{ className?: string }>> = {
  select: MousePointer2,
  pin: MessageCircle,
  arrow: ArrowUpRight,
  rectangle: Square,
  highlight: Highlighter,
  text: Type,
  voice: Mic,
};

export function AnnotationToolbar({ activeTool: controlledTool, onToolChange }: AnnotationToolbarProps) {
  const [internalTool, setInternalTool] = useState<AnnotationToolId>("pin");
  const activeTool = controlledTool ?? internalTool;

  const setTool = (tool: AnnotationToolId) => {
    setInternalTool(tool);
    onToolChange?.(tool);
  };

  return (
    <div className="inline-flex items-center gap-px rounded-lg bg-muted/60 p-0.5">
      {annotationTools.map((tool) => {
        const Icon = iconByTool[tool.id];

        return (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            title={tool.label}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-100",
              activeTool === tool.id
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
