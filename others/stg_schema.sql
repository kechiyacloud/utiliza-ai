-- ─────────────────────────────────────────────────────────────
-- FULL MIGRATION STAGING SCHEMA
-- ─────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS stg_actionable_todos CASCADE;
DROP TABLE IF EXISTS stg_certificates CASCADE;
DROP TABLE IF EXISTS stg_clients CASCADE;
DROP TABLE IF EXISTS stg_employee_certificates CASCADE;
DROP TABLE IF EXISTS stg_employee_master CASCADE;
DROP TABLE IF EXISTS stg_employee_master_pro CASCADE;
DROP TABLE IF EXISTS stg_employee_nominations CASCADE;
DROP TABLE IF EXISTS stg_employee_skills CASCADE;
DROP TABLE IF EXISTS stg_partners CASCADE;
DROP TABLE IF EXISTS stg_project_commercials CASCADE;
DROP TABLE IF EXISTS stg_project_scopes CASCADE;
DROP TABLE IF EXISTS stg_project_skills CASCADE;
DROP TABLE IF EXISTS stg_projects CASCADE;
DROP TABLE IF EXISTS stg_projects_allocation CASCADE;
DROP TABLE IF EXISTS stg_skills CASCADE;
DROP TABLE IF EXISTS stg_team_members CASCADE;
DROP TABLE IF EXISTS stg_users CASCADE;
DROP TABLE IF EXISTS stg_weekly_allocations CASCADE;

CREATE TABLE stg_actionable_todos (id integer, message text, type varchar(50), status varchar(50), created_at timestamp);
CREATE TABLE stg_certificates (certificate_id varchar(50), certificate_name varchar(255));
CREATE TABLE stg_clients (client_id varchar(255), client_name varchar(255), website_url varchar(255), industry varchar(255), status varchar(255), budget numeric);
CREATE TABLE stg_employee_certificates (certificate_id varchar(50), employee_id varchar(50));
CREATE TABLE stg_employee_master (si_number integer, employee_id varchar(50), employee_name varchar(255), phone_number bigint, email_id varchar(255), location varchar(255), mode_of_work varchar(50), date_of_joining date, role_designation varchar(255), department varchar(255), employee_type varchar(50), total_experience numeric, experience_in_cd numeric, shift varchar(255), time_zone varchar(100), date_of_resign date, photo_url varchar(255));
CREATE TABLE stg_employee_master_pro (employee_id varchar(50), reporting_manager_id varchar(50), employee_status varchar(50), upcoming_leaves varchar(255), employee_allocations integer);
CREATE TABLE stg_employee_nominations (id integer, nominator_id varchar(50), nominee_id varchar(50), reason text, nomination_date date);
CREATE TABLE stg_employee_skills (skill_id integer, employee_id varchar(50), proficiency_level integer, years_of_experience numeric);
CREATE TABLE stg_partners (id integer, name varchar(255));
CREATE TABLE stg_project_commercials (id integer, project_id varchar(50), budget numeric, billing_type varchar(100), contract_type varchar(100), revenue_model varchar(100), commercial_notes text);
CREATE TABLE stg_project_scopes (id integer, project_id varchar(50), objective text, deliverables text, milestones text, timeline_notes text);
CREATE TABLE stg_project_skills (project_id varchar(50), skill_id integer);
CREATE TABLE stg_projects (project_id varchar(50), project_name varchar(255), project_status varchar(50), billable varchar(50), start_date date, end_date date, project_type varchar(255), client_name varchar(255), budget varchar(255), billing_type varchar(255), contract_type varchar(255), revenue_model varchar(255), commercial_notes text, objective text, deliverables text, milestones text, timeline_notes text, client_id varchar(255), partner_id integer);
CREATE TABLE stg_projects_allocation (allocation_id varchar(50), employee_id varchar(50), project_id varchar(50), role_in_project varchar(255), allocation_percentage integer, allocation_start_date date, allocation_end_date date, project_tags varchar(255), w1 integer, w2 integer, w3 integer, w4 integer, weekly_hours numeric(6,2), weekly_plan jsonb);
CREATE TABLE stg_skills (skill_id integer, skill_name varchar(255));
CREATE TABLE stg_team_members (id integer, project_id varchar(255), name varchar(255), role varchar(255), company varchar(255), company_type varchar(50), location varchar(150), allocation_percentage integer, allocation_start_date date, allocation_end_date date, project_tags varchar(255), w1 integer, w2 integer, w3 integer, w4 integer);
CREATE TABLE stg_users (id integer, employee_id varchar(50), email varchar(255), password_hash varchar(255), is_active boolean, failed_login_attempts integer, last_login_at timestamp, password_changed_at timestamp, created_at timestamp, updated_at timestamp);
CREATE TABLE stg_weekly_allocations (id integer, allocation_id varchar(50), allocation_year integer, week_number integer, allocated_hours integer, created_at timestamp);
