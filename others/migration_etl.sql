-- ─────────────────────────────────────────────────────────────
-- MIGRATION ETL SCRIPT (v3 Robust)
-- ─────────────────────────────────────────────────────────────

-- 0. Clean Target Tables
TRUNCATE 
    actionable_todos, weekly_allocations, projects_allocation,
    project_scopes, project_commercials, project_skills,
    projects, employee_skills, employee_certificates,
    users, employee_master_pro, employee_master,
    clients, skills, certificates, partners,
    departments, designations
CASCADE;

-- 1. Create Mapping Tables
DROP TABLE IF EXISTS map_partners;
DROP TABLE IF EXISTS map_skills;
CREATE TABLE map_partners (old_id int, new_id varchar(50));
CREATE TABLE map_skills (old_id int, new_id varchar(20));

INSERT INTO map_partners (old_id, new_id)
SELECT id, 'PRT-' || LPAD(ROW_NUMBER() OVER(ORDER BY id)::TEXT, 4, '0')
FROM stg_partners;

INSERT INTO map_skills (old_id, new_id)
SELECT skill_id, 'SKL-' || LPAD(ROW_NUMBER() OVER(ORDER BY skill_id)::TEXT, 3, '0')
FROM stg_skills;

-- 2. Populate Lookup Tables
-- Use ON CONFLICT DO NOTHING to handle duplicates robustly
INSERT INTO partners (partner_id, partner_name)
SELECT m.new_id, TRIM(s.name)
FROM stg_partners s
JOIN map_partners m ON s.id = m.old_id
ON CONFLICT DO NOTHING;

INSERT INTO skills (skill_id, skill_name)
SELECT m.new_id, TRIM(s.skill_name)
FROM stg_skills s
JOIN map_skills m ON s.skill_id = m.old_id
ON CONFLICT DO NOTHING;

INSERT INTO certificates (certificate_id, certificate_name)
SELECT DISTINCT ON (certificate_id) certificate_id, TRIM(certificate_name) 
FROM stg_certificates
ON CONFLICT DO NOTHING;

-- 3. Populate Clients
INSERT INTO clients (client_id, client_name, website_url, industry, status, budget)
SELECT DISTINCT ON (client_id) 
    client_id, TRIM(client_name), website_url, industry, 
    COALESCE(status, 'Stable'), COALESCE(budget, 0.00)
FROM stg_clients
ON CONFLICT DO NOTHING;

-- 4. Populate Employee Master (Critical: Deduplicate by email and skip NULL emails)
INSERT INTO employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url)
SELECT DISTINCT ON (LOWER(TRIM(email_id))) 
    si_number, employee_id, TRIM(employee_name), phone_number, LOWER(TRIM(email_id)), 
    location, mode_of_work, date_of_joining, role_designation, department, employee_type, 
    total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url
FROM stg_employee_master
WHERE email_id IS NOT NULL AND employee_id IS NOT NULL
ORDER BY LOWER(TRIM(email_id)), si_number
ON CONFLICT DO NOTHING;

-- 5. Populate Projects
INSERT INTO projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_id, partner_id)
SELECT DISTINCT ON (project_id)
    s.project_id, TRIM(s.project_name), COALESCE(s.project_status, 'Active'), 
    COALESCE(s.billable, 'Yes'), s.start_date, s.end_date, 
    COALESCE(s.project_type, 'Client'), s.client_id,
    m.new_id
FROM stg_projects s
LEFT JOIN map_partners m ON s.partner_id = m.old_id
ON CONFLICT DO NOTHING;

-- 6. Normalize Projects
INSERT INTO project_commercials (project_id, budget, billing_type, contract_type, revenue_model, commercial_notes)
SELECT DISTINCT ON (project_id)
    project_id, 
    CASE WHEN budget ~ '^[0-9.]+$' THEN budget::numeric ELSE 0.00 END,
    billing_type, contract_type, revenue_model, commercial_notes
FROM stg_projects
WHERE (budget IS NOT NULL OR billing_type IS NOT NULL OR commercial_notes IS NOT NULL)
  AND EXISTS (SELECT 1 FROM projects p WHERE p.project_id = stg_projects.project_id)
