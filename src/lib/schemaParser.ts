import { getSqlJs } from '../engine/sqlEngine';

export interface ParsedColumn {
  name: string;
  type: string;
  isPk: boolean;
  nullable: boolean;
  defaultValue: string | null;
}

export interface ParsedTable {
  tableName: string;
  columns: ParsedColumn[];
  sampleData: {
    columns: string[];
    rows: (string | number | null)[][];
  };
}

/**
 * Synchronous regex-based schema parser for instant initial render.
 */
export function parseSchemaSync(schemaSQL: string, seedSQL: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  if (!schemaSQL) return tables;

  // Split CREATE TABLE statements
  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]+?)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = createRegex.exec(schemaSQL)) !== null) {
    const tableName = match[1];
    const body = match[2];

    const columns: ParsedColumn[] = [];
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      const cleanLine = line.replace(/,$/, '').trim();
      if (
        !cleanLine ||
        cleanLine.toUpperCase().startsWith('PRIMARY KEY') ||
        cleanLine.toUpperCase().startsWith('FOREIGN KEY') ||
        cleanLine.toUpperCase().startsWith('CONSTRAINT')
      ) {
        continue;
      }

      const colMatch = cleanLine.match(/^["`]?(\w+)["`]?\s+([A-Za-z0-9_()]+)(.*)$/i);
      if (colMatch) {
        const name = colMatch[1];
        const type = colMatch[2].toUpperCase();
        const rest = colMatch[3].toUpperCase();

        const isPk = rest.includes('PRIMARY KEY');
        const nullable = !rest.includes('NOT NULL') && !isPk;

        let defaultValue: string | null = null;
        const defaultMatch = rest.match(/DEFAULT\s+([^,\s]+)/i);
        if (defaultMatch) {
          defaultValue = defaultMatch[1].replace(/['"]/g, '');
        }

        columns.push({
          name,
          type,
          isPk,
          nullable,
          defaultValue,
        });
      }
    }

    // Attempt to parse sample rows from seedSQL for this table
    const sampleRows: (string | number | null)[][] = [];
    if (seedSQL) {
      const insertRegex = new RegExp(
        `INSERT\\s+INTO\\s+["\`]?${tableName}["\`]?(?:\\s*\\([^)]+\\))?\\s+VALUES\\s*([\\s\\S]+?);`,
        'gi'
      );
      const insertMatch = insertRegex.exec(seedSQL);
      if (insertMatch && insertMatch[1]) {
        const valuesStr = insertMatch[1].trim();
        // Match tuple parenthesis like (1, 'Alice', 95000, ...)
        const tupleRegex = /\(([^)]+)\)/g;
        let tupleMatch: RegExpExecArray | null;
        let count = 0;
        while ((tupleMatch = tupleRegex.exec(valuesStr)) !== null && count < 10) {
          const rawRow = tupleMatch[1];
          // Split by comma outside quotes
          const rawCells = rawRow.split(/,(?=(?:[^']*'[^']*')*[^']*$)/);
          const parsedRow = rawCells.map((cell) => {
            const trimmed = cell.trim();
            if (trimmed.toUpperCase() === 'NULL') return null;
            if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
              return trimmed.slice(1, -1);
            }
            const num = Number(trimmed);
            return isNaN(num) ? trimmed : num;
          });
          sampleRows.push(parsedRow);
          count++;
        }
      }
    }

    tables.push({
      tableName,
      columns,
      sampleData: {
        columns: columns.map((c) => c.name),
        rows: sampleRows,
      },
    });
  }

  return tables;
}

/**
 * Asynchronous sql.js database parser for exact schema & sample query output.
 */
export async function parseDatabaseSchema(schemaSQL: string, seedSQL: string): Promise<ParsedTable[]> {
  // First get sync fallback
  const fallback = parseSchemaSync(schemaSQL, seedSQL);

  try {
    const SQL = await getSqlJs();
    const db = new SQL.Database();

    if (schemaSQL) db.run(schemaSQL);
    if (seedSQL) db.run(seedSQL);

    const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
    if (!tablesResult || tablesResult.length === 0) {
      db.close();
      return fallback;
    }

    const tableNames = tablesResult[0].values.map((row: any[]) => String(row[0]));
    const tables: ParsedTable[] = [];

    for (const tableName of tableNames) {
      const infoResult = db.exec(`PRAGMA table_info("${tableName}");`);
      const columns: ParsedColumn[] = [];

      if (infoResult && infoResult.length > 0) {
        for (const row of infoResult[0].values) {
          columns.push({
            name: String(row[1]),
            type: String(row[2] || 'TEXT').toUpperCase(),
            nullable: Number(row[3]) === 0,
            defaultValue: row[4] !== null && row[4] !== undefined ? String(row[4]) : null,
            isPk: Number(row[5]) > 0,
          });
        }
      }

      let sampleRows: (string | number | null)[][] = [];
      let sampleCols = columns.map((c) => c.name);

      try {
        const dataResult = db.exec(`SELECT * FROM "${tableName}" LIMIT 10;`);
        if (dataResult && dataResult.length > 0) {
          sampleCols = dataResult[0].columns;
          sampleRows = dataResult[0].values.map((r: any[]) =>
            r.map((v) => (v === undefined ? null : v))
          );
        }
      } catch {
        // use sync fallback rows if query fails
        const fbTable = fallback.find((t) => t.tableName === tableName);
        if (fbTable) sampleRows = fbTable.sampleData.rows;
      }

      tables.push({
        tableName,
        columns,
        sampleData: {
          columns: sampleCols,
          rows: sampleRows,
        },
      });
    }

    db.close();
    return tables;
  } catch (err) {
    console.warn('Asynchronous schema parsing failed, using fallback:', err);
    return fallback;
  }
}
