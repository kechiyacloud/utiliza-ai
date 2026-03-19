from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, employees, dashboard, projects, allocations, clients, partner_clients, availability

app = FastAPI()

# -------------------- CORS --------------------
allowed_origins = [
    "http://localhost:5173",   # Frontend 5173 without Docker
    "http://127.0.0.1:5173",
    "http://localhost:3000",   # Frontend 3000 using Docker
    "http://127.0.0.1:3000",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://65.0.110.174",
    "http://65.0.110.174:5173",
    "http://65.0.110.174:5174",
    "http://65.0.110.174:3000",
    "https://nonhabitably-arabinosic-dedra.ngrok-free.dev"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.ngrok.*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Access-Control-Allow-Private-Network", "Access-Control-Request-Private-Network"],
    max_age=86400,
)


# -------------------- Include Routers --------------------
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(dashboard.router)
app.include_router(projects.router)
app.include_router(allocations.router)
app.include_router(clients.router)
app.include_router(partner_clients.router)
app.include_router(availability.router)


@app.get("/")
def root():
    return {"message": "API is running"}
