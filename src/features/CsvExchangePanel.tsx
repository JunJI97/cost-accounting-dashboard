import { Download, FileJson, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  downloadCsv,
  downloadJson,
  getCsvFiles,
  parseDatasetCsv,
  parseDatasetJson,
} from '../domain/csvExchange';
import type { CostDataset } from '../domain/types';
import { useCostingStore } from '../store/useCostingStore';

export function CsvExchangePanel({ dataset }: { dataset: CostDataset }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState('CSV 또는 JSON 파일을 가져올 수 있습니다.');
  const { setDataset, updateDatasetPart } = useCostingStore();

  async function handleImport(file: File) {
    const text = await file.text();

    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        setDataset(parseDatasetJson(text));
        setMessage(`${file.name} 전체 데이터셋을 가져왔습니다.`);
        return;
      }

      const result = parseDatasetCsv(text, dataset);
      updateDatasetPart(result.key, result.rows);
      setMessage(`${file.name} 파일을 ${getLabel(result.key)} 데이터로 반영했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '파일을 가져오지 못했습니다.');
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">CSV / JSON 교환</p>
          <p className="mt-1 text-sm text-slate-500">{message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800"
          >
            <Upload size={15} aria-hidden="true" />
            가져오기
          </button>
          <button
            type="button"
            onClick={() => downloadJson(dataset)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileJson size={15} aria-hidden="true" />
            JSON
          </button>
          {getCsvFiles().map((file) => (
            <button
              key={file.key}
              type="button"
              onClick={() => downloadCsv(dataset, file.key)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={15} aria-hidden="true" />
              {file.label}
            </button>
          ))}
        </div>
      </div>
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept=".csv,.json,text/csv,application/json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImport(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function getLabel(key: keyof CostDataset) {
  return getCsvFiles().find((file) => file.key === key)?.label ?? key;
}
