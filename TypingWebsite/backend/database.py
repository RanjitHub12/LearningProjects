# from sqlalchemy import create_engine
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker
# import os

# # 1. Try to get the Cloud Database URL
# SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# # 2. If no cloud URL (we are on localhost), use your local password
# if not SQLALCHEMY_DATABASE_URL:
#     # REPLACE 'password' BELOW WITH YOUR ACTUAL LOCAL PASSWORD
#     SQLALCHEMY_DATABASE_URL = "postgresql://postgres:hades12@localhost/typing_db"

# # Fix for some cloud providers that use "postgres://" instead of "postgresql://"
# if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
#     SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# engine = create_engine(SQLALCHEMY_DATABASE_URL)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base = declarative_base()
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# FIXED CONNECTION STRING:
# 1. Added '+psycopg2' to ensure Vercel finds the driver.
# 2. Changed '@' in password to '%40' so it doesn't break the URL.
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://postgres:TypingTest%4012@db.tdlyfcxgwhcmzdeczuxg.supabase.co:5432/postgres"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()