import { useState, useEffect, useRef, type PointerEvent, type PointerEventHandler } from "react";
import type { AnnotationColorState } from "@/features/editor/shared/types/editor-state";
import type { NormalizedAnnotation, ToolMode } from "@/features/editor/shared/types/annotation";
import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";
import { toAbsolutePoint } from "@/features/editor/shared/coords/normalizedCoords";
import {
  getAnnotationAnchor,
  getArrowGeometry,
  getArrowHeadGeometry,
  getHighlightGeometry,
  getPenPathGeometry,
  getPinGeometry,
  getRectGeometry,
} from "@/features/editor/image/imageOverlayRenderers";
import { sanitizeAnnotationColor, toRgba, adjustColor } from "@/features/editor/shared/colors/annotationColor";

type DragPreview = {
  toolMode: "arrow" | "rectangle" | "highlight";
  color: string;
  start: { x: number; y: number };
  current: { x: number; y: number };
};

type PenPreview = {
  toolMode: "pen";
  color: string;
  points: Array<{ x: number; y: number }>;
};

type InteractionPreview = DragPreview | PenPreview;

interface ImageAnnotationOverlayProps {
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
  /** 待处理的文本标注（用于显示输入框） */
  pendingTextAnnotation?: { x: number; y: number; color: string } | null;
  /** 文本提交回调 */
  onTextSubmit?: (text: string) => void;
  /** 文本取消回调 */
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
  pendingTextAnnotation,
  onTextSubmit,
  onTextCancel,
}: ImageAnnotationOverlayProps) {
  const cursorClass = mode === "editor" && toolMode !== "select" ? "cursor-crosshair" : "cursor-default";
  const selectionOutlineColor = "rgba(15, 23, 42, 0.45)";

  // 使用 ref 来聚焦 textarea，避免 autoFocus 可能导致的布局偏移
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

            case "text": {
              // 文字标注：使用 toAbsolutePoint 转换百分比坐标为像素坐标
              const textPoint = bounds ? toAbsolutePoint(bounds, annotation.x, annotation.y) : { x: annotation.x, y: annotation.y };
              const textX = textPoint.x;
              const textY = textPoint.y;
              const fontSize = annotation.fontSize ?? 14;
              const textContent = annotation.textContent || "";
              const displayOrder = annotation.displayOrder ?? annotation.pinNumber ?? 0;
              
              return (
                <g key={annotation.id} className="cursor-pointer" onPointerDown={selectAnnotation}>
                  {isSelected && (
                    // 选中时的背景框
                    <rect
                      x={textX - 4}
                      y={textY - fontSize - 4}
                      width={Math.max(textContent.length * fontSize * 0.6 + 8, 40)}
                      height={fontSize + 12}
                      rx={4}
                      fill={toRgba(baseColor, 0.15)}
                      stroke={strokeColor}
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                    />
                  )}
                  {textContent ? (
                    // 有内容时显示文字
                    <>
                      <text
                        x={textX}
                        y={textY}
                        fontSize={fontSize}
                        fontWeight={annotation.fontWeight ?? 500}
                        fill={strokeColor}
                        textAnchor="start"
                        dominantBaseline="auto"
                      >
                        {textContent}
                      </text>
                      {displayOrder > 0 && (
                        <g transform={`translate(${textX + textContent.length * fontSize * 0.6 + 8}, ${textY - fontSize - 4})`}>
                          <circle cx="6" cy="6" r="6" fill={strokeColor} />
                          <text
                            x="6"
                            y="6"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="9"
                            fontWeight="600"
                            fill="#ffffff"
                          >
                            {displayOrder}
                          </text>
                        </g>
                      )}
                    </>
                  ) : (
                    // 无内容时显示占位符
                    <text
                      x={textX}
                      y={textY}
                      fontSize={fontSize}
                      fontWeight={500}
                      fill={strokeColor}
                      textAnchor="start"
                      dominantBaseline="auto"
                      opacity={0.6}
                    >
                      点击添加文字
                    </text>
                  )}
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

        {/* 文本输入框 */}
        {pendingTextAnnotation && bounds ? (
          <>
            {/* 调试用：显示位置标记 */}
            <circle
              cx={bounds.x + (bounds.width * pendingTextAnnotation.x) / 100}
              cy={bounds.y + (bounds.height * pendingTextAnnotation.y) / 100}
              r="5"
              fill={pendingTextAnnotation.color}
            />
            <foreignObject
              x={bounds.x + (bounds.width * pendingTextAnnotation.x) / 100}
              y={bounds.y + (bounds.height * pendingTextAnnotation.y) / 100 - 70}
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
