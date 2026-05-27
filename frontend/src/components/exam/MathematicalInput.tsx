import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import LatexContent from "./LatexContent";
import { optionDisplayText } from "./examUtils";

interface MathematicalInputProps {
  question: any;
  value: any;
  onChange: (value: any) => void;
}

export default function MathematicalInput({ question, value, onChange }: MathematicalInputProps) {
  const mathType = question.math_type || "expression";

  if (mathType === "expression" || mathType === "number") {
    return (
      <textarea
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={mathType === "expression" ? "Enter mathematical expression (LaTeX supported)" : "Enter numeric value"}
        className="w-full border rounded-lg p-3 text-slate-900 font-mono text-sm focus:ring-2 focus:ring-amber-500 outline-none"
      />
    );
  }

  if (mathType === "choice") {
    const options = question.options || [];
    const selectedIds = Array.isArray(value) ? value : [];

    return (
      <div className="space-y-2">
        {options.map((opt: any) => {
          const isSelected = selectedIds.includes(opt.id);
          return (
            <label
              key={opt.id}
              className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors"
              style={{ borderColor: isSelected ? "#b45309" : "#e2e8f0", background: isSelected ? "#fffbeb" : "#fff" }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {
                  if (isSelected) {
                    onChange(selectedIds.filter((id: string) => id !== opt.id));
                  } else {
                    onChange([...selectedIds, opt.id]);
                  }
                }}
                className="mt-1"
              />
              <LatexContent text={optionDisplayText(opt)} />
            </label>
          );
        })}
      </div>
    );
  }

  if (mathType === "matrix") {
    return <MatrixInput question={question} value={value} onChange={onChange} />;
  }

  return null;
}

function MatrixInput({ question, value, onChange }: { question: any; value: any; onChange: (v: any) => void }) {
  const [rows, setRows] = useState(value?.rows || question.matrix_rows || 2);
  const [cols, setCols] = useState(value?.cols || question.matrix_cols || 2);
  const [data, setData] = useState<string[][]>(() => {
    if (value?.data && Array.isArray(value.data)) {
      return value.data.map((r: any[]) => r.map((c) => String(c)));
    }
    return Array.from({ length: rows }, () => Array(cols).fill(""));
  });

  useEffect(() => {
    if (rows !== data.length || cols !== (data[0]?.length || 0)) {
       const newData = Array.from({ length: rows }, (_, r) =>
         Array.from({ length: cols }, (_, c) => (data[r] && data[r][c] !== undefined ? data[r][c] : ""))
       );
       setData(newData);
       onChange({ rows, cols, data: newData });
    }
  }, [rows, cols]);

  const handleCellChange = (r: number, c: number, val: string) => {
    const newData = data.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row));
    setData(newData);
    onChange({ rows, cols, data: newData });
  };

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50">
      <div className="flex items-center gap-4 mb-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Rows</Label>
          <select 
            value={rows} 
            onChange={(e) => setRows(Number(e.target.value))}
            className="block w-16 text-sm border rounded-md p-1"
          >
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Cols</Label>
          <select 
            value={cols} 
            onChange={(e) => setCols(Number(e.target.value))}
            className="block w-16 text-sm border rounded-md p-1"
          >
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <Badge variant="outline" className="mt-4">Matrix {rows}x{cols}</Badge>
      </div>

      <div 
        className="inline-grid gap-2 p-3 bg-white border-2 border-slate-300 rounded-lg relative"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(60px, 1fr))`,
          boxShadow: 'inset 0 0 0 2px white, -4px 0 0 0 #334155, 4px 0 0 0 #334155'
        }}
      >
        {data.map((row, r) =>
          row.map((cell, c) => (
            <input
              key={`${r}-${c}`}
              type="text"
              value={cell}
              onChange={(e) => handleCellChange(r, c, e.target.value)}
              className="w-full h-10 border rounded px-2 text-center text-sm font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          ))
        )}
      </div>
      <p className="text-[10px] text-muted-foreground italic">Input each element of the matrix above.</p>
    </div>
  );
}
