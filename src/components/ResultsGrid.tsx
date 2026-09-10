// Query results table with optional diff highlighting.
// (Extracted from App.tsx unchanged so it can be shared with the Labs UI.)
import type { QueryResult, GradingResult } from '../engine/sqlEngine';

export function ResultsGrid({
  result,
  diff,
}: {
  result: QueryResult;
  diff?: GradingResult['diff'];
}) {
  if (result.columns.length === 0 && result.rows.length === 0) {
    return (
      <div style={{ padding: '16px', color: 'var(--muted)', fontSize: '0.88rem', textAlign: 'center' }}>
        Query executed successfully with no results.
      </div>
    );
  }

  const extraRowKeys = new Set(
    (diff?.extraRows || []).map((r) => r.join('\x00'))
  );

  return (
    <div className="results-grid-wrapper">
      <table className="results-grid" aria-label="Query results">
        <thead>
          <tr>
            {result.columns.map((col, i) => (
              <th key={i} scope="col">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, ri) => {
            const rowKey = row.join('\x00');
            const isExtra = extraRowKeys.has(rowKey);
            return (
              <tr key={ri} className={isExtra ? 'row-extra' : ''}>
                {row.map((cell, ci) => (
                  <td key={ci} className={cell === null ? 'null-cell' : ''}>
                    {cell === null ? 'NULL' : String(cell)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
