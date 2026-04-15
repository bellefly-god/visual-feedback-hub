/**
 * InlineTextInput - 内联文本输入组件
 * 
 * 当用户使用文本工具点击画布时显示
 * 文字直接输入后显示在图片上
 */

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toRgba } from "@/features/editor/shared/colors/annotationColor";

interface InlineTextInputProps {
  x: number; // 百分比位置 (0-100)
  y: number; // 百分比位置 (0-100)
  color: string;
  fontSize?: number;
  initialText?: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function InlineTextInput({
  x,
  y,
  color,
  fontSize = 14,
  initialText = "",
  onSubmit,
  onCancel,
  onDelete,
}: InlineTextInputProps) {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        onSubmit(text.trim());
      }
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
    }
  };

  // 计算输入框宽度（基于文字长度）
  const minWidth = 120;
  const charWidth = fontSize * 0.6;
  const calculatedWidth = Math.max(text.length * charWidth + 24, minWidth);

  return (
    <div
      ref={containerRef}
      className="absolute z-50"
      style={{
        // 使用百分比定位，与 SVG 坐标系统一致
        left: `${x}%`,
        top: `${y}%`,
        // 微调位置，让输入框出现在点击点附近
        transform: "translate(0, -100%)",
      }}
    >
      {/* 输入框 */}
      <div
        className={cn(
          "rounded-lg border-2 shadow-lg",
          "flex flex-col gap-1 p-2"
        )}
        style={{
          backgroundColor: toRgba(color, 0.95),
          borderColor: color,
          minWidth: Math.min(calculatedWidth, 300),
        }}
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入文字..."
          className={cn(
            "resize-none border-0 bg-transparent outline-none",
            "text-white placeholder:text-white/60"
          )}
          style={{
            fontSize: fontSize,
            fontWeight: 500,
            minHeight: fontSize * 1.5,
          }}
          rows={1}
        />
        
        {/* 操作按钮 */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-white/60">
            Enter 确认 · Esc 取消
          </span>
          <div className="flex items-center gap-1">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/20"
                onClick={onDelete}
                title="删除"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
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
      </div>
    </div>
  );
}

export default InlineTextInput;
