import { useState, useRef, useEffect, type PointerEventHandler } from "react";
import type { AnnotationColorState } from "@/features/editor/shared/types/editor-state";
import type { NormalizedAnnotation, ToolMode } from "@/features/editor/shared/types/annotation";
import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";
import { getPdfAnnotationAnchor, getPdfArrowGeometry, getPdfPenPathGeometry, getPdfPinGeometry, getPdfRectGeometry } from "@/features/editor/pdf/pdfOverlayRenderers";
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

type TextPreview = {
  toolMode: "text";
  color: string;
  x: number;
  y: number;
};

type InteractionPreview = DragPreview | PenPreview | TextPreview;

interface PdfAnnotationOverlayProps {
  mode: "editor" | "review";
  toolMode: ToolMode;
  bounds: OverlayBounds | null;
  annotations: NormalizedAnnotation[];
  selectedAnnotationId: string | null;
  colors: AnnotationColorState;
  preview: InteractionPreview | null;
  editingTextId?: string | null;
  onSelectAnnotation: (annotationId: string | null) => void;
  onTextEdit?: (annotationId: string, text: string) => void;
  onTextCommit?: (annotationId: string, text: string) => void;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
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

  if (preview.toolMode === "text") {
    return (
      <text
        x={preview.x}
        y={preview.y}
        fontSize={16}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={stroke}
        fillOpacity={0.7}
      >
        Text
      </text>
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

function renderTextAnnotation(
  annotation: NormalizedAnnotation,
  bounds: OverlayBounds,
  isSelected: boolean,
  isEditing: boolean,
  editingText: string,
  onTextChange: (text: string) => void,
  onTextCommit: () => void,
) {
  const rect = getPdfRectGeometry(annotation, bounds);
  const color = sanitizeAnnotationColor(annotation.color);
  const fontSize = annotation.fontSize ?? 16;
  const fontFamily = annotation.fontFamily ?? "system-ui, -apple-system, sans-serif";
  const fontWeight = annotation.fontWeight ?? 400;

  if (isEditing) {
    return (
      <foreignObject
        x={rect.x}
        y={rect.y}
        width={Math.max(rect.width, 100)}
        height={Math.max(rect.height, 30)}
      >
        <input
          autoFocus
          value={editingText}
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={onTextCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              onTextCommit();
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            border: `2px dashed ${adjustColor(color, -20)}`,
            borderRadius: 4,
            padding: "2px 4px",
            fontSize,
            fontFamily,
            fontWeight,
            color,
            background: toRgba(color, 0.1),
            outline: "none",
          }}
        />
      </foreignObject>
    );
  }

  return (
    <g
      className="cursor-pointer"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <text
        x={rect.x}
        y={rect.y + fontSize}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        fill={color}
      >
        {annotation.textContent || "Click to edit"}
      </text>
      {isSelected && (
        <rect
          x={rect.x - 4}
          y={rect.y - 4}
          width={rect.width + 8}
          height={rect.height + 8}
          fill="none"
          stroke={adjustColor(color, -20)}
          strokeWidth={1.5}
          strokeDasharray="4 2"
          rx={4}
          ry={4}
        />
      )}
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
  editingTextId,
  onSelectAnnotation,
  onTextEdit,
  onTextCommit,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: PdfAnnotationOverlayProps) {
  const [editingText, setEditingText] = useState("");
  const cursorClass = mode === "editor" && toolMode !== "select" ? "cursor-crosshair" : "cursor-default";

  useEffect(() => {
    if (editingTextId) {
      const annotation = annotations.find((a) => a.id === editingTextId);
      if (annotation && annotation.textContent !== undefined) {
        setEditingText(annotation.textContent);
      }
    }
  }, [editingTextId, annotations]);

  const handleTextChange = (text: string) => {
    setEditingText(text);
    if (editingTextId) {
      onTextEdit?.(editingTextId, text);
    }
  };

  const handleTextCommit = () => {
    if (editingTextId) {
      onTextCommit?.(editingTextId, editingText);
    }
  };

  return (
    <div
      className={`absolute inset-0 touch-none ${cursorClass}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
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
          const isEditing = annotation.id === editingTextId;
          const baseColor = sanitizeAnnotationColor(annotation.color ?? colors.stroke);
          const activeColor = adjustColor(baseColor, -20);

          if (annotation.shapeType === "text") {
            const rect = getPdfRectGeometry(annotation, bounds);
            const displayOrder = annotation.displayOrder ?? annotation.pinNumber ?? 0;

            return (
              <g key={annotation.id}>
                {renderTextAnnotation(
                  annotation,
                  bounds,
                  isSelected,
                  isEditing,
                  editingText,
                  handleTextChange,
                  handleTextCommit,
                )}
                {displayOrder > 0 && renderOrderBadge(displayOrder, { x: rect.x, y: rect.y })}
              </g>
            );
          }

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
