from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, employees , dashboard , projects , allocations

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
    "https://photobathic-unbackward-matha.ngrok-free.dev"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.ngrok-free\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Access-Control-Allow-Private-Network", "Access-Control-Request-Private-Network"],
    expose_headers=["*"]
)

@app.options("/{path:path}")
async def options_handler(request, path: str):
    response = Response()
    if request.headers.get("Access-Control-Request-Private-Network"):
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

# -------------------- Include Routers --------------------
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(dashboard.router)
app.include_router(projects.router)
app.include_router(allocations.router)


@app.get("/")
def root():
    return {"message": "API is running"}
