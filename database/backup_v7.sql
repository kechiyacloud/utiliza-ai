-- 1. Create Core Master Tables
CREATE TABLE IF NOT EXISTS clients (
    client_id VARCHAR(50) PRIMARY KEY,
    client_name VARCHAR(255) UNIQUE NOT NULL,
    website_url VARCHAR(255),
    industry VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Stable',
    budget NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partners (
    partner_id VARCHAR(50) PRIMARY KEY,
    partner_name VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Alter Projects Table
ALTER TABLE projects 
    ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'Client',
    ADD COLUMN IF NOT EXISTS client_id VARCHAR(50) REFERENCES clients(client_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS partner_id VARCHAR(50) REFERENCES partners(partner_id) ON DELETE SET NULL;

-- 3. Create Commercials & Scopes Tables
CREATE TABLE IF NOT EXISTS project_commercials (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,
    project_name VARCHAR(255),
    client_id VARCHAR(50) REFERENCES clients(client_id) ON DELETE SET NULL,
    budget NUMERIC(15, 2) DEFAULT 0.00,
    billing_type VARCHAR(100),
    contract_type VARCHAR(100),
    revenue_model VARCHAR(100),
    commercial_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_scopes (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,
    objective TEXT,
    deliverables TEXT,
    milestones TEXT,
    timeline_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create the 52-Week Allocation Table (Normalized)
CREATE TABLE IF NOT EXISTS weekly_allocations (
    id SERIAL PRIMARY KEY,
    allocation_id VARCHAR(50) REFERENCES projects_allocation(allocation_id) ON DELETE CASCADE,
    allocation_year INTEGER NOT NULL,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
    allocated_hours INTEGER DEFAULT 0,
    UNIQUE(allocation_id, allocation_year, week_number)
);

-- Index for fast querying by project/employee allocation
CREATE INDEX IF NOT EXISTS idx_weekly_alloc_id ON weekly_allocations(allocation_id);
