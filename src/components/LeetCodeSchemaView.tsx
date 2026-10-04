import { useEffect, useState } from 'react';
import { parseSchemaSync, parseDatabaseSchema, ParsedTable } from '../lib/schemaParser';

interface LeetCodeSchemaViewProps {
  schemaSQL: string;
  seedSQL: string;
}

export function LeetCodeSchemaView({ schemaSQL, seedSQL }: LeetCodeSchemaViewProps) {
  const [tables, setTables] = useState<ParsedTable[]>(() => parseSchemaSync(schemaSQL, seedSQL));
  const [selectedTableIndex, setSelectedTableIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');

  useEffect(() => {
    let isMounted = true;
    // Initial sync load
    const syncResult = parseSchemaSync(schemaSQL, seedSQL);
    setTables(syncResult);
    if (selectedTableIndex >= syncResult.length) {
      setSelectedTableIndex(0);
    }

    // Async DB parse for exact PRAGMA information & full sample data
    parseDatabaseSchema(schemaSQL, seedSQL).then((res) => {
      if (isMounted && res.length > 0) {
        setTables(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [schemaSQL, seedSQL]);

  if (tables.length === 0) {
    return (
      <div className="leetcode-empty-schema">
        <span>⚠️ No table definitions found in schema.</span>
      </div>
    );
  }

  const activeTable = tables[selectedTableIndex] || tables[0];

  return (
    <div className="leetcode-schema-container">
      {/* Table selector tabs & View toggle */}
      <div className="leetcode-schema-toolbar">
        <div className="leetcode-table-tabs" role="tablist" aria-label="Database Tables">
          {tables.map((t, idx) => (
            <button
              key={t.tableName}
              role="tab"
              aria-selected={idx === selectedTableIndex}
              className={`leetcode-tab-btn ${idx === selectedTableIndex ? 'active' : ''}`}
              onClick={() => setSelectedTableIndex(idx)}
            >
              <span className="leetcode-tab-icon">🗄️</span>
              <span className="leetcode-tab-name">{t.tableName}</span>
            </button>
          ))}
        </div>

        <div className="leetcode-view-toggle">
          <button
            className={`leetcode-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Structured Table View (LeetCode Feel)"
          >
            📋 Grid
          </button>
          <button
            className={`leetcode-toggle-btn ${viewMode === 'raw' ? 'active' : ''}`}
            onClick={() => setViewMode('raw')}
            title="Raw SQL Statement"
          >
            💻 SQL
          </button>
        </div>
      </div>

      {viewMode === 'raw' ? (
        <div className="leetcode-raw-sql">
          <pre><code>{schemaSQL}\n\n{seedSQL}</code></pre>
        </div>
      ) : (
        <div className="leetcode-schema-content">
          {/* Section 1: Column Schema Definition */}
          <div className="leetcode-section-card">
            <div className="leetcode-section-header">
              <div className="leetcode-table-title">
                <span className="table-badge">Table</span>
                <strong>{activeTable.tableName}</strong>
                <span className="col-count-chip">{activeTable.columns.length} columns</span>
              </div>
            </div>

            <div className="leetcode-grid-wrapper">
              <table className="leetcode-grid">
                <thead>
                  <tr>
                    <th scope="col">Column Name</th>
                    <th scope="col">Type</th>
                    <th scope="col">Key</th>
                    <th scope="col">Nullable</th>
                    <th scope="col">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTable.columns.map((col) => (
                    <tr key={col.name}>
                      <td className="col-name font-mono">
                        {col.isPk && <span className="pk-icon" title="Primary Key">🔑</span>}
                        {col.name}
                      </td>
                      <td className="col-type">
                        <span className="type-pill">{col.type}</span>
                      </td>
                      <td className="col-key">
                        {col.isPk ? (
                          <span className="pk-badge">PK</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="col-nullable">
                        {col.nullable ? (
                          <span className="nullable-tag yes">YES</span>
                        ) : (
                          <span className="nullable-tag no">NO</span>
                        )}
                      </td>
                      <td className="col-default font-mono">
                        {col.defaultValue ? (
                          col.defaultValue
                        ) : (
                          <span className="text-muted">NULL</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Input Sample Data Table */}
          {activeTable.sampleData.rows.length > 0 && (
            <div className="leetcode-section-card mt-14">
              <div className="leetcode-section-header">
                <div className="leetcode-table-title">
                  <span>📊 Input Sample Data</span>
                  <span className="col-count-chip">{activeTable.sampleData.rows.length} preview rows</span>
                </div>
              </div>

              <div className="leetcode-grid-wrapper">
                <table className="leetcode-grid">
                  <thead>
                    <tr>
                      <th scope="col" className="row-num-col">#</th>
                      {activeTable.sampleData.columns.map((colName) => (
                        <th scope="col" key={colName}>{colName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTable.sampleData.rows.map((row, rIdx) => (
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
