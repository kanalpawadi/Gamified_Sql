// sql.js ephemeral execution engine
// Each call creates a fresh in-memory database — no state is shared between calls

export interface QueryResult {
  columns: string[];
  rows: (string | number | null)[][];
}

export interface ExecutionResult {
  success: boolean;
  results?: QueryResult;
  error?: string;
}

export interface GradingResult {
  passed: boolean;
  learnerResult?: QueryResult;
  expectedResult?: QueryResult;
  errorMessage?: string;
  diff?: DiffSummary;
}

export interface DiffSummary {
  rowCountMatch: boolean;
  columnCountMatch: boolean;
  columnNamesMatch: boolean;
  matchingRows: number;
  totalExpected: number;
  totalActual: number;
  missingRows: (string | number | null)[][];
  extraRows: (string | number | null)[][];
  columnMismatch?: string;
}

import initSqlJs from 'sql.js';

let sqlJsPromise: Promise<any> | null = null;

export async function getSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      try {
        const initFn = (window as any).initSqlJs || initSqlJs;
        return await initFn({
          locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
        });
      } catch (err) {
        console.warn('CDN locateFile failed, falling back to local public WASM:', err);
        const initFn = (window as any).initSqlJs || initSqlJs;
        return await initFn({
          locateFile: () => `/sql-wasm.wasm`
        });
      }
    })();
  }
  return sqlJsPromise;
}

function registerMySQLFunctions(db: any) {
  if (!db || typeof db.create_function !== 'function') return;

  // CONCAT(str1, str2, ...)
  db.create_function('concat', (...args: any[]) =>
    args.map((a) => (a === null || a === undefined ? '' : String(a))).join('')
  );

  // IFNULL(expr1, expr2)
  db.create_function('ifnull', (val: any, fallback: any) =>
    val !== null && val !== undefined ? val : fallback
  );

  // NOW() -> YYYY-MM-DD HH:MM:SS
  db.create_function('now', () =>
    new Date().toISOString().replace('T', ' ').substring(0, 19)
  );

  // CURDATE() -> YYYY-MM-DD
  db.create_function('curdate', () =>
    new Date().toISOString().split('T')[0]
  );

  // DATEDIFF(expr1, expr2) -> number of days (expr1 - expr2)
  db.create_function('datediff', (d1: string | null, d2: string | null) => {
    if (!d1 || !d2) return null;
    const t1 = new Date(d1).getTime();
    const t2 = new Date(d2).getTime();
    if (isNaN(t1) || isNaN(t2)) return null;
    return Math.round((t1 - t2) / 86400000);
  });

  // YEAR(date)
  db.create_function('year', (d: string | null) => {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date.getFullYear();
  });

  // MONTH(date)
  db.create_function('month', (d: string | null) => {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date.getMonth() + 1;
  });

  // DAY(date) / DAYOFMONTH(date)
  const getDay = (d: string | null) => {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date.getDate();
  };
  db.create_function('day', getDay);
  db.create_function('dayofmonth', getDay);
}

export async function runEphemeralQuery(
  schemaSQL: string,
  seedSQL: string,
  querySQL: string
): Promise<ExecutionResult> {
  let db: any = null;
  try {
    const SQL = await getSqlJs();
    db = new SQL.Database();
    
    // Register MySQL compatibility functions
    registerMySQLFunctions(db);

    // Apply schema
    db.run(schemaSQL);
    // Apply seed data
    db.run(seedSQL);
    // Run the user query
    const results = db.exec(querySQL);
    
    if (results.length === 0) {
      return {
        success: true,
        results: { columns: [], rows: [] }
      };
    }
    
    const first = results[0];
    return {
      success: true,
      results: {
        columns: first.columns,
        rows: first.values.map((row: any[]) => row.map((v: any) => v === undefined ? null : v))
      }
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown SQL error'
    };
  } finally {
    if (db) db.close();
  }
}

