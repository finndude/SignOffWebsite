from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.database import Base, engine
from src.models import user, assignment, document  # noqa: F401 — imported so create_all sees them
from src.routes import auth, admin, documents

# Creates tables from models if they don't exist yet.
# Fine for early development — switch to Alembic migrations once the schema stabilizes.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SignOffWebsite API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,  # required so the browser sends the httpOnly cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(documents.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}