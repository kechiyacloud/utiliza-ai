#  Project Dashboard

##  Overview
Project Dashboard is a centralized organizational platform designed to manage **employees, projects, and resource allocations** from a single interface.  
The system provides **role-based access**, ensuring that users view and manage data according to their organizational responsibilities.  
This dashboard offers a **complete organizational view**, from individual employee details to high-level project and allocation insights for leadership.

---

## Project Aim

The primary aim of this project is to:
- Centralize employee, project, and allocation information
- Enable efficient project allocation management
- Provide role-specific dashboards for better decision-making
- Improve visibility, tracking, and control across the organization

---

##  Technology Stack

**Frontend**
- React.js
- HTML, CSS, JavaScript

**Backend**
- Python (FastAPI)

**Database**
- PostgreSQL

**Authentication & Security**
- JWT / Role-based authorization
- Secure API access

---

##  Project Structure
```text
Project-Dashboard/
│
├── frontend/          # UI components and views
├── backend/           # APIs, business logic, authentication
├── database/          # Database schemas and scripts
├── docs/              # Documentation and diagrams
└── README.md
```

---

## Running the Project

The project uses **Docker Compose** to standardize development and production environments.

---

## Development Mode

Development mode enables:
- Hot reload for backend (FastAPI)
- Hot reload for frontend (Vite)
- Automatic dependency installation
- Easy onboarding for team members

---

## Prerequisites

Install:
- Docker Desktop (Windows/Mac)  
  OR Docker Engine (Linux)

Verify installation:
```bash
docker --version
docker compose version
```

---

## Start Development Environment

From the project root directory:
```bash
docker compose -f docker-compose.dev.yml up
```

First time or after dependency updates:
```bash
docker compose -f docker-compose.dev.yml up --build
```

---

##  Access the Application

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| FastAPI Swagger Docs | http://localhost:8000/docs |

---

##  Stop Development Containers

Press `CTRL + C`

Or run:
```bash
docker compose -f docker-compose.dev.yml down

```
