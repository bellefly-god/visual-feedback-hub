import { useState, useRef, useEffect, type PointerEventHandler } from "react";
import type { AnnotationColorState } from "@/features/editor/shared/types/editor-state";
import type { NormalizedAnnotation, ToolMode } from "@/features/editor/shared/types/annotation";
import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";
import { toAbsolutePoint } from "@/features/editor/shared/coords/normalizedCoords";
import { getPdfAnnotationAnchor, getPdfArrowGeometry, getPdfPenPathGeometry, getPdfPinGeometry, getPdfRectGeometry, getPdfTextGeometry } from "@/features/editor/pdf/pdfOverlayRenderers";
import { adjustColor, sanitizeAnnotationColor, toRgba } from "@/features/editor/shared/colors/annotationColor";

type DragPreview = {
  toolMode: "arrow" | "rectangle" | "highlight";
  color?: string;
  start: { x: number; y: number };
  current: { x: number; y: number };
};

type PenPreview = {
  toolMode: "pen";
  color: string;
  points: Array<{ x: number; y: number }>;
};

type InteractionPreview = DragPreview | PenPreview;

interface PdfAnnotationOverlayProps {
  mode: "editor" | "review";
  toolMode: ToolMode;
  bounds: OverlayBounds | null;
  annotations: NormalizedAnnotation[];
  selectedAnnotationId: string | null;
  colors: AnnotationColorState;
  preview: InteractionPreview | null;
  onSelectAnnotation: (annotationId: string | null) => void;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
  // 平移支持
  panOffset?: { x: number; y: number };
  onPanChange?: (offset: { x: number; y: number }) => void;
  isPanning?: boolean;
  onPanStart?: () => void;
  onPanEnd?: () => void;
  // 文本工具支持
  pendingTextAnnotation?: { x: number; y: number; color: string } | null;
  onTextSubmit?: (text: string) => void;
  onTextCancel?: () => void;
}

