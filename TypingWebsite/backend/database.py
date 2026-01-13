from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

# Try several common environment variable names used by hosting providers
_env_candidates = [
    "DATABASE_URL",
    "SQLALCHEMY_DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRESQL_URL",
    "RAILWAY_DATABASE_URL",
    "DATABASE_URI",
]

SQLALCHEMY_DATABASE_URL = None
for _name in _env_candidates:
    _val = os.getenv(_name)
    if _val:
        SQLALCHEMY_DATABASE_URL = _val
        break

# If no remote DB provided, fall back to a local sqlite file so the app can start.
if not SQLALCHEMY_DATABASE_URL:
    logging.warning("No DATABASE_URL found in environment; falling back to local sqlite.")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./typing_db.sqlite"

# Normalize older 'postgres://' scheme to 'postgresql://' required by SQLAlchemy
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Use `pool_pre_ping` for more robust connections to cloud DBs
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
