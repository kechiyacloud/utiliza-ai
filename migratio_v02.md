# Database Schema Migration Plan (v02)

Based on a detailed analysis of the backend routers (`@backend/**/*.py`), database migrations (`@backend/run_migrations.py`), and the existing schema file (`@database/backup_v6.sql`), here is the detailed architectural plan for the new database schema, complete with Primary Key (PK) and Foreign Key (FK) mappings, and a specific focus on the 52-week allocation requirement.

## 1. Missing Tables Identified

The following tables are entirely missing from `backup_v6.sql` but are required by the backend API:

| Table Name | Source Reference | Expected Columns |
| :--- | :--- | :--- |
| **`clients`** | `@backend/app/routers/clients.py` | `client_id` (or `id`), `client_name` (or `name`), `website_url`, `industry`, `status`, `budget` |
| **`partners`** | `@backend/app/routers/clients_partners.py` | `id`, `name` |
| **`team_members`** | `@backend/run_migrations.py` | `id`, `project_id`, `name`, `role`, `company`, `company_type`, `location`, `w1`, `w2`, `w3`, `w4` |

---

## 🏛️ Phase 1: Core Master Entities (Clients & Partners)
Your backend treats Clients and Partners as distinct entities that own projects. We will create dedicated master tables for them.

### 1. `clients` Table
Stores all external client metadata.
*   **`client_id`** `VARCHAR(50) PRIMARY KEY` (e.g., 'CLI-001')
*   **`client_name`** `VARCHAR(255) NOT NULL UNIQUE`
*   **`website_url`** `VARCHAR(255)`
*   **`industry`** `VARCHAR(100)` (e.g., 'Retail', 'Healthcare')
*   **`status`** `VARCHAR(50)` (e.g., 'Stable', 'At Risk')
*   **`budget`** `NUMERIC(15, 2) DEFAULT 0.00`
*   **`created_at`** `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

### 2. `partners` Table
Stores partner details (for 'Partner' type projects).
*   **`partner_id`** `VARCHAR(50) PRIMARY KEY`
*   **`partner_name`** `VARCHAR(255) NOT NULL UNIQUE`
*   **`status`** `VARCHAR(50) DEFAULT 'Active'`
*   **`created_at`** `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

---

## 🏗️ Phase 2: Project Table Evolution
We need to enrich the existing `projects` table by adding relationships to the master tables and adding the missing commercial/scope columns.

### Modified `projects` Table
*   **`project_id`** `VARCHAR(50) PRIMARY KEY` *(Existing)*
*   **`project_name`** `VARCHAR(255)` *(Existing)*
*   **`project_status`** `VARCHAR(50)` *(Existing)*
*   **`billable`** `VARCHAR(50)` *(Existing)*
*   **`start_date`** `DATE` *(Existing)*
*   **`end_date`** `DATE` *(Existing)*
*   *(NEW)* **`project_type`** `VARCHAR(50)` ('Client', 'Internal', 'Partner')
*   *(NEW)* **`client_id`** `VARCHAR(50) FOREIGN KEY REFERENCES clients(client_id)`
*   *(NEW)* **`partner_id`** `VARCHAR(50) FOREIGN KEY REFERENCES partners(partner_id)`
*   *(NEW - Commercials)* **`budget`** `NUMERIC(15, 2)`
*   *(NEW - Commercials)* **`billing_type`** `VARCHAR(100)` (e.g., T&M, Fixed Price)
*   *(NEW - Commercials)* **`contract_type`** `VARCHAR(100)`
*   *(NEW - Commercials)* **`revenue_model`** `VARCHAR(100)`
*   *(NEW - Commercials)* **`commercial_notes`** `TEXT`
*   *(NEW - Scope)* **`objective`** `TEXT`
*   *(NEW - Scope)* **`deliverables`** `TEXT`
*   *(NEW - Scope)* **`milestones`** `TEXT`
*   *(NEW - Scope)* **`timeline_notes`** `TEXT`

---

## ⏱️ Phase 3: The 52-Week Allocation Architecture

As a Data Engineer, I must warn you: creating a table with 52 columns (`w1`, `w2`, ... `w52`) is called a **"Wide Table" (or pivoted table)**. It makes writing SQL queries (like "find all hours worked in Q1") very difficult, and it breaks in leap years which actually have **53 weeks**.

However, I will give you **two options**: The one you requested, and the standard Data Engineering best practice. I highly recommend Option B.

In both options, we keep your existing `projects_allocation` table as the "Master Contract" for that employee on that project.

### Base Contract Table: `projects_allocation` (Modified)
*   **`allocation_id`** `VARCHAR(50) PRIMARY KEY` *(Existing)*
*   **`employee_id`** `VARCHAR(50) FOREIGN KEY REFERENCES employee_master(employee_id)`
*   **`project_id`** `VARCHAR(50) FOREIGN KEY REFERENCES projects(project_id)`
*   **`role_in_project`** `VARCHAR(255)` *(Existing)*
*   **`project_tags`** `VARCHAR(255)` *(Existing)*

