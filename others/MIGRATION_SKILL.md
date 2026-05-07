# SKILL: PostgreSQL Schema Migration — cd-utiliza-ai

> **Purpose:** A reusable, step-by-step agent playbook for migrating the `cd-utiliza-ai`
> application from its legacy EC2 PostgreSQL schema to the normalized v3 schema,
> and updating the backend + frontend to connect to the new database.
> Follow every phase in order. Do NOT skip phases.

---

## PROJECT OVERVIEW

| Item | Value |
|---|---|
| App | cd-utiliza-ai (Resource Allocation / HR Dashboard) |
| Backend | FastAPI (Python) — `backend/` |
| Frontend | React + Vite — `frontend/` |
| Database | PostgreSQL 16 |
| Local DB container | `pg_migration_local` on `localhost:5433` |
| Target DB name | `migration_db` |
| DB credentials | User: `postgres` / Password: `localpass` |

---

## KEY FILES

| File | Purpose |
|---|---|
| `new_schemas.sql` | Full v3 target schema — all tables, triggers, sequences, indexes |
| `stg_schema.sql` | Staging tables (mirrors old EC2 schema structure) |
| `ec2_data.sql` | Production data dump — inserts into `stg_*` tables |
| `migration_etl.sql` | ETL script — transforms `stg_*` → final v3 tables |
| `stg_cleanup.sql` | Drops all `stg_*` staging tables after ETL |
| `ec2_schema.sql` | Old EC2 schema reference |
| `SCHEMA_DIFF_REPORT.md` | Detailed column-level diff between old and new schema |
| `CHANGE_IMPACT_REPORT.md` | All backend/frontend files that needed updating |
| `backend/.env` | DB connection config (must point to local Docker) |
| `docker-compose.full.yml` | Runs backend + frontend + redis (no DB — DB is external) |

---

## SCHEMA CHANGES SUMMARY (Legacy EC2 → v3)

### Breaking Changes
| Table | Change |
|---|---|
| `partners` | PK changed: `id SERIAL` → `partner_id VARCHAR(50)` (`PRT-NNNN` format). `name` → `partner_name` |
| `skills` | PK changed: `skill_id INTEGER` → `skill_id VARCHAR(20)` (`SKL-NNN` format) |
| `projects` | `partner_id INTEGER` → `partner_id VARCHAR(50)`. Heavy columns moved to child tables |
| `project_commercials` | Removed `project_name`, `client_id` columns (were redundant with `projects` table) |
| `project_scopes` | Now strict 1:1 with `projects` |
| `projects_allocation` | Removed `w1`, `w2`, `w3`, `w4`, `weekly_hours` — moved to `weekly_allocations` |
| `employee_nominations` | **DROPPED** — table no longer exists |
| `team_members` | **DROPPED** — table no longer exists |
| `users` | Added `employee_id`, `department_id`, `designation_id` FK columns |
| `weekly_allocations` | New: `week_start_date`, `week_end_date` auto-computed via ISO week trigger |

### New Tables
- `departments` — lookup table with `DEPT-NNN` IDs
- `designations` — lookup table with `DESG-NNN` IDs

---

## PHASE 1 — PROVISION LOCAL DOCKER DATABASE

```bash
# Start a fresh Postgres 16 container (only needed first time)
docker run --name pg_migration_local \
  -e POSTGRES_PASSWORD=localpass \
  -e POSTGRES_DB=migration_db \
  -p 5433:5432 \
  -d postgres:16-alpine

# Wait for it to be ready
docker exec pg_migration_local pg_isready -U postgres
```

**If container already exists but is stopped:**
```bash
docker start pg_migration_local
docker exec pg_migration_local pg_isready -U postgres
```

---

## PHASE 2 — APPLY v3 SCHEMA

```bash
docker exec -i pg_migration_local psql -U postgres -d migration_db \
  < new_schemas.sql
```

**Expected output:** `CREATE TABLE`, `CREATE FUNCTION`, `CREATE TRIGGER`, `CREATE INDEX` (many lines, no ERRORs).

---

## PHASE 3 — LOAD STAGING DATA

```bash
# Step 3a: Create staging tables
docker exec -i pg_migration_local psql -U postgres -d migration_db \
  < stg_schema.sql

# Step 3b: Load EC2 production data into staging
docker exec -i pg_migration_local psql -U postgres -d migration_db \
  < ec2_data.sql
```

