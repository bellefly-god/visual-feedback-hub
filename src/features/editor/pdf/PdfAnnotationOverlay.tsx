import { useState, useRef, useEffect, type PointerEventHandler } from "react";
import type { AnnotationColorState } from "@/features/editor/shared/types/editor-state";
import type { NormalizedAnnotation, ToolMode } from "@/features/editor/shared/types/annotation";
import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";
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
}: PdfAnnotationOverlayProps) {
  const cursorClass = mode === "editor" && toolMode !== "select" ? "cursor-crosshair" : "cursor-default";
  
  // 平移状态
  const panStartRef = useRef<{ x: number; y: number; panStartOffset: { x: number; y: number } } | null>(null);

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
            x={bounds.x}
            y={bounds.y}
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
                  cx={pin.cx}
                  cy={pin.cy}
                  r={isSelected ? 11 : 10}
                  fill={isSelected ? activeColor : baseColor}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                <text
                  x={pin.cx}
                  y={pin.cy + 0.5}
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
                  x1={arrow.x1}
                  y1={arrow.y1}
                  x2={arrow.x2}
                  y2={arrow.y2}
                  stroke={isSelected ? activeColor : baseColor}
                  strokeWidth={isSelected ? 3 : 2}
                  markerEnd="url(#pdf-annotation-arrow-head)"
                />
                {displayOrder > 0 && renderOrderBadge(displayOrder, anchor)}
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
              }}>
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
                  x={textGeom.x}
                  y={textGeom.y}
                  fontSize={textGeom.fontSize}
                  fontWeight={500}
                  fill={isSelected ? activeColor : baseColor}
                  style={{ userSelect: "none" }}
                >
                  {textGeom.text || "Text"}
                </text>
                {displayOrder > 0 && renderOrderBadge(displayOrder, anchor)}
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
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                rx={6}
                ry={6}
                fill={fill}
                stroke={isSelected ? activeColor : baseColor}
                strokeWidth={isSelected ? 2.4 : 2}
              />
              {displayOrder > 0 && renderOrderBadge(displayOrder, anchor)}
            </g>
          );
        })}

        {preview && renderPreview(preview, colors)}
      </svg>
    </div>
  );
}
