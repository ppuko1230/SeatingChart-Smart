// src/types.ts
export interface SeatNode {
  id: string;          // 座席のユニークID
  x: number;           // X座標
  y: number;           // Y座標
  studentNumber: number; // 出席番号
  nameKanji: string;   // 漢字氏名
  nameKana: string;    // フリガナ
  gender: 'male' | 'female'; // 性別
}