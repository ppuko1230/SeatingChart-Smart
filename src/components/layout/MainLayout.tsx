// src/App.tsx
import { useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { Student, Seat } from './types';

// ※ 後でコンポーネント分割しますが、まずは全体像を掴むためここに書きます
function App() {
  // 1. 状態管理
  const [students, setStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);

  // 2. ドラッグ＆ドロップ終了時の処理（後で実装）
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    // ここで生徒の入れ替えや机の移動ロジックを書きます
    console.log("ドラッグ終了:", active.id, "->", over?.id);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex h-screen w-screen bg-gray-100 overflow-hidden font-sans">
        
        {/* 左側：コントロールパネル (幅約30%) */}
        <aside className="w-1/3 max-w-sm bg-white border-r shadow-lg p-6 flex flex-col gap-6 overflow-y-auto">
          <h1 className="text-xl font-bold">🏫 座席表作成ツール</h1>
          
          <div className="border p-4 rounded bg-gray-50">
            <h2 className="font-semibold mb-2">名簿データの取り込み</h2>
            <button className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition">
              Excelファイルを選択
            </button>
          </div>

          <div className="border p-4 rounded bg-gray-50">
            <h2 className="font-semibold mb-2">出力設定</h2>
            <button className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition">
              PDFで出力
            </button>
          </div>
          {/* ここにレイアウト調整やシャッフルボタンを追加していきます */}
        </aside>

        {/* 右側：座席配置キャンバス (幅約70%) */}
        <main className="flex-1 bg-blue-50/50 p-8 overflow-auto relative">
          <div 
            id="seating-canvas" // PDF出力時にこのIDの範囲を取得します
            className="w-full h-full bg-white rounded-xl shadow-inner border-2 border-gray-200 relative"
            style={{
              // グリッド線の背景（スナップのガイドライン）
              backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(#e5e7eb 1px, transparent 1px)',
              backgroundSize: '50px 50px' // ここがグリッドの1マスのサイズになります
            }}
          >
            {/* ここに教卓や、机（Seat）、生徒（Student）を配置していきます */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-8 py-4 bg-amber-100 border-2 border-amber-300 rounded font-bold text-amber-800 shadow">
              教卓
            </div>
          </div>
        </main>

      </div>
    </DndContext>
  );
}

export default App;