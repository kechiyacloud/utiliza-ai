from fastapi import FastAPI, Response, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, employees, dashboard, projects, allocations, clients, partner_clients, availability, feedback, users, sub_roles
from app.database import db_cursor

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    print("API starting up: checking database schema...")
    with db_cursor() as cur:
        employees._ensure_employee_columns(cur)
        auth._ensure_auth_schema(cur)
    print("Schema check complete.")

# -------------------- Global Exception Handler (CORS Robustness) --------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Credentials": "true",
        }
    )

# -------------------- CORS --------------------
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
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
app.include_router(auth.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(allocations.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
# clients.api_router is redundant now as clients.router is under /api prefix
# app.include_router(clients.api_router) 
app.include_router(partner_clients.router, prefix="/api")
app.include_router(availability.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(sub_roles.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "API is running"}
