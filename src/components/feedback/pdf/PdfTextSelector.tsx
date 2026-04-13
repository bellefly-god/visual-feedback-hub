/**
 * PdfTextSelector - PDF 文字选择器
 * 
 * 功能：
 * - 监听用户选择 PDF 中的文字
 * - 获取选中区域的边界
 * - 生成 highlight 标注
 */

import { useEffect, useRef, useCallback, useState } from "react";
import type * as pdfjsTypes from "pdfjs-dist";

interface TextSelectorOptions {
  /** PDF.js 实例 */
  pdfDoc: pdfjsTypes.PDFDocumentProxy | null;
  /** 当前页码 */
  pageNumber: number;
  /** 视口缩放比例 */
  viewportScale: number;
  /** 视口偏移 */
  viewportOffset: { x: number; y: number };
  /** 文字层容器 */
  textLayerContainer: HTMLElement | null;
  /** 选择变化回调 */
  onSelectionChange?: (selection: TextSelection | null) => void;
  /** 双击回调（创建标注） */
  onDoubleClick?: (selection: TextSelection) => void;
}

export interface TextSelection {
  /** 选中的文字内容 */
  text: string;
  /** 页码 */
  page: number;
  /** 选区边界（屏幕坐标） */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** PDF 坐标（归一化） */
  pdfCoords: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function usePdfTextSelector(options: TextSelectorOptions) {
  const {
    viewportScale,
    viewportOffset,
    textLayerContainer,
    onSelectionChange,
    onDoubleClick,
  } = options;

  // 选择状态
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const lastClickRef = useRef<number>(0);

  // 处理选择变化
  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelection(null);
      onSelectionChange?.(null);
      return;
    }

    const selectedText = sel.toString().trim();
    if (!selectedText) {
      setSelection(null);
      onSelectionChange?.(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // 转换为屏幕坐标
    const screenBounds = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };

    // 转换为 PDF 归一化坐标
    const pdfCoords = {
      x: ((rect.left - viewportOffset.x) / viewportScale),
      y: ((rect.top - viewportOffset.y) / viewportScale),
      width: (rect.width / viewportScale),
      height: (rect.height / viewportScale),
    };

    const newSelection: TextSelection = {
      text: selectedText,
      page: options.pageNumber,
      bounds: screenBounds,
      pdfCoords,
    };

    setSelection(newSelection);
    onSelectionChange?.(newSelection);
  }, [viewportScale, viewportOffset, onSelectionChange, options.pageNumber]);

  // 处理双击（创建标注）
  const handleDoubleClick = useCallback(() => {
    if (selection) {
      onDoubleClick?.(selection);
    }
  }, [selection, onDoubleClick]);

  // 监听选择事件
  useEffect(() => {
    if (!textLayerContainer) return;

    // 使用 mouseup 事件检测选择
    const handleMouseUp = (e: MouseEvent) => {
      // 延迟执行，等待选择完成
      requestAnimationFrame(() => {
        handleSelectionChange();
      });
    };

    // 双击创建标注
    const handleDblClick = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastClickRef.current < 300) {
        return; // 忽略快速双击
      }
      lastClickRef.current = now;

      // 检查是否有选中文字
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        handleDoubleClick();
        // 清除选择
        sel.removeAllRanges();
        setSelection(null);
      }
    };

    textLayerContainer.addEventListener("mouseup", handleMouseUp);
    textLayerContainer.addEventListener("dblclick", handleDblClick);

    return () => {
      textLayerContainer.removeEventListener("mouseup", handleMouseUp);
      textLayerContainer.removeEventListener("dblclick", handleDblClick);
    };
  }, [textLayerContainer, handleSelectionChange, handleDoubleClick]);

  // 清除选择
  const clearSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
    }
    setSelection(null);
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  return {
    selection,
    clearSelection,
  };
}

// ============================================
// PdfTextHighlight - 选中文字高亮
// ============================================

interface PdfTextHighlightProps {
  /** 选中区域 */
  selection: TextSelection | null;
}

export function PdfTextHighlight({ selection }: PdfTextHighlightProps) {
  if (!selection) return null;

  const { bounds } = selection;

  return (
    <div
      className="pointer-events-none absolute bg-yellow-300/40 border border-yellow-400/60 rounded"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }}
    />
  );
}

export default PdfTextHighlight;
