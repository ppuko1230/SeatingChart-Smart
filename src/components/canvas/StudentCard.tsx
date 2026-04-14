// src/components/canvas/StudentCard.tsx
import { useDraggable } from '@dnd-kit/core';
import type { Student } from '../../types';

type Props = {
  student: Student;
  bgColor: string;
  furiganaMode: 'hiragana' | 'katakana';
};

const toKatakana = (str: string) => {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    const chr = match.charCodeAt(0) + 0x60;
    return String.fromCharCode(chr);
  });
};

const toHiragana = (str: string) => {
  return str.replace(/[\u30A1-\u30F6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
};
export const StudentCard = ({ student, bgColor, furiganaMode }: Props) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `student-${student.id}`,
    data: student,
  });

  const style = transform
    ? { 
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        backgroundColor: bgColor 
      }
    : { backgroundColor: bgColor };

  const displayFurigana = furiganaMode === 'katakana' 
    ? toKatakana(student.furigana) 
    : toHiragana(student.furigana);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      // p-1 を py-2 に変更して上下の物理的なバッファを増やす
      className="relative w-full h-full border border-gray-400 rounded shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow z-10 box-border px-1 py-1.5"
    >
      <div className="w-full h-full flex flex-col items-center">
        
        {/* ★ 修正2：truncate を削除し、overflow-visible に変更 

        */}
        <div 
          className="text-[10px] text-gray-600 w-full text-center overflow-visible whitespace-nowrap mb-0.5"
          style={{ 
            lineHeight: '1.2',
            display: 'inline-block', // インラインブロックにすることでベースラインを安定させる
            verticalAlign: 'top'
          }}
        >
          {displayFurigana}
        </div>
        
        {/* ★ 修正3：名前部分
            - こちらも truncate を外し、フォントサイズに対して少し余裕のある高さを確保。
        */}
        <div 
          className="text-[13px] font-bold text-gray-800 w-full text-center overflow-visible whitespace-nowrap"
          style={{ 
            lineHeight: '1.2',
            display: 'inline-block',
            verticalAlign: 'top',
            minHeight: '1.2em' // 最低限の描画高さを保証
          }}
        >
          {student.name}
        </div>

      </div>
      
      <span className="absolute top-1 right-1 text-[8px] text-gray-500 leading-none">
        {student.attendanceNo}
      </span>
    </div>
  );
};
