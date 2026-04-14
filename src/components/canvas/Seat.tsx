// src/components/canvas/Seat.tsx
import { useDraggable, useDroppable } from '@dnd-kit/core';
import React from 'react';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  id: string;
  x: number;
  y: number;
  children?: React.ReactNode;
  style?: React.CSSProperties; // App.tsxから渡される width, height 用
}

export const Seat = ({ id, x, y, children, style: customStyle }: Props) => {
  // ドロップ先の判定
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `seat-${id}`,
  });

  // 自分自身のドラッグ判定
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging
  } = useDraggable({
    id: `seat-self-${id}`,
    data: { type: 'seat', seatId: id }
  });

  // 【重要】App.tsxからのサイズ指定と、dnd-kitのスタイルをすべて合体させます
  const combinedStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.6 : 1,
    ...customStyle, // App.tsxで計算された width と height がここで適用されます
  };

  // 2つのRefを統合して1つの要素に適用する
  const setCombinedRef = (node: HTMLDivElement | null) => {
    setDroppableRef(node);
    setDraggableRef(node);
  };

  return (
    <div
      ref={setCombinedRef}
      style={combinedStyle} // 合体させたスタイルを適用
      {...listeners}
      {...attributes}
      // 【重要】className から固定サイズの `w-28 h-20` を削除しました
      className={`border-2 rounded flex items-center justify-center transition-colors duration-200 shadow-sm cursor-move ${
        isOver ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300 bg-white'
      }`}
    >
      {children || <span className="text-gray-300 text-[10px] pointer-events-none">机（空席）</span>}
    </div>
  );
};