import type { PointerEvent, PointerEventHandler } from "react";
import type { AnnotationColorState } from "@/features/editor/shared/types/editor-state";
import type { NormalizedAnnotation, ToolMode } from "@/features/editor/shared/types/annotation";
import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";
import {
  getAnnotationAnchor,
  getArrowGeometry,
  getArrowHeadGeometry,
  getHighlightGeometry,
  getPenPathGeometry,
  getPinGeometry,
  getRectGeometry,
} from "@/features/editor/image/imageOverlayRenderers";
import { sanitizeAnnotationColor, toRgba } from "@/features/editor/shared/colors/annotationColor";

type DragPreview = {
  toolMode: "arrow" | "rectangle" | "highlight";
  color: string;
  start: { x: number; y: number };
  current: { x: number; y: number };
};

interface ImageAnnotationOverlayProps {
  mode: "editor" | "review";
  toolMode: ToolMode;
  bounds: OverlayBounds | null;
  annotations: NormalizedAnnotation[];
  selectedAnnotationId: string | null;
  colors: AnnotationColorState;
  preview: DragPreview | null;
  onSelectAnnotation: (annotationId: string | null) => void;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
}

function renderPreview(preview: DragPreview, colors: AnnotationColorState) {
  const stroke = sanitizeAnnotationColor(preview.color || colors.stroke);

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
      fill={preview.toolMode === "highlight" ? toRgba(stroke, 0.24) : toRgba(stroke, 0.12)}
      stroke={stroke}
      strokeWidth={2}
    />
  );
}

function renderOrderBadge(
  order: number,
  anchor: { x: number; y: number },
  options?: { offsetX?: number; offsetY?: number },
) {
  const x = anchor.x + (options?.offsetX ?? 12);
  const y = anchor.y + (options?.offsetY ?? -12);
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

export function ImageAnnotationOverlay({
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
}: ImageAnnotationOverlayProps) {
  const cursorClass = mode === "editor" && toolMode !== "select" ? "cursor-crosshair" : "cursor-default";
  const selectionOutlineColor = "rgba(15, 23, 42, 0.45)";

  return (
    <div
      className={`absolute inset-0 touch-none ${cursorClass}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <svg className="h-full w-full" role="presentation">
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
          const isDraft = annotation.status === "draft";
          const baseColor = sanitizeAnnotationColor(annotation.color ?? colors.stroke);
          const type = annotation.shapeType as string;
          const strokeColor = baseColor;
          const displayOrder = annotation.displayOrder ?? annotation.pinNumber ?? 0;
          const anchor = getAnnotationAnchor(annotation, bounds);

          const selectAnnotation = (event: PointerEvent<SVGElement>) => {
            event.stopPropagation();
            onSelectAnnotation(annotation.id);
          };

          switch (type) {
            case "pin": {
              const pin = getPinGeometry(annotation, bounds);
              return (
                <g
                  key={annotation.id}
                  onPointerDown={selectAnnotation}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pin.cx}
                    cy={pin.cy}
                    r={isSelected ? 11 : 10}
                    fill={strokeColor}
                    stroke={isSelected ? selectionOutlineColor : "#ffffff"}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={isDraft ? "2 2" : undefined}
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
                    {displayOrder || pin.label}
                  </text>
                </g>
              );
            }

            case "arrow": {
              const arrow = getArrowGeometry(annotation, bounds);
              const arrowHead = getArrowHeadGeometry(arrow);
              return (
                <g key={annotation.id} className="cursor-pointer" onPointerDown={selectAnnotation}>
                  {isSelected && (
                    <line
                      x1={arrow.x1}
                      y1={arrow.y1}
                      x2={arrow.x2}
                      y2={arrow.y2}
                      stroke={selectionOutlineColor}
                      strokeWidth={5}
                      strokeLinecap="round"
                    />
                  )}
                  <line
                    x1={arrow.x1}
                    y1={arrow.y1}
                    x2={arrow.x2}
                    y2={arrow.y2}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeLinecap="round"
                    strokeDasharray={isDraft ? "6 4" : undefined}
                  />
                  {isSelected && (
                    <polygon points={arrowHead.points} fill={selectionOutlineColor} />
                  )}
                  <polygon points={arrowHead.points} fill={strokeColor} />
                  {displayOrder > 0 && renderOrderBadge(displayOrder, anchor)}
                </g>
              );
            }

            case "rectangle": {
              const rect = getRectGeometry(annotation, bounds);
              const fill = isSelected ? toRgba(baseColor, 0.2) : toRgba(baseColor, 0.12);
              return (
                <g key={annotation.id}>
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    rx={6}
                    ry={6}
                    fill={fill}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 2.4 : 2}
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray={isDraft ? "6 4" : undefined}
                    className="cursor-pointer"
                    onPointerDown={selectAnnotation}
                  />
                  {displayOrder > 0 && renderOrderBadge(displayOrder, anchor)}
                </g>
              );
            }

            case "highlight": {
              const highlight = getHighlightGeometry(annotation, bounds);
              return (
                <g key={annotation.id}>
                  <rect
                    x={highlight.x}
                    y={highlight.y}
                    width={highlight.width}
                    height={highlight.height}
                    rx={6}
                    ry={6}
                    fill={toRgba(baseColor, 0.24)}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 2.4 : 2}
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray={isDraft ? "6 4" : undefined}
                    className="cursor-pointer"
                    onPointerDown={selectAnnotation}
                  />
                  {displayOrder > 0 && renderOrderBadge(displayOrder, anchor)}
                </g>
              );
            }

            case "pen": {
              const pen = getPenPathGeometry(annotation, bounds);
              return (
                <g key={annotation.id}>
                  <path
                    d={pen.d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 3.2 : 2.4}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isDraft ? "4 3" : undefined}
                    className="cursor-pointer"
                    onPointerDown={selectAnnotation}
                  />
                  {displayOrder > 0 && renderOrderBadge(displayOrder, anchor)}
                </g>
              );
            }

            default: {
              const pin = getPinGeometry(annotation, bounds);
              return (
                <circle
                  key={annotation.id}
                  cx={pin.cx}
                  cy={pin.cy}
                  r={isSelected ? 9 : 8}
                  fill={strokeColor}
                  className="cursor-pointer"
                  onPointerDown={selectAnnotation}
                />
              );
            }
          }
        })}

        {preview && renderPreview(preview, colors)}
      </svg>
    </div>
  );
}
