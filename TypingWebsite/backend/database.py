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

# --- FINAL VERCEL FIX ---
# 1. USERNAME: postgres.tdlyfcxgwhcmzdeczuxg (Supabase Pooler requires project name in user)
# 2. PASSWORD: TypingTest1213
# 3. HOST: aws-0-ap-south-1.pooler.supabase.com (The Pooler URL)
# 4. PORT: 6543 (Required for Vercel)
# 5. SSL: Required
SQLALCHEMY_DATABASE_URL = "postgresql://postgres.tdlyfcxgwhcmzdeczuxg:TypingTest1213@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()