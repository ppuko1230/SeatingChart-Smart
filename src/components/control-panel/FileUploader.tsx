// src/components/control-panel/FileUploader.tsx
import * as XLSX from 'xlsx';
import type { Student } from '../../types';

type Props = {
  onDataLoaded: (students: Student[]) => void;
};

export const FileUploader = ({ onDataLoaded }: Props) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // シートをJSON形式（配列）に変換
      const jsonData = XLSX.utils.sheet_to_json<any>(sheet);

      // アプリ用のStudent型にマッピング
      const mappedStudents: Student[] = jsonData.map((row, index) => ({
        id: `student-${Date.now()}-${index}`,
        attendanceNo: row['出席番号'] || row['No'] || index + 1,
        name: row['氏名'] || row['名前'] || '不明',
        furigana: row['フリガナ'] || '',
        gender: row['性別'] === '女' || row['性別'] === 'female' ? 'female' : 'male',
      }));

      onDataLoaded(mappedStudents);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-medium text-gray-700">
        名簿データのインポート (.xlsx / .csv)
      </label>
      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={handleFileUpload}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
    </div>
  );
};