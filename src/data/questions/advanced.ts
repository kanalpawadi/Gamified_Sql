import { domainSchemas } from '../domains';
import type { Question } from './basic';

const { company_hr, retail, campus } = domainSchemas;

export const advancedQuestions: Question[] = [
  // ─── CTEs ─────────────────────────────────────────────────────────────────
  {
    id: 'a001',
    category: 'advanced',
    domain: 'company_hr',
    title: 'CTE: Department Salary Stats',
    difficulty: 'hard',
    points: 30,
    tags: ['cte', 'group_by', 'aggregates'],
    prompt: 'Using a CTE called dept_stats, calculate the average salary per department. Then select departments where avg_salary > 80000, showing department and avg_salary.',
    expectedOutputDescription: 'Departments with avg salary > 80000 from CTE.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `WITH dept_stats AS (
  SELECT department, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department
)
SELECT department, ROUND(avg_salary, 2) AS avg_salary
FROM dept_stats
WHERE avg_salary > 80000
ORDER BY avg_salary DESC;`,
    hints: [
      { text: 'A CTE starts with: WITH cte_name AS (SELECT ...) followed by your main query.', xpCost: 3, confidenceLevel: 'low' },
      { text: 'WITH dept_stats AS (...) SELECT department, avg_salary FROM dept_stats WHERE avg_salary > 80000', xpCost: 4, confidenceLevel: 'medium' }
    ],
    commonMistakes: []
  },
  {
    id: 'a002',
    category: 'advanced',
    domain: 'retail',
    title: 'CTE: Customer Order Summary',
    difficulty: 'hard',
    points: 28,
    tags: ['cte', 'join', 'group_by'],
    prompt: 'Create a CTE called customer_totals that sums total_amount per customer. Then join to customers to show customer name and total_spent for customers who spent more than $200.',
    expectedOutputDescription: 'Customers spending > $200 total.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `WITH customer_totals AS (
  SELECT customer_id, SUM(total_amount) AS total_spent
  FROM orders
  GROUP BY customer_id
)
SELECT c.name AS customer_name, ct.total_spent
FROM customer_totals ct
INNER JOIN customers c ON ct.customer_id = c.id
WHERE ct.total_spent > 200
ORDER BY ct.total_spent DESC;`,
    hints: [
      { text: 'Build the aggregation CTE first, then join it to the customers table.', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a003',
    category: 'advanced',
    domain: 'campus',
    title: 'CTE: Top GPA Students Per Major',
    difficulty: 'hard',
    points: 32,
    tags: ['cte', 'window_functions', 'rank'],
    prompt: 'Using a CTE with ROW_NUMBER() PARTITION BY major ORDER BY gpa DESC, find the top-ranked student in each major. Show major, student name, and gpa.',
    expectedOutputDescription: 'One top student per major.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `WITH ranked_students AS (
  SELECT name, major, gpa,
    ROW_NUMBER() OVER (PARTITION BY major ORDER BY gpa DESC) AS rn
  FROM students
)
SELECT major, name, gpa
FROM ranked_students
WHERE rn = 1
ORDER BY major;`,
    hints: [
      { text: 'Use ROW_NUMBER() OVER (PARTITION BY major ORDER BY gpa DESC) to rank within each major.', xpCost: 4, confidenceLevel: 'low' },
      { text: 'Wrap in a CTE then filter WHERE rn = 1.', xpCost: 5, confidenceLevel: 'medium' }
    ],
    commonMistakes: []
  },
  // ─── WINDOW FUNCTIONS ─────────────────────────────────────────────────────
  {
    id: 'a004',
    category: 'advanced',
    domain: 'company_hr',
    title: 'Window: Salary Rank',
    difficulty: 'hard',
    points: 28,
    tags: ['window_functions', 'rank'],
    prompt: 'Rank all employees by salary from highest to lowest using RANK(). Show name, salary, and salary_rank.',
    expectedOutputDescription: '15 rows: name, salary, salary_rank (ties share rank).',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT name, salary,
  RANK() OVER (ORDER BY salary DESC) AS salary_rank
FROM employees
ORDER BY salary_rank;`,
    hints: [
      { text: 'Use RANK() OVER (ORDER BY salary DESC) as a window function.', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a005',
    category: 'advanced',
    domain: 'company_hr',
    title: 'Window: Rank Within Department',
    difficulty: 'hard',
    points: 30,
    tags: ['window_functions', 'rank', 'partition'],
    prompt: 'Rank employees within each department by salary (highest = rank 1). Show name, department, salary, and dept_rank.',
    expectedOutputDescription: '15 rows: name, department, salary, dept_rank.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT name, department, salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank
FROM employees
ORDER BY department, dept_rank;`,
    hints: [
      { text: 'Add PARTITION BY department to rank within each group.', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a006',
    category: 'advanced',
    domain: 'retail',
    title: 'Window: ROW_NUMBER for Order Sequence',
    difficulty: 'hard',
    points: 28,
    tags: ['window_functions', 'row_number'],
    prompt: 'Assign a sequential row number to each order per customer based on order_date (earliest = 1). Show customer_id, order_date, total_amount, and order_seq.',
    expectedOutputDescription: '15 rows with order sequence per customer.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT customer_id, order_date, total_amount,
  ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date ASC) AS order_seq
FROM orders
ORDER BY customer_id, order_seq;`,
    hints: [
      { text: 'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) assigns sequential numbers within each customer.', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a007',
    category: 'advanced',
    domain: 'company_hr',
    title: 'Window: Dense Rank Salary',
    difficulty: 'hard',
    points: 28,
    tags: ['window_functions', 'dense_rank'],
    prompt: 'Assign a DENSE_RANK to employees by salary descending. Show name, salary, and dense_salary_rank. Unlike RANK(), DENSE_RANK() has no gaps after ties.',
    expectedOutputDescription: '15 rows with dense rank — no gaps after duplicate salaries.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT name, salary,
  DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_salary_rank
FROM employees
ORDER BY dense_salary_rank;`,
    hints: [
      { text: 'DENSE_RANK() is like RANK() but does not skip numbers after ties.', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a008',
    category: 'advanced',
    domain: 'retail',
    title: 'Window: Running Total of Orders',
    difficulty: 'hard',
    points: 32,
    tags: ['window_functions', 'sum', 'running_total'],
    prompt: 'Show each order\'s id, order_date, total_amount, and a running total of total_amount ordered by order_date. Alias as running_total.',
    expectedOutputDescription: '15 rows with cumulative running total.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT id, order_date, total_amount,
  SUM(total_amount) OVER (ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM orders
ORDER BY order_date;`,
    hints: [
      { text: 'Use SUM() OVER (ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) for a running total.', xpCost: 4, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a009',
    category: 'advanced',
    domain: 'company_hr',
    title: 'Window: LAG — Salary Comparison',
    difficulty: 'hard',
    points: 33,
    tags: ['window_functions', 'lag'],
    prompt: 'For each employee ordered by hire_date, show their name, hire_date, salary, and the salary of the previously hired employee (NULL for the first). Alias as prev_salary.',
    expectedOutputDescription: '15 rows: name, hire_date, salary, prev_salary.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT name, hire_date, salary,
  LAG(salary) OVER (ORDER BY hire_date) AS prev_salary
FROM employees
ORDER BY hire_date;`,
    hints: [
      { text: 'LAG(column) OVER (ORDER BY ...) returns the value from the previous row.', xpCost: 4, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a010',
    category: 'advanced',
    domain: 'retail',
    title: 'Window: LEAD — Next Order Date',
    difficulty: 'hard',
    points: 33,
    tags: ['window_functions', 'lead'],
    prompt: 'For each customer, show their order_date and the next order date from the same customer (NULL if no next). Show customer_id, order_date, and next_order_date.',
    expectedOutputDescription: 'Orders with next order date per customer.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT customer_id, order_date,
  LEAD(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS next_order_date
FROM orders
ORDER BY customer_id, order_date;`,
    hints: [
      { text: 'LEAD(column) OVER (PARTITION BY ... ORDER BY ...) returns the next row\'s value within the partition.', xpCost: 4, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── CORRELATED SUBQUERIES ────────────────────────────────────────────────
  {
    id: 'a011',
    category: 'advanced',
    domain: 'company_hr',
    title: 'Correlated: Above-Dept Average',
    difficulty: 'hard',
    points: 35,
    tags: ['subquery', 'correlated'],
    prompt: 'Find employees who earn more than the average salary of their own department.',
    expectedOutputDescription: 'Employees above their departmental average.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT e.*
FROM employees e
WHERE e.salary > (
  SELECT AVG(e2.salary)
  FROM employees e2
  WHERE e2.department = e.department
);`,
    hints: [
      { text: 'The inner subquery references e.department from the outer query — this makes it correlated.', xpCost: 4, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a012',
    category: 'advanced',
    domain: 'retail',
    title: 'Correlated: Products Ordered More Than Average',
    difficulty: 'hard',
    points: 33,
    tags: ['subquery', 'correlated'],
    prompt: 'Find products whose total quantity ordered (across all order_items) is above the average total quantity ordered per product.',
    expectedOutputDescription: 'Products with above-average total quantity sold.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT p.name, SUM(oi.quantity) AS total_qty
FROM products p
INNER JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
HAVING SUM(oi.quantity) > (
  SELECT AVG(total_q)
  FROM (
    SELECT SUM(quantity) AS total_q
    FROM order_items
    GROUP BY product_id
  )
)
ORDER BY total_qty DESC;`,
    hints: [
      { text: 'Calculate total qty per product in a subquery, then compare with the overall average.', xpCost: 4, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── EXISTS ───────────────────────────────────────────────────────────────
  {
    id: 'a013',
    category: 'advanced',
    domain: 'company_hr',
    title: 'EXISTS: Employees on Any Project',
    difficulty: 'hard',
    points: 28,
    tags: ['exists'],
    prompt: 'Find all employees who are assigned to at least one project, using EXISTS.',
    expectedOutputDescription: 'Employees with at least one project assignment.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT e.*
FROM employees e
WHERE EXISTS (
  SELECT 1 FROM employee_projects ep
  WHERE ep.employee_id = e.id
);`,
    hints: [
      { text: 'EXISTS returns TRUE if the subquery returns at least one row.', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a014',
    category: 'advanced',
    domain: 'retail',
    title: 'NOT EXISTS: Unordered Products',
    difficulty: 'hard',
    points: 28,
    tags: ['exists', 'not_exists'],
    prompt: 'Find all products that have never been included in any order, using NOT EXISTS.',
    expectedOutputDescription: 'Products with no order history.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT p.*
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM order_items oi
  WHERE oi.product_id = p.id
);`,
    hints: [
      { text: 'NOT EXISTS returns TRUE when no matching rows exist in the subquery.', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a015',
    category: 'advanced',
    domain: 'campus',
    title: 'EXISTS: Students in CS Courses',
    difficulty: 'hard',
    points: 28,
    tags: ['exists'],
    prompt: 'Find students who are enrolled in at least one Computer Science course, using EXISTS.',
    expectedOutputDescription: 'Students with at least one CS enrollment.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `SELECT s.*
FROM students s
WHERE EXISTS (
  SELECT 1
  FROM enrollments e
  INNER JOIN courses c ON e.course_id = c.id
  WHERE e.student_id = s.id AND c.department = 'Computer Science'
);`,
    hints: [
      { text: 'The EXISTS subquery can itself include a JOIN.', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── MULTI-JOIN + AGGREGATION + HAVING ────────────────────────────────────
  {
    id: 'a016',
    category: 'advanced',
    domain: 'retail',
    title: 'Advanced: Top Products by Revenue',
    difficulty: 'hard',
    points: 35,
    tags: ['join', 'group_by', 'having', 'aggregates'],
    prompt: 'Find products with total revenue (quantity × unit_price from order_items) greater than $100. Show product name and total_revenue, ordered by total_revenue descending.',
    expectedOutputDescription: 'High-revenue products with total > $100.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT p.name AS product_name, SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM products p
INNER JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
HAVING SUM(oi.quantity * oi.unit_price) > 100
ORDER BY total_revenue DESC;`,
    hints: [
      { text: 'Calculate revenue as SUM(quantity * unit_price) per product, then filter with HAVING.', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a017',
    category: 'advanced',
    domain: 'company_hr',
    title: 'Multi-JOIN + Aggregation: Project Budget vs Actual Hours',
    difficulty: 'hard',
    points: 38,
    tags: ['join', 'group_by', 'aggregates'],
    prompt: 'For each project, show its name, budget, and the total hours worked by all employees on it. Show project_name, budget, and total_hours, sorted by total_hours descending.',
    expectedOutputDescription: 'Projects with budget and total hours worked.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT p.name AS project_name, p.budget, SUM(ep.hours_worked) AS total_hours
FROM projects p
INNER JOIN employee_projects ep ON p.id = ep.project_id
GROUP BY p.id, p.name, p.budget
ORDER BY total_hours DESC;`,
    hints: [],
    commonMistakes: []
  },
  {
    id: 'a018',
    category: 'advanced',
    domain: 'campus',
    title: 'Multi-JOIN: Student GPA vs Course Load',
    difficulty: 'hard',
    points: 35,
    tags: ['join', 'group_by', 'aggregates', 'having'],
    prompt: 'Find students enrolled in 2 or more courses who have a GPA above 3.5. Show student name, gpa, and course_count.',
    expectedOutputDescription: 'High-GPA students with 2+ courses.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `SELECT s.name AS student_name, s.gpa, COUNT(e.course_id) AS course_count
FROM students s
INNER JOIN enrollments e ON s.id = e.student_id
WHERE s.gpa > 3.5
GROUP BY s.id, s.name, s.gpa
HAVING COUNT(e.course_id) >= 2
ORDER BY s.gpa DESC;`,
    hints: [],
    commonMistakes: []
  },
  // ─── WINDOW WITH CTE ──────────────────────────────────────────────────────
  {
    id: 'a019',
    category: 'advanced',
    domain: 'company_hr',
    title: 'CTE + Window: Top 2 Per Department',
    difficulty: 'hard',
    points: 38,
    tags: ['cte', 'window_functions', 'rank'],
    prompt: 'Using a CTE with DENSE_RANK() partitioned by department and ordered by salary, find the top 2 earners in each department. Show name, department, salary, and rank.',
    expectedOutputDescription: 'Top 2 paid employees per department.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `WITH ranked AS (
  SELECT name, department, salary,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dr
  FROM employees
)
SELECT name, department, salary, dr AS dept_salary_rank
FROM ranked
WHERE dr <= 2
ORDER BY department, dr;`,
    hints: [
      { text: 'Use a CTE to compute DENSE_RANK(), then filter WHERE dr <= 2 in the outer query.', xpCost: 4, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a020',
    category: 'advanced',
    domain: 'retail',
    title: 'CTE + Window: Customer Percentile Rank',
    difficulty: 'hard',
    points: 36,
    tags: ['cte', 'window_functions'],
    prompt: 'Using a CTE, sum total_amount per customer. Then use PERCENT_RANK() OVER (ORDER BY total_spent) to assign a percentile rank. Show customer_id, total_spent, and percentile_rank rounded to 2 decimals.',
    expectedOutputDescription: 'Each customer with their spend percentile rank.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `WITH customer_totals AS (
  SELECT customer_id, SUM(total_amount) AS total_spent
  FROM orders
  GROUP BY customer_id
)
SELECT customer_id, total_spent,
  ROUND(PERCENT_RANK() OVER (ORDER BY total_spent), 2) AS percentile_rank
FROM customer_totals
ORDER BY total_spent DESC;`,
    hints: [
      { text: 'PERCENT_RANK() gives a 0–1 value representing relative position.', xpCost: 4, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a021',
    category: 'advanced',
    domain: 'campus',
    title: 'CTE Chain: Multi-Step Analysis',
    difficulty: 'hard',
    points: 40,
    tags: ['cte', 'join', 'group_by'],
    prompt: 'Using two CTEs: (1) dept_enrollment: count enrollments per course department; (2) dept_gpa: average GPA per student major. Join them on the shared field and show the department, enrollment_count, and avg_gpa where enrollment count > 3.',
    expectedOutputDescription: 'Departments with enrollment count > 3, joined with avg GPA.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `WITH dept_enrollment AS (
  SELECT c.department, COUNT(e.student_id) AS enrollment_count
  FROM courses c
  INNER JOIN enrollments e ON c.id = e.course_id
  GROUP BY c.department
),
dept_gpa AS (
  SELECT major, ROUND(AVG(gpa), 2) AS avg_gpa
  FROM students
  GROUP BY major
)
SELECT de.department, de.enrollment_count, dg.avg_gpa
FROM dept_enrollment de
INNER JOIN dept_gpa dg ON de.department = dg.major
WHERE de.enrollment_count > 3
ORDER BY de.enrollment_count DESC;`,
    hints: [
      { text: 'Define multiple CTEs separated by commas: WITH cte1 AS (...), cte2 AS (...) SELECT ...', xpCost: 5, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── ADDITIONAL ADVANCED ──────────────────────────────────────────────────
  {
    id: 'a022',
    category: 'advanced',
    domain: 'company_hr',
    title: 'Window: SUM PARTITION BY Department',
    difficulty: 'hard',
    points: 30,
    tags: ['window_functions', 'sum', 'partition'],
    prompt: 'For each employee, show their name, department, salary, total department salary, and their salary as a percentage of the department total. Alias as dept_total and pct_of_dept.',
    expectedOutputDescription: '15 rows with per-department salary context.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT name, department, salary,
  SUM(salary) OVER (PARTITION BY department) AS dept_total,
  ROUND(salary * 100.0 / SUM(salary) OVER (PARTITION BY department), 1) AS pct_of_dept
FROM employees
ORDER BY department, salary DESC;`,
    hints: [
      { text: 'SUM() OVER (PARTITION BY department) computes the department total for each row without collapsing rows.', xpCost: 4, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a023',
    category: 'advanced',
    domain: 'retail',
    title: 'Correlated Subquery: Best Product Per Order',
    difficulty: 'hard',
    points: 35,
    tags: ['subquery', 'correlated'],
    prompt: 'For each order, find the product name with the highest unit_price in that order. Show order_id and top_product.',
    expectedOutputDescription: '15 rows: order_id, top_product (most expensive item per order).',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT o.id AS order_id,
  (SELECT p.name
   FROM order_items oi
   INNER JOIN products p ON oi.product_id = p.id
   WHERE oi.order_id = o.id
   ORDER BY oi.unit_price DESC
   LIMIT 1) AS top_product
FROM orders o
ORDER BY o.id;`,
    hints: [
      { text: 'A correlated scalar subquery in the SELECT clause can return one value per outer row.', xpCost: 4, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'a024',
    category: 'advanced',
    domain: 'campus',
    title: 'Window: Running GPA Average',
    difficulty: 'hard',
    points: 32,
    tags: ['window_functions', 'avg', 'running_total'],
    prompt: 'List students ordered by id, and show a running average GPA as you go through each student. Show id, name, gpa, and running_avg_gpa (rounded to 2 decimals).',
    expectedOutputDescription: '15 rows with cumulative average GPA.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `SELECT id, name, gpa,
  ROUND(AVG(gpa) OVER (ORDER BY id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2) AS running_avg_gpa
FROM students
ORDER BY id;`,
    hints: [],
    commonMistakes: []
  },
  {
    id: 'a025',
    category: 'advanced',
    domain: 'company_hr',
    title: 'CTE Recursive-Style: Hire Cohort Analysis',
    difficulty: 'hard',
    points: 38,
    tags: ['cte', 'group_by', 'window_functions'],
    prompt: 'Using a CTE, extract the hire year from hire_date. Then for each year, show: hire_year, headcount, avg_salary, and the cumulative headcount up to that year using SUM() OVER (ORDER BY hire_year).',
    expectedOutputDescription: 'Cohort analysis with cumulative hire counts by year.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `WITH hire_years AS (
  SELECT SUBSTR(hire_date, 1, 4) AS hire_year, salary
  FROM employees
),
yearly AS (
  SELECT hire_year, COUNT(*) AS headcount, ROUND(AVG(salary), 0) AS avg_salary
  FROM hire_years
  GROUP BY hire_year
)
SELECT hire_year, headcount, avg_salary,
  SUM(headcount) OVER (ORDER BY hire_year ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_hires
FROM yearly
ORDER BY hire_year;`,
    hints: [
      { text: 'Chain two CTEs to first extract year, then group by year, then apply a window function to the aggregated result.', xpCost: 5, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  }
];