function renderPreview(preview: InteractionPreview, colors: AnnotationColorState) {
  const stroke = sanitizeAnnotationColor(preview.color || colors.stroke);

  if (preview.toolMode === "pen") {
    if (preview.points.length === 0) {
      return null;
    }

    if (preview.points.length === 1) {
      const point = preview.points[0];
      return <circle cx={point.x} cy={point.y} r={2.5} fill={stroke} />;
    }

    const [first, ...rest] = preview.points;
    const path = `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(" ")}`;
    return (
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (preview.toolMode === "arrow") {
    return (
      <line
        x1={preview.start.x}
        y1={preview.start.y}
        x2={preview.current.x}
        y2={preview.current.y}
        stroke={stroke}
        strokeWidth={2}
      />
    );
  }

  const left = Math.min(preview.start.x, preview.current.x);
  const top = Math.min(preview.start.y, preview.current.y);
  const width = Math.max(1, Math.abs(preview.current.x - preview.start.x));
  const height = Math.max(1, Math.abs(preview.current.y - preview.start.y));

  return (
    <rect
      x={left}
      y={top}
      width={width}
      height={height}
      rx={6}
      ry={6}
      fill={preview.toolMode === "highlight" ? toRgba(stroke, 0.24) : toRgba(stroke, 0.1)}
      stroke={stroke}
      strokeWidth={2}
    />
  );
}

function renderOrderBadge(order: number, anchor: { x: number; y: number }) {
  const x = anchor.x + 12;
  const y = anchor.y - 12;
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={9} fill="#111827" opacity={0.92} />
      <text
        x={x}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fontWeight={700}
        fill="#ffffff"
      >
        {order}
      </text>
    </g>
  );
}

export function PdfAnnotationOverlay({
  mode,
  toolMode,
  bounds,
  annotations,
  selectedAnnotationId,
  colors,
  preview,
  onSelectAnnotation,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  panOffset = { x: 0, y: 0 },
  onPanChange,
  isPanning = false,
  onPanStart,
  onPanEnd,
  pendingTextAnnotation,
  onTextSubmit,
  onTextCancel,
}: PdfAnnotationOverlayProps) {
  const cursorClass = mode === "editor" && toolMode !== "select" ? "cursor-crosshair" : "cursor-default";
  
  // 平移状态
  const panStartRef = useRef<{ x: number; y: number; panStartOffset: { x: number; y: number } } | null>(null);
  // 文本输入框 ref
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 当 pendingTextAnnotation 出现时，延迟聚焦 textarea
  useEffect(() => {
    if (pendingTextAnnotation && textareaRef.current) {
      const timer = requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [pendingTextAnnotation]);

  // 判断是否可以使用平移（在 select 模式下）
  const canPan = (toolMode === "select" || mode === "review") && onPanChange;

  // 处理平移的 Pointer 事件
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canPan || event.button !== 0) {
      onPointerDown(event);
      return;
    }

    // 开始平移
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      panStartOffset: panOffset,
    };
    onPanStart?.();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panStartRef.current) {
      onPointerMove(event);
      return;
    }

    // 拖拽平移
    const dx = event.clientX - panStartRef.current.x;
    const dy = event.clientY - panStartRef.current.y;
    onPanChange?.({
      x: panStartRef.current.panStartOffset.x + dx,
      y: panStartRef.current.panStartOffset.y + dy,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panStartRef.current) {
      onPointerUp(event);
      return;
    }

    // 结束平移
    panStartRef.current = null;
    onPanEnd?.();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    panStartRef.current = null;
    onPanEnd?.();
    onPointerCancel(event);
  };

  // 更新光标样式以指示可平移
  const panCursorClass = canPan ? "cursor-grab" : cursorClass;
  const effectiveCursorClass = isPanning ? "cursor-grabbing" : panCursorClass;

  return (
    <div
      className={`absolute inset-0 touch-none ${effectiveCursorClass}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <svg className="h-full w-full" role="presentation">
        <defs>
          <marker id="pdf-annotation-arrow-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="context-stroke" />
          </marker>
        </defs>

        {bounds && (
          <rect
            x={bounds.x + panOffset.x}
            y={bounds.y + panOffset.y}
            width={bounds.width}
            height={bounds.height}
            fill="transparent"
            pointerEvents="none"
          />
        )}

        {bounds && annotations.map((annotation) => {
          const isSelected = annotation.id === selectedAnnotationId;
          const baseColor = sanitizeAnnotationColor(annotation.color ?? colors.stroke);
          const activeColor = adjustColor(baseColor, -20);

          if (annotation.shapeType === "pin") {
            const pin = getPdfPinGeometry(annotation, bounds);
            return (
              <g
                key={annotation.id}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onSelectAnnotation(annotation.id);
                }}
                className="cursor-pointer"
              >
                <circle
                  cx={pin.cx + panOffset.x}
                  cy={pin.cy + panOffset.y}
                  r={isSelected ? 11 : 10}
                  fill={isSelected ? activeColor : baseColor}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                <text
                  x={pin.cx + panOffset.x}
                  y={pin.cy + panOffset.y + 0.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="#ffffff"
                >
                  {pin.label}
                </text>
              </g>
            );
          }

          if (annotation.shapeType === "arrow") {
            const arrow = getPdfArrowGeometry(annotation, bounds);
            const anchor = getPdfAnnotationAnchor(annotation, bounds);
            const displayOrder = annotation.displayOrder ?? annotation.pinNumber ?? 0;
            return (
              <g key={annotation.id} className="cursor-pointer" onPointerDown={(event) => {
                event.stopPropagation();
                onSelectAnnotation(annotation.id);
              }}>
                <line
                  x1={arrow.x1 + panOffset.x}
                  y1={arrow.y1 + panOffset.y}
                  x2={arrow.x2 + panOffset.x}
                  y2={arrow.y2 + panOffset.y}
                  stroke={isSelected ? activeColor : baseColor}
                  strokeWidth={isSelected ? 3 : 2}
                  markerEnd="url(#pdf-annotation-arrow-head)"
                />
                {displayOrder > 0 && renderOrderBadge(displayOrder, { x: anchor.x + panOffset.x, y: anchor.y + panOffset.y })}
              </g>
            );
          }

          if (annotation.shapeType === "pen" && annotation.pathPoints) {
            const pathData = getPdfPenPathGeometry(annotation, bounds);
            const anchor = getPdfAnnotationAnchor(annotation, bounds);
            const displayOrder = annotation.displayOrder ?? annotation.pinNumber ?? 0;
            return (
              <g key={annotation.id} className="cursor-pointer" onPointerDown={(event) => {
                event.stopPropagation();
                onSelectAnnotation(annotation.id);
              }} transform={`translate(${panOffset.x}, ${panOffset.y})`}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? activeColor : baseColor}
                  strokeWidth={isSelected ? 3 : 2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {displayOrder > 0 && renderOrderBadge(displayOrder, anchor)}
              </g>
            );
          }

          if (annotation.shapeType === "text") {
            const textGeom = getPdfTextGeometry(annotation, bounds);
            const anchor = getPdfAnnotationAnchor(annotation, bounds);
            const displayOrder = annotation.displayOrder ?? annotation.pinNumber ?? 0;
            return (
              <g key={annotation.id} className="cursor-pointer" onPointerDown={(event) => {
                event.stopPropagation();
                onSelectAnnotation(annotation.id);
              }}>
                <text
                  x={textGeom.x + panOffset.x}
                  y={textGeom.y + panOffset.y}
                  fontSize={textGeom.fontSize}
                  fontWeight={500}
                  fill={isSelected ? activeColor : baseColor}
                  style={{ userSelect: "none" }}
                >
                  {textGeom.text || "Text"}
                </text>
                {displayOrder > 0 && renderOrderBadge(displayOrder, { x: anchor.x + panOffset.x, y: anchor.y + panOffset.y })}
              </g>
            );
          }

          const rect = getPdfRectGeometry(annotation, bounds);
          const fill = annotation.shapeType === "highlight"
            ? toRgba(baseColor, 0.24)
            : isSelected
              ? toRgba(baseColor, 0.2)
              : toRgba(baseColor, 0.12);
          const anchor = getPdfAnnotationAnchor(annotation, bounds);
          const displayOrder = annotation.displayOrder ?? annotation.pinNumber ?? 0;

          return (
            <g key={annotation.id} className="cursor-pointer" onPointerDown={(event) => {
              event.stopPropagation();
              onSelectAnnotation(annotation.id);
            }}>
              <rect
                x={rect.x + panOffset.x}
                y={rect.y + panOffset.y}
                width={rect.width}
                height={rect.height}
                rx={6}
                ry={6}
                fill={fill}
                stroke={isSelected ? activeColor : baseColor}
                strokeWidth={isSelected ? 2.4 : 2}
              />
              {displayOrder > 0 && renderOrderBadge(displayOrder, { x: anchor.x + panOffset.x, y: anchor.y + panOffset.y })}
            </g>
          );
        })}

        {preview && renderPreview(preview, colors)}

        {/* 文本输入框 */}
        {pendingTextAnnotation && bounds ? (
          <>
            {/* 调试用：显示位置标记 */}
            <circle
              cx={bounds.x + panOffset.x + (bounds.width * pendingTextAnnotation.x) / 100}
              cy={bounds.y + panOffset.y + (bounds.height * pendingTextAnnotation.y) / 100}
              r="5"
              fill={pendingTextAnnotation.color}
            />
            <foreignObject
              x={bounds.x + panOffset.x + (bounds.width * pendingTextAnnotation.x) / 100}
              y={bounds.y + panOffset.y + (bounds.height * pendingTextAnnotation.y) / 100 - 70}
              width="200"
              height="70"
              requiredExtensions="http://www.w3.org/1999/xhtml"
            >
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  backgroundColor: pendingTextAnnotation.color,
                  borderColor: pendingTextAnnotation.color,
                  borderRadius: '8px',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <textarea
                  ref={textareaRef}
                  id="text-annotation-input"
                  style={{
                    resize: 'none',
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    color: 'white',
                    width: '100%',
                    fontSize: '14px',
                    fontWeight: 500,
                    minHeight: '21px',
                  }}
                  placeholder="输入文字..."
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const value = (e.target as HTMLTextAreaElement).value;
                      if (value.trim()) {
                        onTextSubmit?.(value.trim());
                      }
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      onTextCancel?.();
                    }
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <button
                    style={{
                      height: '24px',
                      padding: '0 8px',
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onTextCancel?.();
                    }}
                  >
                    取消
                  </button>
                  <button
                    style={{
                      height: '24px',
                      padding: '0 8px',
                      fontSize: '11px',
                      color: '#1f2937',
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const textarea = textareaRef.current;
                      const value = textarea?.value || "";
                      if (value.trim()) {
                        onTextSubmit?.(value.trim());
                      }
                    }}
                  >
                    确认
                  </button>
                </div>
              </div>
            </foreignObject>
          </>
        ) : null}
      </svg>
    </div>
  );
}
