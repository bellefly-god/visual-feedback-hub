/**
 * KonvaCanvas - 基于 React-Konva 的标注画布
 * 
 * 功能：
 * - 支持多种标注类型（Pin, Pen, Arrow, Rectangle, Highlight, Text）
 * - 图层管理（背景层、标注层、交互层）
 * - 标注选择和编辑
 * - 路径平滑算法
 */

import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { Stage, Layer, Circle, Rect, Line, Arrow, Text, Group, Transformer } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type { AnnotationShape } from "@/types/feedback";

// ============================================
// Types
// ============================================

export interface Annotation {
  id: string;
  shapeType: AnnotationShape;
  x: number;
  y: number;
  width?: number;
  height?: number;
  pathPoints?: Array<{ x: number; y: number }>;
  color?: string;
  textContent?: string;
  page?: number;
  pinNumber?: number;
}

export interface KonvaCanvasProps {
  /** 画布宽度 */
  width: number;
  /** 画布高度 */
  height: number;
  /** 标注列表 */
  annotations: Annotation[];
  /** 当前工具 */
  tool: "select" | "pin" | "pen" | "arrow" | "rectangle" | "highlight" | "text";
  /** 激活颜色 */
  activeColor: string;
  /** 当前页码（PDF） */
  page?: number;
  /** 选中的标注 ID */
  selectedId: string | null;
  /** 预览标注 */
  previewAnnotation?: Annotation | null;
  /** 模式 */
  mode: "editor" | "review";
  /** 缩放比例 */
  scale?: number;
  /** 选择变化回调 */
  onSelectAnnotation?: (id: string | null) => void;
  /** 创建标注回调 */
  onCreateAnnotation?: (annotation: Partial<Annotation>) => void;
  /** 更新标注回调 */
  onUpdateAnnotation?: (id: string, updates: Partial<Annotation>) => void;
  /** 删除标注回调 */
  onDeleteAnnotation?: (id: string) => void;
}

// ============================================
// 工具函数
// ============================================

