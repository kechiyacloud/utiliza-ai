# Local Development Setup (No Docker Rebuild)

## How It Works

Only **Postgres and Redis** run in Docker. Backend and Frontend run natively in WSL for instant hot-reload.

| Service  | Runs via   | Port | Auto-reload    |
|----------|------------|------|----------------|
| Postgres | Docker     | 5433 | N/A            |
| Redis    | Docker     | 6379 | N/A            |
| Backend  | WSL native | 8000 | Yes (uvicorn)  |
| Frontend | WSL native | 5173 | Yes (Vite HMR) |

---

## One-Time Setup (run once per machine)

Open WSL and navigate to the project:

```bash
cd /mnt/c/Users/PrasanthSubramanian/Desktop/git-repo-int-project/cd-utiliza-ai
```

### Step 1 — Backend Python environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### Step 2 — Frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 3 — Start Postgres and Redis in Docker

```bash
docker compose -f docker-compose.local.yml up postgres redis -d
```

---

## Daily Usage

Open **two WSL terminals** from the project root:

### Terminal 1 — Backend

```bash
cd /mnt/c/Users/PrasanthSubramanian/Desktop/git-repo-int-project/cd-utiliza-ai/backend
source venv/bin/activate
export DB_HOST=localhost
export DB_PORT=5433
export REDIS_HOST=localhost
export REDIS_PORT=6379
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — Frontend

```bash
cd /mnt/c/Users/PrasanthSubramanian/Desktop/git-repo-int-project/cd-utiliza-ai/frontend
npm run dev
```

Press `Ctrl+C` in each terminal to stop.

---

## Access Points

| Service   | URL                        |
|-----------|----------------------------|
| Frontend  | http://localhost:5173      |
| Backend   | http://localhost:8000      |
| API Docs  | http://localhost:8000/docs |

---

## Stop Everything

Stop backend and frontend: `Ctrl+C` in each terminal.

Stop Postgres and Redis:
```bash
docker compose -f docker-compose.local.yml stop postgres redis
```

---

## Notes

- `vite.config.js` proxy target is set to `http://localhost:8000` — no hosts file or admin access needed.
- `backend/.env` is not modified — DB and Redis hostnames are overridden via `export` in the terminal.
- Docker setup in `docker-compose.full.yml` remains intact for EC2 deployment.


# Important Command in local setup

## For Killing 8000 port

- "sudo fuser -k 8000/tcp"