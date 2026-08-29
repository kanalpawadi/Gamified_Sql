import type { GradingResult, DiffSummary, QueryResult } from './sqlEngine';
import type { Question } from '../data/index';

export type ErrorClass =
  | 'syntax_error'
  | 'missing_where'
  | 'wrong_join_type'
  | 'missing_group_by'
  | 'wrong_aggregate'
  | 'off_by_one_limit'
  | 'null_handling'
  | 'wrong_column'
  | 'order_mismatch'
  | 'extra_rows'
  | 'missing_rows'
  | 'wrong_result'
  | 'custom_pattern'
  | 'idiomatic_suggestion';

export interface Classification {
  errorClass: ErrorClass;
  message: string;
  suggestion?: string;
}

export interface PostMortem {
  suggestion: string;
}

export function classifyError(
  learnerSQL: string,
  question: Question,
  gradingResult: GradingResult
): Classification {
  const sql = learnerSQL.trim().toUpperCase();
  const { diff, errorMessage } = gradingResult;
  
  // Syntax error from engine
  if (errorMessage) {
    const cleanErr = errorMessage.replace(/near ".*": /, '').replace(/\bSQLITE_ERROR\b/i, '').trim();
    return {
      errorClass: 'syntax_error',
      message: `SQL syntax error: ${cleanErr}`,
      suggestion: 'Check your SQL for typos, missing commas, unmatched parentheses, or unquoted strings.'
    };
  }
  
  if (!diff) return { errorClass: 'wrong_result', message: 'Your query returned incorrect results.' };
  
  // Check custom mistake patterns first
  for (const mistake of question.commonMistakes) {
    try {
      const regex = new RegExp(mistake.pattern, 'i');
      if (regex.test(learnerSQL)) {
        return {
          errorClass: 'custom_pattern',
          message: mistake.feedback,
          suggestion: 'Review the question schema and expected output carefully.'
        };
      }
    } catch {
      // Invalid regex in pattern, skip
    }
  }
  
  // Column mismatch
  if (!diff.columnNamesMatch) {
    return {
      errorClass: 'wrong_column',
      message: diff.columnMismatch || 'Your query returned different columns than expected.',
      suggestion: 'Check that you\'re selecting the correct columns and using the right aliases.'
    };
  }
  
  // NULL handling: learner used = NULL or != NULL
  if (/=\s*NULL|!=\s*NULL|<>\s*NULL/i.test(learnerSQL)) {
    return {
      errorClass: 'null_handling',
      message: 'NULL values cannot be compared with = or !=.',
      suggestion: 'Use IS NULL or IS NOT NULL to check for missing values.'
    };
  }
  
  // Missing WHERE: learner returned all rows when expected fewer
  if (diff.totalActual > diff.totalExpected && !sql.includes('WHERE')) {
    const hasGroupBy = sql.includes('GROUP BY');
    if (!hasGroupBy) {
      return {
        errorClass: 'missing_where',
        message: `Your query returned ${diff.totalActual} rows but only ${diff.totalExpected} were expected. You may be missing a WHERE clause to filter rows.`,
        suggestion: 'Add a WHERE clause to filter the results to the correct subset.'
      };
    }
  }
  
  // Missing GROUP BY when query has aggregate
  const hasAggregate = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(learnerSQL);
  const hasGroupBy = /\bGROUP\s+BY\b/i.test(learnerSQL);
  if (hasAggregate && !hasGroupBy && diff.totalActual !== diff.totalExpected) {
    return {
      errorClass: 'missing_group_by',
      message: 'Your query uses an aggregate function but is missing a GROUP BY clause.',
      suggestion: 'Add GROUP BY with the non-aggregate columns from your SELECT clause.'
    };
  }
  
  // Wrong JOIN type: too many rows (Cartesian product / INNER instead of LEFT)
  if (diff.totalActual > diff.totalExpected * 1.5 && /JOIN/i.test(learnerSQL)) {
    return {
      errorClass: 'wrong_join_type',
      message: `Your query returned ${diff.totalActual} rows but only ${diff.totalExpected} were expected — this looks like a Cartesian product or wrong JOIN type.`,
      suggestion: 'Double-check your JOIN conditions. An INNER JOIN without an ON clause creates a Cartesian product.'
    };
  }
  
  // Missing rows due to wrong join (INNER instead of LEFT)
  if (diff.totalActual < diff.totalExpected && /JOIN/i.test(learnerSQL)) {
    const lSql = learnerSQL.toUpperCase();
    if (!lSql.includes('LEFT') && !lSql.includes('OUTER')) {
      return {
        errorClass: 'wrong_join_type',
        message: `Your query returned fewer rows (${diff.totalActual}) than expected (${diff.totalExpected}). Some rows may be excluded by using INNER JOIN instead of LEFT JOIN.`,
        suggestion: 'Consider using LEFT JOIN to include all rows from the main table even when there\'s no match.'
      };
    }
  }
  
  // Off-by-one LIMIT
  if (/\bLIMIT\s+\d+/i.test(learnerSQL) && diff.totalActual !== diff.totalExpected) {
    const match = learnerSQL.match(/LIMIT\s+(\d+)/i);
    if (match) {
      const limit = parseInt(match[1]);
      if (Math.abs(limit - diff.totalExpected) <= 2) {
        return {
          errorClass: 'off_by_one_limit',
          message: `Your LIMIT returned ${diff.totalActual} rows but ${diff.totalExpected} were expected.`,
          suggestion: `Check if your LIMIT value (${limit}) is correct. The expected result has ${diff.totalExpected} rows.`
        };
      }
    }
  }
  
  // Order mismatch (if result has same rows but in wrong order)
  if (diff.totalActual === diff.totalExpected && diff.missingRows.length > 0) {
    return {
      errorClass: 'order_mismatch',
      message: 'Your rows are correct but may be in the wrong order, or some values differ.',
      suggestion: 'Check your ORDER BY clause, or verify column values match exactly.'
    };
  }
  
  // Extra rows
  if (diff.extraRows.length > 0 && diff.missingRows.length === 0) {
    return {
      errorClass: 'extra_rows',
      message: `Your query returned ${diff.extraRows.length} extra row(s) that weren't expected.`,
      suggestion: 'You may need a more specific WHERE condition or a DISTINCT clause.'
    };
  }
  
  // Missing rows
  if (diff.missingRows.length > 0 && diff.extraRows.length === 0) {
    return {
      errorClass: 'missing_rows',
      message: `Your query is missing ${diff.missingRows.length} row(s) from the expected output.`,
      suggestion: 'Check your WHERE clause or JOIN conditions — some matching rows may be excluded.'
    };
  }
  
  return {
    errorClass: 'wrong_result',
    message: `Your query returned different results than expected (${diff.totalActual} rows vs ${diff.totalExpected} expected).`,
    suggestion: 'Compare your result carefully against the expected output shown in the Problem Panel.'
  };
}