/** 路径平滑算法（Douglas-Peucker） */
function simplifyPath(points: Array<{ x: number; y: number }>, tolerance = 2): Array<{ x: number; y: number }> {
  if (points.length <= 2) return points;

  const sqDist = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy;
  };

  const sqDistToSegment = (p: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }) => {
    const l2 = sqDist(v, w);
    if (l2 === 0) return sqDist(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return sqDist(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
  };

  const simplifyDPStep = (
    points: Array<{ x: number; y: number }>,
    first: number,
    last: number,
    sqTolerance: number,
    simplified: Array<{ x: number; y: number }>
  ) => {
    let maxSqDist = sqTolerance;
    let index = 0;

    for (let i = first + 1; i < last; i++) {
      const sqDist = sqDistToSegment(points[i], points[first], points[last]);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > sqTolerance) {
      if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
      simplified.push(points[index]);
      if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
    }
  };

  const sqTolerance = tolerance * tolerance;
  const last = points.length - 1;
  const simplified: Array<{ x: number; y: number }> = [points[0]];
  simplifyDPStep(points, 0, last, sqTolerance, simplified);
  simplified.push(points[last]);

  return simplified;
}

/** 生成箭头几何 */
function getArrowPoints(start: { x: number; y: number }, end: { x: number; y: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return { points: [start.x, start.y, end.x, end.y], dx, dy };
}

// ============================================
// KonvaCanvas 组件
// ============================================

export function KonvaCanvas({
  width,
  height,
  annotations,
  tool,
  activeColor,
  page,
  selectedId,
  previewAnnotation,
  mode,
  scale = 1,
  onSelectAnnotation,
  onCreateAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
}: KonvaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  
  // 绘制状态
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);

  // 过滤当前页的标注
  const visibleAnnotations = useMemo(() => {
    return annotations.filter((ann) => ann.page === page || page === undefined);
  }, [annotations, page]);

  // 更新 Transformer
  useEffect(() => {
    if (transformerRef.current && selectedId) {
      const stage = stageRef.current;
      if (!stage) return;

      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedId]);

  // 点击开始绘制
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (mode === "review") return;
      if (tool === "select") return;

      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const { x, y } = pos;

      if (tool === "pin") {
        onCreateAnnotation?.({
          shapeType: "pin",
          x,
          y,
          color: activeColor,
        });
        return;
      }

      if (tool === "text") {
        const id = crypto.randomUUID();
        onCreateAnnotation?.({
          id,
          shapeType: "text",
          x,
          y,
          width: 150,
          height: 30,
          color: activeColor,
          textContent: "点击编辑",
        });
        return;
      }

      setIsDrawing(true);
      setDrawingStart({ x, y });

      if (tool === "pen") {
        setCurrentPoints([{ x, y }]);
      } else {
        setCurrentPoints([{ x, y }, { x, y }]);
      }
    },
    [tool, activeColor, mode, onCreateAnnotation]
  );

  // 鼠标移动（绘制）
  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isDrawing || !drawingStart) return;

      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const { x, y } = pos;

      if (tool === "pen") {
        // 笔触工具：记录点
        setCurrentPoints((prev) => [...prev, { x, y }]);
      } else {
        // 矩形/高亮/箭头：更新端点
        setCurrentPoints((prev) => [prev[0], { x, y }]);
      }
    },
    [isDrawing, drawingStart, tool]
  );

  // 鼠标释放（完成绘制）
  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    if (!drawingStart) return;

    setIsDrawing(false);

    const [start, end] = currentPoints;
    if (!start || !end) {
      setCurrentPoints([]);
      setDrawingStart(null);
      return;
    }

    const minDistance = 5;
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );

    if (distance < minDistance) {
      setCurrentPoints([]);
      setDrawingStart(null);
      return;
    }

    if (tool === "pen") {
      // 平滑路径
      const smoothed = simplifyPath(currentPoints);
      const points = smoothed.flatMap((p) => [p.x, p.y]);
      
      // 计算边界
      const xs = smoothed.map((p) => p.x);
      const ys = smoothed.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      onCreateAnnotation?.({
        shapeType: "pen",
        pathPoints: smoothed,
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY,
        color: activeColor,
      });
    } else if (tool === "arrow") {
      onCreateAnnotation?.({
        shapeType: "arrow",
        x: start.x,
        y: start.y,
        width: end.x - start.x,
        height: end.y - start.y,
        color: activeColor,
      });
    } else if (tool === "rectangle") {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);

      onCreateAnnotation?.({
        shapeType: "rectangle",
        x: x + w / 2,
        y: y + h / 2,
        width: w,
        height: h,
        color: activeColor,
      });
    } else if (tool === "highlight") {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);

      onCreateAnnotation?.({
        shapeType: "highlight",
        x: x + w / 2,
        y: y + h / 2,
        width: w,
        height: h,
        color: activeColor,
      });
    }

    setCurrentPoints([]);
    setDrawingStart(null);
  }, [isDrawing, drawingStart, currentPoints, tool, activeColor, onCreateAnnotation]);

  // 点击选择标注
  const handleAnnotationClick = useCallback(
    (e: KonvaEventObject<MouseEvent>, annotation: Annotation) => {
      e.cancelBubble = true;
      onSelectAnnotation?.(annotation.id);
    },
    [onSelectAnnotation]
  );

  // 双击编辑文字
  const handleTextDblClick = useCallback(
    (e: KonvaEventObject<MouseEvent>, annotation: Annotation) => {
      if (annotation.shapeType !== "text") return;
      e.cancelBubble = true;
      // TODO: 打开文字编辑
    },
    []
  );

  // 渲染预览
  const renderPreview = () => {
    if (!isDrawing || currentPoints.length === 0) return null;

    const color = activeColor;

    if (tool === "pen" && currentPoints.length >= 1) {
      const flatPoints = currentPoints.flatMap((p) => [p.x, p.y]);
      return (
        <Line
          points={flatPoints}
          stroke={color}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
          tension={0.5}
        />
      );
    }

    if (tool === "arrow" && currentPoints.length === 2) {
      const [start, end] = currentPoints;
      return <Arrow points={[start.x, start.y, end.x, end.y]} stroke={color} strokeWidth={2} />;
    }

    if ((tool === "rectangle" || tool === "highlight") && currentPoints.length === 2) {
      const [start, end] = currentPoints;
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);

      if (tool === "highlight") {
        return (
          <Rect
            x={x}
            y={y}
            width={w}
            height={h}
            fill={`${color}40`}
            stroke={color}
            strokeWidth={1}
          />
        );
      }

      return (
        <Rect
          x={x}
          y={y}
          width={w}
          height={h}
          stroke={color}
          strokeWidth={2}
          cornerRadius={4}
        />
      );
    }

    return null;
  };

  // 渲染单个标注
  const renderAnnotation = (annotation: Annotation) => {
    const isSelected = annotation.id === selectedId;
    const color = annotation.color ?? activeColor;
    const commonProps = {
      id: annotation.id,
      onClick: (e: KonvaEventObject<MouseEvent>) => handleAnnotationClick(e, annotation),
      onDblClick: (e: KonvaEventObject<MouseEvent>) => handleTextDblClick(e, annotation),
    };

    switch (annotation.shapeType) {
      case "pin": {
        return (
          <Group key={annotation.id} {...commonProps}>
            <Circle
              x={annotation.x}
              y={annotation.y}
              radius={isSelected ? 12 : 10}
              fill={color}
              stroke={isSelected ? "#111" : "#fff"}
              strokeWidth={isSelected ? 3 : 2}
            />
            {annotation.pinNumber && (
              <Text
                x={annotation.x}
                y={annotation.y}
                text={String(annotation.pinNumber)}
                fontSize={11}
                fontStyle="bold"
                fill="#fff"
                offsetX={3}
                offsetY={5}
                align="center"
              />
            )}
          </Group>
        );
      }

      case "arrow": {
        return (
          <Arrow
            key={annotation.id}
            points={[
              annotation.x,
              annotation.y,
              annotation.x + (annotation.width ?? 0),
              annotation.y + (annotation.height ?? 0),
            ]}
            stroke={color}
            strokeWidth={isSelected ? 3 : 2}
            pointerLength={10}
            pointerWidth={10}
            {...commonProps}
          />
        );
      }

      case "rectangle": {
        const w = annotation.width ?? 0;
        const h = annotation.height ?? 0;
        return (
          <Rect
            key={annotation.id}
            x={annotation.x - w / 2}
            y={annotation.y - h / 2}
            width={w}
            height={h}
            stroke={color}
            strokeWidth={isSelected ? 2.4 : 2}
            fill={`${color}20`}
            cornerRadius={6}
            {...commonProps}
          />
        );
      }

      case "highlight": {
        const w = annotation.width ?? 0;
        const h = annotation.height ?? 0;
        return (
          <Rect
            key={annotation.id}
            x={annotation.x - w / 2}
            y={annotation.y - h / 2}
            width={w}
            height={h}
            stroke={color}
            strokeWidth={1}
            fill={`${color}40`}
            cornerRadius={4}
            {...commonProps}
          />
        );
      }

      case "pen": {
        if (!annotation.pathPoints || annotation.pathPoints.length < 2) return null;
        const flatPoints = annotation.pathPoints.flatMap((p) => [p.x, p.y]);
        return (
          <Line
            key={annotation.id}
            points={flatPoints}
            stroke={color}
            strokeWidth={isSelected ? 3.2 : 2.4}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
            {...commonProps}
          />
        );
      }

      case "text": {
        return (
          <Text
            key={annotation.id}
            x={annotation.x}
            y={annotation.y}
            text={annotation.textContent ?? "点击编辑"}
            fontSize={16}
            fill={color}
            {...commonProps}
          />
        );
      }

      default:
        return null;
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: tool === "select" ? "default" : "crosshair" }}
    >
      {/* 标注层 */}
      <Layer>
        {visibleAnnotations.map(renderAnnotation)}
        {renderPreview()}
      </Layer>

      {/* Transformer（用于选中后的变换） */}
      {selectedId && (
        <Layer>
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      )}
    </Stage>
  );
}

export default KonvaCanvas;
