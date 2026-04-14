// src/types/index.ts

// 生徒のデータ構造
export type Student = {
  id: string;
  attendanceNo: number; // 出席番号
  name: string;
  furigana: string;
  gender: 'male' | 'female' | 'other';
  needsFrontRow?: boolean; // 視力等の配慮
  isLocked?: boolean;      // 席の固定（シャッフル除外）
  memo?: string;           // 先生用メモ
};

// 座席（机）のデータ構造
export type Seat = {
  id: string;
  x: number;               // キャンバス上の絶対X座標
  y: number;               // キャンバス上の絶対Y座標
  studentId: string | null; // 座っている生徒のID（空席ならnull）
  isVisible: boolean;      // 席の表示/非表示（33人学級などの調整用）
};