### Option A: The "Wide" Table (What you requested)
We create a new child table linked to `projects_allocation`. One row represents an employee's allocation for an entire year.
*   **`id`** `SERIAL PRIMARY KEY`
*   **`allocation_id`** `VARCHAR(50) FOREIGN KEY REFERENCES projects_allocation(allocation_id) ON DELETE CASCADE`
*   **`allocation_year`** `INTEGER` (e.g., 2026)
*   **`w1`** `INTEGER DEFAULT 0`
*   **`w2`** `INTEGER DEFAULT 0`
*   ... *(columns w3 through w51)* ...
*   **`w52`** `INTEGER DEFAULT 0`
*   **`w53`** `INTEGER DEFAULT 0` *(Added to handle 53-week years safely)*

*Pros: Matches the frontend UI exactly.*
*Cons: Terrible for database aggregations, reporting, and BI tools.*

### Option B: The Normalized Table (Data Engineer Recommended 🏆)
Instead of wide columns, we use a vertical structure. One row represents an employee's allocation for a *single week*.
*   **`id`** `SERIAL PRIMARY KEY`
*   **`allocation_id`** `VARCHAR(50) FOREIGN KEY REFERENCES projects_allocation(allocation_id) ON DELETE CASCADE`
*   **`allocation_year`** `INTEGER` (e.g., 2026)
*   **`week_number`** `INTEGER` (1 through 53)
*   **`allocated_hours`** `INTEGER DEFAULT 0`

*Unique Constraint:* `UNIQUE(allocation_id, allocation_year, week_number)`

*Why Option B is better:*
1.  **FastAPI/Python can easily pivot this** into `{w1: 40, w2: 40}` before sending it to the frontend.
2.  **SQL Aggregation is easy:** `SELECT sum(allocated_hours) WHERE week_number BETWEEN 1 AND 12` (Q1 total).
3.  **Scalability:** If an employee is only allocated for 3 weeks, you only store 3 rows, not 52 columns of zeros.

---

## 🔄 Phase 4: Implementation & Migration Plan

Here is the SQL script to safely bridge your `backup_v6.sql` schema to this new architecture:

```sql
-- 1. Create Core Master Tables
CREATE TABLE clients (
    client_id VARCHAR(50) PRIMARY KEY,
    client_name VARCHAR(255) UNIQUE NOT NULL,
    website_url VARCHAR(255),
    industry VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Stable',
    budget NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE partners (
    partner_id VARCHAR(50) PRIMARY KEY,
    partner_name VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Alter Projects Table
ALTER TABLE projects 
    ADD COLUMN project_type VARCHAR(50) DEFAULT 'Client',
    ADD COLUMN client_id VARCHAR(50) REFERENCES clients(client_id) ON DELETE SET NULL,
    ADD COLUMN partner_id VARCHAR(50) REFERENCES partners(partner_id) ON DELETE SET NULL,
    ADD COLUMN budget NUMERIC(15, 2),
    ADD COLUMN billing_type VARCHAR(100),
    ADD COLUMN contract_type VARCHAR(100),
    ADD COLUMN revenue_model VARCHAR(100),
    ADD COLUMN commercial_notes TEXT,
    ADD COLUMN objective TEXT,
    ADD COLUMN deliverables TEXT,
    ADD COLUMN milestones TEXT,
    ADD COLUMN timeline_notes TEXT;

-- 3. Create the 52-Week Allocation Table (Normalized Approach Recommended)
CREATE TABLE weekly_allocations (
    id SERIAL PRIMARY KEY,
    allocation_id VARCHAR(50) REFERENCES projects_allocation(allocation_id) ON DELETE CASCADE,
    allocation_year INTEGER NOT NULL,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
    allocated_hours INTEGER DEFAULT 0,
    UNIQUE(allocation_id, allocation_year, week_number)
);

-- Index for fast querying by project/employee
CREATE INDEX idx_weekly_alloc_id ON weekly_allocations(allocation_id);
```

### Action Items for the Backend (FastAPI):
Once this schema is applied, your `projects.py` router needs a slight adjustment. 
When the frontend sends `w1: 40, w2: 40`, the Python backend should map it:
```python
# In FastAPI update_project_resources
for week_num, hours in [(1, tm.w1), (2, tm.w2), (3, tm.w3), (4, tm.w4)]:
    if hours > 0:
        cur.execute("""
            INSERT INTO weekly_allocations (allocation_id, allocation_year, week_number, allocated_hours)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (allocation_id, allocation_year, week_number) 
            DO UPDATE SET allocated_hours = EXCLUDED.allocated_hours
        """, (allocation_id, current_year, week_num, hours))
```