/**
 * SvgInlineTextInput - SVG 内的文本输入组件
 * 
 * 使用 foreignObject 在 SVG 内渲染 HTML 输入框
 * 确保位置与 SVG 坐标系统一致
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toRgba } from "@/features/editor/shared/colors/annotationColor";

interface SvgInlineTextInputProps {
  x: number; // SVG 坐标（百分比）
  y: number; // SVG 坐标（百分比）
  color: string;
  fontSize?: number;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export function SvgInlineTextInput({
  x,
  y,
  color,
  fontSize = 14,
  onSubmit,
  onCancel,
}: SvgInlineTextInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // 延迟聚焦，确保 DOM 已渲染
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        onSubmit(text.trim());
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
    }
  };

  const inputWidth = Math.max(text.length * fontSize * 0.6 + 80, 150);
  const inputHeight = fontSize * 3 + 20;

  return (
    <foreignObject
      x={x}
      y={y - inputHeight}
      width={inputWidth}
      height={inputHeight}
      style={{ overflow: "visible" }}
    >
      <div
        className={cn(
          "rounded-lg border-2 shadow-lg",
          "flex flex-col gap-1 p-2"
        )}
        style={{
          backgroundColor: toRgba(color, 0.95),
          borderColor: color,
          width: inputWidth,
        }}
        xmlns="http://www.w3.org/1999/xhtml"
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入文字..."
          className={cn(
            "resize-none border-0 bg-transparent outline-none w-full",
            "text-white placeholder:text-white/60"
          )}
          style={{
            fontSize: fontSize,
            fontWeight: 500,
            minHeight: fontSize * 1.5,
          }}
          rows={1}
        />
        
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-white/80 hover:text-white hover:bg-white/20"
            onClick={onCancel}
          >
            取消
          </Button>
          <Button
            size="sm"
            className="h-6 px-2 text-[11px] bg-white/90 text-gray-800 hover:bg-white"
            onClick={handleSubmit}
            disabled={!text.trim()}
          >
            确认
          </Button>
        </div>
      </div>
    </foreignObject>
  );
}

export default SvgInlineTextInput;
