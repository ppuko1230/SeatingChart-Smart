// src/App.tsx
import { useState } from 'react';
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Student, Seat as SeatType } from './types';
import { StudentCard } from './components/canvas/StudentCard';
import { Seat } from './components/canvas/Seat';
import { FileUploader } from './components/control-panel/FileUploader';

// ★ 追加：書き出し用のライブラリをインポート
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- 定数定義（机のサイズは削除し、Stateで管理します） ---
const ROW_GAP = 25;
const GRID_SIZE = 5;

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<SeatType[]>([]);
  const [initialSeats, setInitialSeats] = useState<SeatType[]>([]);
  
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  
  // ★ 追加：列数のステート（初期値 6）
  const [cols, setCols] = useState(6);

  // ★ 追加：机のサイズを管理するState
  const [seatWidth, setSeatWidth] = useState(112);
  const [seatHeight, setSeatHeight] = useState(80);

  const [isTeacherView, setIsTeacherView] = useState(false);
  const [showSeatFrame, setShowSeatFrame] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const [maleColor, setMaleColor] = useState('#dbeafe');
  const [femaleColor, setFemaleColor] = useState('#fce7f3');
  const [furiganaMode, setFuriganaMode] = useState<'hiragana' | 'katakana'>('hiragana');
  
  const [gapNarrow, setGapNarrow] = useState(5);
  const [gapWide, setGapWide] = useState(30);
  const [frontMargin, setFrontMargin] = useState(100);

  // 使い方
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  // SNS用
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

