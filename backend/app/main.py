from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, employees

app = FastAPI()

# -------------------- CORS --------------------
allowed_origins = [
    "http://localhost:5173",   # Frontend 5173 without Docker
    "http://127.0.0.1:5173",
    "http://localhost:5174",   # Frontend 5173 without Docker
    "http://127.0.0.1:5174",
    "http://localhost:3000",   # Frontend 3000 using Docker
    "http://127.0.0.1:3000",
    "https://photobathic-unbackward-matha.ngrok-free.dev", # Ngrok URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- Include Routers --------------------
app.include_router(auth.router)
app.include_router(employees.router)

@app.get("/")
def root():
    return {"message": "API is running"}