ON CONFLICT DO NOTHING;

INSERT INTO project_scopes (project_id, objective, deliverables, milestones, timeline_notes)
SELECT DISTINCT ON (project_id)
    project_id, objective, deliverables, milestones, timeline_notes
FROM stg_projects
WHERE (objective IS NOT NULL OR deliverables IS NOT NULL OR milestones IS NOT NULL)
  AND EXISTS (SELECT 1 FROM projects p WHERE p.project_id = stg_projects.project_id)
ON CONFLICT DO NOTHING;

-- 7. Populate Pro & Junctions
INSERT INTO employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations)
SELECT
    s.employee_id,
    CASE WHEN EXISTS (SELECT 1 FROM employee_master e2 WHERE e2.employee_id = s.reporting_manager_id)
         THEN s.reporting_manager_id ELSE NULL END,
    s.employee_status, s.upcoming_leaves, s.employee_allocations
FROM stg_employee_master_pro s
WHERE EXISTS (SELECT 1 FROM employee_master e WHERE e.employee_id = s.employee_id)
ON CONFLICT DO NOTHING;

INSERT INTO employee_certificates (employee_id, certificate_id)
SELECT s.employee_id, s.certificate_id 
FROM stg_employee_certificates s
WHERE EXISTS (SELECT 1 FROM employee_master e WHERE e.employee_id = s.employee_id)
  AND EXISTS (SELECT 1 FROM certificates c WHERE c.certificate_id = s.certificate_id)
ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, years_of_experience)
SELECT s.employee_id, m.new_id, s.proficiency_level, s.years_of_experience
FROM stg_employee_skills s
JOIN map_skills m ON s.skill_id = m.old_id
WHERE EXISTS (SELECT 1 FROM employee_master e WHERE e.employee_id = s.employee_id)
  AND EXISTS (SELECT 1 FROM skills sk WHERE sk.skill_id = m.new_id)
ON CONFLICT DO NOTHING;

INSERT INTO project_skills (project_id, skill_id)
SELECT s.project_id, m.new_id
FROM stg_project_skills s
JOIN map_skills m ON s.skill_id = m.old_id
WHERE EXISTS (SELECT 1 FROM projects p WHERE p.project_id = s.project_id)
  AND EXISTS (SELECT 1 FROM skills sk WHERE sk.skill_id = m.new_id)
ON CONFLICT DO NOTHING;

-- 8. Populate Allocations
INSERT INTO projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags)
SELECT s.allocation_id, s.employee_id, s.project_id, s.role_in_project, s.allocation_percentage, s.allocation_start_date, s.allocation_end_date, s.project_tags
FROM stg_projects_allocation s
WHERE EXISTS (SELECT 1 FROM employee_master e WHERE e.employee_id = s.employee_id)
  AND EXISTS (SELECT 1 FROM projects p WHERE p.project_id = s.project_id)
ON CONFLICT DO NOTHING;

INSERT INTO weekly_allocations (id, allocation_id, allocation_year, week_number, allocated_hours, created_at)
SELECT s.id, s.allocation_id, s.allocation_year, s.week_number, s.allocated_hours, s.created_at
FROM stg_weekly_allocations s
WHERE EXISTS (SELECT 1 FROM projects_allocation pa WHERE pa.allocation_id = s.allocation_id)
ON CONFLICT DO NOTHING;

-- 9. Populate Users & Todos
INSERT INTO users (id, employee_id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at)
SELECT DISTINCT ON (email)
    id, employee_id, LOWER(TRIM(email)), password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at
FROM stg_users
WHERE EXISTS (SELECT 1 FROM employee_master e WHERE e.employee_id = stg_users.employee_id)
ON CONFLICT DO NOTHING;

INSERT INTO actionable_todos (id, user_id, message, type, status, created_at)
SELECT s.id, u.id, s.message, s.type, s.status, s.created_at
FROM stg_actionable_todos s
LEFT JOIN users u ON u.id = s.id
WHERE s.message IS NOT NULL
ON CONFLICT DO NOTHING;
