import { domainSchemas } from '../domains';
import type { Question } from './basic';

const { company_hr, retail, campus } = domainSchemas;

export const intermediateQuestions: Question[] = [
  // ─── GROUP BY ──────────────────────────────────────────────────────────────
  {
    id: 'i001',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'Employees Per Department',
    difficulty: 'medium',
    points: 15,
    tags: ['group_by', 'count'],
    prompt: 'Count the number of employees in each department. Show department and count, ordered by count descending.',
    expectedOutputDescription: '6 rows: department, employee_count — sorted by count DESC.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT department, COUNT(*) AS employee_count FROM employees GROUP BY department ORDER BY employee_count DESC;',
    hints: [
      { text: 'Use GROUP BY to group rows and COUNT(*) to count each group.', xpCost: 2, confidenceLevel: 'low' },
      { text: 'SELECT department, COUNT(*) AS employee_count FROM employees GROUP BY department', xpCost: 3, confidenceLevel: 'medium' }
    ],
    commonMistakes: [
      { pattern: 'SELECT.*department.*COUNT.*(?!GROUP)', feedback: 'When using COUNT with non-aggregate columns, you need GROUP BY.' }
    ]
  },
  {
    id: 'i002',
    category: 'intermediate',
    domain: 'retail',
    title: 'Revenue Per Category',
    difficulty: 'medium',
    points: 15,
    tags: ['group_by', 'sum'],
    prompt: 'Calculate the total revenue (price * stock) per product category. Show category and total_value, sorted by total_value descending.',
    expectedOutputDescription: '7 rows: category, total_value — sorted DESC.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT category, SUM(price * stock) AS total_value FROM products GROUP BY category ORDER BY total_value DESC;',
    hints: [
      { text: 'Group by category and use SUM(price * stock) for total value.', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'i003',
    category: 'intermediate',
    domain: 'campus',
    title: 'Students Per Major',
    difficulty: 'medium',
    points: 14,
    tags: ['group_by', 'count'],
    prompt: 'Count how many students are in each major. Show major and student_count, ordered alphabetically by major.',
    expectedOutputDescription: '5 rows: major, student_count — sorted by major.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT major, COUNT(*) AS student_count FROM students GROUP BY major ORDER BY major;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i004',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'Average Salary Per Department',
    difficulty: 'medium',
    points: 15,
    tags: ['group_by', 'avg'],
    prompt: 'Calculate the average salary per department. Show department and avg_salary rounded to 2 decimal places, ordered by avg_salary descending.',
    expectedOutputDescription: '6 rows: department, avg_salary.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT department, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC;',
    hints: [
      { text: 'GROUP BY department, then use AVG(salary).', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'i005',
    category: 'intermediate',
    domain: 'campus',
    title: 'Average GPA Per Year',
    difficulty: 'medium',
    points: 14,
    tags: ['group_by', 'avg'],
    prompt: 'Calculate the average GPA for each year group. Show year and avg_gpa (rounded to 2 decimals), sorted by year.',
    expectedOutputDescription: '4 rows: year, avg_gpa.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT year, ROUND(AVG(gpa), 2) AS avg_gpa FROM students GROUP BY year ORDER BY year;',
    hints: [],
    commonMistakes: []
  },
  // ─── HAVING ────────────────────────────────────────────────────────────────
  {
    id: 'i006',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'Departments With 3+ Employees',
    difficulty: 'medium',
    points: 16,
    tags: ['group_by', 'having'],
    prompt: 'Find departments that have 3 or more employees. Show department and employee_count.',
    expectedOutputDescription: 'Departments with >=3 employees.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT department, COUNT(*) AS employee_count FROM employees GROUP BY department HAVING COUNT(*) >= 3;',
    hints: [
      { text: 'HAVING filters groups after aggregation, unlike WHERE which filters rows before.', xpCost: 2, confidenceLevel: 'low' },
      { text: 'Add HAVING COUNT(*) >= 3 after GROUP BY.', xpCost: 3, confidenceLevel: 'medium' }
    ],
    commonMistakes: [
      { pattern: 'WHERE COUNT', feedback: 'You cannot use COUNT() in a WHERE clause — use HAVING to filter aggregated groups.' }
    ]
  },
  {
    id: 'i007',
    category: 'intermediate',
    domain: 'retail',
    title: 'High-Value Categories',
    difficulty: 'medium',
    points: 16,
    tags: ['group_by', 'having'],
    prompt: 'Find product categories where the average price exceeds $40. Show category and avg_price.',
    expectedOutputDescription: 'Categories with avg price > $40.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT category, AVG(price) AS avg_price FROM products GROUP BY category HAVING AVG(price) > 40;',
    hints: [
      { text: 'Filter groups with HAVING AVG(price) > 40 after GROUP BY.', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'i008',
    category: 'intermediate',
    domain: 'campus',
    title: 'Majors With High Average GPA',
    difficulty: 'medium',
    points: 16,
    tags: ['group_by', 'having'],
    prompt: 'Find majors where the average GPA is 3.5 or above. Show major and avg_gpa rounded to 2 decimals.',
    expectedOutputDescription: 'Majors with avg GPA >= 3.5.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT major, ROUND(AVG(gpa), 2) AS avg_gpa FROM students GROUP BY major HAVING AVG(gpa) >= 3.5;',
    hints: [],
    commonMistakes: []
  },
  // ─── INNER JOIN ────────────────────────────────────────────────────────────
  {
    id: 'i009',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'Employee Projects',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'inner_join'],
    prompt: 'Show each employee\'s name and the project they worked on (project name). Only include employees who worked on at least one project.',
    expectedOutputDescription: '14 rows: employee name, project name.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT e.name AS employee_name, p.name AS project_name
FROM employees e
INNER JOIN employee_projects ep ON e.id = ep.employee_id
INNER JOIN projects p ON ep.project_id = p.id;`,
    hints: [
      { text: 'You need to join employees → employee_projects → projects.', xpCost: 2, confidenceLevel: 'low' },
      { text: 'Use INNER JOIN ... ON to link tables on matching keys.', xpCost: 3, confidenceLevel: 'medium' }
    ],
    commonMistakes: [
      { pattern: 'FROM employees, projects', feedback: 'Avoid implicit Cartesian joins. Use explicit JOIN ... ON syntax.' }
    ]
  },
  {
    id: 'i010',
    category: 'intermediate',
    domain: 'retail',
    title: 'Orders with Customer Names',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'inner_join'],
    prompt: 'Show each order\'s ID, order date, and the customer\'s name who placed it.',
    expectedOutputDescription: '15 rows: order id, order_date, customer name.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT o.id AS order_id, o.order_date, c.name AS customer_name
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id;`,
    hints: [
      { text: 'JOIN orders to customers on the customer_id foreign key.', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'i011',
    category: 'intermediate',
    domain: 'retail',
    title: 'Order Items with Product Names',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'inner_join'],
    prompt: 'List all order items with the product name and quantity. Show order_id, product name, and quantity.',
    expectedOutputDescription: '25 rows: order_id, product_name, quantity.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT oi.order_id, p.name AS product_name, oi.quantity
FROM order_items oi
INNER JOIN products p ON oi.product_id = p.id;`,
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i012',
    category: 'intermediate',
    domain: 'campus',
    title: 'Student Enrollments with Course Names',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'inner_join'],
    prompt: 'Show each student\'s name and the title of each course they are enrolled in.',
    expectedOutputDescription: '33 rows: student name, course title.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `SELECT s.name AS student_name, c.title AS course_title
FROM students s
INNER JOIN enrollments e ON s.id = e.student_id
INNER JOIN courses c ON e.course_id = c.id;`,
    hints: [],
    commonMistakes: []
  },
  // ─── LEFT JOIN ────────────────────────────────────────────────────────────
  {
    id: 'i013',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'All Employees and Their Projects',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'left_join'],
    prompt: 'Show all employees and any projects they\'re assigned to. Include employees with NO project assignments.',
    expectedOutputDescription: 'All 15 employees, with project name NULL where unassigned.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT e.name AS employee_name, p.name AS project_name
FROM employees e
LEFT JOIN employee_projects ep ON e.id = ep.employee_id
LEFT JOIN projects p ON ep.project_id = p.id;`,
    hints: [
      { text: 'Use LEFT JOIN to include all rows from the left table even when there\'s no match.', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: [
      { pattern: 'INNER JOIN', feedback: 'INNER JOIN would exclude employees with no projects. You need LEFT JOIN to include them.' }
    ]
  },
  {
    id: 'i014',
    category: 'intermediate',
    domain: 'campus',
    title: 'All Students and Their Clubs',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'left_join'],
    prompt: 'Show all students and any clubs they belong to. Include students not in any club.',
    expectedOutputDescription: 'All 15 students, club name NULL where not in any club.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `SELECT s.name AS student_name, c.name AS club_name
FROM students s
LEFT JOIN club_memberships cm ON s.id = cm.student_id
LEFT JOIN clubs c ON cm.club_id = c.id;`,
    hints: [
      { text: 'LEFT JOIN keeps all students even if they have no club membership.', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'i015',
    category: 'intermediate',
    domain: 'retail',
    title: 'Customers Without Orders',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'left_join', 'null'],
    prompt: 'Find customers who have never placed an order.',
    expectedOutputDescription: 'Customers with no orders — 0 rows (all have orders in seed data).',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT c.name
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.id IS NULL;`,
    hints: [
      { text: 'LEFT JOIN then filter WHERE the joined column IS NULL to find non-matches.', xpCost: 2, confidenceLevel: 'low' },
      { text: 'The anti-join pattern: LEFT JOIN ... WHERE right.id IS NULL', xpCost: 3, confidenceLevel: 'medium' }
    ],
    commonMistakes: []
  },
  // ─── MULTI-TABLE JOIN ─────────────────────────────────────────────────────
  {
    id: 'i016',
    category: 'intermediate',
    domain: 'retail',
    title: 'Customer Order Details',
    difficulty: 'medium',
    points: 20,
    tags: ['join', 'inner_join'],
    prompt: 'Show customer name, order date, product name, quantity, and unit_price for each order line item.',
    expectedOutputDescription: '25 rows with customer → order → product details.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT c.name AS customer_name, o.order_date, p.name AS product_name, oi.quantity, oi.unit_price
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id;`,
    hints: [
      { text: 'Chain multiple JOINs: customers → orders → order_items → products.', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'i017',
    category: 'intermediate',
    domain: 'campus',
    title: 'Student Course Grades',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'inner_join'],
    prompt: 'Show student name, course title, and grade for all completed enrollments.',
    expectedOutputDescription: 'Completed enrollments with student + course + grade.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `SELECT s.name AS student_name, c.title AS course_title, e.grade
FROM students s
INNER JOIN enrollments e ON s.id = e.student_id
INNER JOIN courses c ON e.course_id = c.id
WHERE e.completed = 1;`,
    hints: [],
    commonMistakes: []
  },
  // ─── JOIN + GROUP BY ──────────────────────────────────────────────────────
  {
    id: 'i018',
    category: 'intermediate',
    domain: 'retail',
    title: 'Total Spend Per Customer',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'group_by', 'sum'],
    prompt: 'Calculate the total amount spent by each customer across all their orders. Show customer name and total_spent, ordered by total_spent descending.',
    expectedOutputDescription: 'Each customer and their total order spend.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT c.name AS customer_name, SUM(o.total_amount) AS total_spent
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name
ORDER BY total_spent DESC;`,
    hints: [
      { text: 'JOIN customers to orders, then GROUP BY customer and SUM total_amount.', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'i019',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'Project Hours Per Employee',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'group_by', 'sum'],
    prompt: 'Show each employee\'s name and total hours worked across all projects. Order by total_hours descending.',
    expectedOutputDescription: 'Employees with total project hours.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT e.name AS employee_name, SUM(ep.hours_worked) AS total_hours
FROM employees e
INNER JOIN employee_projects ep ON e.id = ep.employee_id
GROUP BY e.id, e.name
ORDER BY total_hours DESC;`,
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i020',
    category: 'intermediate',
    domain: 'campus',
    title: 'Enrollments Per Course',
    difficulty: 'medium',
    points: 16,
    tags: ['join', 'group_by', 'count'],
    prompt: 'Count the number of students enrolled in each course. Show course title and enrollment_count, ordered by count descending.',
    expectedOutputDescription: 'Each course and its student enrollment count.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `SELECT c.title, COUNT(e.student_id) AS enrollment_count
FROM courses c
INNER JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title
ORDER BY enrollment_count DESC;`,
    hints: [],
    commonMistakes: []
  },
  // ─── HAVING with JOIN ─────────────────────────────────────────────────────
  {
    id: 'i021',
    category: 'intermediate',
    domain: 'retail',
    title: 'Top Customers (3+ Orders)',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'group_by', 'having'],
    prompt: 'Find customers who have placed 3 or more orders. Show customer name and order_count.',
    expectedOutputDescription: 'Customers with 3+ orders.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT c.name AS customer_name, COUNT(o.id) AS order_count
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name
HAVING COUNT(o.id) >= 3;`,
    hints: [
      { text: 'After joining and grouping, use HAVING COUNT(...) >= 3.', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'i022',
    category: 'intermediate',
    domain: 'campus',
    title: 'Students in 2+ Clubs',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'group_by', 'having'],
    prompt: 'Find students who are members of 2 or more clubs. Show student name and club_count.',
    expectedOutputDescription: 'Students with 2+ club memberships.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `SELECT s.name AS student_name, COUNT(cm.club_id) AS club_count
FROM students s
INNER JOIN club_memberships cm ON s.id = cm.student_id
GROUP BY s.id, s.name
HAVING COUNT(cm.club_id) >= 2;`,
    hints: [],
    commonMistakes: []
  },
  // ─── SUBQUERIES ───────────────────────────────────────────────────────────
  {
    id: 'i023',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'Employees Earning Above Average',
    difficulty: 'medium',
    points: 16,
    tags: ['subquery', 'where'],
    prompt: 'Find all employees whose salary is above the company-wide average salary.',
    expectedOutputDescription: 'Higher-than-average earners.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);',
    hints: [
      { text: 'Use a scalar subquery in the WHERE clause to compare against the average.', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'i024',
    category: 'intermediate',
    domain: 'retail',
    title: 'Products More Expensive Than Average',
    difficulty: 'medium',
    points: 15,
    tags: ['subquery', 'where'],
    prompt: 'Find all products priced above the average product price.',
    expectedOutputDescription: 'Above-average-priced products.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM products WHERE price > (SELECT AVG(price) FROM products);',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i025',
    category: 'intermediate',
    domain: 'campus',
    title: 'Students With Above-Average GPA',
    difficulty: 'medium',
    points: 15,
    tags: ['subquery', 'where'],
    prompt: 'Find students with a GPA above the campus-wide average GPA.',
    expectedOutputDescription: 'Above-average GPA students.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM students WHERE gpa > (SELECT AVG(gpa) FROM students);',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i026',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'Highest Paid in Each Department',
    difficulty: 'medium',
    points: 20,
    tags: ['subquery', 'group_by'],
    prompt: 'Find the name of the highest-paid employee in each department. Show department and name.',
    expectedOutputDescription: 'One highest-paid employee per department.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT department, name
FROM employees e
WHERE salary = (
  SELECT MAX(salary)
  FROM employees e2
  WHERE e2.department = e.department
);`,
    hints: [
      { text: 'Use a correlated subquery: the inner query references the outer employee\'s department.', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── SUBQUERY IN FROM (Derived Table) ────────────────────────────────────
  {
    id: 'i027',
    category: 'intermediate',
    domain: 'retail',
    title: 'Top-Spending Category',
    difficulty: 'medium',
    points: 18,
    tags: ['subquery', 'group_by'],
    prompt: 'Find the product category with the highest total revenue (price * stock). Return just the category name.',
    expectedOutputDescription: '1 row: category with highest total_value.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT category FROM (
  SELECT category, SUM(price * stock) AS total_value
  FROM products
  GROUP BY category
  ORDER BY total_value DESC
  LIMIT 1
);`,
    hints: [
      { text: 'Use a derived table (subquery in FROM) to group, sum, order, and limit.', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── SELF JOIN ────────────────────────────────────────────────────────────
  {
    id: 'i028',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'Employees and Their Managers',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'self_join'],
    prompt: 'Show each employee and their manager\'s name. Include only employees who have a manager.',
    expectedOutputDescription: '9 rows: employee_name, manager_name.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT e.name AS employee_name, m.name AS manager_name
FROM employees e
INNER JOIN employees m ON e.manager_id = m.id;`,
    hints: [
      { text: 'Join the employees table to itself: alias one as e (employee) and one as m (manager).', xpCost: 3, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── UNION ────────────────────────────────────────────────────────────────
  {
    id: 'i029',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'Engineering and Research Staff',
    difficulty: 'medium',
    points: 16,
    tags: ['union'],
    prompt: 'List all employees in Engineering OR Research, combined with UNION. Ensure no duplicates. Show name and department.',
    expectedOutputDescription: 'Combined list of Engineering + Research employees (no duplicates).',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT name, department FROM employees WHERE department = 'Engineering'
UNION
SELECT name, department FROM employees WHERE department = 'Research';`,
    hints: [
      { text: 'UNION combines results of two SELECT statements and removes duplicates.', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'i030',
    category: 'intermediate',
    domain: 'retail',
    title: 'All Customer Cities',
    difficulty: 'medium',
    points: 15,
    tags: ['union'],
    prompt: 'Get a combined, deduplicated list of all cities from both the customers and orders (shipping_city) tables. Alias as city.',
    expectedOutputDescription: 'All unique cities from both tables.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT city FROM customers
UNION
SELECT shipping_city AS city FROM orders;`,
    hints: [
      { text: 'UNION deduplicates. UNION ALL keeps duplicates.', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'i031',
    category: 'intermediate',
    domain: 'campus',
    title: 'CS and Math Professors',
    difficulty: 'medium',
    points: 14,
    tags: ['union'],
    prompt: 'List all instructors from Computer Science OR Mathematics courses (no duplicates), as a combined list.',
    expectedOutputDescription: 'Combined unique instructors from CS and Math.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `SELECT instructor FROM courses WHERE department = 'Computer Science'
UNION
SELECT instructor FROM courses WHERE department = 'Mathematics';`,
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i032',
    category: 'intermediate',
    domain: 'retail',
    title: 'Union All Orders vs Products Count',
    difficulty: 'medium',
    points: 15,
    tags: ['union', 'count'],
    prompt: 'Using UNION ALL, create a summary report showing: "Total Orders" as label and count of orders, plus "Total Products" and count of products, in a single result.',
    expectedOutputDescription: '2 rows: label, count.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT 'Total Orders' AS label, COUNT(*) AS count FROM orders
UNION ALL
SELECT 'Total Products' AS label, COUNT(*) AS count FROM products;`,
    hints: [
      { text: 'UNION ALL keeps duplicate rows (here two different query results).', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── MORE GROUP BY + HAVING ────────────────────────────────────────────────
  {
    id: 'i033',
    category: 'intermediate',
    domain: 'retail',
    title: 'Orders Per Customer Per City',
    difficulty: 'medium',
    points: 16,
    tags: ['group_by', 'count'],
    prompt: 'Count orders per shipping city. Show city and order_count, ordered by order_count descending.',
    expectedOutputDescription: 'Each shipping city with order count.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT shipping_city, COUNT(*) AS order_count FROM orders GROUP BY shipping_city ORDER BY order_count DESC;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i034',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'Max Salary Per Department',
    difficulty: 'medium',
    points: 15,
    tags: ['group_by', 'max'],
    prompt: 'Find the maximum salary in each department. Show department and max_salary.',
    expectedOutputDescription: '6 rows: department, max_salary.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT department, MAX(salary) AS max_salary FROM employees GROUP BY department;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i035',
    category: 'intermediate',
    domain: 'campus',
    title: 'Courses With High Enrollment',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'group_by', 'having'],
    prompt: 'Find courses with 3 or more students enrolled. Show course title and enrollment_count.',
    expectedOutputDescription: 'Courses with 3+ students.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `SELECT c.title, COUNT(e.student_id) AS enrollment_count
FROM courses c
INNER JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title
HAVING COUNT(e.student_id) >= 3;`,
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i036',
    category: 'intermediate',
    domain: 'retail',
    title: 'Items Sold Per Order',
    difficulty: 'medium',
    points: 15,
    tags: ['group_by', 'count'],
    prompt: 'Count the number of line items per order. Show order_id and item_count, sorted by order_id.',
    expectedOutputDescription: 'Each order and its item count.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT order_id, COUNT(*) AS item_count FROM order_items GROUP BY order_id ORDER BY order_id;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i037',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'Departments With Above-Average Budget',
    difficulty: 'medium',
    points: 18,
    tags: ['subquery', 'where'],
    prompt: 'List all departments whose budget is above the average department budget.',
    expectedOutputDescription: 'Departments with above-average budgets.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM departments WHERE budget > (SELECT AVG(budget) FROM departments);',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i038',
    category: 'intermediate',
    domain: 'campus',
    title: 'Department Course Count',
    difficulty: 'medium',
    points: 14,
    tags: ['group_by', 'count'],
    prompt: 'Count the number of courses offered by each academic department. Show department and course_count, sorted by course_count descending.',
    expectedOutputDescription: 'Each department with course count.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT department, COUNT(*) AS course_count FROM courses GROUP BY department ORDER BY course_count DESC;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i039',
    category: 'intermediate',
    domain: 'retail',
    title: 'Average Quantity Per Product',
    difficulty: 'medium',
    points: 16,
    tags: ['join', 'group_by', 'avg'],
    prompt: 'Calculate the average quantity ordered for each product (across all order items). Show product name and avg_quantity rounded to 1 decimal.',
    expectedOutputDescription: 'Each product with avg quantity ordered.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT p.name AS product_name, ROUND(AVG(oi.quantity), 1) AS avg_quantity
FROM products p
INNER JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY avg_quantity DESC;`,
    hints: [],
    commonMistakes: []
  },
  {
    id: 'i040',
    category: 'intermediate',
    domain: 'company_hr',
    title: 'Employees and Department Budget',
    difficulty: 'medium',
    points: 18,
    tags: ['join', 'inner_join'],
    prompt: 'Show each employee\'s name, department, and their department\'s budget. Join employees to departments.',
    expectedOutputDescription: '15 rows: name, department, budget.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT e.name, e.department, d.budget
FROM employees e
INNER JOIN departments d ON e.department = d.name;`,
    hints: [
      { text: 'Join employees to departments where the department name matches.', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  }
];