**Expected:** Only acceptable errors are sequence errors for dropped tables:
```
ERROR:  relation "public.employee_nominations_id_seq" does not exist
ERROR:  relation "public.partners_id_seq" does not exist
ERROR:  relation "public.team_members_id_seq" does not exist
```
These are safe to ignore — those tables don't exist in v3.

---

## PHASE 4 — RUN ETL MIGRATION

```bash
docker exec -i pg_migration_local psql -U postgres -d migration_db \
  < migration_etl.sql
```

**Expected output (clean run — zero ERRORs):**
```
TRUNCATE TABLE
DROP TABLE / DROP TABLE / CREATE TABLE / CREATE TABLE
INSERT 0 0    ← map_partners (no source partners)
INSERT 0 186  ← map_skills
INSERT 0 0    ← partners (empty source)
INSERT 0 78   ← skills
INSERT 0 9    ← certificates
INSERT 0 1    ← clients
INSERT 0 26   ← employee_master
INSERT 0 17   ← projects
INSERT 0 0    ← project_commercials (no commercial data in source)
INSERT 0 0    ← project_scopes (no scope data in source)
INSERT 0 26   ← employee_master_pro
INSERT 0 5    ← employee_certificates
INSERT 0 162  ← employee_skills
INSERT 0 161  ← project_skills (161 skill-project mappings)
INSERT 0 25   ← projects_allocation
INSERT 0 4    ← weekly_allocations
INSERT 0 0    ← users (no user data in source)
INSERT 0 0    ← actionable_todos
```

**Verify data:**
```bash
docker exec pg_migration_local psql -U postgres -d migration_db -c "
SELECT 'employees' AS t, COUNT(*) FROM employee_master
UNION ALL SELECT 'employee_pro', COUNT(*) FROM employee_master_pro
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'allocations', COUNT(*) FROM projects_allocation
UNION ALL SELECT 'skills', COUNT(*) FROM skills;"
```

---

## PHASE 5 — BACKEND CODE FIXES (v3 Schema Compatibility)

These are the exact SQL-level fixes required in the backend routers.

### 5.1 `backend/.env` — Point to local Docker DB

```env
DB_HOST=host.docker.internal
DB_PORT=5433
DB_NAME=migration_db
DB_USER=postgres
DB_PASSWORD=localpass
```

> **Note:** Use `host.docker.internal` (not `localhost`) when the backend runs inside
> Docker — `localhost` inside a container refers to the container itself, not the host.

### 5.2 `backend/app/routers/clients.py` — Partners endpoints

**Problem:** Old schema used `id` and `name` columns. New schema uses `partner_id` and `partner_name`.

| Endpoint | Fix |
|---|---|
| `GET /clients/partners` | `SELECT partner_id, partner_name FROM partners` |
| `POST /clients/partners` | `INSERT INTO partners (partner_name) VALUES (%s) RETURNING partner_id, partner_name` |
| `PUT /clients/partners/{partner_id}` | param type `int` → `str`; `SET name = %s WHERE id = %s` → `SET partner_name = %s WHERE partner_id = %s` |
| `DELETE /clients/partners/{partner_id}` | param type `int` → `str`; `DELETE FROM partners WHERE id = %s` → `WHERE partner_id = %s` |

### 5.3 `backend/app/routers/partner_clients.py` — All partner operations

Same column rename as above. Also change all path param types from `int` to `str`.

### 5.4 `backend/app/routers/projects.py` — `update_project_details`

**Problem:** `project_commercials` INSERT included `project_name` and `client_id` columns
that no longer exist in the v3 schema.

**Fix:** Remove `project_name` and `client_id` from the INSERT:
```python
# WRONG (legacy)
INSERT INTO project_commercials (project_id, project_name, client_id, budget, ...)

# CORRECT (v3)
INSERT INTO project_commercials (project_id, budget, billing_type, contract_type, revenue_model, commercial_notes)
```

Also simplify the project lookup from `SELECT project_name, client_id FROM projects` to `SELECT 1 FROM projects`.

### 5.5 `backend/app/routers/employees.py` — Remove `employee_nominations`

**Problem:** `employee_nominations` table was DROPPED in v3.

**Fix:**
- `fetch_employee_of_month`: Remove the nominations query block entirely. Keep only the allocation-based fallback.
- `nominate_employee`: Return a static message — nominations not supported in v3.

### 5.6 `backend/app/routers/allocations.py` — LIKE `%` escaping

**Problem:** `department_allocation_breakdown` query uses `LIKE '%billable%'` inside a
parameterized `cur.execute(query, params)` call. psycopg2 treats `%` as parameter
format codes, mangling the SQL when params is non-empty.