// ★ 汎用化したレイアウト計算ロジック
  const calculateLayoutCoordinates = (count: number) => {
    // 全体の幅を計算（列数に合わせて隙間と通路を合算）
    let totalContentWidth = 0;
    for (let c = 0; c < cols; c++) {
      totalContentWidth += seatWidth;
      if (c < cols - 1) {
        // 最後の列以外は隙間を追加
        totalContentWidth += (c % 2 === 0) ? gapNarrow : gapWide;
      }
    }

    const startX = Math.max(0, (canvasWidth - totalContentWidth) / 2);
    const startY = frontMargin;

    const coords = [];
    for (let index = 0; index < count; index++) {
      const row = Math.floor(index / cols);
      const col = index % cols;

      let offsetX = startX;
      for (let c = 0; c < col; c++) {
        offsetX += seatWidth;
        if (c % 2 === 0) offsetX += gapNarrow; // 偶数列の後は狭い隙間
        else offsetX += gapWide;               // 奇数列の後は広い通路
      }

      const offsetY = startY + row * (seatHeight + ROW_GAP);
      coords.push({ x: offsetX, y: offsetY });
    }
    return coords;
  };

  // ★ 追加：席をランダムに入れ替えるハンドラー
  const handleRandomShuffle = () => {
    if (seats.length === 0) return;

    setSeats((prevSeats) => {
      // 1. 現在の席に割り当てられている studentId の配列を作成
      const studentIds = prevSeats.map(seat => seat.studentId);

      // 2. フィッシャー–イェーツのシャッフルアルゴリズムで配列をかき混ぜる
      for (let i = studentIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [studentIds[i], studentIds[j]] = [studentIds[j], studentIds[i]];
      }

      // 3. シャッフルしたIDを元の席（座標は維持）に再割り当て
      return prevSeats.map((seat, index) => ({
        ...seat,
        studentId: studentIds[index],
      }));
    });
  };

  const handleDataLoaded = (newStudents: Student[]) => {
    setStudents(newStudents);
    const coords = calculateLayoutCoordinates(newStudents.length);
    const newSeats: SeatType[] = newStudents.map((student, index) => ({
      id: `seat-${index}`,
      x: coords[index].x,
      y: coords[index].y,
      studentId: student.id,
      isVisible: true,
    }));

    setSeats(newSeats);
    setInitialSeats(newSeats);
  };

  const handleRearrange = () => {
    const coords = calculateLayoutCoordinates(seats.length);
    setSeats((prevSeats) => 
      prevSeats.map((seat, index) => ({
        ...seat,
        x: coords[index].x,
        y: coords[index].y,
      }))
    );
  };

  const handleReset = () => {
    if (window.confirm('手動で並べ替えた席順もすべて初期化されます。よろしいですか？')) {
      setSeats(initialSeats);
    }
  };

  // --- ドラッグ＆ドロップ処理 ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;

    if (active.id.toString().startsWith('seat-self-')) {
      const activeSeatId = active.id.toString().replace('seat-self-', '');

      setSeats((prev) => {
        const newSeats = [...prev];
        const sourceIndex = newSeats.findIndex(s => s.id === activeSeatId);

        if (over) {
          const overSeatId = over.id.toString().replace('seat-', '');
          const targetIndex = newSeats.findIndex(s => s.id === overSeatId);
          if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
            const temp = newSeats[targetIndex].studentId;
            newSeats[targetIndex].studentId = newSeats[sourceIndex].studentId;
            newSeats[sourceIndex].studentId = temp;
            return newSeats;
          }
        }

        if (sourceIndex !== -1) {
          const seat = newSeats[sourceIndex];
          const moveX = isTeacherView ? -delta.x : delta.x;
          const moveY = isTeacherView ? -delta.y : delta.y;

          const pixelX = seat.x + moveX;
          const pixelY = seat.y + moveY;

          const snappedX = Math.round(pixelX / GRID_SIZE) * GRID_SIZE;
          const snappedY = Math.round(pixelY / GRID_SIZE) * GRID_SIZE;

          // ★ 変更：キャンバス外にはみ出ないためのクランプ処理に seatWidth/seatHeight を使用
          const clampedX = Math.max(0, Math.min(snappedX, canvasWidth - seatWidth));
          const clampedY = Math.max(0, Math.min(snappedY, canvasHeight - seatHeight));

          newSeats[sourceIndex] = { ...seat, x: clampedX, y: clampedY };
        }
        return newSeats;
      });
      return;
    }

    if (!over) return; 

    const activeStudentId = (active.id as string).replace('student-', '');
    const overSeatId = (over.id as string).replace('seat-', '');

    setSeats((prevSeats) => {
      const newSeats = [...prevSeats];
      const sourceSeatIndex = newSeats.findIndex(seat => seat.studentId === activeStudentId);
      const targetSeatIndex = newSeats.findIndex(seat => seat.id === overSeatId);

      if (sourceSeatIndex !== -1 && targetSeatIndex !== -1) {
        const targetStudentId = newSeats[targetSeatIndex].studentId;
        newSeats[sourceSeatIndex].studentId = targetStudentId;
        newSeats[targetSeatIndex].studentId = activeStudentId;
      }
      return newSeats;
    });
  };


  // ★ 追加：書き出し（エクスポート）関数
  const exportCanvas = async (format: 'png' | 'pdf', mode: 'color' | 'monochrome') => {
    const targetElement = document.getElementById('seating-canvas');
    if (!targetElement) return;

    // 現在の表示状態を保存し、書き出しに不要な要素を一時的に非表示にする
    const originalFilter = targetElement.style.filter;
    const wasGridShown = showGrid;
    
    // 書き出し時はグリッド線を消す（任意）
    if (showGrid) setShowGrid(false);

    // 白黒モードならCSSでグレースケールを適用
    if (mode === 'monochrome') {
      targetElement.style.filter = 'grayscale(100%)';
    }

    // 状態の反映を待つための微小なタイムラグ
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // App.tsx の exportCanvas 内
      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        // ★ クローンした要素（書き出し用の裏側要素）に対して強制的にスタイルを当てる
        onclone: (clonedDoc) => {
          const names = clonedDoc.querySelectorAll('.text-gray-800, .text-gray-600');
          names.forEach(el => {
            // 書き出しの瞬間だけ、さらに高さを無理やり確保する
            (el as HTMLElement).style.paddingBottom = '4px';
            (el as HTMLElement).style.overflow = 'visible';
          });
        }
      });
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `seating-chart-${mode}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        // キャンバスの縦横比に合わせてPDFの向きを設定 (l: 横, p: 縦)
        const orientation = canvas.width > canvas.height ? 'l' : 'p';
        const pdf = new jsPDF(orientation, 'pt', [canvas.width, canvas.height]);
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save(`seating-chart-${mode}.pdf`);
      }
    } catch (error) {
      console.error('エクスポートに失敗しました', error);
      alert('書き出しに失敗しました。');
    } finally {
      // フィルタとグリッド状態を元に戻す
      targetElement.style.filter = originalFilter;
      if (wasGridShown) setShowGrid(true);
    }
  };

  const shareMessage = "【おすすめツール】ログイン不要で簡単！ドラッグ＆ドロップで座席表が作れる「座席表メーカー」を使ってみました。席替えがめちゃくちゃ楽になるので、他の先生もぜひ！";
    const appUrl = window.location.href;

    const shareOnX = () => {
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(appUrl)}`;
      window.open(url, '_blank');
    };

    const shareOnLine = () => {
      const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(appUrl)}`;
      window.open(url, '_blank');
    };

    const copyUrl = async () => {
      await navigator.clipboard.writeText(appUrl);
      alert("URLをコピーしました！先生同士のチャットなどで共有してください。");
    };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex h-screen w-full bg-gray-100 overflow-hidden font-sans text-gray-800">
        {/* === 左側：コントロールパネル === */}
        <aside className="w-80 flex-shrink-0 bg-white border-r shadow-lg p-6 flex flex-col gap-6 overflow-y-auto z-10">
          <h1 className="text-xl font-bold">🏫 座席表メーカー</h1>
          
          <div className="border p-4 rounded-lg bg-gray-50">
            <h2 className="font-semibold mb-3">名簿データの取り込み</h2>
            <FileUploader onDataLoaded={handleDataLoaded} />
          </div>

          <div className="border p-4 rounded-lg bg-gray-50 flex flex-col gap-3">
             <h2 className="font-semibold">キャンバス＆机サイズ設定</h2>
             <div className="grid grid-cols-2 gap-2 text-sm">
               <label className="flex flex-col">
                 <span className="text-gray-600 text-xs">全体の幅(px)</span>
                 <input type="number" step="10" value={canvasWidth} onChange={(e) => setCanvasWidth(Number(e.target.value))} className="p-1 border rounded" />
               </label>
               <label className="flex flex-col">
                 <span className="text-gray-600 text-xs">全体の高さ(px)</span>
                 <input type="number" step="10" value={canvasHeight} onChange={(e) => setCanvasHeight(Number(e.target.value))} className="p-1 border rounded" />
               </label>
               {/* ★ 追加：列数の入力 */}
               <label className="flex flex-col mt-2">
                 <span className="text-indigo-600 font-bold text-xs">横の列数</span>
                 <input type="number" min="1" max="20" value={cols} onChange={(e) => setCols(Number(e.target.value))} className="p-1 border-2 border-indigo-200 rounded font-bold" />
               </label>
               {/* ★ 追加：机サイズのコントロール */}
               <label className="flex flex-col mt-2">
                 <span className="text-gray-600 text-xs">机の幅(px)</span>
                 <input type="number" step="2" value={seatWidth} onChange={(e) => setSeatWidth(Number(e.target.value))} className="p-1 border rounded" />
               </label>
               <label className="flex flex-col mt-2">
                 <span className="text-gray-600 text-xs">机の高さ(px)</span>
                 <input type="number" step="2" value={seatHeight} onChange={(e) => setSeatHeight(Number(e.target.value))} className="p-1 border rounded" />
               </label>
             </div>
          </div>

          <div className="border p-4 rounded-lg bg-gray-50 flex flex-col gap-3">
            <h2 className="font-semibold text-gray-700">レイアウト配置設定</h2>
            <button 
              onClick={handleRandomShuffle} 
              disabled={seats.length === 0} 
              className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded hover:from-purple-600 hover:to-indigo-700 disabled:bg-gray-300 transition-all font-bold shadow-md text-sm mb-1"
            >
              🎲 ランダムに入れ替える
            </button>
            <label className="flex items-center justify-between text-sm">
              <span>教卓からの距離:</span>
              <input type="number" step="5" value={frontMargin} onChange={(e) => setFrontMargin(Number(e.target.value))} className="w-16 p-1 border rounded text-right" />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>机の隙間:</span>
              <input type="number" step="5" value={gapNarrow} onChange={(e) => setGapNarrow(Number(e.target.value))} className="w-16 p-1 border rounded text-right" />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>通路の広さ:</span>
              <input type="number" step="5" value={gapWide} onChange={(e) => setGapWide(Number(e.target.value))} className="w-16 p-1 border rounded text-right" />
            </label>
            <div className="flex gap-2 mt-3">
              <button onClick={handleRearrange} disabled={seats.length === 0} className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 transition-colors font-semibold shadow-sm text-sm">
                整列する
              </button>
              <button onClick={handleReset} disabled={initialSeats.length === 0} className="flex-1 py-2 bg-rose-500 text-white rounded hover:bg-rose-600 disabled:bg-gray-300 transition-colors font-semibold shadow-sm text-sm">
                初期化
              </button>
            </div>
          </div>
          <div className="border p-4 rounded-lg bg-indigo-50 border-indigo-100 flex flex-col gap-4">
            <h2 className="font-semibold text-indigo-800">👁️ 表示設定</h2>
            
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-indigo-900">先生視点 (教卓下)</span>
              <button onClick={() => setIsTeacherView(!isTeacherView)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isTeacherView ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTeacherView ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-indigo-900">机の枠線を表示</span>
              <button onClick={() => setShowSeatFrame(!showSeatFrame)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showSeatFrame ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showSeatFrame ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-indigo-900">グリッド線を表示</span>
              <button onClick={() => setShowGrid(!showGrid)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showGrid ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showGrid ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </label>

            <hr className="border-indigo-200 my-1" />
            
            <label className="flex items-center justify-between text-sm">
              <span className="font-medium text-indigo-900">男子カード色</span>
              <input type="color" value={maleColor} onChange={(e) => setMaleColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span className="font-medium text-indigo-900">女子カード色</span>
              <input type="color" value={femaleColor} onChange={(e) => setFemaleColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span className="font-medium text-indigo-900">フリガナ表示</span>
              <select value={furiganaMode} onChange={(e) => setFuriganaMode(e.target.value as 'hiragana' | 'katakana')} className="border border-indigo-200 rounded px-2 py-1 text-sm bg-white">
                <option value="hiragana">ひらがな</option>
                <option value="katakana">カタカナ</option>
              </select>
            </label>
          </div>

          {/* ★ 追加：書き出し（エクスポート）パネル */}
          <div className="border p-4 rounded-lg bg-emerald-50 border-emerald-100 flex flex-col gap-3 mb-6">
            <h2 className="font-semibold text-emerald-800">💾 出力・保存</h2>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => exportCanvas('png', 'color')} className="py-2 px-1 bg-white border border-emerald-300 text-emerald-700 rounded hover:bg-emerald-100 text-xs font-semibold">
                PNG (カラー)
              </button>
              <button onClick={() => exportCanvas('pdf', 'color')} className="py-2 px-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs font-semibold">
                PDF (カラー)
              </button>
              <button onClick={() => exportCanvas('png', 'monochrome')} className="py-2 px-1 bg-white border border-gray-400 text-gray-700 rounded hover:bg-gray-100 text-xs font-semibold">
                PNG (白黒)
              </button>
              <button onClick={() => exportCanvas('pdf', 'monochrome')} className="py-2 px-1 bg-gray-700 text-white rounded hover:bg-gray-800 text-xs font-semibold">
                PDF (白黒)
              </button>
            </div>
          </div>
        </aside>

        {/* === 右側：キャンバス領域 === */}
        <main className="flex-1 p-8 bg-gray-200 overflow-auto flex justify-center items-start">
          <div 
            id="seating-canvas"
            className={`bg-white rounded-xl relative transition-all duration-300 origin-top ${showGrid ? 'border-2 border-gray-300 shadow-xl' : ''}`}
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              backgroundImage: showGrid 
                ? `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)` 
                : 'none',
              backgroundSize: `${GRID_SIZE * 5}px ${GRID_SIZE * 5}px`
            }}
          >
            <div 
              className="absolute left-1/2 transform -translate-x-1/2 px-16 py-3 bg-amber-100 border-b-4 border-amber-300 rounded text-amber-800 font-bold tracking-widest shadow-sm transition-all duration-500 z-0"
              style={isTeacherView ? { bottom: '20px' } : { top: '20px' }}
            >
              教 卓
            </div>

            {seats.map((seat) => {
              const student = students.find(s => s.id === seat.studentId);
              
              // ★ 変更：seatWidth, seatHeight を使用
              const displayX = isTeacherView ? canvasWidth - seat.x - seatWidth : seat.x;
              const displayY = isTeacherView ? canvasHeight - seat.y - seatHeight : seat.y;
              const cardColor = student?.gender === 'female' ? femaleColor : maleColor;

              return (
                <Seat 
                  key={seat.id} 
                  id={seat.id} 
                  x={displayX} 
                  y={displayY}
                  style={{
                    width: `${seatWidth}px`,
                    height: `${seatHeight}px`,
                    // ★ 修正箇所：visibility ではなく border のスタイルで制御する
                    borderWidth: showSeatFrame ? '1px' : '0px',
                    borderColor: showSeatFrame ? '#9ca3af' : 'transparent', // 透明にする
                    borderStyle: 'solid',
                    backgroundColor: showSeatFrame ? 'white' : 'transparent', 
                  }}
                >
                  <div className="relative w-full h-full flex items-center justify-center p-1" style={{ visibility: 'visible' }}>
                    {student && <StudentCard student={student} bgColor={cardColor} furiganaMode={furiganaMode} />}
                  </div>
                </Seat>
              );
            })}
          </div>
        </main>
        {/* === 使い方ボタン（シェアボタンの上に配置） === */}
        <button
          onClick={() => setIsHelpModalOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-white text-indigo-600 rounded-full shadow-xl hover:bg-gray-50 transition-all flex items-center justify-center z-50 border-2 border-indigo-100 group"
          title="使い方を見る"
        >
          <span className="text-2xl font-bold group-hover:scale-110 transition-transform">？</span>
        </button>

        {/* === 使い方モーダル === */}
        {isHelpModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setIsHelpModalOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
              
              {/* 閉じるボタン */}
              <button 
                onClick={() => setIsHelpModalOpen(false)}
                className="absolute top-4 right-4 bg-black/50 text-white w-8 h-8 rounded-full hover:bg-black transition-colors z-10"
              >✕</button>

              <div className="overflow-y-auto p-6 text-center">
                <h3 className="text-2xl font-bold mb-4 text-gray-800">クイック使い方ガイド</h3>
                
                <div className="bg-white rounded-xl overflow-hidden shadow-inner border border-gray-200">
                  <img 
                    src="/guide.png" 
                    alt="座席表メーカー 使い方ガイド" 
                    className="w-full h-auto block"
                    // 画像が読み込めなかった時のためのエラーハンドリング（任意）
                    onError={(e) => (e.currentTarget.style.display = 'none')} 
                  />
                </div>

                <button 
                  onClick={() => setIsHelpModalOpen(false)}
                  className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                  わかった！
                </button>
              </div>
            </div>
          </div>
        )}
        {/* === 追加：右下のフローティングシェアボタン === */}
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center z-50 group"
          title="アプリをシェアする"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform">📢</span>
        </button>

        {/* === 追加：シェア用モーダル === */}
        {isShareModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setIsShareModalOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
              >✕</button>
              
              <h3 className="text-xl font-bold text-center mb-2 text-gray-800">みんなに紹介する</h3>
              <p className="text-sm text-gray-500 text-center mb-6">このアプリをシェアして、<br />周りの先生たちを応援しましょう！</p>
              
              <div className="flex flex-col gap-3">
                <button onClick={shareOnX} className="flex items-center justify-center gap-3 w-full py-3 bg-black text-white rounded-xl font-bold hover:opacity-90 transition-opacity">
                   𝕏 でポスト
                </button>
                <button onClick={shareOnLine} className="flex items-center justify-center gap-3 w-full py-3 bg-[#06C755] text-white rounded-xl font-bold hover:opacity-90 transition-opacity">
                   LINEで送る
                </button>
                <button onClick={copyUrl} className="flex items-center justify-center gap-3 w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors border border-gray-200">
                   🔗 URLをコピー
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100 text-[10px] text-gray-400 text-center leading-relaxed">
                ※入力された生徒名簿などのデータは<br />サーバーに送信されないので、安心して紹介いただけます。
              </div>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}