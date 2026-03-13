"use client";

import { useMemo, useState } from "react";

const ROW_COUNT = 6;
const COL_COUNT = 5;

const INITIAL_CELLS = {
  A1: "12",
  B1: "8",
  C1: "=A1+B1",
  A2: "5",
  B2: "4",
  C2: "=A2*B2",
  D1: "=SUM(A1:C1)"
};

function columnLabel(index) {
  return String.fromCharCode(65 + index);
}

function toCellId(rowIndex, colIndex) {
  return `${columnLabel(colIndex)}${rowIndex + 1}`;
}

function parseCellId(cellId) {
  const match = /^([A-Z]+)(\d+)$/.exec(cellId);
  if (!match) {
    return null;
  }

  const [, rawColumn, rawRow] = match;
  let colIndex = 0;

  for (let i = 0; i < rawColumn.length; i += 1) {
    colIndex = colIndex * 26 + (rawColumn.charCodeAt(i) - 64);
  }

  return { rowIndex: Number(rawRow) - 1, colIndex: colIndex - 1 };
}

function expandRange(rangeText) {
  const [start, end] = rangeText.split(":");
  const startCell = parseCellId(start?.trim() ?? "");
  const endCell = parseCellId(end?.trim() ?? "");

  if (!startCell || !endCell) {
    return null;
  }

  const minRow = Math.min(startCell.rowIndex, endCell.rowIndex);
  const maxRow = Math.max(startCell.rowIndex, endCell.rowIndex);
  const minCol = Math.min(startCell.colIndex, endCell.colIndex);
  const maxCol = Math.max(startCell.colIndex, endCell.colIndex);
  const rangeCells = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      rangeCells.push(toCellId(row, col));
    }
  }

  return rangeCells;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatResult(value) {
  if (!Number.isFinite(value)) {
    return "#ERR";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Number(value.toFixed(6)));
}

function evaluateCell(cellId, cells, cache, visiting) {
  if (cache.has(cellId)) {
    return cache.get(cellId);
  }

  if (visiting.has(cellId)) {
    return "#CYCLE!";
  }

  visiting.add(cellId);
  const rawValue = cells[cellId] ?? "";

  if (!rawValue.startsWith("=")) {
    cache.set(cellId, rawValue);
    visiting.delete(cellId);
    return rawValue;
  }

  const formula = rawValue.slice(1).trim();
  const sumMatch = /^SUM\(([^)]+)\)$/i.exec(formula);

  if (sumMatch) {
    const rangeCells = expandRange(sumMatch[1]);

    if (!rangeCells) {
      cache.set(cellId, "#ERR");
      visiting.delete(cellId);
      return "#ERR";
    }

    const total = rangeCells.reduce((runningTotal, currentCell) => {
      const value = evaluateCell(currentCell, cells, cache, visiting);
      if (typeof value === "string" && value.startsWith("#")) {
        return Number.NaN;
      }
      return runningTotal + toNumber(value);
    }, 0);

    const result = formatResult(total);
    cache.set(cellId, result);
    visiting.delete(cellId);
    return result;
  }

  const substitutedFormula = formula.replace(/\b([A-Z]+[1-9][0-9]*)\b/g, (match) => {
    const referencedValue = evaluateCell(match, cells, cache, visiting);
    if (typeof referencedValue === "string" && referencedValue.startsWith("#")) {
      return "NaN";
    }
    return String(toNumber(referencedValue));
  });

  if (!/^[0-9+\-*/().\s]+$/.test(substitutedFormula)) {
    cache.set(cellId, "#ERR");
    visiting.delete(cellId);
    return "#ERR";
  }

  try {
    const computed = Function(`"use strict"; return (${substitutedFormula});`)();
    const result = formatResult(Number(computed));
    cache.set(cellId, result);
    visiting.delete(cellId);
    return result;
  } catch {
    cache.set(cellId, "#ERR");
    visiting.delete(cellId);
    return "#ERR";
  }
}

export default function Home() {
  const [cells, setCells] = useState(INITIAL_CELLS);
  const [activeCell, setActiveCell] = useState("C1");

  const computedCells = useMemo(() => {
    const cache = new Map();
    const nextValues = {};

    for (let row = 0; row < ROW_COUNT; row += 1) {
      for (let col = 0; col < COL_COUNT; col += 1) {
        const id = toCellId(row, col);
        nextValues[id] = evaluateCell(id, cells, cache, new Set());
      }
    }

    return nextValues;
  }, [cells]);

  const selectedRawValue = cells[activeCell] ?? "";
  const selectedComputedValue = computedCells[activeCell] ?? "";

  return (
    <main className="page">
      <section className="sheet-card">
        <h1>Simple Spreadsheet</h1>
        <p className="subtext">
          Formula example: <code>C1 = A1 + B1</code> and <code>D1 = SUM(A1:C1)</code>.
        </p>

        <div className="formula-bar">
          <strong>{activeCell}:</strong> {selectedRawValue || "(empty)"}{" "}
          <span className="computed-preview">=> {selectedComputedValue || "(empty)"}</span>
        </div>

        <div className="sheet-scroll">
          <table className="sheet">
            <thead>
              <tr>
                <th />
                {Array.from({ length: COL_COUNT }, (_, colIndex) => (
                  <th key={columnLabel(colIndex)}>{columnLabel(colIndex)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROW_COUNT }, (_, rowIndex) => (
                <tr key={rowIndex + 1}>
                  <th>{rowIndex + 1}</th>
                  {Array.from({ length: COL_COUNT }, (_, colIndex) => {
                    const cellId = toCellId(rowIndex, colIndex);
                    const isSelected = activeCell === cellId;
                    const rawValue = cells[cellId] ?? "";
                    const computedValue = computedCells[cellId] ?? "";
                    const value = isSelected ? rawValue : computedValue;

                    return (
                      <td key={cellId}>
                        <input
                          className={isSelected ? "selected" : ""}
                          value={value}
                          onFocus={() => setActiveCell(cellId)}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setCells((previous) => ({ ...previous, [cellId]: nextValue }));
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.currentTarget.blur();
                            }
                          }}
                          aria-label={`Cell ${cellId}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
