from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from src.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency — yields a DB session per request,
    and always closes it afterward, even on error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()