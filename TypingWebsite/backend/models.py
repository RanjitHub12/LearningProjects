from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String) # NEW: Store secure password
    
    # Link to results
    results = relationship("Result", back_populates="owner")

class Result(Base):
    __tablename__ = "results"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    wpm = Column(Integer)
    accuracy = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Link back to user
    owner = relationship("User", back_populates="results")

class Word(Base):
    __tablename__ = "words"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, unique=True, index=True)