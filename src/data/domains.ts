// Domain schemas and seed data for SQLQuest
// Three themed domains: company_hr, retail, campus

export type Domain = 'company_hr' | 'retail' | 'campus';

export const domainSchemas: Record<Domain, { schemaSQL: string; seedSQL: string }> = {
  company_hr: {
    schemaSQL: `CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  salary REAL NOT NULL,
  hire_date TEXT NOT NULL,
  manager_id INTEGER,
  job_title TEXT NOT NULL,
  age INTEGER,
  email TEXT
);

CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  budget REAL,
  location TEXT
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  start_date TEXT,
  end_date TEXT,
  budget REAL,
  status TEXT
);

CREATE TABLE employee_projects (
  employee_id INTEGER,
  project_id INTEGER,
  role TEXT,
  hours_worked INTEGER,
  PRIMARY KEY (employee_id, project_id)
);`,
    seedSQL: `INSERT INTO departments VALUES
  (1, 'Engineering', 1500000, 'New York'),
  (2, 'Marketing', 800000, 'Los Angeles'),
  (3, 'Sales', 950000, 'Chicago'),
  (4, 'HR', 400000, 'New York'),
  (5, 'Finance', 600000, 'Boston'),
  (6, 'Research', 1200000, 'San Francisco');

INSERT INTO employees VALUES
  (1, 'Alice Johnson', 'Engineering', 95000, '2019-03-15', NULL, 'Senior Engineer', 34, 'alice@company.com'),
  (2, 'Bob Smith', 'Engineering', 82000, '2020-07-01', 1, 'Software Engineer', 29, 'bob@company.com'),
  (3, 'Carol White', 'Marketing', 72000, '2018-11-20', NULL, 'Marketing Manager', 41, 'carol@company.com'),
  (4, 'David Brown', 'Sales', 65000, '2021-01-10', NULL, 'Sales Representative', 27, 'david@company.com'),
  (5, 'Eve Davis', 'Engineering', 110000, '2017-05-22', 1, 'Lead Engineer', 38, 'eve@company.com'),
  (6, 'Frank Miller', 'HR', 58000, '2022-03-01', NULL, 'HR Specialist', 25, 'frank@company.com'),
  (7, 'Grace Wilson', 'Finance', 78000, '2020-09-14', NULL, 'Financial Analyst', 32, 'grace@company.com'),
  (8, 'Henry Moore', 'Research', 92000, '2019-01-30', NULL, 'Research Scientist', 36, 'henry@company.com'),
  (9, 'Iris Taylor', 'Engineering', 88000, '2021-06-15', 1, 'Software Engineer', 28, 'iris@company.com'),
  (10, 'Jack Anderson', 'Sales', 70000, '2018-08-05', 4, 'Senior Sales Rep', 45, 'jack@company.com'),
  (11, 'Kate Thomas', 'Marketing', 68000, '2022-01-20', 3, 'Marketing Specialist', 26, 'kate@company.com'),
  (12, 'Liam Jackson', 'Engineering', 95000, '2019-12-01', 1, 'Senior Engineer', 35, 'liam@company.com'),
  (13, 'Mia Harris', 'Finance', 62000, '2023-02-15', 7, 'Junior Analyst', 23, 'mia@company.com'),
  (14, 'Noah Martin', 'Research', 105000, '2016-09-10', 8, 'Senior Scientist', 42, 'noah@company.com'),
  (15, 'Olivia Lee', 'HR', 54000, '2022-07-01', 6, 'HR Assistant', 22, NULL);

INSERT INTO projects VALUES
  (1, 'Apollo Platform', 'Engineering', '2023-01-01', '2023-12-31', 500000, 'completed'),
  (2, 'Brand Refresh', 'Marketing', '2023-03-01', '2023-09-30', 150000, 'completed'),
  (3, 'CRM Upgrade', 'Sales', '2023-06-01', NULL, 200000, 'active'),
  (4, 'AI Research', 'Research', '2022-01-01', NULL, 800000, 'active'),
  (5, 'Budget Automation', 'Finance', '2023-04-01', '2023-10-31', 80000, 'completed'),
  (6, 'Onboarding Portal', 'HR', '2023-07-01', NULL, 60000, 'active');

INSERT INTO employee_projects VALUES
  (1, 1, 'Lead', 480),
  (2, 1, 'Developer', 350),
  (5, 1, 'Architect', 200),
  (9, 1, 'Developer', 300),
  (3, 2, 'Lead', 400),
  (11, 2, 'Contributor', 250),
  (4, 3, 'Lead', 320),
  (10, 3, 'Contributor', 180),
  (8, 4, 'Lead', 600),
  (14, 4, 'Lead', 550),
  (7, 5, 'Lead', 280),
  (13, 5, 'Contributor', 150),
  (6, 6, 'Lead', 200),
  (15, 6, 'Contributor', 120);`
  },

  retail: {
    schemaSQL: `CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  cost REAL NOT NULL,
  stock INTEGER NOT NULL,
  supplier_id INTEGER,
  sku TEXT UNIQUE
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  city TEXT,
  joined_date TEXT,
  tier TEXT DEFAULT 'regular'
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  total_amount REAL,
  status TEXT DEFAULT 'pending',
  shipping_city TEXT
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);

CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  rating REAL
);`,
    seedSQL: `INSERT INTO suppliers VALUES
  (1, 'TechParts Inc', 'USA', 4.5),
  (2, 'Global Goods', 'China', 3.8),
  (3, 'EcoSupply', 'Germany', 4.9),
  (4, 'FastShip Co', 'Canada', 4.2),
  (5, 'BudgetSource', 'India', 3.5);

INSERT INTO products VALUES
  (1, 'Wireless Headphones', 'Electronics', 89.99, 40.00, 145, 1, 'ELEC-001'),
  (2, 'Running Shoes', 'Apparel', 64.99, 28.00, 230, 2, 'APP-001'),
  (3, 'Coffee Maker', 'Kitchen', 49.99, 22.00, 87, 3, 'KIT-001'),
  (4, 'USB-C Hub', 'Electronics', 34.99, 12.00, 312, 1, 'ELEC-002'),
  (5, 'Yoga Mat', 'Sports', 29.99, 10.00, 190, 4, 'SPT-001'),
  (6, 'Desk Lamp', 'Home', 39.99, 15.00, 0, 3, 'HOM-001'),
  (7, 'Blender', 'Kitchen', 79.99, 35.00, 64, 2, 'KIT-002'),
  (8, 'Notebook Set', 'Stationery', 12.99, 4.00, 500, 5, 'STA-001'),
  (9, 'Smart Watch', 'Electronics', 199.99, 90.00, 78, 1, 'ELEC-003'),
  (10, 'Water Bottle', 'Sports', 24.99, 8.00, 275, 4, 'SPT-002'),
  (11, 'Backpack', 'Apparel', 54.99, 22.00, 155, 2, 'APP-002'),
  (12, 'Gaming Mouse', 'Electronics', 44.99, 18.00, 220, 1, 'ELEC-004'),
  (13, 'Protein Powder', 'Health', 59.99, 25.00, 90, 5, 'HLT-001'),
  (14, 'Candle Set', 'Home', 19.99, 6.00, 340, 3, 'HOM-002'),
  (15, 'Resistance Bands', 'Sports', 17.99, 5.00, 420, 5, 'SPT-003');

INSERT INTO customers VALUES
  (1, 'Sophie Turner', 'sophie@email.com', 'New York', '2021-01-15', 'gold'),
  (2, 'Marcus Chen', 'marcus@email.com', 'Los Angeles', '2020-06-20', 'platinum'),
  (3, 'Priya Patel', 'priya@email.com', 'Chicago', '2022-03-10', 'regular'),
  (4, 'James Wilson', 'james@email.com', 'Houston', '2019-11-30', 'gold'),
  (5, 'Amara Osei', 'amara@email.com', 'Phoenix', '2023-01-05', 'regular'),
  (6, 'Elena Rodrigo', 'elena@email.com', 'New York', '2021-08-22', 'regular'),
  (7, 'Tom Bradley', NULL, 'Seattle', '2020-04-14', 'silver'),
  (8, 'Nina Kowalski', 'nina@email.com', 'Chicago', '2022-09-01', 'regular'),
  (9, 'Omar Farouk', 'omar@email.com', 'Boston', '2021-05-18', 'silver'),
  (10, 'Zoe Martin', 'zoe@email.com', 'Los Angeles', '2019-07-07', 'platinum');

INSERT INTO orders VALUES
  (1, 1, '2024-01-10', 124.98, 'delivered', 'New York'),
  (2, 2, '2024-01-15', 199.99, 'delivered', 'Los Angeles'),
  (3, 3, '2024-01-20', 94.98, 'delivered', 'Chicago'),
  (4, 1, '2024-02-01', 44.99, 'delivered', 'New York'),
  (5, 4, '2024-02-10', 164.98, 'delivered', 'Houston'),
  (6, 5, '2024-02-14', 29.99, 'processing', 'Phoenix'),
  (7, 2, '2024-02-20', 89.99, 'delivered', 'Los Angeles'),
  (8, 6, '2024-03-01', 52.98, 'delivered', 'New York'),
  (9, 7, '2024-03-05', 79.99, 'delivered', 'Seattle'),
  (10, 8, '2024-03-10', 47.98, 'delivered', 'Chicago'),
  (11, 9, '2024-03-15', 224.98, 'delivered', 'Boston'),
  (12, 10, '2024-03-20', 74.98, 'delivered', 'Los Angeles'),
  (13, 3, '2024-04-01', 17.99, 'processing', 'Chicago'),
  (14, 1, '2024-04-05', 239.98, 'delivered', 'New York'),
  (15, 4, '2024-04-10', 12.99, 'cancelled', 'Houston');

INSERT INTO order_items VALUES
  (1, 1, 1, 1, 89.99),
  (2, 1, 5, 1, 29.99),
  (3, 1, 8, 1, 12.99),
  (4, 2, 9, 1, 199.99),
  (5, 3, 1, 1, 89.99),
  (6, 3, 8, 1, 12.99),
  (7, 4, 12, 1, 44.99),
  (8, 5, 2, 1, 64.99),
  (9, 5, 10, 2, 24.99),
  (10, 5, 15, 3, 17.99),
  (11, 6, 5, 1, 29.99),
  (12, 7, 1, 1, 89.99),
  (13, 8, 14, 1, 19.99),
  (14, 8, 8, 3, 12.99),
  (15, 9, 7, 1, 79.99),
  (16, 10, 10, 1, 24.99),
  (17, 10, 15, 2, 17.99),
  (18, 11, 9, 1, 199.99),
  (19, 11, 12, 1, 44.99),
  (20, 12, 11, 1, 54.99),
  (21, 12, 10, 2, 24.99),
  (22, 13, 15, 1, 17.99),
  (23, 14, 9, 1, 199.99),
  (24, 14, 1, 1, 89.99),
  (25, 15, 8, 1, 12.99);`
  },

  campus: {
    schemaSQL: `CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  major TEXT NOT NULL,
  year INTEGER NOT NULL,
  gpa REAL,
  dorm TEXT,
  scholarship REAL DEFAULT 0,
  email TEXT
);

CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  credits INTEGER NOT NULL,
  instructor TEXT,
  max_enrollment INTEGER,
  semester TEXT
);

CREATE TABLE enrollments (
  student_id INTEGER,
  course_id INTEGER,
  grade TEXT,
  grade_points REAL,
  completed INTEGER DEFAULT 0,
  PRIMARY KEY (student_id, course_id)
);

CREATE TABLE clubs (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  president_id INTEGER,
  budget REAL,
  members_count INTEGER
);

CREATE TABLE club_memberships (
  student_id INTEGER,
  club_id INTEGER,
  role TEXT DEFAULT 'member',
  joined_date TEXT,
  PRIMARY KEY (student_id, club_id)
);`,
    seedSQL: `INSERT INTO students VALUES
  (1, 'Alex Rivera', 'Computer Science', 3, 3.85, 'Anderson Hall', 5000, 'alex@campus.edu'),
  (2, 'Bella Nguyen', 'Mathematics', 2, 3.92, 'Baker Hall', 8000, 'bella@campus.edu'),
  (3, 'Carlos Gomez', 'Physics', 4, 3.45, 'Anderson Hall', 0, 'carlos@campus.edu'),
  (4, 'Diana Park', 'Computer Science', 1, 3.78, 'Cedar Hall', 3000, 'diana@campus.edu'),
  (5, 'Ethan Wright', 'Biology', 3, 2.95, 'Baker Hall', 0, 'ethan@campus.edu'),
  (6, 'Fiona Chang', 'Chemistry', 4, 3.60, 'Cedar Hall', 4000, 'fiona@campus.edu'),
  (7, 'George Adams', 'Computer Science', 2, 3.10, NULL, 0, 'george@campus.edu'),
  (8, 'Hannah Lee', 'Mathematics', 1, 3.99, 'Anderson Hall', 10000, 'hannah@campus.edu'),
  (9, 'Ivan Petrov', 'Physics', 3, 3.25, 'Baker Hall', 2000, 'ivan@campus.edu'),
  (10, 'Julia Santos', 'Biology', 2, 3.70, 'Cedar Hall', 5000, 'julia@campus.edu'),
  (11, 'Kevin Liu', 'Computer Science', 4, 3.88, 'Anderson Hall', 6000, 'kevin@campus.edu'),
  (12, 'Luna Shah', 'Chemistry', 1, 3.50, NULL, 1000, 'luna@campus.edu'),
  (13, 'Miguel Torres', 'Mathematics', 3, 3.15, 'Baker Hall', 0, 'miguel@campus.edu'),
  (14, 'Nadia Volkov', 'Biology', 4, 3.82, 'Cedar Hall', 7000, 'nadia@campus.edu'),
  (15, 'Owen Campbell', 'Physics', 2, 2.80, 'Anderson Hall', 0, NULL);

INSERT INTO courses VALUES
  (1, 'CS101', 'Intro to Programming', 'Computer Science', 3, 'Prof. Morris', 40, 'Fall 2024'),
  (2, 'CS301', 'Data Structures', 'Computer Science', 4, 'Prof. Morris', 35, 'Fall 2024'),
  (3, 'CS401', 'Database Systems', 'Computer Science', 3, 'Prof. Yuen', 30, 'Fall 2024'),
  (4, 'MATH201', 'Linear Algebra', 'Mathematics', 4, 'Prof. Okafor', 45, 'Fall 2024'),
  (5, 'MATH301', 'Statistics', 'Mathematics', 3, 'Prof. Okafor', 40, 'Fall 2024'),
  (6, 'PHYS201', 'Classical Mechanics', 'Physics', 4, 'Prof. Zhang', 35, 'Fall 2024'),
  (7, 'BIO201', 'Cell Biology', 'Biology', 3, 'Prof. Gupta', 45, 'Fall 2024'),
  (8, 'CHEM201', 'Organic Chemistry', 'Chemistry', 4, 'Prof. Sullivan', 35, 'Fall 2024'),
  (9, 'CS201', 'Algorithms', 'Computer Science', 4, 'Prof. Yuen', 30, 'Spring 2024'),
  (10, 'MATH101', 'Calculus I', 'Mathematics', 4, 'Prof. Okafor', 50, 'Spring 2024');

INSERT INTO enrollments VALUES
  (1, 1, 'A', 4.0, 1),
  (1, 2, 'A-', 3.7, 1),
  (1, 3, 'B+', 3.3, 0),
  (1, 9, 'A', 4.0, 1),
  (2, 4, 'A', 4.0, 1),
  (2, 5, 'A+', 4.0, 0),
  (2, 10, 'A', 4.0, 1),
  (3, 6, 'B+', 3.3, 1),
  (3, 4, 'B', 3.0, 1),
  (4, 1, 'A-', 3.7, 0),
  (4, 2, NULL, NULL, 0),
  (5, 7, 'C+', 2.3, 1),
  (5, 5, 'B-', 2.7, 1),
  (6, 8, 'A-', 3.7, 0),
  (6, 6, 'B+', 3.3, 1),
  (7, 1, 'B', 3.0, 1),
  (7, 9, 'B-', 2.7, 1),
  (8, 4, 'A+', 4.0, 0),
  (8, 10, 'A+', 4.0, 1),
  (9, 6, 'B', 3.0, 1),
  (9, 8, 'B+', 3.3, 1),
  (10, 7, 'A-', 3.7, 0),
  (10, 5, 'A', 4.0, 1),
  (11, 2, 'A', 4.0, 1),
  (11, 3, 'A-', 3.7, 0),
  (11, 9, 'A+', 4.0, 1),
  (12, 8, 'B+', 3.3, 0),
  (13, 4, 'B', 3.0, 1),
  (13, 5, 'B+', 3.3, 1),
  (14, 7, 'A', 4.0, 1),
  (14, 8, 'A-', 3.7, 1),
  (15, 6, 'C', 2.0, 1),
  (15, 10, 'C+', 2.3, 1);

INSERT INTO clubs VALUES
  (1, 'Coding Club', 'Academic', 1, 2000, 45),
  (2, 'Math League', 'Academic', 2, 1500, 30),
  (3, 'Astronomy Club', 'Academic', 9, 800, 22),
  (4, 'Robotics Team', 'Competition', 11, 5000, 18),
  (5, 'Green Campus', 'Service', 10, 1200, 38),
  (6, 'Chess Club', 'Recreation', 8, 400, 25);

INSERT INTO club_memberships VALUES
  (1, 1, 'president', '2022-09-01'),
  (1, 4, 'member', '2022-09-15'),
  (2, 2, 'president', '2023-01-10'),
  (2, 1, 'member', '2023-02-01'),
  (3, 3, 'member', '2022-09-05'),
  (4, 1, 'member', '2024-01-15'),
  (5, 5, 'member', '2023-03-01'),
  (6, 6, 'member', '2023-10-01'),
  (7, 1, 'member', '2023-09-01'),
  (8, 2, 'member', '2024-01-01'),
  (8, 6, 'president', '2023-09-01'),
  (9, 3, 'president', '2023-01-20'),
  (10, 5, 'president', '2022-10-01'),
  (11, 1, 'vice_president', '2022-09-01'),
  (11, 4, 'captain', '2023-01-10'),
  (12, 5, 'member', '2024-02-01'),
  (13, 2, 'member', '2023-04-01'),
  (14, 5, 'member', '2023-03-15'),
  (15, 3, 'member', '2023-09-20');`
  }
};
