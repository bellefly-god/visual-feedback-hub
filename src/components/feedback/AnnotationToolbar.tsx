import { MousePointer2, MessageCircle, ArrowUpRight, Square, Type, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const tools = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "pin", icon: MessageCircle, label: "Comment Pin" },
  { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
  { id: "rect", icon: Square, label: "Highlight" },
  { id: "text", icon: Type, label: "Text Note" },
  { id: "voice", icon: Mic, label: "Voice Note" },
];

export function AnnotationToolbar() {
  const [activeTool, setActiveTool] = useState("pin");

  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-card p-1 shadow-sm">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          title={tool.label}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150",
            activeTool === tool.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <tool.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
