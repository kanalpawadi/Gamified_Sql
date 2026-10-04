import { useState, useEffect } from 'react';
import type { QueryResult, GradingResult } from '../engine/sqlEngine';

interface LeetCodeResultsViewProps {
  runResult?: QueryResult | null;
  gradingResult?: GradingResult | null;
  isRunning?: boolean;
  onExecute?: () => void;
}

export function LeetCodeResultsView({
  runResult,
  gradingResult,
  isRunning,
  onExecute,
}: LeetCodeResultsViewProps) {
  const [activeOutputTab, setActiveOutputTab] = useState<'actual' | 'expected' | 'diff'>('actual');

  // Automatically switch tab if expected output is available on failure
  useEffect(() => {
    if (gradingResult && !gradingResult.passed && gradingResult.expectedResult) {
      setActiveOutputTab('actual');
    }
  }, [gradingResult]);

  if (isRunning) {
    return (
      <div className="leetcode-results-empty">
        <div className="leetcode-running-spinner">
          <span className="loading-spinner" style={{ width: 24, height: 24, borderWidth: 3, borderColor: '#3b82f6', borderTopColor: 'transparent' }} />
          <span>Running query & evaluating testcases…</span>
        </div>
      </div>
    );
  }

  if (!runResult && !gradingResult) {
    return (
      <div className="leetcode-results-empty">
        <div className="leetcode-empty-icon">▶</div>
        <div className="leetcode-empty-text">No results yet</div>
        <div className="leetcode-empty-subtext">Click <strong>Execute Query</strong> to run your SQL query and test against expected output.</div>
        {onExecute && (
          <button className="btn btn-primary btn-sm mt-12" onClick={onExecute}>
            ▶ Run Query
          </button>
        )}
      </div>
    );
  }

  const passed = gradingResult?.passed ?? false;
  const isError = gradingResult?.errorMessage != null;

  const extraRowKeys = new Set(
    (gradingResult?.diff?.extraRows || []).map((r) => r.join('\x00'))
  );
  const missingRowKeys = new Set(
    (gradingResult?.diff?.missingRows || []).map((r) => r.join('\x00'))
  );

  return (
    <div className="leetcode-results-container">
      {/* ── Verdict Status Header ────────────────────────────────────────── */}
      {gradingResult ? (
        <div className={`leetcode-verdict-bar ${passed ? 'verdict-pass' : isError ? 'verdict-error' : 'verdict-fail'}`}>
          <div className="leetcode-verdict-left">
            <div className="leetcode-status-badge">
              {passed ? (
                <>
                  <span className="badge-symbol">✓</span> Accepted
                </>
              ) : isError ? (
                <>
                  <span className="badge-symbol">⚠️</span> Runtime Error
                </>
              ) : (
                <>
                  <span className="badge-symbol">✗</span> Wrong Answer
                </>
              )}
            </div>

            <div className="leetcode-metrics">
              {runResult && (
                <span className="metric-item">
                  <strong>{runResult.rows.length}</strong> {runResult.rows.length === 1 ? 'row' : 'rows'}
                </span>
              )}
              {gradingResult.diff && (
                <span className="metric-item">
                  <strong>{gradingResult.diff.matchingRows}</strong> / {gradingResult.diff.totalExpected} matched
                </span>
              )}
            </div>
          </div>
        </div>
      ) : runResult ? (
        <div className="leetcode-verdict-bar verdict-info">
          <div className="leetcode-verdict-left">
            <div className="leetcode-status-badge info">
              <span className="badge-symbol">ℹ️</span> Executed Successfully
            </div>
            <div className="leetcode-metrics">
              <span className="metric-item">
                <strong>{runResult.rows.length}</strong> {runResult.rows.length === 1 ? 'row' : 'rows'} returned
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── SQL Error Banner ───────────────────────────────────────────── */}
      {gradingResult?.errorMessage && (
        <div className="leetcode-error-box">
          <div className="error-title">SQL Syntax / Runtime Error:</div>
          <pre className="error-content font-mono">{gradingResult.errorMessage}</pre>
        </div>
      )}

      {/* ── Tab Bar: Output / Expected / Diff ────────────────────────────── */}
      {(runResult || gradingResult?.expectedResult) && (
        <div className="leetcode-output-tabs-bar">
          <div className="leetcode-output-tabs">
            {runResult && (
              <button
                className={`leetcode-out-tab ${activeOutputTab === 'actual' ? 'active' : ''}`}
                onClick={() => setActiveOutputTab('actual')}
              >
                <span>📊 Your Output</span>
                <span className="tab-count-badge">{runResult.rows.length}</span>
              </button>
            )}

            {gradingResult?.expectedResult && (
              <button
                className={`leetcode-out-tab ${activeOutputTab === 'expected' ? 'active' : ''}`}
                onClick={() => setActiveOutputTab('expected')}
              >
                <span>🎯 Expected Output</span>
                <span className="tab-count-badge">{gradingResult.expectedResult.rows.length}</span>
              </button>
            )}

            {gradingResult?.diff && !passed && (
              <button
                className={`leetcode-out-tab ${activeOutputTab === 'diff' ? 'active' : ''}`}
                onClick={() => setActiveOutputTab('diff')}
              >
                <span>🔍 Diff Analysis</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Content: Actual / Expected / Diff ────────────────────────── */}
      <div className="leetcode-results-body">
        {/* Tab 1: Your Output */}
        {activeOutputTab === 'actual' && runResult && (
          <div className="leetcode-grid-wrapper">
            {runResult.columns.length === 0 && runResult.rows.length === 0 ? (
              <div className="leetcode-no-rows">Query executed successfully with 0 columns/rows.</div>
            ) : (
              <table className="leetcode-grid">
                <thead>
                  <tr>
                    <th scope="col" className="row-num-col">#</th>
                    {runResult.columns.map((col, i) => (
                      <th scope="col" key={i}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runResult.rows.map((row, rIdx) => {
                    const rKey = row.join('\x00');
                    const isExtra = extraRowKeys.has(rKey);
                    return (
                      <tr key={rIdx} className={isExtra ? 'row-extra-tint' : ''}>
                        <td className="row-num-cell font-mono">{rIdx + 1}</td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="font-mono">
                            {cell === null ? (
                              <span className="leetcode-null">null</span>
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Expected Output */}
        {activeOutputTab === 'expected' && gradingResult?.expectedResult && (
          <div className="leetcode-grid-wrapper">
            <table className="leetcode-grid">
              <thead>
                <tr>
                  <th scope="col" className="row-num-col">#</th>
                  {gradingResult.expectedResult.columns.map((col, i) => (
                    <th scope="col" key={i}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradingResult.expectedResult.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    <td className="row-num-cell font-mono">{rIdx + 1}</td>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="font-mono">
                        {cell === null ? (
                          <span className="leetcode-null">null</span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Diff View */}
        {activeOutputTab === 'diff' && gradingResult?.diff && (
          <div className="leetcode-diff-container">
            {gradingResult.diff.columnMismatch && (
              <div className="leetcode-diff-alert error">
                <strong>Column Mismatch:</strong> {gradingResult.diff.columnMismatch}
              </div>
            )}

            <div className="leetcode-diff-chips">
              <span className="diff-chip pass">✓ {gradingResult.diff.matchingRows} Matching Rows</span>
              {gradingResult.diff.missingRows.length > 0 && (
                <span className="diff-chip fail">✗ {gradingResult.diff.missingRows.length} Missing Rows</span>
              )}
              {gradingResult.diff.extraRows.length > 0 && (
                <span className="diff-chip warn">+ {gradingResult.diff.extraRows.length} Extra Rows</span>
              )}
            </div>

            {/* Missing rows grid */}
            {gradingResult.diff.missingRows.length > 0 && (
              <div className="leetcode-diff-section mt-12">
                <div className="diff-section-title text-fail">❌ Missing Rows in Your Result:</div>
                <div className="leetcode-grid-wrapper">
                  <table className="leetcode-grid">
                    <thead>
                      <tr>
                        <th scope="col" className="row-num-col">#</th>
                        {gradingResult.expectedResult?.columns.map((c, i) => (
                          <th scope="col" key={i}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gradingResult.diff.missingRows.map((row, rIdx) => (
                        <tr key={rIdx} className="row-missing-tint">
                          <td className="row-num-cell font-mono">{rIdx + 1}</td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="font-mono">
                              {cell === null ? <span className="leetcode-null">null</span> : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Extra rows grid */}
            {gradingResult.diff.extraRows.length > 0 && (
              <div className="leetcode-diff-section mt-12">
                <div className="diff-section-title text-warn">⚠️ Extra Rows (Unmatched):</div>
                <div className="leetcode-grid-wrapper">
                  <table className="leetcode-grid">
                    <thead>
                      <tr>
                        <th scope="col" className="row-num-col">#</th>
                        {runResult?.columns.map((c, i) => (
                          <th scope="col" key={i}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gradingResult.diff.extraRows.map((row, rIdx) => (
                        <tr key={rIdx} className="row-extra-tint">
                          <td className="row-num-cell font-mono">{rIdx + 1}</td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="font-mono">
                              {cell === null ? <span className="leetcode-null">null</span> : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