export function analyzePostMortem(
  learnerSQL: string,
  solutionSQL: string
): PostMortem | null {
  const lSql = learnerSQL.trim().toUpperCase();
  const sSql = solutionSQL.trim().toUpperCase();
  
  // Subquery in SELECT where JOIN would do
  const hasSelectSubquery = /SELECT\s+.*\(\s*SELECT/i.test(learnerSQL);
  const solutionUsesJoin = /\bJOIN\b/i.test(solutionSQL);
  if (hasSelectSubquery && solutionUsesJoin) {
    return {
      suggestion: '💡 Idiomatic tip: Your correlated subquery in SELECT works, but a JOIN is typically more readable and performant here.'
    };
  }
  
  // Using SELECT * when specific columns could be selected
  if (lSql.includes('SELECT *') && !sSql.includes('SELECT *')) {
    return {
      suggestion: '💡 Idiomatic tip: Selecting specific columns (instead of *) makes queries more explicit and resistant to schema changes.'
    };
  }
  
  // Nested subquery where CTE would be cleaner
  if ((learnerSQL.match(/SELECT/gi) || []).length >= 3 && !/\bWITH\b/i.test(learnerSQL) && /\bWITH\b/i.test(solutionSQL)) {
    return {
      suggestion: '💡 Idiomatic tip: A CTE (WITH clause) could make this deeply nested query much easier to read.'
    };
  }
  
  // OR where IN would be cleaner
  const orCount = (learnerSQL.match(/\bOR\b/gi) || []).length;
  if (orCount >= 2 && /\bIN\b/i.test(solutionSQL)) {
    return {
      suggestion: '💡 Idiomatic tip: Multiple OR conditions on the same column can be simplified with IN (\'val1\', \'val2\', ...).'
    };
  }
  
  return null;
}

export function getMistakePatternLabel(errorClass: ErrorClass): string {
  const labels: Record<ErrorClass, string> = {
    syntax_error: 'Syntax Error',
    missing_where: 'Missing WHERE',
    wrong_join_type: 'Wrong JOIN Type',
    missing_group_by: 'Missing GROUP BY',
    wrong_aggregate: 'Wrong Aggregate',
    off_by_one_limit: 'Off-by-one LIMIT',
    null_handling: 'NULL Handling',
    wrong_column: 'Wrong Column',
    order_mismatch: 'Order/Value Mismatch',
    extra_rows: 'Too Many Rows',
    missing_rows: 'Missing Rows',
    wrong_result: 'Incorrect Result',
    custom_pattern: 'Common Mistake',
    idiomatic_suggestion: 'Idiomatic Improvement'
  };
  return labels[errorClass] || 'Error';
}
