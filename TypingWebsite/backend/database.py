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

# If no remote DB provided, use an explicit remote Postgres URI fallback.
# Replace [YOUR-PASSWORD] with your actual DB password, or set a DATABASE_URL env var instead.
if not SQLALCHEMY_DATABASE_URL:
    logging.warning(
        "No DATABASE_URL found in environment; using explicit Postgres URI fallback. "
        "Set DATABASE_URL to override or replace [YOUR-PASSWORD] in the fallback string."
    )
    SQLALCHEMY_DATABASE_URL = (
        "postgresql://postgres.tdlyfcxgwhcmzdeczuxg:TypingTest1213@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
    )

# Normalize older 'postgres://' scheme to 'postgresql://' required by SQLAlchemy
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# If the fallback value still contains an obvious placeholder, treat it as unset
# and fall back to a local sqlite file so the app can start locally and not
# attempt a failing network connection during startup.
if SQLALCHEMY_DATABASE_URL and "[YOUR-PASSWORD]" in SQLALCHEMY_DATABASE_URL:
    logging.warning(
        "Detected placeholder password in DATABASE URL; falling back to local sqlite. "
        "Set a real DATABASE_URL environment variable to use Postgres."
    )
    SQLALCHEMY_DATABASE_URL = "sqlite:///./typing_db.sqlite"

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
