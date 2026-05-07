# CD Utiliza AI — Application Runbook

> **Platform:** Cloud Destinations Internal Tool &nbsp;|&nbsp; **Stack:** React + FastAPI + PostgreSQL &nbsp;|&nbsp; **Infra:** Docker
>
> **Audience:** Developers · DevOps engineers · New team members

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Tech Stack](#2-tech-stack)
- [3. System Architecture](#3-system-architecture)
- [4. Repository Structure](#4-repository-structure)
- [**Getting Started**](#getting-started)
  - [5. Prerequisites](#5-prerequisites)
  - [6. Environment Variables](#6-environment-variables)
  - [7. Local Development Setup](#7-local-development-setup)
  - [8. Full Docker Setup](#8-full-docker-setup)
  - [9. Production Deployment](#9-production-deployment)
- [**Application Reference**](#application-reference)
  - [10. Pages & Features](#10-pages--features)
  - [11. API Reference](#11-api-reference)
  - [12. Database Schema](#12-database-schema)
- [**Developer Guide**](#developer-guide)
  - [13. Frontend Proxy Configuration](#13-frontend-proxy-configuration)
  - [14. Key Business Rules & Pitfalls](#14-key-business-rules--pitfalls)
  - [15. Export Capabilities](#15-export-capabilities)
  - [16. Feedback & Bug Reporting](#16-feedback--bug-reporting)
- [**Operations**](#operations)
  - [17. Troubleshooting](#17-troubleshooting)
  - [18. Commands Cheatsheet](#18-commands-cheatsheet)

---

## 1. Overview

**CD Utiliza AI** is a centralized resource allocation and project management platform for Cloud Destinations. It gives managers and team leads a single interface to track people, projects, and utilization in real time.

### What it does

| Capability | Description |
|------------|-------------|
| Employee Management | Track headcount, skills, certifications, and availability |
| Project Management | Create and manage Client, Internal, Partner, and POC projects |
| Resource Allocation | Assign employees to projects with weekly hours and % allocation |
| Utilization Monitoring | Billable, bench, and overallocated metrics across departments |
| Analytics & Reporting | KPI dashboards, risk boards, skill gap analysis, PDF/Excel/CSV exports |
| Feedback System | In-app bug reports and feature requests with email notifications |

### Primary Users

Resource managers · Project leads · Department heads · HR

---

## 2. Tech Stack

### Frontend

| Library | Purpose | Version |
|---------|---------|---------|
| React + Vite (SWC) | UI framework + build tool | React 18.3, Vite 7.2 |
| React Router DOM | Client-side routing | 7.13 |
| Tailwind CSS | Utility-first styling | 3.4 |
| Axios | HTTP client | 1.13 |
| Recharts | Data visualization | 3.7 |
| Lucide React | Icon library | latest |
| jsPDF + autotable | PDF export | 4.2 |
| SheetJS (xlsx) | Excel export | 0.18 |

### Backend

| Library | Purpose | Version |
|---------|---------|---------|
| FastAPI + Uvicorn | REST API framework + ASGI server | latest |
| Python | Backend language | 3.10+ |
| Psycopg2 | PostgreSQL driver | latest |
| Passlib + bcrypt | Password hashing | latest |
| Redis | Cache + async job queue | 7 |
| SMTP / Gmail | Email notifications | — |

### Infrastructure

| Component | Technology | Version |
|-----------|-----------|---------|
| Database | PostgreSQL | 16 |
| Web server (prod) | Nginx | latest |
| Containerization | Docker + Docker Compose | — |

---

## 3. System Architecture

### Production

```
  Browser
    │
    │ :80
    ▼
┌─────────────────────────────────┐
│  Nginx                          │
│  ├── serves React static bundle │
│  └── proxies /api/* → :8000     │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  FastAPI  (Uvicorn :8000)       │
│  ├── PostgreSQL  (:5432)        │
│  ├── Redis       (:6379)        │
│  └── SMTP → Gmail (outbound)    │
└─────────────────────────────────┘
```

### Local Development

```
  Browser
    │
    │ :5173
    ▼
┌─────────────────────────────────┐
│  Vite Dev Server (HMR)          │
│  └── proxy ^/(routes) → :8000   │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  FastAPI  (Uvicorn :8000)       │  ← WSL native, --reload
│  ├── PostgreSQL  (:5433)        │  ← Docker container
│  └── Redis       (:6379)        │  ← Docker container
└─────────────────────────────────┘
```

**Request flow (dev):**
1. Browser hits Vite at `localhost:5173`
2. API calls matching the proxy regex forward to `localhost:8000`
3. FastAPI queries PostgreSQL and/or Redis
4. Feedback submissions push to Redis queue → SMTP email

---

## 4. Repository Structure

```
cd-utiliza-ai/
│
├── frontend/                          React + Vite SPA
│   ├── src/
│   │   ├── api/                       Axios API client modules
│   │   │   ├── axios.js                 Base Axios instance
│   │   │   ├── authApi.js               Login / register / verify
│   │   │   ├── employeeApi.js           Employee CRUD
│   │   │   ├── projectsApi.js           Projects CRUD
│   │   │   ├── allocationApi.js         Allocation metrics & import
│   │   │   ├── clientApi.js             Client management
│   │   │   ├── dashboardApi.js          Dashboard aggregations
│   │   │   ├── availabilityApi.js       Availability timeline
│   │   │   ├── feedbackApi.js           Feedback submission
│   │   │   └── entitiesApi.js           Master data (depts, skills)
│   │   ├── components/                Shared UI (navbar, modals)
│   │   ├── context/                   React Context providers
│   │   │   ├── ClientContext.jsx
│   │   │   ├── EmployeeContext.jsx
│   │   │   ├── ProjectContext.jsx
│   │   │   └── index.jsx                Root provider
│   │   ├── dashboard/                 Feature pages + sub-components
│   │   │   ├── Dashboard.jsx            KPIs and forecast
│   │   │   ├── Employee.jsx             Employee management
│   │   │   ├── Projects.jsx             Project management
│   │   │   ├── Allocations.jsx          Allocation dashboard
│   │   │   ├── Availability.jsx         Availability timeline
│   │   │   ├── Client.jsx               Client management
│   │   │   ├── Organization.jsx         Org chart
│   │   │   ├── FullAnalytics.jsx        Advanced analytics
│   │   │   ├── Settings.jsx             User settings
│   │   │   ├── allocation/              Allocation sub-components
│   │   │   ├── employee/                Employee sub-components
│   │   │   ├── clients/                 Client sub-components
│   │   │   └── projects/                Project sub-components
│   │   ├── login-register/            Auth pages (Login, Register, Verify)
│   │   ├── utils/                     Export helpers, avatar utilities
│   │   ├── data/                      Static constants
│   │   ├── App.jsx                    Route definitions
│   │   ├── MainDashboard.jsx          Dashboard layout wrapper
│   │   └── main.jsx                   React entry point
│   ├── package.json
│   ├── vite.config.js                 Vite config + dev proxy
│   └── Dockerfile.prod                Production Nginx build
│
├── backend/
│   ├── app/
│   │   ├── main.py                    FastAPI app, CORS, router registration
│   │   ├── database.py                PostgreSQL connection pool (min 1 / max 20)
│   │   ├── auth_utils.py              Bcrypt password utilities
│   │   └── routers/
│   │       ├── auth.py                POST /register, POST /login
│   │       ├── employees.py           Employee CRUD + queries
│   │       ├── projects.py            Project CRUD + resource allocation
│   │       ├── allocations.py         Allocation metrics & bulk import
│   │       ├── clients.py             Client CRUD + partner sub-routes
│   │       ├── partner_clients.py     Partner client CRUD (/partner-clients)
│   │       ├── clients_partners.py    Alternate /clients + /partners endpoints
│   │       ├── dashboard.py           KPIs, todos, risk board
│   │       ├── availability.py        Availability timeline
│   │       └── feedback.py            Feedback submission
│   ├── requirements.txt
│   ├── .env                           Local environment variables
│   └── Dockerfile.prod                Production backend image
│
├── database/
│   ├── schema.sql                     PostgreSQL schema (tables, functions, triggers)
│   └── init.sql                       DB init script (schema + seed)
│
├── docker-compose.local.yml           Local dev: Postgres + Redis only
├── docker-compose.prod.single.yml     Production: all services, single host
├── docker-compose.prod.app.yml        Production: app services only
├── docker-compose.prod.db.yml         Production: DB services only
├── .env.prod.app                      Production app environment
├── .env.prod.db                       Production database environment
├── RUNBOOK.md                         This file
├── README.md                          Project overview
├── LOCAL_DEV_SETUP.md                 Quick-start local dev guide
├── CLAUDE.md                          Architecture notes for AI assistant
└── MCP_GUIDE.md                       MCP server guide
```

---

## Getting Started

---

## 5. Prerequisites

### Docker-based setup _(recommended)_

| Tool | Min Version | Notes |
|------|------------|-------|
| Docker Desktop | 4.x | [docker.com](https://www.docker.com/products/docker-desktop) |
| Docker Compose | v2 | Bundled with Docker Desktop |

```bash
docker --version
docker compose version
```

### Local native dev _(WSL on Windows)_

| Tool | Min Version | Notes |
|------|------------|-------|
| WSL 2 | — | Windows users only |
| Python | 3.10+ | For backend virtual environment |
| Node.js | 18+ | For Vite dev server |
| npm | 9+ | Bundled with Node.js |
| Docker Desktop | 4.x | For Postgres + Redis containers |

---

## 6. Environment Variables

Create `backend/.env` using the template below. **Never commit this file.**

```env
# ── Database ──────────────────────────────────────────────────────
DB_HOST=localhost        # Docker backend: host.docker.internal | WSL: localhost
DB_PORT=5433             # Local dev: 5433 | Production: 5432
DB_NAME=migration_db
DB_USER=postgres
DB_PASSWORD=your_db_password

# ── Redis ─────────────────────────────────────────────────────────
REDIS_HOST=localhost     # Docker: redis (service name) | WSL native: localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# ── SMTP (Gmail) ──────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password   # Gmail App Password, NOT account password

# ── Notifications ─────────────────────────────────────────────────
TEAM_EMAILS=person1@company.com,person2@company.com
ADMIN_EMAIL=admin@company.com
```

### Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | Yes | — | PostgreSQL host |
| `DB_PORT` | Yes | `5432` | `5433` for local dev (avoids system Postgres conflict) |
| `DB_NAME` | Yes | `migration_db` | Database name |
| `DB_USER` | Yes | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | Yes | — | PostgreSQL password |
| `REDIS_HOST` | Yes | — | Redis hostname |
| `REDIS_PORT` | Yes | `6379` | Redis port |
| `REDIS_PASSWORD` | Yes | — | Redis password |
| `SMTP_HOST` | Yes | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | Yes | `587` | SMTP port (TLS) |
| `SMTP_USER` | Yes | — | Sender email address |
| `SMTP_PASSWORD` | Yes | — | Gmail App Password (not your Google login) |
| `TEAM_EMAILS` | Yes | — | Comma-separated notification recipients |
| `ADMIN_EMAIL` | No | — | Admin email address |

### Production Environment Files

| File | Used by |
|------|---------|
| `.env.prod.app` | Backend + frontend containers |
| `.env.prod.db` | PostgreSQL + Redis containers |

> **Gmail App Password:** Go to Google Account → Security → 2-Step Verification → App passwords. 2FA must be enabled.

---

## 7. Local Development Setup

> **Recommended for daily development.** Postgres and Redis run in Docker; backend and frontend run natively in WSL with instant hot-reload.

### Service Map

| Service | Runs via | Port | Hot-reload |
|---------|----------|------|-----------|
| PostgreSQL | Docker | 5433 | — |
| Redis | Docker | 6379 | — |
| FastAPI backend | WSL native | 8000 | Yes (`--reload`) |
| React frontend | WSL native | 5173 | Yes (Vite HMR) |

### Step 1 — One-Time Setup

```bash
# Navigate to project root in WSL
cd /mnt/c/Users/PrasanthSubramanian/Desktop/git-repo-int-project/cd-utiliza-ai

# Backend: create virtual environment and install dependencies
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Frontend: install Node dependencies
cd frontend
npm install
cd ..

# Start Postgres and Redis in Docker
docker compose -f docker-compose.local.yml up postgres redis -d
```

### Step 2 — Daily Startup

Open **two WSL terminals:**

**Terminal 1 — Backend**
```bash
cd /mnt/c/Users/PrasanthSubramanian/Desktop/git-repo-int-project/cd-utiliza-ai/backend
source venv/bin/activate
export DB_HOST=localhost DB_PORT=5433 REDIS_HOST=localhost REDIS_PORT=6379
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend**
```bash
cd /mnt/c/Users/PrasanthSubramanian/Desktop/git-repo-int-project/cd-utiliza-ai/frontend
npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend (React) | http://localhost:5173 |
| Backend (FastAPI) | http://localhost:8000 |
| Swagger API Docs | http://localhost:8000/docs |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6379` |

### Stopping

```bash
# Stop backend and frontend: Ctrl+C in each terminal

# Stop Postgres and Redis
docker compose -f docker-compose.local.yml stop postgres redis
```

---

## 8. Full Docker Setup

Runs all services in Docker — no local Python or Node required.

```bash
# First run or after dependency changes
docker compose -f docker-compose.local.yml up --build

# Regular startup
docker compose -f docker-compose.local.yml up -d

# Stop all services
docker compose -f docker-compose.local.yml down

# Full reset (removes volumes)
docker compose -f docker-compose.local.yml down -v
```

Access points are the same as local dev (ports 5173 and 8000).

---

## 9. Production Deployment

### Option A — Single Instance _(all services on one host)_

```bash
docker compose -f docker-compose.prod.single.yml up -d --build
```

| Service | Image | Host Port | Volume |
|---------|-------|-----------|--------|
| `postgres` | postgres:16-alpine | Internal only | `postgres_data_prod` |
| `redis` | redis:7-alpine | Internal only | `redis_data_prod` |
| `backend` | Custom Dockerfile.prod | Internal only | — |
| `frontend` | Nginx Dockerfile.prod | **80** | — |

- All services communicate over the internal `app-network` bridge
- Only the Nginx frontend is exposed on port 80
- `postgres` and `backend` have health checks; dependent services wait for them

### Option B — Split DB + App _(separate hosts)_

```bash
# On the database host
docker compose -f docker-compose.prod.db.yml up -d

# On the application host
docker compose -f docker-compose.prod.app.yml up -d --build
```

### Updating the App (no DB changes)

```bash
git pull
docker compose -f docker-compose.prod.single.yml up -d --build backend frontend
```

---

## Application Reference

---

## 10. Pages & Features

### Authentication

| Route | Page | Description |
|-------|------|-------------|
| `/` | Login | Email + password login, JWT returned |
| `/register` | Register | Create a new account |
| `/verify` | Email Verify | Email address verification |

### Dashboard & Core Pages

| Route | Page | Key Features |
|-------|------|-------------|
| `/info/dashboard` | Dashboard | Summary cards (Employees, Clients, Projects, Bench), 3-month forecast chart, KPI metrics, risk board, CSV export |
| `/info/employee` | Employees | Master list with search/filter, add/edit/delete, bulk CSV/Excel import, skill & cert tracking, allocation history |
| `/info/employee/add` | Add Employee | Multi-step add employee form |
| `/info/employee/:id` | Employee Profile | Personal info, allocations, skills, certifications, reporting manager |
| `/info/employees/list` | Employee List | Flat master list with advanced filters |
| `/info/projects` | Projects | Project list (filter by status/type/client), add/edit/delete, team allocation, weekly hours, PDF/CSV/Excel export |
| `/info/projects/add` | Add Project | Type selector (Client/Internal/Partner/POC), client/partner pick, team members, allocation % |
| `/info/projects/:id` | Project Details | Resource table, weekly hours, commercials, scope & deliverables, team management |
| `/info/allocation` | Allocations | 6 metric cards, billable/bench charts, dept utilization, bench forecast, project matching, bulk import |
| `/info/availability` | Availability | Employee timeline view, allocation date ranges, filter by dept/project/location, export |
| `/info/client` | Clients | Client + partner management, budget tracking, status, linked projects |
| `/info/organization` | Organization | Org chart, department hierarchy, team breakdowns |
| `/info/analytics` | Analytics | Workforce pulse (bench risk, transitions, skill gaps), PDF export |
| `/info/settings` | Settings | User profile and preferences |
| `/info/WorkStatus` | Work Status | Employee work status tracking |

---

## 11. API Reference

> Interactive Swagger UI: **http://localhost:8000/docs**

---

### Authentication
> `backend/app/routers/auth.py`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register` | Register new user — body: `{ email, password }` |
| `POST` | `/login` | Login — body: `{ email, password }` → returns `user_id` |

---

### Employees
> `backend/app/routers/employees.py`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/employees/list` | All active employees with allocations, status, skills |
| `GET` | `/employees/{employee_id}` | Full employee profile |
| `POST` | `/employees` | Create employee |
| `PUT` | `/employees/{employee_id}` | Update employee |
| `DELETE` | `/employees/{employee_id}` | Delete employee |
| `GET` | `/employees/roles` | All unique roles/designations |
| `GET` | `/employees/upcoming-bench` | Employees off projects in next 30 days |
| `GET` | `/employees/new-joiners` | Employees joined in last 90 days |
| `GET` | `/employees/employee-of-month` | Current employee of the month |
| `POST` | `/employees/nominate` | Nominate employee of the month |
| `GET` | `/employees/action-inbox` | Action items inbox |
| `GET` | `/employees/filter-options` | Filter dropdown values (dept, location, status) |
| `GET` | `/employees/departments/roles-mapping` | Department → roles mapping |
| `GET` | `/employees/allocations/weekly` | Weekly allocation hours |
| `GET` | `/employee/by-email/{email_id}` | Look up employee by email |
| `POST` | `/employee/count` | Total active employee count |
| `POST` | `/employee/bench` | Bench employee count |
| `POST` | `/employee/notice` | Notice period employee count |

---

### Projects
> `backend/app/routers/projects.py` — prefix: `/projects`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/projects/overview` | Project summary stats |
| `GET` | `/projects/list` | All projects — filters: status, type, client |
| `POST` | `/projects` | Create project → see [Business Rules](#14-key-business-rules--pitfalls) |
| `PUT` | `/projects/{project_id}` | Update project metadata |
| `DELETE` | `/projects/{project_id}` | Delete project |
| `GET` | `/projects/{project_id}/details` | Commercial, scope, milestones |
| `PUT` | `/projects/{project_id}/details` | Update commercial/scope details |
| `GET` | `/projects/{project_id}/resources` | All team members and allocations |
| `POST` | `/projects/{project_id}/resources` | Add a resource |
| `PUT` | `/projects/{project_id}/resources` | Replace all resources |
| `PATCH` | `/projects/{project_id}/resources/{allocation_id}` | Update single allocation |
| `DELETE` | `/projects/{project_id}/resources/{allocation_id}` | Remove resource |
| `POST` | `/projects/{project_id}/resources/export/pdf` | Generate PDF for project resources |

---

### Allocations
> `backend/app/routers/allocations.py` — prefix: `/allocations`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/allocations/metrics` | 6 info-cards: Total, Billable, Non-Billable, Bench, Avg Utilization, Overallocated |
| `GET` | `/allocations/projects` | Projects with billable/non-billable counts |
| `GET` | `/allocations/projects/{project_id}/employees` | Employees on a project with % and tags |
| `GET` | `/allocations/organization` | Org-wide utilization by status |
| `GET` | `/allocations/department-breakdown` | Billable/non-billable per department |
| `GET` | `/allocations/forecast-bench` | Allocations ending in next 30 days |
| `GET` | `/allocations/possible-projects/{employee_id}` | Projects matching bench employee skills |
| `POST` | `/allocations/import` | Bulk import — body: `{ dry_run: bool, rows: [...] }` |

---

### Clients
> `backend/app/routers/clients.py` — prefix: `/clients`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/clients` | All clients with linked projects and stakeholders |
| `POST` | `/clients` | Create client |
| `PUT` | `/clients/{client_id}` | Update client (name, URL, industry, status, budget) |
| `DELETE` | `/clients/{client_id}` | Delete client |
| `GET` | `/clients/simple` | Lightweight list (id + name) |
| `POST` | `/clients/simple` | Create client (simple) |
| `PUT` | `/clients/simple/{client_id}` | Update client (simple) |
| `DELETE` | `/clients/simple/{client_id}` | Delete client (simple) |
| `GET` | `/clients/partners` | All partners |
| `POST` | `/clients/partners` | Create partner |
| `PUT` | `/clients/partners/{partner_id}` | Update partner |
| `DELETE` | `/clients/partners/{partner_id}` | Delete partner |

---

### Partner Clients
> `backend/app/routers/partner_clients.py` — prefix: `/partner-clients`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/partner-clients` | List all partner clients |
| `POST` | `/partner-clients` | Create partner client |
| `PUT` | `/partner-clients/{partner_client_id}` | Update partner client |
| `DELETE` | `/partner-clients/{partner_client_id}` | Delete partner client |

---

### Dashboard
> `backend/app/routers/dashboard.py`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dashboard/all` | Consolidated: cards, forecast, employees, projects, utilization |
| `GET` | `/dashboard/infocards` | Summary cards only |
| `GET` | `/dashboard/departments` | All departments list |
| `GET` | `/dashboard/skills-gap` | Skill gap analysis |
| `GET` | `/dashboard/executive-metrics` | Executive KPIs |
| `GET` | `/dashboard/todos` | Current user's todos |
| `POST` | `/dashboard/todos` | Add todo |
| `PUT` | `/dashboard/todos/{todo_id}/toggle` | Toggle todo status |
| `DELETE` | `/dashboard/todos/{todo_id}` | Delete todo |
| `GET` | `/dashboard/export-risk-board` | Export risk board as CSV |

---

### Availability
> `backend/app/routers/availability.py` — prefix: `/availability`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/availability/all` | All employees' allocation data — query: `department`, `project`, `location` |
| `GET` | `/availability/filters` | Unique filter values (depts, projects, locations) |

---

### Feedback
> `backend/app/routers/feedback.py` — prefix: `/feedback`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/feedback` | Submit ticket — body: `{ employee_id, email, subject, description, type, priority }` |

---

## 12. Database Schema

> Connection pool: **min 1 / max 20** — configured in `backend/app/database.py`

### Tables

| Table | Primary Key | Key Columns | Purpose |
|-------|-------------|-------------|---------|
| `users` | `id` serial | `employee_id`, `email`, `password_hash`, `is_active` | Login accounts |
| `employee_master` | `employee_id` varchar | `employee_name`, `email_id`, `location`, `department`, `date_of_joining`, `role_designation`, `employee_type` | Master employee records |
| `employee_master_pro` | `employee_id` FK | `reporting_manager_id`, `employee_status`, `employee_allocations` | Status and professional details |
| `employee_skills` | `(employee_id, skill_id)` | `proficiency_level` 1–5, `years_of_experience` | Skill proficiencies |
| `employee_certificates` | `(employee_id, certificate_id)` | `issued_date`, `expiry_date` | Certifications |
| `projects` | `project_id` varchar | `project_name`, `project_status`, `project_type`, `billable`, `start_date`, `end_date`, `client_id`, `partner_id` | Projects |
| `projects_allocation` | `allocation_id` serial | `employee_id`, `project_id`, `role_in_project`, `allocation_percentage` 0–100, `allocation_start_date`, `allocation_end_date`, `project_tags` | Employee-to-project allocations |
| `weekly_allocations` | `id` serial | `allocation_id`, `allocation_year`, `week_number`, `allocated_hours` | Weekly hours per allocation |
| `project_skills` | `(project_id, skill_id)` | — | Skills required by project |
| `project_commercials` | `id` serial | `project_id`, `budget`, `billing_type`, `contract_type`, `revenue_model` | Budget and commercial terms |
| `project_scopes` | `id` serial | `project_id`, `objective`, `deliverables`, `milestones`, `timeline_notes` | Scope and milestones |
| `clients` | `client_id` serial | `client_name`, `website_url`, `industry`, `status`, `budget`, `partner_id` | Client organizations |
| `partners` | `partner_id` serial | `partner_name`, `status` | Partner/vendor organizations |
| `skills` | `skill_id` serial | `skill_name` | Master skill list |
| `departments` | `department_id` serial | `department_name` | Departments |
| `designations` | `designation_id` serial | `designation_name` | Job titles / roles |
| `certificates` | `certificate_id` serial | `certificate_name` | Master certificate list |
| `actionable_todos` | `id` serial | `user_id`, `message`, `type`, `status` | User action items |
| `feedback_tickets` | `id` serial | `employee_id`, `subject`, `description`, `type`, `priority`, `status` | Feedback and bug reports |

### Entity Relationships

```
users
└── employee_master              (via employee_id)
      ├── employee_master_pro    1:1
      ├── employee_skills        1:many  →  skills
      ├── employee_certificates  1:many  →  certificates
      └── projects_allocation    1:many
            ├── weekly_allocations  1:many
            └── projects            (via project_id)
                  ├── project_commercials  1:1
                  ├── project_scopes       1:1
                  ├── project_skills       1:many  →  skills
                  └── clients              (via client_id)
                        └── partners       (via partner_id)
```

### Auto-Generated Project IDs

A PostgreSQL trigger (`fn_generate_project_id`) fires on INSERT if no `project_id` is provided:

| Project Type | DB Format | Example |
|-------------|-----------|---------|
| Client | `CP-####` | `CP-0042` |
| Internal / Partner / POC | `CD-####` | `CD-0017` |

The frontend also generates collision-resistant IDs:
```js
`PRJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
```

---

## Developer Guide

---

## 13. Frontend Proxy Configuration

The Vite dev server forwards matching requests to `http://localhost:8000`. Configured in [frontend/vite.config.js](frontend/vite.config.js) at line 41:

```js
'^/(api/)?(login|register|employees?|dashboard|projects|allocations|clients|partner-clients|partners|availability|departments|feedback)'
```

### Adding a New Route

When you add a new FastAPI router, **you must also update this regex**, or the Vite server will intercept the request and return a 404 HTML response.

**Example — adding a `/reports` router:**
```js
// Before
'^/(api/)?(login|register|...|feedback)'

// After
'^/(api/)?(login|register|...|feedback|reports)'
```

Then restart the Vite dev server.

---

## 14. Key Business Rules & Pitfalls

### Rule 1 — `projects` table has no `client_name` column

> **Symptom:** HTTP 500 on project create or update

The `projects` table stores **only foreign key IDs** — there is no text column for client name.

| Correct | Incorrect |
|---------|-----------|
| `client_id` (varchar FK → `clients`) | `client_name` (does not exist) |
| `partner_id` (varchar FK → `partners`) | inserting `client_name` text |

Check `backend/app/routers/projects.py` — only `client_id` and `partner_id` should appear in INSERT/UPDATE statements.

---

### Rule 2 — Vite proxy must cover all backend route prefixes

> **Symptom:** HTTP 404 with HTML body on API calls (Vite served the page instead of calling FastAPI)

Every new router prefix must be added to the proxy regex in `frontend/vite.config.js`. See [Section 13](#13-frontend-proxy-configuration).

---

### Rule 3 — Project ID must be collision-resistant

> **Symptom:** HTTP 409 Conflict on `POST /projects`

Use a timestamp + random suffix — never a simple counter or short UUID:

```js
`PRJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
```

The DB trigger also auto-generates an ID if none is provided, but if the frontend sends an existing ID it will collide.

---

### Rule 4 — Weekly allocation key format

> **Symptom:** DB insert failure or duplicate key error on `weekly_allocations`

The `weekly_hours` dict uses `"year-week"` string keys (e.g. `"2026-14"`). Before inserting into the DB, split the key:

```python
year, week_number = "2026-14".split("-")
# INSERT ... allocation_year=2026, week_number=14
```

The unique constraint is `(allocation_id, allocation_year, week_number)` — duplicate weeks will fail.

---

## 15. Export Capabilities

| Page / Feature | CSV | Excel (.xlsx) | PDF |
|----------------|:---:|:------------:|:---:|
| Dashboard risk board | Yes | — | — |
| Employee list | Yes | Yes | — |
| Project resources | Yes | Yes | Yes |
| Availability timeline | Yes | Yes | Yes |
| Full Analytics | — | — | Yes |
| Allocation dashboard | Yes | — | — |

- **Frontend PDF:** jsPDF + jspdf-autotable (client-side generation)
- **Backend PDF:** `POST /projects/{id}/resources/export/pdf` (server-side)
- **Excel:** SheetJS (xlsx library)

---

## 16. Feedback & Bug Reporting

Users submit feedback through the in-app form. The submission triggers three actions in parallel:

```
User submits form
       │
       ▼
POST /feedback
       │
       ├──► INSERT → feedback_tickets (PostgreSQL)
       ├──► PUSH   → Redis job queue (async processing)
       └──► SEND   → SMTP email to TEAM_EMAILS list
```

### Ticket Classification

| Field | Options |
|-------|---------|
| **Type** | `Bug` · `Feature Request` · `General` |
| **Priority** | `Low` · `Medium` · `High` |
| **Status** | `open` · `resolved` · `closed` |

To view tickets, query the `feedback_tickets` table directly in PostgreSQL or use `GET /dashboard/todos` for action items.

---

## Operations

---

## 17. Troubleshooting

### HTTP 500 on project create/update

| | |
|-|-|
| **Symptom** | `POST /projects` or `PUT /projects/{id}` returns 500 |
| **Cause** | SQL is trying to insert/update a `client_name` column that does not exist |
| **Fix** | In `backend/app/routers/projects.py`, use only `client_id` and `partner_id` — never `client_name` |

---

### HTTP 404 on API calls from the frontend

| | |
|-|-|
| **Symptom** | API call returns 404 with HTML (not JSON) |
| **Cause** | Route prefix is missing from the Vite proxy regex |
| **Fix** | Add the prefix to `frontend/vite.config.js` and restart `npm run dev` |

---

### HTTP 409 Conflict on project create

| | |
|-|-|
| **Symptom** | `POST /projects` returns 409 |
| **Cause** | `project_id` already exists in the database |
| **Fix** | Use the timestamp-based ID pattern (see [Rule 3](#rule-3--project-id-must-be-collision-resistant)) |

---

### Database connection error on startup

| | |
|-|-|
| **Symptom** | `psycopg2.OperationalError: could not connect to server` |
| **Fix** | 1. Check `docker ps` — is the postgres container running? <br> 2. Verify `DB_HOST` and `DB_PORT` in `backend/.env` <br> 3. WSL native: ensure `DB_HOST=localhost` `DB_PORT=5433` are exported <br> 4. Docker backend: use `DB_HOST=host.docker.internal` |

---

### Redis connection error

| | |
|-|-|
| **Symptom** | `redis.exceptions.ConnectionError` or feedback saves silently fail |
| **Fix** | 1. Check `docker ps` — is the redis container running? <br> 2. Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` in `.env` <br> 3. WSL native: export `REDIS_HOST=localhost` in the backend terminal |

---

### Feedback email not sending

| | |
|-|-|
| **Symptom** | Ticket saved to DB but no email received |
| **Fix** | 1. `SMTP_PASSWORD` must be a **Gmail App Password**, not your Google account password <br> 2. Enable 2FA on the Gmail account first (App Passwords require it) <br> 3. Check `docker compose logs -f backend` for SMTP errors |

---

### Frontend not reflecting backend changes

| | |
|-|-|
| **Symptom** | Stale UI after a backend code change |
| **Fix (local dev)** | Backend runs with `--reload` — changes apply automatically. If stuck, `Ctrl+C` and restart. |
| **Fix (Docker)** | `docker compose up -d --build backend` |

---

### `Module not found` on frontend startup

| | |
|-|-|
| **Symptom** | `npm run dev` fails with module resolution errors |
| **Fix** | `cd frontend && rm -rf node_modules && npm install` |

---

## 18. Commands Cheatsheet

### Local Development

```bash
# Start Postgres + Redis
docker compose -f docker-compose.local.yml up postgres redis -d

# Backend (Terminal 1)
cd backend && source venv/bin/activate
export DB_HOST=localhost DB_PORT=5433 REDIS_HOST=localhost REDIS_PORT=6379
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Terminal 2)
cd frontend && npm run dev

# Stop Postgres + Redis
docker compose -f docker-compose.local.yml stop postgres redis
```

### Docker (Full Stack)

```bash
# First run or after dependency changes
docker compose -f docker-compose.local.yml up --build

# Regular start
docker compose -f docker-compose.local.yml up -d

# Stop
docker compose -f docker-compose.local.yml down

# Full reset (wipes volumes)
docker compose -f docker-compose.local.yml down -v
```

### Production

```bash
# Deploy all services
docker compose -f docker-compose.prod.single.yml up -d --build

# Redeploy app only (no DB downtime)
docker compose -f docker-compose.prod.single.yml up -d --build backend frontend

# Stop
docker compose -f docker-compose.prod.single.yml down
```

### Logs

```bash
# Stream backend logs
docker compose -f docker-compose.prod.single.yml logs -f backend

# Stream frontend (Nginx) logs
docker compose -f docker-compose.prod.single.yml logs -f frontend

# Last 100 lines from all services
docker compose -f docker-compose.prod.single.yml logs --tail=100
```

### Database

```bash
# Connect via Docker exec
docker exec -it <postgres_container_name> psql -U postgres -d migration_db

# Connect via psql client
psql -h localhost -p 5433 -U postgres -d migration_db

# Apply schema changes
psql -h localhost -p 5433 -U postgres -d migration_db -f database/schema.sql
```

### Frontend Build

```bash
# Build production bundle
cd frontend && npm run build

# Preview production build locally
cd frontend && npm run preview
```

---

*Last updated: 2026-04-06*
