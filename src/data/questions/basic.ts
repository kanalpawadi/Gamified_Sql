import { domainSchemas } from '../domains';

export interface Question {
  id: string;
  category: 'basic' | 'intermediate' | 'advanced';
  domain: 'company_hr' | 'retail' | 'campus';
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  tags: string[];
  prompt: string;
  expectedOutputDescription: string;
  schemaSQL: string;
  seedSQL: string;
  solutionSQL: string;
  hints: { text: string; xpCost: number; confidenceLevel: 'low' | 'medium' | 'high' }[];
  commonMistakes: { pattern: string; feedback: string }[];
}

const { company_hr, retail, campus } = domainSchemas;

export const basicQuestions: Question[] = [
  // ─── SELECT ALL ───────────────────────────────────────────────────────────
  {
    id: 'b001',
    category: 'basic',
    domain: 'company_hr',
    title: 'Select All Employees',
    difficulty: 'easy',
    points: 5,
    tags: ['select'],
    prompt: 'Retrieve all columns and all rows from the employees table.',
    expectedOutputDescription: 'All 15 rows from employees with every column.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM employees;',
    hints: [
      { text: 'Use SELECT * to select all columns.', xpCost: 1, confidenceLevel: 'low' },
      { text: 'The full syntax is: SELECT * FROM table_name;', xpCost: 2, confidenceLevel: 'high' }
    ],
    commonMistakes: [
      { pattern: 'FROM employee', feedback: 'Check the table name — it\'s "employees" (plural).' }
    ]
  },
  {
    id: 'b002',
    category: 'basic',
    domain: 'retail',
    title: 'List All Products',
    difficulty: 'easy',
    points: 5,
    tags: ['select'],
    prompt: 'Retrieve all products from the products table.',
    expectedOutputDescription: 'All 15 rows from the products table with all columns.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM products;',
    hints: [
      { text: 'SELECT * retrieves all columns.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b003',
    category: 'basic',
    domain: 'campus',
    title: 'Show All Students',
    difficulty: 'easy',
    points: 5,
    tags: ['select'],
    prompt: 'Write a query to return all students in the students table.',
    expectedOutputDescription: 'All 15 student rows with all columns.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM students;',
    hints: [
      { text: 'Use SELECT * FROM students;', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── SELECT SPECIFIC COLUMNS ──────────────────────────────────────────────
  {
    id: 'b004',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employee Names and Salaries',
    difficulty: 'easy',
    points: 5,
    tags: ['select', 'columns'],
    prompt: 'Retrieve only the name and salary of every employee.',
    expectedOutputDescription: 'Two columns: name, salary — 15 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT name, salary FROM employees;',
    hints: [
      { text: 'List specific column names separated by commas after SELECT.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: [
      { pattern: 'SELECT \\*', feedback: 'The question asks for only name and salary, not all columns.' }
    ]
  },
  {
    id: 'b005',
    category: 'basic',
    domain: 'retail',
    title: 'Product Name and Price',
    difficulty: 'easy',
    points: 5,
    tags: ['select', 'columns'],
    prompt: 'Retrieve only the name and price of every product.',
    expectedOutputDescription: 'Two columns: name, price — 15 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT name, price FROM products;',
    hints: [
      { text: 'SELECT name, price FROM products;', xpCost: 2, confidenceLevel: 'high' }
    ],
    commonMistakes: []
  },
  {
    id: 'b006',
    category: 'basic',
    domain: 'campus',
    title: 'Student Names and Majors',
    difficulty: 'easy',
    points: 5,
    tags: ['select', 'columns'],
    prompt: 'Retrieve only the name and major of each student.',
    expectedOutputDescription: 'Two columns: name, major — 15 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT name, major FROM students;',
    hints: [
      { text: 'List both column names in the SELECT clause.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── ALIASES ──────────────────────────────────────────────────────────────
  {
    id: 'b007',
    category: 'basic',
    domain: 'company_hr',
    title: 'Rename Column with Alias',
    difficulty: 'easy',
    points: 5,
    tags: ['select', 'alias'],
    prompt: 'Select the name column from employees and alias it as "Employee Name". Also select salary.',
    expectedOutputDescription: 'Columns: "Employee Name", salary — 15 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT name AS "Employee Name", salary FROM employees;',
    hints: [
      { text: 'Use the AS keyword: column AS "New Name"', xpCost: 1, confidenceLevel: 'low' },
      { text: 'SELECT name AS "Employee Name", salary FROM employees;', xpCost: 2, confidenceLevel: 'high' }
    ],
    commonMistakes: []
  },
  {
    id: 'b008',
    category: 'basic',
    domain: 'retail',
    title: 'Product Price with Alias',
    difficulty: 'easy',
    points: 5,
    tags: ['select', 'alias'],
    prompt: 'Select the product name aliased as "Product" and price aliased as "List Price".',
    expectedOutputDescription: 'Columns: Product, "List Price" — 15 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT name AS "Product", price AS "List Price" FROM products;',
    hints: [
      { text: 'Use AS to alias each column in the SELECT clause.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── WHERE ────────────────────────────────────────────────────────────────
  {
    id: 'b009',
    category: 'basic',
    domain: 'company_hr',
    title: 'Filter by Department',
    difficulty: 'easy',
    points: 6,
    tags: ['where'],
    prompt: 'Find all employees in the Engineering department.',
    expectedOutputDescription: 'All Engineering employees — should return 5 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM employees WHERE department = 'Engineering';",
    hints: [
      { text: 'Use a WHERE clause to filter rows.', xpCost: 1, confidenceLevel: 'low' },
      { text: 'WHERE department = \'Engineering\'', xpCost: 2, confidenceLevel: 'medium' }
    ],
    commonMistakes: [
      { pattern: 'WHERE department = engineering', feedback: 'String values must be wrapped in single quotes.' }
    ]
  },
  {
    id: 'b010',
    category: 'basic',
    domain: 'retail',
    title: 'Find Expensive Products',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'comparison'],
    prompt: 'Find all products with a price greater than 50.',
    expectedOutputDescription: 'Products priced above $50 — should return 7 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM products WHERE price > 50;',
    hints: [
      { text: 'Use > for "greater than" comparison.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b011',
    category: 'basic',
    domain: 'campus',
    title: 'High GPA Students',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'comparison'],
    prompt: 'Find all students with a GPA of 3.8 or higher.',
    expectedOutputDescription: 'Students with GPA >= 3.8 — should return 4 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM students WHERE gpa >= 3.8;',
    hints: [
      { text: 'Use >= for "greater than or equal to".', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b012',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employees Not in HR',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'inequality'],
    prompt: 'List all employees who are NOT in the HR department.',
    expectedOutputDescription: '13 employees from departments other than HR.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM employees WHERE department != 'HR';",
    hints: [
      { text: 'Use != or <> for "not equal to".', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── AND / OR ─────────────────────────────────────────────────────────────
  {
    id: 'b013',
    category: 'basic',
    domain: 'company_hr',
    title: 'Engineering AND High Salary',
    difficulty: 'easy',
    points: 7,
    tags: ['where', 'and'],
    prompt: 'Find employees in Engineering with a salary greater than 90000.',
    expectedOutputDescription: 'Engineering employees earning > $90k — 3 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM employees WHERE department = 'Engineering' AND salary > 90000;",
    hints: [
      { text: 'Combine conditions with AND — both must be true.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b014',
    category: 'basic',
    domain: 'retail',
    title: 'Electronics or Kitchen',
    difficulty: 'easy',
    points: 7,
    tags: ['where', 'or'],
    prompt: 'Find all products in either the Electronics or Kitchen category.',
    expectedOutputDescription: 'Electronics and Kitchen products combined — 6 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT * FROM products WHERE category = 'Electronics' OR category = 'Kitchen';",
    hints: [
      { text: 'Use OR to match either condition.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b015',
    category: 'basic',
    domain: 'campus',
    title: 'CS Students in Year 3 or 4',
    difficulty: 'easy',
    points: 7,
    tags: ['where', 'and', 'or'],
    prompt: 'Find Computer Science students in their 3rd or 4th year.',
    expectedOutputDescription: 'CS juniors and seniors — 3 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: "SELECT * FROM students WHERE major = 'Computer Science' AND (year = 3 OR year = 4);",
    hints: [
      { text: 'Combine AND with OR using parentheses for correct precedence.', xpCost: 1, confidenceLevel: 'low' },
      { text: 'WHERE major = \'Computer Science\' AND (year = 3 OR year = 4)', xpCost: 2, confidenceLevel: 'medium' }
    ],
    commonMistakes: [
      { pattern: 'WHERE major.*year.*OR', feedback: 'Watch out for operator precedence — AND binds tighter than OR. Use parentheses around the OR condition.' }
    ]
  },
  // ─── BETWEEN ──────────────────────────────────────────────────────────────
  {
    id: 'b016',
    category: 'basic',
    domain: 'company_hr',
    title: 'Salary Range',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'between'],
    prompt: 'Find employees with a salary between 70000 and 95000 (inclusive).',
    expectedOutputDescription: 'Employees earning between $70k and $95k — 7 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM employees WHERE salary BETWEEN 70000 AND 95000;',
    hints: [
      { text: 'Use BETWEEN low AND high for inclusive range checks.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b017',
    category: 'basic',
    domain: 'retail',
    title: 'Mid-Range Products',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'between'],
    prompt: 'List products priced between $20 and $60 (inclusive).',
    expectedOutputDescription: 'Products in the $20–$60 price range — 8 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM products WHERE price BETWEEN 20 AND 60;',
    hints: [
      { text: 'BETWEEN is inclusive on both ends.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── IN ───────────────────────────────────────────────────────────────────
  {
    id: 'b018',
    category: 'basic',
    domain: 'company_hr',
    title: 'Multiple Departments with IN',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'in'],
    prompt: 'Find employees in the Sales, Marketing, or Finance departments using IN.',
    expectedOutputDescription: 'Employees from three departments — 5 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM employees WHERE department IN ('Sales', 'Marketing', 'Finance');",
    hints: [
      { text: 'Use IN (val1, val2, ...) instead of multiple OR conditions.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b019',
    category: 'basic',
    domain: 'campus',
    title: 'Science Majors',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'in'],
    prompt: 'Find all students majoring in Physics, Chemistry, or Biology.',
    expectedOutputDescription: 'Science majors — 9 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: "SELECT * FROM students WHERE major IN ('Physics', 'Chemistry', 'Biology');",
    hints: [
      { text: 'Use IN with a list of values in parentheses.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── LIKE ─────────────────────────────────────────────────────────────────
  {
    id: 'b020',
    category: 'basic',
    domain: 'company_hr',
    title: 'Names Starting with A',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'like'],
    prompt: 'Find all employees whose name starts with the letter A.',
    expectedOutputDescription: 'Employees with names beginning with A — 2 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM employees WHERE name LIKE 'A%';",
    hints: [
      { text: "Use LIKE with % as a wildcard: 'A%' matches anything starting with A.", xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b021',
    category: 'basic',
    domain: 'retail',
    title: 'Products Containing "Wireless"',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'like'],
    prompt: 'Find all products whose name contains the word "Wireless".',
    expectedOutputDescription: '1 row: Wireless Headphones.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT * FROM products WHERE name LIKE '%Wireless%';",
    hints: [
      { text: "Use %Wireless% to match the word anywhere in the name.", xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b022',
    category: 'basic',
    domain: 'company_hr',
    title: 'Job Titles Ending with Engineer',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'like'],
    prompt: 'Find all employees whose job title ends with "Engineer".',
    expectedOutputDescription: 'Engineers by job title — 3 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM employees WHERE job_title LIKE '%Engineer';",
    hints: [
      { text: "Use %Engineer (no trailing %) to match titles that END with Engineer.", xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── NULL ─────────────────────────────────────────────────────────────────
  {
    id: 'b023',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employees Without a Manager',
    difficulty: 'easy',
    points: 7,
    tags: ['where', 'null'],
    prompt: 'Find all employees who do not have a manager (manager_id is NULL).',
    expectedOutputDescription: 'Top-level employees with no manager — 6 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM employees WHERE manager_id IS NULL;',
    hints: [
      { text: 'NULL cannot be compared with = — use IS NULL instead.', xpCost: 1, confidenceLevel: 'low' },
      { text: 'WHERE manager_id IS NULL', xpCost: 2, confidenceLevel: 'high' }
    ],
    commonMistakes: [
      { pattern: 'WHERE manager_id = NULL', feedback: 'NULL cannot be tested with = in SQL. Use IS NULL instead.' }
    ]
  },
  {
    id: 'b024',
    category: 'basic',
    domain: 'retail',
    title: 'Customers Without Email',
    difficulty: 'easy',
    points: 7,
    tags: ['where', 'null'],
    prompt: 'Find all customers who have no email address on file (email is NULL).',
    expectedOutputDescription: 'Customers with NULL email — 1 row.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM customers WHERE email IS NULL;',
    hints: [
      { text: 'NULL values require IS NULL or IS NOT NULL — never = NULL.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: [
      { pattern: '= NULL', feedback: 'Use IS NULL to check for missing values, not = NULL.' }
    ]
  },
  {
    id: 'b025',
    category: 'basic',
    domain: 'campus',
    title: 'Students With No Dorm',
    difficulty: 'easy',
    points: 7,
    tags: ['where', 'null'],
    prompt: 'Find students who are not assigned to a dorm (dorm is NULL).',
    expectedOutputDescription: 'Students with NULL dorm — 2 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM students WHERE dorm IS NULL;',
    hints: [
      { text: 'Always use IS NULL, never = NULL.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b026',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employees With Email',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'null'],
    prompt: 'Find all employees who do have an email address (email is NOT NULL).',
    expectedOutputDescription: 'Employees with a non-null email — 14 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM employees WHERE email IS NOT NULL;',
    hints: [
      { text: 'Use IS NOT NULL to check for present values.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── ORDER BY ─────────────────────────────────────────────────────────────
  {
    id: 'b027',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employees by Salary Descending',
    difficulty: 'easy',
    points: 6,
    tags: ['order_by'],
    prompt: 'List all employees ordered by salary from highest to lowest.',
    expectedOutputDescription: '15 employees sorted by salary descending.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM employees ORDER BY salary DESC;',
    hints: [
      { text: 'Use ORDER BY column DESC for descending order.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b028',
    category: 'basic',
    domain: 'retail',
    title: 'Products by Price Ascending',
    difficulty: 'easy',
    points: 6,
    tags: ['order_by'],
    prompt: 'List all products sorted by price from cheapest to most expensive.',
    expectedOutputDescription: '15 products sorted by price ASC.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM products ORDER BY price ASC;',
    hints: [
      { text: 'ASC is ascending (low to high) and is the default sort order.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b029',
    category: 'basic',
    domain: 'campus',
    title: 'Students by GPA Descending',
    difficulty: 'easy',
    points: 6,
    tags: ['order_by'],
    prompt: 'List all students sorted by GPA from highest to lowest.',
    expectedOutputDescription: '15 students sorted by GPA DESC.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM students ORDER BY gpa DESC;',
    hints: [
      { text: 'Use ORDER BY gpa DESC.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b030',
    category: 'basic',
    domain: 'company_hr',
    title: 'Sort by Department then Name',
    difficulty: 'easy',
    points: 7,
    tags: ['order_by'],
    prompt: 'List all employees sorted first by department (A-Z), then by name (A-Z) within each department.',
    expectedOutputDescription: '15 employees sorted by department ASC, then name ASC.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM employees ORDER BY department ASC, name ASC;',
    hints: [
      { text: 'You can ORDER BY multiple columns separated by commas.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── LIMIT / OFFSET ───────────────────────────────────────────────────────
  {
    id: 'b031',
    category: 'basic',
    domain: 'retail',
    title: 'Top 5 Most Expensive Products',
    difficulty: 'easy',
    points: 6,
    tags: ['limit', 'order_by'],
    prompt: 'Show the 5 most expensive products.',
    expectedOutputDescription: 'Top 5 products by price — 5 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM products ORDER BY price DESC LIMIT 5;',
    hints: [
      { text: 'Sort by price DESC first, then use LIMIT 5.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: [
      { pattern: 'LIMIT 5(?!.*ORDER)', feedback: 'Without ORDER BY, LIMIT returns an arbitrary set of rows — sort by price DESC first.' }
    ]
  },
  {
    id: 'b032',
    category: 'basic',
    domain: 'company_hr',
    title: 'Top 3 Highest Salaries',
    difficulty: 'easy',
    points: 6,
    tags: ['limit', 'order_by'],
    prompt: 'Find the 3 employees with the highest salaries.',
    expectedOutputDescription: 'The 3 highest-paid employees — 3 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM employees ORDER BY salary DESC LIMIT 3;',
    hints: [
      { text: 'Combine ORDER BY DESC with LIMIT to get the top rows.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b033',
    category: 'basic',
    domain: 'campus',
    title: 'Second Page of Students',
    difficulty: 'easy',
    points: 7,
    tags: ['limit', 'offset'],
    prompt: 'Get students 6 through 10 (the second "page" of 5) ordered by name alphabetically.',
    expectedOutputDescription: 'Students 6–10 by name order — 5 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM students ORDER BY name LIMIT 5 OFFSET 5;',
    hints: [
      { text: 'Use LIMIT to limit row count and OFFSET to skip rows.', xpCost: 1, confidenceLevel: 'low' },
      { text: 'OFFSET 5 skips the first 5 results.', xpCost: 2, confidenceLevel: 'medium' }
    ],
    commonMistakes: []
  },
  // ─── DISTINCT ─────────────────────────────────────────────────────────────
  {
    id: 'b034',
    category: 'basic',
    domain: 'company_hr',
    title: 'Unique Departments',
    difficulty: 'easy',
    points: 6,
    tags: ['distinct'],
    prompt: 'List all unique department names that employees belong to.',
    expectedOutputDescription: 'Distinct department names — 6 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT DISTINCT department FROM employees;',
    hints: [
      { text: 'Use SELECT DISTINCT to eliminate duplicate rows.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b035',
    category: 'basic',
    domain: 'retail',
    title: 'Unique Product Categories',
    difficulty: 'easy',
    points: 6,
    tags: ['distinct'],
    prompt: 'List all unique product categories.',
    expectedOutputDescription: 'Distinct categories — 7 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT DISTINCT category FROM products;',
    hints: [
      { text: 'DISTINCT removes duplicate values.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b036',
    category: 'basic',
    domain: 'campus',
    title: 'Unique Majors',
    difficulty: 'easy',
    points: 6,
    tags: ['distinct'],
    prompt: 'List all unique majors offered to students in the campus.',
    expectedOutputDescription: 'Distinct majors — 5 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT DISTINCT major FROM students;',
    hints: [
      { text: 'SELECT DISTINCT major FROM students;', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── AGGREGATE FUNCTIONS ──────────────────────────────────────────────────
  {
    id: 'b037',
    category: 'basic',
    domain: 'company_hr',
    title: 'Count All Employees',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'count'],
    prompt: 'Count the total number of employees.',
    expectedOutputDescription: 'Single row with count: 15.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT COUNT(*) FROM employees;',
    hints: [
      { text: 'COUNT(*) counts all rows including NULLs.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b038',
    category: 'basic',
    domain: 'company_hr',
    title: 'Average Salary',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'avg'],
    prompt: 'Calculate the average salary of all employees. Alias the result as avg_salary.',
    expectedOutputDescription: 'Single row: avg_salary (the average).',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT AVG(salary) AS avg_salary FROM employees;',
    hints: [
      { text: 'Use AVG(column) to calculate the mean.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b039',
    category: 'basic',
    domain: 'company_hr',
    title: 'Maximum Salary',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'max'],
    prompt: 'Find the highest salary among all employees. Alias it as max_salary.',
    expectedOutputDescription: 'Single row: max_salary.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT MAX(salary) AS max_salary FROM employees;',
    hints: [
      { text: 'MAX(column) returns the maximum value.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b040',
    category: 'basic',
    domain: 'company_hr',
    title: 'Minimum Salary',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'min'],
    prompt: 'Find the lowest salary among all employees. Alias it as min_salary.',
    expectedOutputDescription: 'Single row: min_salary.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT MIN(salary) AS min_salary FROM employees;',
    hints: [
      { text: 'MIN(column) returns the minimum value.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b041',
    category: 'basic',
    domain: 'company_hr',
    title: 'Total Payroll',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'sum'],
    prompt: 'Calculate the total salary payroll (sum of all salaries). Alias as total_payroll.',
    expectedOutputDescription: 'Single row: total_payroll.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT SUM(salary) AS total_payroll FROM employees;',
    hints: [
      { text: 'SUM(column) adds up all values in the column.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b042',
    category: 'basic',
    domain: 'retail',
    title: 'Total Revenue Potential',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'sum', 'arithmetic'],
    prompt: 'Calculate the total inventory value for all products (price × stock for each product, summed). Alias as total_inventory_value.',
    expectedOutputDescription: 'Single row: total_inventory_value.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT SUM(price * stock) AS total_inventory_value FROM products;',
    hints: [
      { text: 'You can use arithmetic inside aggregate functions: SUM(price * stock).', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b043',
    category: 'basic',
    domain: 'retail',
    title: 'Average Product Price',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'avg'],
    prompt: 'Find the average price of all products. Alias as avg_price.',
    expectedOutputDescription: 'Single row: avg_price.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT AVG(price) AS avg_price FROM products;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b044',
    category: 'basic',
    domain: 'campus',
    title: 'Total Scholarship Awarded',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'sum'],
    prompt: 'Calculate the total scholarship amount awarded across all students. Alias as total_scholarships.',
    expectedOutputDescription: 'Single row: total_scholarships.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT SUM(scholarship) AS total_scholarships FROM students;',
    hints: [],
    commonMistakes: []
  },
  // ─── ARITHMETIC / STRING FUNCTIONS ────────────────────────────────────────
  {
    id: 'b045',
    category: 'basic',
    domain: 'company_hr',
    title: 'Monthly Salary',
    difficulty: 'easy',
    points: 7,
    tags: ['arithmetic', 'select'],
    prompt: 'Show each employee\'s name and their monthly salary (annual salary divided by 12). Alias as monthly_salary.',
    expectedOutputDescription: '15 rows: name, monthly_salary.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT name, salary / 12 AS monthly_salary FROM employees;',
    hints: [
      { text: 'You can use arithmetic operators (+, -, *, /) in SELECT.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b046',
    category: 'basic',
    domain: 'retail',
    title: 'Profit Margin Per Product',
    difficulty: 'easy',
    points: 8,
    tags: ['arithmetic', 'select'],
    prompt: 'For each product, show its name and profit margin in dollars (price minus cost). Alias as profit.',
    expectedOutputDescription: '15 rows: name, profit.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT name, price - cost AS profit FROM products;',
    hints: [
      { text: 'Subtract columns using the - operator.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b047',
    category: 'basic',
    domain: 'company_hr',
    title: 'Salary After 10% Raise',
    difficulty: 'easy',
    points: 7,
    tags: ['arithmetic'],
    prompt: 'Show each employee\'s name and what their salary would be after a 10% raise. Alias as new_salary.',
    expectedOutputDescription: '15 rows: name, new_salary.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT name, salary * 1.1 AS new_salary FROM employees;',
    hints: [
      { text: 'Multiply salary by 1.1 to add 10%.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b048',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employee Name Length',
    difficulty: 'easy',
    points: 7,
    tags: ['string_functions'],
    prompt: 'Show each employee\'s name and the number of characters in their name. Alias as name_length.',
    expectedOutputDescription: '15 rows: name, name_length.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT name, LENGTH(name) AS name_length FROM employees;',
    hints: [
      { text: 'Use LENGTH(column) to get the number of characters.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b049',
    category: 'basic',
    domain: 'company_hr',
    title: 'Uppercase Department Names',
    difficulty: 'easy',
    points: 7,
    tags: ['string_functions'],
    prompt: 'Show each employee\'s name and their department in ALL CAPITALS. Alias as DEPT.',
    expectedOutputDescription: '15 rows: name, DEPT (uppercase department).',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT name, UPPER(department) AS DEPT FROM employees;',
    hints: [
      { text: 'Use UPPER(column) to convert text to uppercase.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b050',
    category: 'basic',
    domain: 'retail',
    title: 'Lowercase SKU',
    difficulty: 'easy',
    points: 7,
    tags: ['string_functions'],
    prompt: 'Show each product\'s name and its SKU in lowercase. Alias as sku_lower.',
    expectedOutputDescription: '15 rows: name, sku_lower.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT name, LOWER(sku) AS sku_lower FROM products;',
    hints: [
      { text: 'Use LOWER(column) to convert text to lowercase.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── CASE ─────────────────────────────────────────────────────────────────
  {
    id: 'b051',
    category: 'basic',
    domain: 'company_hr',
    title: 'Salary Band Classification',
    difficulty: 'medium',
    points: 12,
    tags: ['case'],
    prompt: 'Classify each employee into a salary band: "Low" (< 65000), "Mid" (65000–90000), "High" (> 90000). Show name, salary, and band.',
    expectedOutputDescription: '15 rows: name, salary, band.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT name, salary,
  CASE
    WHEN salary < 65000 THEN 'Low'
    WHEN salary BETWEEN 65000 AND 90000 THEN 'Mid'
    ELSE 'High'
  END AS band
FROM employees;`,
    hints: [
      { text: 'Use CASE WHEN ... THEN ... ELSE ... END syntax.', xpCost: 2, confidenceLevel: 'low' },
      { text: 'CASE WHEN salary < 65000 THEN \'Low\' WHEN salary <= 90000 THEN \'Mid\' ELSE \'High\' END', xpCost: 3, confidenceLevel: 'medium' }
    ],
    commonMistakes: []
  },
  {
    id: 'b052',
    category: 'basic',
    domain: 'campus',
    title: 'GPA Letter Grade',
    difficulty: 'medium',
    points: 12,
    tags: ['case'],
    prompt: 'Show each student\'s name, GPA, and a letter_grade: A (GPA >= 3.7), B (3.3–3.69), C (below 3.3).',
    expectedOutputDescription: '15 rows: name, gpa, letter_grade.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `SELECT name, gpa,
  CASE
    WHEN gpa >= 3.7 THEN 'A'
    WHEN gpa >= 3.3 THEN 'B'
    ELSE 'C'
  END AS letter_grade
FROM students;`,
    hints: [
      { text: 'CASE statements evaluate conditions in order — first match wins.', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b053',
    category: 'basic',
    domain: 'retail',
    title: 'Stock Status',
    difficulty: 'easy',
    points: 10,
    tags: ['case'],
    prompt: 'For each product show name, stock, and a status: "Out of Stock" (stock = 0), "Low" (1–50), "In Stock" (above 50).',
    expectedOutputDescription: '15 rows: name, stock, status.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT name, stock,
  CASE
    WHEN stock = 0 THEN 'Out of Stock'
    WHEN stock <= 50 THEN 'Low'
    ELSE 'In Stock'
  END AS status
FROM products;`,
    hints: [
      { text: 'Use CASE WHEN ... THEN ... END in your SELECT list.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── DATE FILTERS ─────────────────────────────────────────────────────────
  {
    id: 'b054',
    category: 'basic',
    domain: 'company_hr',
    title: 'Recent Hires',
    difficulty: 'easy',
    points: 8,
    tags: ['where', 'date'],
    prompt: 'Find all employees hired after January 1, 2021.',
    expectedOutputDescription: 'Employees hired in 2021 onwards — 6 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM employees WHERE hire_date > '2021-01-01';",
    hints: [
      { text: 'SQLite stores dates as text in YYYY-MM-DD format. String comparison works for ISO dates.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b055',
    category: 'basic',
    domain: 'retail',
    title: 'Q1 2024 Orders',
    difficulty: 'easy',
    points: 8,
    tags: ['where', 'date', 'between'],
    prompt: 'Find all orders placed in Q1 2024 (January through March 2024 inclusive).',
    expectedOutputDescription: 'Orders from Q1 2024 — 12 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT * FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-03-31';",
    hints: [
      { text: 'Use BETWEEN with date strings in YYYY-MM-DD format.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── COMBINED WHERE + ORDER BY + LIMIT ────────────────────────────────────
  {
    id: 'b056',
    category: 'basic',
    domain: 'company_hr',
    title: 'Top 3 Youngest Employees in Engineering',
    difficulty: 'easy',
    points: 8,
    tags: ['where', 'order_by', 'limit'],
    prompt: 'Find the 3 youngest employees in the Engineering department.',
    expectedOutputDescription: '3 youngest Engineering employees.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM employees WHERE department = 'Engineering' ORDER BY age ASC LIMIT 3;",
    hints: [
      { text: 'Filter first with WHERE, then sort by age ASC, then LIMIT 3.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b057',
    category: 'basic',
    domain: 'retail',
    title: 'Cheapest Out-of-Stock Products',
    difficulty: 'easy',
    points: 8,
    tags: ['where', 'order_by', 'limit'],
    prompt: 'Show the 3 cheapest products that are out of stock (stock = 0).',
    expectedOutputDescription: 'Up to 3 out-of-stock products, cheapest first.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM products WHERE stock = 0 ORDER BY price ASC LIMIT 3;',
    hints: [],
    commonMistakes: []
  },
  // ─── MORE COUNT/AGGREGATE PATTERNS ────────────────────────────────────────
  {
    id: 'b058',
    category: 'basic',
    domain: 'company_hr',
    title: 'Count Non-Null Emails',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'count', 'null'],
    prompt: 'Count only the employees who have an email address (COUNT ignores NULLs when given a column name).',
    expectedOutputDescription: 'Single row: count of employees with email (14).',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT COUNT(email) AS employees_with_email FROM employees;',
    hints: [
      { text: 'COUNT(column) skips NULL values, unlike COUNT(*).', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b059',
    category: 'basic',
    domain: 'campus',
    title: 'Average GPA',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'avg'],
    prompt: 'Calculate the average GPA of all students. Alias as avg_gpa.',
    expectedOutputDescription: 'Single row: avg_gpa.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT AVG(gpa) AS avg_gpa FROM students;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b060',
    category: 'basic',
    domain: 'retail',
    title: 'Most Expensive Product Price',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'max'],
    prompt: 'Find the price of the most expensive product. Alias as max_price.',
    expectedOutputDescription: 'Single row: max_price.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT MAX(price) AS max_price FROM products;',
    hints: [],
    commonMistakes: []
  },
  // ─── WHERE with AGGREGATES (scalar subquery teaser) ───────────────────────
  {
    id: 'b061',
    category: 'basic',
    domain: 'company_hr',
    title: 'Above-Average Salary Employees',
    difficulty: 'medium',
    points: 14,
    tags: ['where', 'aggregates', 'subquery'],
    prompt: 'Find all employees whose salary is above the overall average salary.',
    expectedOutputDescription: 'Employees earning above average — varies.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);',
    hints: [
      { text: 'Use a scalar subquery in the WHERE clause: WHERE salary > (SELECT AVG(salary) FROM employees)', xpCost: 2, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── MORE WHERE PATTERNS ──────────────────────────────────────────────────
  {
    id: 'b062',
    category: 'basic',
    domain: 'campus',
    title: 'Year 2 and 3 Students With Scholarships',
    difficulty: 'easy',
    points: 8,
    tags: ['where', 'and', 'in'],
    prompt: 'Find 2nd and 3rd year students who have a scholarship greater than 0.',
    expectedOutputDescription: 'Year 2-3 students with scholarship > 0.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM students WHERE year IN (2, 3) AND scholarship > 0;',
    hints: [
      { text: 'Combine IN for year and > for scholarship amount.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b063',
    category: 'basic',
    domain: 'retail',
    title: 'Active Orders From NY',
    difficulty: 'easy',
    points: 8,
    tags: ['where', 'and'],
    prompt: 'Find all orders with status "delivered" that were shipped to New York.',
    expectedOutputDescription: 'Delivered orders to New York — 3 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT * FROM orders WHERE status = 'delivered' AND shipping_city = 'New York';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b064',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employees Named with "son"',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'like'],
    prompt: 'Find all employees whose last name contains "son" (anywhere in their name).',
    expectedOutputDescription: 'Employees with "son" in their name — 2 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM employees WHERE name LIKE '%son%';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b065',
    category: 'basic',
    domain: 'retail',
    title: 'NOT IN — Exclude Categories',
    difficulty: 'easy',
    points: 7,
    tags: ['where', 'not_in'],
    prompt: 'List all products that are NOT in the Electronics or Sports categories.',
    expectedOutputDescription: 'Products outside Electronics and Sports — 8 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT * FROM products WHERE category NOT IN ('Electronics', 'Sports');",
    hints: [
      { text: 'Use NOT IN to exclude a list of values.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── CONCAT / SUBSTR ──────────────────────────────────────────────────────
  {
    id: 'b066',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employee Full Label',
    difficulty: 'easy',
    points: 8,
    tags: ['string_functions', 'concat'],
    prompt: 'Create a label for each employee combining their name and job title, separated by " — ". Alias as label.',
    expectedOutputDescription: '15 rows: label (e.g. "Alice Johnson — Senior Engineer").',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT name || ' — ' || job_title AS label FROM employees;",
    hints: [
      { text: 'In SQLite, use || to concatenate strings.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b067',
    category: 'basic',
    domain: 'campus',
    title: 'Student ID Email Format',
    difficulty: 'easy',
    points: 8,
    tags: ['string_functions'],
    prompt: 'Show each student\'s name and the first 4 characters of their email. Alias as email_prefix.',
    expectedOutputDescription: '15 rows: name, email_prefix.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT name, SUBSTR(email, 1, 4) AS email_prefix FROM students;',
    hints: [
      { text: 'Use SUBSTR(column, start, length) to extract part of a string.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── ROUND ────────────────────────────────────────────────────────────────
  {
    id: 'b068',
    category: 'basic',
    domain: 'company_hr',
    title: 'Rounded Monthly Salary',
    difficulty: 'easy',
    points: 7,
    tags: ['arithmetic', 'round'],
    prompt: 'Show each employee\'s name and their monthly salary rounded to 2 decimal places. Alias as monthly_salary.',
    expectedOutputDescription: '15 rows: name, monthly_salary (rounded).',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT name, ROUND(salary / 12, 2) AS monthly_salary FROM employees;',
    hints: [
      { text: 'Use ROUND(value, decimals) to round to a specified number of decimal places.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b069',
    category: 'basic',
    domain: 'retail',
    title: 'Profit Margin Percentage',
    difficulty: 'easy',
    points: 9,
    tags: ['arithmetic', 'round'],
    prompt: 'For each product, show name and profit margin as a percentage of price, rounded to 1 decimal. Alias as margin_pct.',
    expectedOutputDescription: '15 rows: name, margin_pct.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT name, ROUND((price - cost) / price * 100, 1) AS margin_pct FROM products;',
    hints: [
      { text: 'Profit margin % = (price - cost) / price * 100', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── COALESCE / IFNULL ────────────────────────────────────────────────────
  {
    id: 'b070',
    category: 'basic',
    domain: 'company_hr',
    title: 'Null-Safe Email Display',
    difficulty: 'easy',
    points: 9,
    tags: ['null', 'coalesce'],
    prompt: 'Show each employee\'s name and email. Where email is NULL, display "No Email" instead. Alias as email_display.',
    expectedOutputDescription: '15 rows: name, email_display.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT name, COALESCE(email, 'No Email') AS email_display FROM employees;",
    hints: [
      { text: 'COALESCE(column, fallback) returns the first non-NULL value.', xpCost: 1, confidenceLevel: 'low' },
      { text: 'You can also use IFNULL(email, \'No Email\') in SQLite.', xpCost: 2, confidenceLevel: 'medium' }
    ],
    commonMistakes: []
  },
  {
    id: 'b071',
    category: 'basic',
    domain: 'campus',
    title: 'Dorm or Off-Campus',
    difficulty: 'easy',
    points: 8,
    tags: ['null', 'coalesce'],
    prompt: 'Show each student\'s name and dorm. Where dorm is NULL, display "Off-Campus". Alias as housing.',
    expectedOutputDescription: '15 rows: name, housing.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: "SELECT name, COALESCE(dorm, 'Off-Campus') AS housing FROM students;",
    hints: [
      { text: 'COALESCE returns the first non-NULL value in its argument list.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // ─── COMBINED QUESTIONS ───────────────────────────────────────────────────
  {
    id: 'b072',
    category: 'basic',
    domain: 'company_hr',
    title: 'Senior Engineers',
    difficulty: 'easy',
    points: 7,
    tags: ['where', 'like'],
    prompt: 'Find all employees whose job_title contains "Senior".',
    expectedOutputDescription: 'Employees with Senior in title — 3 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM employees WHERE job_title LIKE '%Senior%';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b073',
    category: 'basic',
    domain: 'retail',
    title: 'High Stock Electronics',
    difficulty: 'easy',
    points: 7,
    tags: ['where', 'and'],
    prompt: 'Find Electronics products with more than 200 units in stock.',
    expectedOutputDescription: 'Electronics with stock > 200 — 2 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT * FROM products WHERE category = 'Electronics' AND stock > 200;",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b074',
    category: 'basic',
    domain: 'campus',
    title: 'Honor Students on Scholarship',
    difficulty: 'easy',
    points: 8,
    tags: ['where', 'and'],
    prompt: 'Find students with GPA >= 3.7 who also receive a scholarship (scholarship > 0).',
    expectedOutputDescription: 'High-achieving scholarship students.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM students WHERE gpa >= 3.7 AND scholarship > 0;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b075',
    category: 'basic',
    domain: 'company_hr',
    title: 'Department Headcount',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'count'],
    prompt: 'Count how many employees are in the Engineering department only.',
    expectedOutputDescription: 'Single row: count (5).',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT COUNT(*) AS engineering_headcount FROM employees WHERE department = 'Engineering';",
    hints: [
      { text: 'Add a WHERE clause before the COUNT to filter first.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b076',
    category: 'basic',
    domain: 'retail',
    title: 'Average Price of Electronics',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'avg', 'where'],
    prompt: 'Calculate the average price of Electronics products only. Alias as avg_electronics_price.',
    expectedOutputDescription: 'Single row: avg_electronics_price.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT AVG(price) AS avg_electronics_price FROM products WHERE category = 'Electronics';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b077',
    category: 'basic',
    domain: 'campus',
    title: 'Freshman Count',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'count', 'where'],
    prompt: 'How many first-year (year = 1) students are there?',
    expectedOutputDescription: 'Single row: count (3).',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT COUNT(*) AS freshman_count FROM students WHERE year = 1;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b078',
    category: 'basic',
    domain: 'company_hr',
    title: 'Max Salary in Sales',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'max', 'where'],
    prompt: 'Find the highest salary in the Sales department. Alias as max_sales_salary.',
    expectedOutputDescription: 'Single row: max_sales_salary.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT MAX(salary) AS max_sales_salary FROM employees WHERE department = 'Sales';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b079',
    category: 'basic',
    domain: 'retail',
    title: 'Total Orders Count',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'count'],
    prompt: 'Count the total number of orders in the orders table.',
    expectedOutputDescription: 'Single row: count (15).',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT COUNT(*) AS total_orders FROM orders;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b080',
    category: 'basic',
    domain: 'campus',
    title: 'Number of CS Courses',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'count', 'where'],
    prompt: 'Count how many courses belong to the Computer Science department.',
    expectedOutputDescription: 'Single row: count (4).',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: "SELECT COUNT(*) AS cs_courses FROM courses WHERE department = 'Computer Science';",
    hints: [],
    commonMistakes: []
  },
  // ─── ADDITIONAL BASIC QUESTIONS (81–150) ──────────────────────────────────
  {
    id: 'b081',
    category: 'basic',
    domain: 'company_hr',
    title: 'Project Count',
    difficulty: 'easy',
    points: 5,
    tags: ['select', 'count'],
    prompt: 'How many projects are there in total?',
    expectedOutputDescription: 'Single row: count (6).',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT COUNT(*) AS project_count FROM projects;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b082',
    category: 'basic',
    domain: 'company_hr',
    title: 'Active Projects',
    difficulty: 'easy',
    points: 6,
    tags: ['where'],
    prompt: 'Find all projects with status "active".',
    expectedOutputDescription: 'Active projects — 3 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM projects WHERE status = 'active';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b083',
    category: 'basic',
    domain: 'company_hr',
    title: 'Projects With Budget Over 200k',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'comparison'],
    prompt: 'List all projects with a budget greater than 200000.',
    expectedOutputDescription: 'High-budget projects — 3 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM projects WHERE budget > 200000;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b084',
    category: 'basic',
    domain: 'retail',
    title: 'Count Products by Stock Level',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'count', 'where'],
    prompt: 'Count how many products are in stock (stock > 0).',
    expectedOutputDescription: 'Single row: count (14).',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT COUNT(*) AS in_stock_count FROM products WHERE stock > 0;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b085',
    category: 'basic',
    domain: 'retail',
    title: 'Platinum Customers',
    difficulty: 'easy',
    points: 6,
    tags: ['where'],
    prompt: 'Find all customers with a "platinum" tier.',
    expectedOutputDescription: 'Platinum customers — 2 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT * FROM customers WHERE tier = 'platinum';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b086',
    category: 'basic',
    domain: 'retail',
    title: 'Orders Over $150',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'comparison'],
    prompt: 'Find all orders with a total amount greater than 150.',
    expectedOutputDescription: 'Orders over $150 — 7 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM orders WHERE total_amount > 150;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b087',
    category: 'basic',
    domain: 'campus',
    title: 'Courses Worth 4 Credits',
    difficulty: 'easy',
    points: 6,
    tags: ['where'],
    prompt: 'List all courses worth exactly 4 credits.',
    expectedOutputDescription: 'Four-credit courses — 6 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM courses WHERE credits = 4;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b088',
    category: 'basic',
    domain: 'campus',
    title: 'Fall 2024 Courses',
    difficulty: 'easy',
    points: 6,
    tags: ['where'],
    prompt: 'List all courses offered in the "Fall 2024" semester.',
    expectedOutputDescription: 'Fall 2024 courses — 8 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: "SELECT * FROM courses WHERE semester = 'Fall 2024';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b089',
    category: 'basic',
    domain: 'campus',
    title: 'Students Sorted by Year',
    difficulty: 'easy',
    points: 6,
    tags: ['order_by'],
    prompt: 'List all students ordered by year (ascending), then by name (ascending) within each year.',
    expectedOutputDescription: '15 students sorted by year ASC, then name ASC.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM students ORDER BY year ASC, name ASC;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b090',
    category: 'basic',
    domain: 'retail',
    title: 'Most Recent Orders',
    difficulty: 'easy',
    points: 6,
    tags: ['order_by', 'limit'],
    prompt: 'Show the 5 most recent orders (by order_date).',
    expectedOutputDescription: '5 most recent orders.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM orders ORDER BY order_date DESC LIMIT 5;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b091',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employee Age Range',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'between'],
    prompt: 'Find employees aged between 25 and 35 (inclusive).',
    expectedOutputDescription: 'Employees aged 25-35.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM employees WHERE age BETWEEN 25 AND 35;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b092',
    category: 'basic',
    domain: 'retail',
    title: 'Cancelled Orders',
    difficulty: 'easy',
    points: 5,
    tags: ['where'],
    prompt: 'Find all cancelled orders.',
    expectedOutputDescription: 'Cancelled orders — 1 row.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT * FROM orders WHERE status = 'cancelled';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b093',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employees Hired in 2019',
    difficulty: 'easy',
    points: 7,
    tags: ['where', 'like', 'date'],
    prompt: 'Find all employees hired in the year 2019.',
    expectedOutputDescription: 'Employees hired in 2019 — 3 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM employees WHERE hire_date LIKE '2019%';",
    hints: [
      { text: 'Use LIKE \'2019%\' to match dates starting with 2019.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b094',
    category: 'basic',
    domain: 'campus',
    title: 'Top Scholarship Recipients',
    difficulty: 'easy',
    points: 7,
    tags: ['order_by', 'limit'],
    prompt: 'Show the top 3 students with the largest scholarships.',
    expectedOutputDescription: 'Top 3 scholarship students.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM students ORDER BY scholarship DESC LIMIT 3;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b095',
    category: 'basic',
    domain: 'retail',
    title: 'Products Sorted by Category then Name',
    difficulty: 'easy',
    points: 6,
    tags: ['order_by'],
    prompt: 'List all products sorted by category (A-Z), then by name (A-Z) within each category.',
    expectedOutputDescription: '15 products sorted by category, then name.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM products ORDER BY category ASC, name ASC;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b096',
    category: 'basic',
    domain: 'company_hr',
    title: 'Distinct Job Titles',
    difficulty: 'easy',
    points: 6,
    tags: ['distinct'],
    prompt: 'List all unique job titles in the company.',
    expectedOutputDescription: 'Distinct job titles — up to 8 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT DISTINCT job_title FROM employees;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b097',
    category: 'basic',
    domain: 'campus',
    title: 'Unique Dorm Buildings',
    difficulty: 'easy',
    points: 6,
    tags: ['distinct', 'null'],
    prompt: 'List all unique dorm names (excluding NULLs). Order alphabetically.',
    expectedOutputDescription: 'Distinct non-null dorm names — 3 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT DISTINCT dorm FROM students WHERE dorm IS NOT NULL ORDER BY dorm;',
    hints: [
      { text: 'Filter out NULL dorms with WHERE dorm IS NOT NULL.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b098',
    category: 'basic',
    domain: 'retail',
    title: 'Distinct Order Statuses',
    difficulty: 'easy',
    points: 5,
    tags: ['distinct'],
    prompt: 'List all unique order statuses.',
    expectedOutputDescription: 'Distinct statuses — 3 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT DISTINCT status FROM orders;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b099',
    category: 'basic',
    domain: 'company_hr',
    title: 'Total Budget of Active Projects',
    difficulty: 'easy',
    points: 8,
    tags: ['aggregates', 'sum', 'where'],
    prompt: 'Calculate the total budget of all active projects. Alias as active_budget.',
    expectedOutputDescription: 'Single row: active_budget.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT SUM(budget) AS active_budget FROM projects WHERE status = 'active';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b100',
    category: 'basic',
    domain: 'company_hr',
    title: 'Min and Max Employee Age',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'min', 'max'],
    prompt: 'Find the youngest and oldest employee ages in a single query. Alias as min_age and max_age.',
    expectedOutputDescription: 'Single row: min_age, max_age.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT MIN(age) AS min_age, MAX(age) AS max_age FROM employees;',
    hints: [
      { text: 'You can use multiple aggregate functions in one SELECT.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  // Continue with more basic questions...
  {
    id: 'b101',
    category: 'basic',
    domain: 'campus',
    title: 'Total Credits Enrolled',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'sum'],
    prompt: 'Sum all credit values from the courses table. Alias as total_credits.',
    expectedOutputDescription: 'Single row: total_credits.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT SUM(credits) AS total_credits FROM courses;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b102',
    category: 'basic',
    domain: 'retail',
    title: 'Total Revenue from Delivered Orders',
    difficulty: 'easy',
    points: 8,
    tags: ['aggregates', 'sum', 'where'],
    prompt: 'Calculate the total revenue from all delivered orders. Alias as delivered_revenue.',
    expectedOutputDescription: 'Single row: delivered_revenue.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT SUM(total_amount) AS delivered_revenue FROM orders WHERE status = 'delivered';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b103',
    category: 'basic',
    domain: 'company_hr',
    title: 'Research Department Stats',
    difficulty: 'easy',
    points: 8,
    tags: ['aggregates', 'where'],
    prompt: 'Find the count, min salary, and max salary of employees in the Research department.',
    expectedOutputDescription: 'Single row: count, min_salary, max_salary.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT COUNT(*) AS count, MIN(salary) AS min_salary, MAX(salary) AS max_salary FROM employees WHERE department = 'Research';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b104',
    category: 'basic',
    domain: 'campus',
    title: 'Max Club Budget',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'max'],
    prompt: 'Find the highest budget among all clubs. Alias as max_club_budget.',
    expectedOutputDescription: 'Single row: max_club_budget.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT MAX(budget) AS max_club_budget FROM clubs;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b105',
    category: 'basic',
    domain: 'retail',
    title: 'Lowest-Cost Product',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'min'],
    prompt: 'Find the lowest cost among all products. Alias as min_cost.',
    expectedOutputDescription: 'Single row: min_cost.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT MIN(cost) AS min_cost FROM products;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b106',
    category: 'basic',
    domain: 'company_hr',
    title: 'Engineer Salary Stats',
    difficulty: 'easy',
    points: 8,
    tags: ['aggregates', 'where'],
    prompt: 'Show the average, minimum, and maximum salary for Engineering employees.',
    expectedOutputDescription: 'Single row: avg_salary, min_salary, max_salary.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT AVG(salary) AS avg_salary, MIN(salary) AS min_salary, MAX(salary) AS max_salary FROM employees WHERE department = 'Engineering';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b107',
    category: 'basic',
    domain: 'campus',
    title: 'GPA Range',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates'],
    prompt: 'Find the min and max GPA among all students.',
    expectedOutputDescription: 'Single row: min_gpa, max_gpa.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT MIN(gpa) AS min_gpa, MAX(gpa) AS max_gpa FROM students;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b108',
    category: 'basic',
    domain: 'retail',
    title: 'Product Count by Category Filter',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'count', 'where'],
    prompt: 'Count the number of Sports products.',
    expectedOutputDescription: 'Single row: count (3).',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT COUNT(*) AS sports_count FROM products WHERE category = 'Sports';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b109',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employee Name and Hire Year',
    difficulty: 'easy',
    points: 8,
    tags: ['string_functions', 'date'],
    prompt: 'Show each employee\'s name and the year they were hired (first 4 characters of hire_date). Alias as hire_year.',
    expectedOutputDescription: '15 rows: name, hire_year.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT name, SUBSTR(hire_date, 1, 4) AS hire_year FROM employees;',
    hints: [
      { text: 'SUBSTR(hire_date, 1, 4) extracts the first 4 characters (the year).', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b110',
    category: 'basic',
    domain: 'campus',
    title: 'Course Code and Title',
    difficulty: 'easy',
    points: 5,
    tags: ['select', 'columns'],
    prompt: 'Select only the course code and title from the courses table.',
    expectedOutputDescription: '10 rows: code, title.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT code, title FROM courses;',
    hints: [],
    commonMistakes: []
  },
  // Questions 111-150 (continued variety)
  {
    id: 'b111',
    category: 'basic',
    domain: 'retail',
    title: 'Supplier Names',
    difficulty: 'easy',
    points: 5,
    tags: ['select'],
    prompt: 'Show the name and country of all suppliers, ordered by country.',
    expectedOutputDescription: '5 rows: name, country — sorted by country.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT name, country FROM suppliers ORDER BY country;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b112',
    category: 'basic',
    domain: 'retail',
    title: 'Top-Rated Suppliers',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'comparison'],
    prompt: 'Find all suppliers with a rating of 4.5 or higher.',
    expectedOutputDescription: 'Highly rated suppliers — 2 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM suppliers WHERE rating >= 4.5;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b113',
    category: 'basic',
    domain: 'company_hr',
    title: 'NY or Boston Departments',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'in'],
    prompt: 'Find all departments located in New York or Boston.',
    expectedOutputDescription: 'Departments in NY or Boston — 3 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM departments WHERE location IN ('New York', 'Boston');",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b114',
    category: 'basic',
    domain: 'company_hr',
    title: 'High Budget Departments',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'comparison'],
    prompt: 'List all departments with a budget greater than 1 million.',
    expectedOutputDescription: 'Departments with budget > 1000000 — 2 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM departments WHERE budget > 1000000;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b115',
    category: 'basic',
    domain: 'campus',
    title: 'Academic Clubs',
    difficulty: 'easy',
    points: 5,
    tags: ['where'],
    prompt: 'Find all clubs in the "Academic" category.',
    expectedOutputDescription: 'Academic clubs — 3 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: "SELECT * FROM clubs WHERE category = 'Academic';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b116',
    category: 'basic',
    domain: 'campus',
    title: 'Large Clubs',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'comparison'],
    prompt: 'Find clubs with more than 30 members.',
    expectedOutputDescription: 'Large clubs — 3 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM clubs WHERE members_count > 30;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b117',
    category: 'basic',
    domain: 'retail',
    title: 'New York Customers',
    difficulty: 'easy',
    points: 5,
    tags: ['where'],
    prompt: 'Find all customers from New York.',
    expectedOutputDescription: 'NYC customers — 2 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT * FROM customers WHERE city = 'New York';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b118',
    category: 'basic',
    domain: 'retail',
    title: 'Customers Sorted by Join Date',
    difficulty: 'easy',
    points: 5,
    tags: ['order_by'],
    prompt: 'List all customers ordered by their joined_date, oldest first.',
    expectedOutputDescription: '10 customers by joined_date ASC.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM customers ORDER BY joined_date ASC;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b119',
    category: 'basic',
    domain: 'company_hr',
    title: 'Departments Alphabetically',
    difficulty: 'easy',
    points: 5,
    tags: ['select', 'order_by'],
    prompt: 'List all department names in alphabetical order.',
    expectedOutputDescription: '6 department names, sorted A-Z.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT name FROM departments ORDER BY name;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b120',
    category: 'basic',
    domain: 'campus',
    title: 'Total Members Across Clubs',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'sum'],
    prompt: 'Find the total number of club memberships across all clubs (sum of members_count). Alias as total_members.',
    expectedOutputDescription: 'Single row: total_members.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT SUM(members_count) AS total_members FROM clubs;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b121',
    category: 'basic',
    domain: 'company_hr',
    title: 'Average Department Budget',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'avg'],
    prompt: 'Calculate the average budget across all departments. Alias as avg_dept_budget.',
    expectedOutputDescription: 'Single row: avg_dept_budget.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT AVG(budget) AS avg_dept_budget FROM departments;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b122',
    category: 'basic',
    domain: 'retail',
    title: 'Sum of All Stock',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'sum'],
    prompt: 'Calculate the total number of units across all products. Alias as total_stock.',
    expectedOutputDescription: 'Single row: total_stock.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT SUM(stock) AS total_stock FROM products;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b123',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employee Name Trimmed',
    difficulty: 'easy',
    points: 7,
    tags: ['string_functions'],
    prompt: 'Show each employee\'s name and the name with any surrounding whitespace trimmed. Alias as trimmed_name.',
    expectedOutputDescription: '15 rows: name, trimmed_name.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT name, TRIM(name) AS trimmed_name FROM employees;',
    hints: [
      { text: 'Use TRIM(column) to remove leading and trailing whitespace.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b124',
    category: 'basic',
    domain: 'campus',
    title: 'Course Title in Uppercase',
    difficulty: 'easy',
    points: 6,
    tags: ['string_functions'],
    prompt: 'Show course code and title, with the title in UPPERCASE. Alias the uppercase title as TITLE.',
    expectedOutputDescription: '10 rows: code, TITLE.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT code, UPPER(title) AS TITLE FROM courses;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b125',
    category: 'basic',
    domain: 'retail',
    title: 'Product Name First 5 Chars',
    difficulty: 'easy',
    points: 7,
    tags: ['string_functions'],
    prompt: 'Show each product\'s full name and the first 5 characters of its name. Alias as short_name.',
    expectedOutputDescription: '15 rows: name, short_name.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT name, SUBSTR(name, 1, 5) AS short_name FROM products;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b126',
    category: 'basic',
    domain: 'company_hr',
    title: 'Name and Email Concatenated',
    difficulty: 'easy',
    points: 8,
    tags: ['string_functions', 'concat'],
    prompt: 'Show each employee\'s name and email combined as "Name <email>". Alias as contact. Exclude employees with no email.',
    expectedOutputDescription: '14 rows: contact in "Name <email>" format.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT name || ' <' || email || '>' AS contact FROM employees WHERE email IS NOT NULL;",
    hints: [
      { text: 'Use || for string concatenation, and filter NULLs with IS NOT NULL.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b127',
    category: 'basic',
    domain: 'retail',
    title: 'Price Rounded to Nearest Dollar',
    difficulty: 'easy',
    points: 7,
    tags: ['arithmetic', 'round'],
    prompt: 'Show each product\'s name and its price rounded to the nearest whole dollar. Alias as rounded_price.',
    expectedOutputDescription: '15 rows: name, rounded_price.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT name, ROUND(price, 0) AS rounded_price FROM products;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b128',
    category: 'basic',
    domain: 'campus',
    title: 'Scholarship Classification',
    difficulty: 'medium',
    points: 12,
    tags: ['case'],
    prompt: 'Show each student\'s name and a scholarship_tier: "None" (0), "Partial" (1–5000), "Full" (above 5000).',
    expectedOutputDescription: '15 rows: name, scholarship_tier.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: `SELECT name,
  CASE
    WHEN scholarship = 0 THEN 'None'
    WHEN scholarship <= 5000 THEN 'Partial'
    ELSE 'Full'
  END AS scholarship_tier
FROM students;`,
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b129',
    category: 'basic',
    domain: 'company_hr',
    title: 'Project Status Label',
    difficulty: 'easy',
    points: 10,
    tags: ['case'],
    prompt: 'Show each project\'s name and a status_label: "Ongoing" for active projects, "Done" for completed, "Other" for anything else.',
    expectedOutputDescription: '6 rows: name, status_label.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT name,
  CASE status
    WHEN 'active' THEN 'Ongoing'
    WHEN 'completed' THEN 'Done'
    ELSE 'Other'
  END AS status_label
FROM projects;`,
    hints: [
      { text: 'You can use CASE column WHEN value THEN result END for simple equality checks.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b130',
    category: 'basic',
    domain: 'retail',
    title: 'Order Value Category',
    difficulty: 'medium',
    points: 12,
    tags: ['case'],
    prompt: 'Label each order with its value category: "Small" (< 50), "Medium" (50–150), "Large" (> 150). Show order id, total_amount, and label.',
    expectedOutputDescription: '15 rows: id, total_amount, label.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: `SELECT id, total_amount,
  CASE
    WHEN total_amount < 50 THEN 'Small'
    WHEN total_amount <= 150 THEN 'Medium'
    ELSE 'Large'
  END AS label
FROM orders;`,
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b131',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employees With or Without Manager',
    difficulty: 'easy',
    points: 10,
    tags: ['case', 'null'],
    prompt: 'Show each employee\'s name and a has_manager column: "Yes" if manager_id is not null, "No" otherwise.',
    expectedOutputDescription: '15 rows: name, has_manager.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: `SELECT name,
  CASE
    WHEN manager_id IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END AS has_manager
FROM employees;`,
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b132',
    category: 'basic',
    domain: 'retail',
    title: 'Orders With Tax',
    difficulty: 'easy',
    points: 8,
    tags: ['arithmetic'],
    prompt: 'Show order id, total_amount, and total amount with 8% tax added (total_amount * 1.08). Alias tax amount as amount_with_tax, rounded to 2 decimals.',
    expectedOutputDescription: '15 rows: id, total_amount, amount_with_tax.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT id, total_amount, ROUND(total_amount * 1.08, 2) AS amount_with_tax FROM orders;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b133',
    category: 'basic',
    domain: 'campus',
    title: 'Weighted GPA Points',
    difficulty: 'easy',
    points: 8,
    tags: ['arithmetic'],
    prompt: 'Show each student\'s name and GPA multiplied by 25 (for a 100-point scale). Alias as score.',
    expectedOutputDescription: '15 rows: name, score.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT name, gpa * 25 AS score FROM students;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b134',
    category: 'basic',
    domain: 'company_hr',
    title: 'Total Project Budget',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'sum'],
    prompt: 'Calculate the total budget of ALL projects combined. Alias as total_project_budget.',
    expectedOutputDescription: 'Single row: total_project_budget.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT SUM(budget) AS total_project_budget FROM projects;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b135',
    category: 'basic',
    domain: 'campus',
    title: 'Count Students Per Year Group',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'count', 'where'],
    prompt: 'Count how many 4th-year (senior) students there are.',
    expectedOutputDescription: 'Single row: count (4).',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT COUNT(*) AS senior_count FROM students WHERE year = 4;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b136',
    category: 'basic',
    domain: 'retail',
    title: 'Customers From LA',
    difficulty: 'easy',
    points: 5,
    tags: ['where'],
    prompt: 'Find customers from Los Angeles.',
    expectedOutputDescription: 'LA customers — 2 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT * FROM customers WHERE city = 'Los Angeles';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b137',
    category: 'basic',
    domain: 'company_hr',
    title: 'Finance Department Employees',
    difficulty: 'easy',
    points: 5,
    tags: ['where'],
    prompt: 'List all employees in the Finance department.',
    expectedOutputDescription: 'Finance employees — 2 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: "SELECT * FROM employees WHERE department = 'Finance';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b138',
    category: 'basic',
    domain: 'campus',
    title: 'Biology Students',
    difficulty: 'easy',
    points: 5,
    tags: ['where'],
    prompt: 'List all students majoring in Biology.',
    expectedOutputDescription: 'Biology students — 3 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: "SELECT * FROM students WHERE major = 'Biology';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b139',
    category: 'basic',
    domain: 'retail',
    title: 'Average Order Amount',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'avg'],
    prompt: 'Calculate the average order total_amount. Alias as avg_order_value.',
    expectedOutputDescription: 'Single row: avg_order_value.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT AVG(total_amount) AS avg_order_value FROM orders;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b140',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employees Earning Over 100k',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'comparison'],
    prompt: 'Find all employees with a salary over $100,000.',
    expectedOutputDescription: 'High earners — 2 rows.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM employees WHERE salary > 100000;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b141',
    category: 'basic',
    domain: 'campus',
    title: 'Courses by Prof. Morris',
    difficulty: 'easy',
    points: 5,
    tags: ['where'],
    prompt: 'Find all courses taught by Prof. Morris.',
    expectedOutputDescription: 'Courses by Prof. Morris — 2 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: "SELECT * FROM courses WHERE instructor = 'Prof. Morris';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b142',
    category: 'basic',
    domain: 'retail',
    title: 'Products From USA Suppliers',
    difficulty: 'easy',
    points: 7,
    tags: ['where'],
    prompt: 'Find all products supplied by supplier_id 1 (TechParts Inc, USA).',
    expectedOutputDescription: 'Products from supplier 1 — 4 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: 'SELECT * FROM products WHERE supplier_id = 1;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b143',
    category: 'basic',
    domain: 'company_hr',
    title: 'Oldest and Newest Hire',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates'],
    prompt: 'Find the earliest and latest hire_date in the employees table. Alias as first_hire and last_hire.',
    expectedOutputDescription: 'Single row: first_hire, last_hire.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT MIN(hire_date) AS first_hire, MAX(hire_date) AS last_hire FROM employees;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b144',
    category: 'basic',
    domain: 'campus',
    title: 'Average Club Budget',
    difficulty: 'easy',
    points: 6,
    tags: ['aggregates', 'avg'],
    prompt: 'Calculate the average budget of all clubs. Alias as avg_club_budget.',
    expectedOutputDescription: 'Single row: avg_club_budget.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT AVG(budget) AS avg_club_budget FROM clubs;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b145',
    category: 'basic',
    domain: 'retail',
    title: 'Sum of Electronics Value',
    difficulty: 'easy',
    points: 7,
    tags: ['aggregates', 'sum', 'where'],
    prompt: 'Calculate the total stock value (price * stock) of all Electronics products. Alias as electronics_value.',
    expectedOutputDescription: 'Single row: electronics_value.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT SUM(price * stock) AS electronics_value FROM products WHERE category = 'Electronics';",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b146',
    category: 'basic',
    domain: 'company_hr',
    title: 'Employees With Manager',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'null'],
    prompt: 'Find all employees who DO have a manager (manager_id is NOT NULL).',
    expectedOutputDescription: '9 employees with a manager.',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT * FROM employees WHERE manager_id IS NOT NULL;',
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b147',
    category: 'basic',
    domain: 'campus',
    title: 'Non-CS Non-Math Students',
    difficulty: 'easy',
    points: 7,
    tags: ['where', 'not_in'],
    prompt: 'Find students whose major is neither Computer Science nor Mathematics.',
    expectedOutputDescription: 'Non-CS non-Math students — 9 rows.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: "SELECT * FROM students WHERE major NOT IN ('Computer Science', 'Mathematics');",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b148',
    category: 'basic',
    domain: 'retail',
    title: 'Gold or Platinum Customers',
    difficulty: 'easy',
    points: 6,
    tags: ['where', 'in'],
    prompt: 'Find customers with a tier of "gold" or "platinum".',
    expectedOutputDescription: 'Premium customers — 4 rows.',
    schemaSQL: retail.schemaSQL,
    seedSQL: retail.seedSQL,
    solutionSQL: "SELECT * FROM customers WHERE tier IN ('gold', 'platinum');",
    hints: [],
    commonMistakes: []
  },
  {
    id: 'b149',
    category: 'basic',
    domain: 'company_hr',
    title: 'Total Employees vs. With Email',
    difficulty: 'easy',
    points: 8,
    tags: ['aggregates', 'count'],
    prompt: 'Show total employee count and count of those with email addresses, in one query. Alias as total and with_email.',
    expectedOutputDescription: 'Single row: total (15), with_email (14).',
    schemaSQL: company_hr.schemaSQL,
    seedSQL: company_hr.seedSQL,
    solutionSQL: 'SELECT COUNT(*) AS total, COUNT(email) AS with_email FROM employees;',
    hints: [
      { text: 'COUNT(*) counts all rows; COUNT(col) skips NULLs.', xpCost: 1, confidenceLevel: 'low' }
    ],
    commonMistakes: []
  },
  {
    id: 'b150',
    category: 'basic',
    domain: 'campus',
    title: 'Recent Customer Joiners',
    difficulty: 'easy',
    points: 7,
    tags: ['where', 'date', 'order_by'],
    prompt: 'Find students enrolled in year 1 or 2 with a GPA above 3.5, ordered by GPA descending.',
    expectedOutputDescription: 'Year 1-2 students with GPA > 3.5, sorted.',
    schemaSQL: campus.schemaSQL,
    seedSQL: campus.seedSQL,
    solutionSQL: 'SELECT * FROM students WHERE year IN (1, 2) AND gpa > 3.5 ORDER BY gpa DESC;',
    hints: [],
    commonMistakes: []
  }
];