**Fix:** Double all `%` inside LIKE patterns to escape them for psycopg2:
```python
# WRONG
LOWER(pa.project_tags) LIKE '%billable%'

# CORRECT
LOWER(pa.project_tags) LIKE '%%billable%%'
```

Affected patterns: `'%billable%'` → `'%%billable%%'`, `'%non%'` → `'%%non%%'`, `'%nonbillable%'` → `'%%nonbillable%%'`

---

## PHASE 6 — DOCKER COMPOSE SETUP

The `docker-compose.full.yml` runs backend + frontend. The DB runs separately as `pg_migration_local`.

### Required additions to `docker-compose.full.yml`

Add `extra_hosts` to the backend service so it can resolve `host.docker.internal` on Linux/WSL:

```yaml
backend:
  ...
  extra_hosts:
    - "host.docker.internal:host-gateway"
```

### Start the full application

```bash
# Make sure DB container is running first
docker start pg_migration_local

# Build and start backend + frontend (skip ngrok for local dev)
cd /path/to/cd-utiliza-ai
docker compose -f docker-compose.full.yml up --build backend frontend

# Or start in detached mode (if already built)
docker compose -f docker-compose.full.yml start backend frontend
```

### Verify everything is up

```bash
# All three containers should show "Up"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' \
  | grep -E '(project-|pg_migration)'

# Test backend
curl http://localhost:8000/employees/list | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print('Employees:', len(d))"

# Test frontend (should return 200)
curl -o /dev/null -w "%{http_code}" http://localhost:5173
```

---

## PHASE 7 — CLEANUP (Optional)

Once migration is verified, remove the staging tables to reclaim space:

```bash
docker exec -i pg_migration_local psql -U postgres -d migration_db \
  < stg_cleanup.sql
```

---

## RECURRING STARTUP (After Machine Restart)

```bash
# 1. Start DB
docker start pg_migration_local

# 2. Start app
cd /path/to/cd-utiliza-ai
docker compose -f docker-compose.full.yml start backend frontend
```

---

## KNOWN DATA GAPS (Acceptable)

These tables are empty in the migrated DB because the source EC2 data had no records for them:

| Table | Reason |
|---|---|
| `partners` | No partners in legacy EC2 data |
| `project_commercials` | No budget/billing data in source |
| `project_scopes` | No objective/deliverables data in source |
| `departments` | New lookup table — populate via UI |
| `designations` | New lookup table — populate via UI |
| `users` | No auth users exported (populate via app registration) |
| `weekly_allocations` | Only 4 rows — sparse weekly data in source |

---

## MIGRATED DATA SUMMARY

| Table | Rows |
|---|---|
| `employee_master` | 26 |
| `employee_master_pro` | 26 |
| `projects` | 17 |
| `projects_allocation` | 25 |
| `skills` | 78 |
| `employee_skills` | 162 |
| `certificates` | 9 |
| `employee_certificates` | 5 |
| `clients` | 1 |
| `weekly_allocations` | 4 |

---

## COMMON ERRORS & FIXES

| Error | Cause | Fix |
|---|---|---|
| `FK violation on reporting_manager_id` | Manager ID not in `employee_master` (filtered out as duplicate) | ETL: Wrap in `CASE WHEN EXISTS(...) THEN id ELSE NULL END` |
| `relation "stg_partners" does not exist` | Staging tables were cleaned up before re-run | Re-run Phase 3 (stg_schema + ec2_data) before ETL |
| `tuple index out of range` in `/allocations/department-breakdown` | `%billable%` in LIKE treated as psycopg2 parameter placeholder | Double-escape: `%%billable%%` |
| `column "project_name" does not exist` in `project_commercials` | Backend still using legacy INSERT with removed columns | Remove `project_name` and `client_id` from INSERT |
| `relation "employee_nominations" does not exist` | Table dropped in v3 | Remove queries; return static message for `/employees/nominate` |
| `column "id" does not exist` on partners | Backend using old `id`/`name` columns | Use `partner_id`/`partner_name` in all partner queries |
| Backend can't connect to DB (`localhost:5433`) | Docker container can't reach host `localhost` | Use `host.docker.internal` + `extra_hosts: host-gateway` |

---

## SERVICE URLs

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:8000` |
| Backend Docs | `http://localhost:8000/docs` |
| Database | `localhost:5433` (psql: `-h localhost -p 5433 -U postgres -d migration_db`) |

---

*Migration completed: 2026-03-26 | Schema: v3 | Status: Production-ready on local Docker*
