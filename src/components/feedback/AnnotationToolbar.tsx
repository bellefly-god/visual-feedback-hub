import { MousePointer2, MessageCircle, ArrowUpRight, Square, Type, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const tools = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "pin", icon: MessageCircle, label: "Pin" },
  { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
  { id: "rect", icon: Square, label: "Highlight" },
  { id: "text", icon: Type, label: "Text" },
  { id: "voice", icon: Mic, label: "Voice" },
];

export function AnnotationToolbar() {
  const [activeTool, setActiveTool] = useState("pin");

  return (
    <div className="inline-flex items-center gap-px rounded-lg bg-muted/60 p-0.5">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          title={tool.label}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-100",
            activeTool === tool.id
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <tool.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
