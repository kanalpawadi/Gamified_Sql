export interface MicroLesson {
  id: string;
  tag: string;
  title: string;
  body: string; // markdown
  readTimeSecs: number;
}

export const microLessons: MicroLesson[] = [
  {
    id: 'ml001',
    tag: 'null',
    title: 'NULL: The Missing Value Trap',
    body: `## NULL Is Not Zero or Empty

NULL means **"unknown"** — not zero, not empty string.

\`\`\`sql
-- ❌ This NEVER matches anything (even if value IS null)
WHERE salary = NULL

-- ✅ Always use IS NULL or IS NOT NULL
WHERE salary IS NULL
WHERE salary IS NOT NULL
\`\`\`

**Key rules:**
- \`NULL = NULL\` → **NULL** (not TRUE!)
- Any arithmetic with NULL → NULL
- \`COUNT(*)\` counts NULLs; \`COUNT(column)\` skips them

**Fix it with COALESCE:**
\`\`\`sql
SELECT COALESCE(email, 'No email') FROM employees;
\`\`\``,
    readTimeSecs: 45
  },
  {
    id: 'ml002',
    tag: 'group_by',
    title: 'GROUP BY: Why It Exists',
    body: `## GROUP BY Collapses Rows Into Groups

Without GROUP BY, aggregate functions compute across **all rows** at once.

With GROUP BY, they compute **per group**:

\`\`\`sql
-- Count per department
SELECT department, COUNT(*)
FROM employees
GROUP BY department;   -- ← REQUIRED when mixing column + aggregate
\`\`\`

**The Golden Rule:** Every column in SELECT that is NOT an aggregate must appear in GROUP BY.

\`\`\`sql
-- ❌ ERROR: name not in GROUP BY
SELECT name, department, COUNT(*)
FROM employees
GROUP BY department;

-- ✅ Correct
SELECT department, COUNT(*)
FROM employees
GROUP BY department;
\`\`\``,
    readTimeSecs: 50
  },
  {
    id: 'ml003',
    tag: 'having',
    title: 'HAVING vs WHERE: Filter Order Matters',
    body: `## WHERE filters rows; HAVING filters groups

\`\`\`sql
-- ❌ Cannot use aggregate in WHERE
SELECT department, COUNT(*)
FROM employees
WHERE COUNT(*) > 3        -- syntax error!
GROUP BY department;

-- ✅ Use HAVING to filter after grouping
SELECT department, COUNT(*) AS emp_count
FROM employees
GROUP BY department
HAVING COUNT(*) > 3;
\`\`\`

**Order of execution:**
1. FROM
2. WHERE ← filters individual rows
3. GROUP BY
4. HAVING ← filters groups
5. SELECT
6. ORDER BY`,
    readTimeSecs: 45
  },
  {
    id: 'ml004',
    tag: 'join',
    title: 'JOIN Types: Which Rows Are Kept?',
    body: `## Inner vs Left Join

**INNER JOIN** — only rows that match in BOTH tables:
\`\`\`sql
SELECT e.name, p.name
FROM employees e
INNER JOIN employee_projects ep ON e.id = ep.employee_id;
-- Employees with no projects are excluded!
\`\`\`

**LEFT JOIN** — all rows from the LEFT table, NULLs on right if no match:
\`\`\`sql
SELECT e.name, p.name
FROM employees e
LEFT JOIN employee_projects ep ON e.id = ep.employee_id;
-- All employees included; unassigned ones have NULL project
\`\`\`

**Anti-join pattern** (find non-matches):
\`\`\`sql
SELECT e.name
FROM employees e
LEFT JOIN employee_projects ep ON e.id = ep.employee_id
WHERE ep.employee_id IS NULL;  -- employees with NO projects
\`\`\``,
    readTimeSecs: 55
  },
  {
    id: 'ml005',
    tag: 'window_functions',
    title: 'Window Functions: Rank Without Collapsing',
    body: `## Window Functions Compute Without Grouping Rows

Unlike GROUP BY, window functions keep ALL rows while computing across a "window":

\`\`\`sql
-- RANK: ties get same rank, next rank skips (1,2,2,4)
SELECT name, salary,
  RANK() OVER (ORDER BY salary DESC) AS rnk
FROM employees;

-- DENSE_RANK: ties same rank, no skips (1,2,2,3)
-- ROW_NUMBER: always unique (1,2,3,4...)

-- PARTITION BY = rank within groups
SELECT name, department, salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank
FROM employees;
\`\`\`

**Key window functions:**
| Function | Purpose |
|----------|---------|
| RANK() | Rank with gaps |
| DENSE_RANK() | Rank without gaps |
| ROW_NUMBER() | Unique sequential number |
| LAG(col) | Previous row value |
| LEAD(col) | Next row value |
| SUM() OVER | Running total |`,
    readTimeSecs: 60
  },
  {
    id: 'ml006',
    tag: 'cte',
    title: 'CTEs: Clean Multi-Step Queries',
    body: `## Common Table Expressions (CTEs)

CTEs let you name a subquery and reuse it — making complex queries readable:

\`\`\`sql
-- Define the CTE
WITH high_earners AS (
  SELECT name, salary, department
  FROM employees
  WHERE salary > 90000
)
-- Use it like a table
SELECT department, COUNT(*) AS high_count
FROM high_earners
GROUP BY department;
\`\`\`

**Multiple CTEs:**
\`\`\`sql
WITH
  dept_avg AS (SELECT department, AVG(salary) AS avg_sal FROM employees GROUP BY department),
  top_depts AS (SELECT department FROM dept_avg WHERE avg_sal > 80000)
SELECT * FROM top_depts;
\`\`\`

**When to use CTEs:**
- Break a complex query into readable steps
- Reference the same subquery multiple times
- Before window functions (filter on window results)`,
    readTimeSecs: 55
  },
  {
    id: 'ml007',
    tag: 'subquery',
    title: 'Subqueries vs JOINs',
    body: `## When to Use Each

**Scalar subquery** (returns one value):
\`\`\`sql
-- Find employees earning more than the average
SELECT * FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);
\`\`\`

**Correlated subquery** (references outer query):
\`\`\`sql
-- Employees earning more than their department's average
SELECT * FROM employees e
WHERE salary > (
  SELECT AVG(salary) FROM employees
  WHERE department = e.department  -- references outer e
);
\`\`\`

**Tip:** If you find yourself writing a subquery in SELECT for each row, consider whether a JOIN + GROUP BY would be cleaner:
\`\`\`sql
-- Equivalent with JOIN:
SELECT e.name, d.avg_salary
FROM employees e
JOIN (SELECT department, AVG(salary) AS avg_salary FROM employees GROUP BY department) d
  ON e.department = d.department;
\`\`\``,
    readTimeSecs: 55
  },
  {
    id: 'ml008',
    tag: 'exists',
    title: 'EXISTS: Efficient Existence Checks',
    body: `## EXISTS vs IN

Both check membership, but EXISTS short-circuits as soon as one match is found:

\`\`\`sql
-- IN: evaluates the full subquery result set
SELECT * FROM employees
WHERE department IN (SELECT name FROM departments WHERE budget > 1000000);

-- EXISTS: stops at the first match (often faster)
SELECT * FROM employees e
WHERE EXISTS (
  SELECT 1 FROM departments d
  WHERE d.name = e.department AND d.budget > 1000000
);
\`\`\`

**NOT EXISTS** — the anti-join:
\`\`\`sql
-- Employees with NO project assignments
SELECT * FROM employees e
WHERE NOT EXISTS (
  SELECT 1 FROM employee_projects ep
  WHERE ep.employee_id = e.id
);
\`\`\`

Use \`SELECT 1\` inside EXISTS — the actual columns don't matter, only whether rows exist.`,
    readTimeSecs: 50
  }
];

export function getMicroLessonForTag(tag: string): MicroLesson | undefined {
  return microLessons.find(l => l.tag === tag);
}