export async function gradeQuery(
  schemaSQL: string,
  seedSQL: string,
  learnerSQL: string,
  solutionSQL: string,
  requireOrderBy = false
): Promise<GradingResult> {
  // Run learner query
  const learnerExec = await runEphemeralQuery(schemaSQL, seedSQL, learnerSQL);
  if (!learnerExec.success || !learnerExec.results) {
    return {
      passed: false,
      errorMessage: learnerExec.error
    };
  }
  
  // Run solution query on fresh database
  const solutionExec = await runEphemeralQuery(schemaSQL, seedSQL, solutionSQL);
  if (!solutionExec.success || !solutionExec.results) {
    return {
      passed: false,
      errorMessage: 'Internal error: solution query failed'
    };
  }
  
  const learnerResult = learnerExec.results;
  const expectedResult = solutionExec.results;
  
  const diff = computeDiff(learnerResult, expectedResult, requireOrderBy);
  const passed = diff.rowCountMatch && diff.columnCountMatch && 
                 diff.columnNamesMatch && diff.missingRows.length === 0 && diff.extraRows.length === 0;
  
  return {
    passed,
    learnerResult,
    expectedResult,
    diff
  };
}

function computeDiff(
  actual: QueryResult,
  expected: QueryResult,
  requireOrderBy: boolean
): DiffSummary {
  const columnCountMatch = actual.columns.length === expected.columns.length;
  const columnNamesMatch = columnCountMatch && 
    actual.columns.every((col, i) => col.toLowerCase() === expected.columns[i].toLowerCase());
  
  let columnMismatch: string | undefined;
  if (!columnNamesMatch) {
    columnMismatch = `Expected columns [${expected.columns.join(', ')}], got [${actual.columns.join(', ')}]`;
  }
  
  const rowCountMatch = actual.rows.length === expected.rows.length;
  
  if (!columnNamesMatch) {
    return {
      rowCountMatch,
      columnCountMatch,
      columnNamesMatch,
      matchingRows: 0,
      totalExpected: expected.rows.length,
      totalActual: actual.rows.length,
      missingRows: expected.rows,
      extraRows: actual.rows,
      columnMismatch
    };
  }
  
  // Compare rows
  const normalize = (row: (string | number | null)[]) => 
    row.map(v => v === null ? 'NULL' : String(v));
  
  const stringify = (row: (string | number | null)[]) => normalize(row).join('\x00');
  
  if (requireOrderBy) {
    // Order-sensitive comparison
    let matchingRows = 0;
    const missingRows: (string | number | null)[][] = [];
    const extraRows: (string | number | null)[][] = [];
    
    const len = Math.max(actual.rows.length, expected.rows.length);
    for (let i = 0; i < len; i++) {
      const a = actual.rows[i];
      const e = expected.rows[i];
      if (a && e && stringify(a) === stringify(e)) {
        matchingRows++;
      } else {
        if (e) missingRows.push(e);
        if (a) extraRows.push(a);
      }
    }
    
    return {
      rowCountMatch,
      columnCountMatch,
      columnNamesMatch,
      matchingRows,
      totalExpected: expected.rows.length,
      totalActual: actual.rows.length,
      missingRows,
      extraRows
    };
  } else {
    // Order-insensitive comparison (multiset)
    const expectedMap = new Map<string, number>();
    for (const row of expected.rows) {
      const key = stringify(row);
      expectedMap.set(key, (expectedMap.get(key) || 0) + 1);
    }
    
    const actualMap = new Map<string, number>();
    for (const row of actual.rows) {
      const key = stringify(row);
      actualMap.set(key, (actualMap.get(key) || 0) + 1);
    }
    
    let matchingRows = 0;
    const missingRows: (string | number | null)[][] = [];
    const extraRows: (string | number | null)[][] = [];
    
    for (const row of expected.rows) {
      const key = stringify(row);
      const count = actualMap.get(key) || 0;
      if (count > 0) {
        matchingRows++;
        actualMap.set(key, count - 1);
      } else {
        missingRows.push(row);
      }
    }
    
    for (const row of actual.rows) {
      const key = stringify(row);
      const count = expectedMap.get(key) || 0;
      if (count > 0) {
        expectedMap.set(key, count - 1);
      } else {
        extraRows.push(row);
      }
    }
    
    return {
      rowCountMatch,
      columnCountMatch,
      columnNamesMatch,
      matchingRows,
      totalExpected: expected.rows.length,
      totalActual: actual.rows.length,
      missingRows,
      extraRows
    };
  }
}
