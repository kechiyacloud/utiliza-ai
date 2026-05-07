# Project Dashboard

## Overview

Project Dashboard is a centralized organizational platform designed to manage **employees, projects, and resource allocations** from a single interface.
The system provides **role-based access**, ensuring that users view and manage data according to their organizational responsibilities.
This dashboard offers a **complete organizational view**, from individual employee details to high-level project and allocation insights for leadership.

---

## Project Aim

- Centralize employee, project, and allocation information
- Enable efficient project allocation management
- Provide role-specific dashboards for better decision-making
- Improve visibility, tracking, and control across the organization

---

## Technology Stack

**Frontend**
- React.js 18 with Vite
- React Router DOM 7
- Tailwind CSS
- Recharts (data visualization)
- Axios (HTTP client)
- jsPDF + jspdf-autotable (PDF exports)
- XLSX (Excel exports)
- Lucide React (icons)

**Backend**
- Python 3 with FastAPI
- Uvicorn (ASGI server)
- Psycopg2 (PostgreSQL driver)
- Passlib + bcrypt (password hashing)
- Redis (caching and job queue)
- SMTP / Gmail (email notifications)

**Database**
- PostgreSQL 16

**Authentication & Security**
- JWT-based authentication
- Role-based authorization
- Bcrypt password hashing
- CORS middleware

**Infrastructure**
- Docker & Docker Compose

---

## Project Structure

```text
cd-utiliza-ai/
├── frontend/
│   ├── src/
│   │   ├── dashboard/           # Pages and components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Employee.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── Allocations.jsx
│   │   │   ├── Availability.jsx
│   │   │   ├── Client.jsx
│   │   │   ├── Organization.jsx
│   │   │   ├── FullAnalytics.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── allocation/
│   │   │   ├── employee/
│   │   │   ├── clients/
│   │   │   └── projects/
│   │   ├── api/                 # API client functions
│   │   ├── components/          # Shared UI components
│   │   ├── context/             # React Context (global state)
│   │   ├── utils/               # Utilities (export helpers, etc.)
│   │   ├── login-register/      # Auth pages
│   │   └── App.jsx              # Route configuration
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── database.py          # Connection pooling
│   │   ├── auth_utils.py        # JWT utilities
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── employees.py
│   │       ├── projects.py
│   │       ├── allocations.py
│   │       ├── clients.py
│   │       ├── partner_clients.py
│   │       ├── dashboard.py
│   │       ├── availability.py
│   │       └── feedback.py
│   ├── requirements.txt
│   └── .env
│
├── database/
│   └── init.sql                 # Schema, tables, functions, seed data
│
├── docker-compose.local.yml     # Local development
├── docker-compose.full.yml      # Full setup with Ngrok tunneling
└── README.md
```

---

## Prerequisites

Install Docker Desktop (Windows/Mac) or Docker Engine (Linux).

Verify:
```bash
docker --version
docker compose version
```

---

## Environment Variables

Create `backend/.env` with the following values:

```env
# Database
DB_HOST=host.docker.internal
DB_PORT=5433
DB_NAME=migration_db
DB_USER=postgres
DB_PASSWORD=your_db_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# SMTP (email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Admin
ADMIN_EMAIL=your_email@gmail.com
```

---

## Running the Project

### Local Development

From the project root:

```bash
# First time or after dependency changes
docker compose -f docker-compose.local.yml up --build

# Regular startup
docker compose -f docker-compose.local.yml up
```

### Full Setup (with Ngrok tunneling)

```bash
docker compose -f docker-compose.full.yml up --build
```

### Stop Containers

Press `CTRL + C`, or:

```bash
docker compose -f docker-compose.local.yml down
```

---

## Access Points

| Service             | URL                          |
|---------------------|------------------------------|
| Frontend            | http://localhost:5173        |
| Backend API         | http://localhost:8000        |
| API Swagger Docs    | http://localhost:8000/docs   |
| PostgreSQL          | localhost:5433               |
| Redis               | localhost:6379               |

---

## Features

### Dashboard
- Summary cards: Total Employees, Clients, Projects, Bench Strength
- KPIs, departmental insights, risk board
- CSV export for risk board data

### Employee Management
- Employee master list with search and filters
- Add, edit, delete employee records
- Skills and certification tracking
- Bulk upload via Excel/CSV
- Per-employee allocation history

### Project Management
- Project list filtered by status, type, client
- Detailed project view with team member allocations
- Weekly resource allocation (W1–W4)
- Export to CSV, Excel, PDF

### Allocation Dashboard
- Billable / Internal / Bench metrics
- Department and location utilization charts
- Forecasting and project matching

### Resource Availability
- Timeline view of employee availability
- Filter by department and project
- Export to CSV, Excel, PDF

### Client Management
- Internal client and partner/vendor client management
- Budget and status tracking

### Analytics
- Workforce pulse: bench risk, transitions, skill gaps
- Export to PDF

### Organization
- Org chart and hierarchy view
- Department breakdowns

### Settings & Auth
- User profile and preferences
- JWT-based login, registration, email verification

---

## API Overview

| Router           | Prefix              | Responsibilities                          |
|------------------|---------------------|-------------------------------------------|
| auth             | `/auth`             | Login, logout, token refresh              |
| employees        | `/`                 | Employee CRUD, skills, certs, allocations |
| projects         | `/projects`         | Project CRUD, team allocations, PDF export|
| allocations      | `/allocations`      | Metrics, utilization, department data     |
| clients          | `/clients`          | Client CRUD, budget tracking              |
| partner_clients  | `/clients/partner`  | Partner/vendor client management          |
| dashboard        | `/dashboard`        | Aggregated KPIs, risk board export        |
| availability     | `/availability`     | Resource availability and bench data      |
| feedback         | `/feedback`         | Submit feedback, bug reports, features    |

---

## Database

- **PostgreSQL 16** initialized automatically from `database/init.sql` on first Docker run.
- Connection pooling: min 1 / max 20 connections.
- Custom PL/pgSQL functions for auto-generated project IDs (`CP-####`, `CD-####`).
- Key tables: `employee_master`, `employee_master_pro`, `projects`, `projects_allocation`, `clients`, `feedback_tickets`.

---

## Export Formats

All major pages support exporting their data:

| Format | Library          |
|--------|------------------|
| CSV    | Built-in browser |
| Excel  | `xlsx`           |
| PDF    | `jsPDF` + `jspdf-autotable` |
