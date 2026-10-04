import { useState, useEffect } from 'react';
import { LeetCodeSchemaView } from './LeetCodeSchemaView';
import { LeetCodeResultsView } from './LeetCodeResultsView';
import type { QueryResult, GradingResult } from '../engine/sqlEngine';

export interface QueryLogEntry {
  id: string;
  sql: string;
  timestamp: string;
  passed: boolean;
}

interface LeetCodeConsoleProps {
  schemaSQL: string;
  seedSQL: string;
  runResult?: QueryResult | null;
  gradingResult?: GradingResult | null;
  isRunning?: boolean;
  onExecute?: () => void;
  queryLog?: QueryLogEntry[];
  onReloadLog?: (sql: string) => void;
  defaultTab?: 'schema' | 'output' | 'log';
}

export function LeetCodeConsole({
  schemaSQL,
  seedSQL,
  runResult,
  gradingResult,
  isRunning,
  onExecute,
  queryLog = [],
  onReloadLog,
  defaultTab = 'schema',
}: LeetCodeConsoleProps) {
  const [activeTab, setActiveTab] = useState<'schema' | 'output' | 'log'>(defaultTab);

  // Automatically switch to 'output' tab when execution starts or results land
  useEffect(() => {
    if (isRunning || runResult || gradingResult) {
      setActiveTab('output');
    }
  }, [isRunning, runResult, gradingResult]);

  return (
    <div className="leetcode-console-card">
      {/* ── Console Top Navigation Tabs ──────────────────────────────────── */}
      <div className="leetcode-console-tabs" role="tablist" aria-label="Editor Console">
        <button
          role="tab"
          aria-selected={activeTab === 'schema'}
          className={`console-tab-btn ${activeTab === 'schema' ? 'active' : ''}`}
          onClick={() => setActiveTab('schema')}
        >
          <span className="tab-icon">🗄️</span>
          <span>Table Schema</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'output'}
          className={`console-tab-btn ${activeTab === 'output' ? 'active' : ''}`}
          onClick={() => setActiveTab('output')}
        >
          <span className="tab-icon">📊</span>
          <span>Test Result / Output</span>
          {gradingResult ? (
            <span className={`tab-indicator-badge ${gradingResult.passed ? 'pass' : 'fail'}`}>
              {gradingResult.passed ? '✓ Passed' : '✗ Failed'}
            </span>
          ) : runResult ? (
            <span className="tab-indicator-badge info">• Ready</span>
          ) : null}
        </button>

        {queryLog.length > 0 && (
          <button
            role="tab"
            aria-selected={activeTab === 'log'}
            className={`console-tab-btn ${activeTab === 'log' ? 'active' : ''}`}
            onClick={() => setActiveTab('log')}
          >
            <span className="tab-icon">📜</span>
            <span>Query Log</span>
            <span className="tab-count-badge">{queryLog.length}</span>
          </button>
        )}
      </div>

      {/* ── Console Body ───────────────────────────────────────────────── */}
      <div className="leetcode-console-body">
        {activeTab === 'schema' && (
          <LeetCodeSchemaView schemaSQL={schemaSQL} seedSQL={seedSQL} />
        )}

        {activeTab === 'output' && (
          <LeetCodeResultsView
            runResult={runResult}
            gradingResult={gradingResult}
            isRunning={isRunning}
            onExecute={onExecute}
          />
        )}

        {activeTab === 'log' && (
          <div className="leetcode-query-log">
            {queryLog.map((entry) => (
              <div
                key={entry.id}
                className="query-log-row"
                onClick={() => onReloadLog?.(entry.sql)}
                title="Click to load into editor"
              >
                <div className="log-status font-mono">
                  {entry.passed ? <span className="text-pass">✓</span> : <span className="text-fail">✗</span>}
                </div>
                <div className="log-code font-mono">{entry.sql}</div>
                <div className="log-time">{entry.timestamp}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
