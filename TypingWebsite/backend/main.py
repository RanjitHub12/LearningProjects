from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func as sql_func
from pydantic import BaseModel
from passlib.context import CryptContext
from spellchecker import SpellChecker 
from better_profanity import profanity # NEW IMPORT
import models, database, re
from contextlib import asynccontextmanager

# --- SECURITY SETUP ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- PROFANITY SETUP ---
profanity.load_censor_words() # Load the default list of bad words

# Create tables
models.Base.metadata.create_all(bind=database.engine)
# --- LIFESPAN MANAGER (Auto-creates tables on startup) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # This runs when the server starts
    models.Base.metadata.create_all(bind=database.engine)
    yield
    # This runs when the server stops (optional cleanup)

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SCHEMAS ---
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class ScoreCreate(BaseModel):
    user_id: int 
    wpm: int
    accuracy: int

# --- AUTH ENDPOINTS (No Changes) ---
@app.post("/api/register")
def register(user: UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = pwd_context.hash(user.password)
    new_user = models.User(username=user.username, email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created", "user_id": new_user.id, "username": new_user.username}

@app.post("/api/login")
def login(user: UserLogin, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return {"message": "Login successful", "user_id": db_user.id, "username": db_user.username}

# --- GAME ENDPOINTS ---

@app.post("/api/save-score")
def save_score(result: ScoreCreate, db: Session = Depends(database.get_db)):
    db_result = models.Result(user_id=result.user_id, wpm=result.wpm, accuracy=result.accuracy)
    db.add(db_result)
    db.commit()
    return {"message": "Score saved!"}

# --- UPDATED LEADERBOARD LOGIC ---
@app.get("/api/leaderboard")
def get_leaderboard(db: Session = Depends(database.get_db)):
    results = db.query(models.Result, models.User.username)\
        .join(models.User)\
        .filter(models.Result.accuracy > 85)\
        .order_by(models.Result.wpm.desc(), models.Result.accuracy.desc())\
        .limit(5)\
        .all()
        # .filter(...) -> IGNORES any score with 85% or less accuracy
    
    clean_data = []
    for r, username in results:
        clean_data.append({
            "id": r.id,
            "wpm": r.wpm,
            "accuracy": r.accuracy,
            "date": r.created_at,
            "username": username
        })
    return clean_data

# --- NEW ENDPOINT FOR GRAPH DATA ---
@app.get("/api/user-history/{user_id}")
def get_user_history(user_id: int, db: Session = Depends(database.get_db)):
    # Get the last 10 games for this user, ordered by time
    history = db.query(models.Result)\
        .filter(models.Result.user_id == user_id)\
        .order_by(models.Result.created_at.asc())\
        .limit(20)\
        .all()

    return [
        {
            "wpm": r.wpm,
            "accuracy": r.accuracy,
            "date": r.created_at.strftime("%H:%M") # Simple time format
        } 
        for r in history
    ]

@app.get("/api/get-text")
def get_random_text(db: Session = Depends(database.get_db)):
    random_words = db.query(models.Word).order_by(sql_func.random()).limit(50).all()
    if not random_words:
        return {"content": "the quick brown fox jumps over the lazy dog"}
    text_string = " ".join([w.text for w in random_words])
    return {"content": text_string}

# --- UPDATED UPLOAD LOGIC ---
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(database.get_db)):
    content_bytes = await file.read()
    
    try:
        text_data = content_bytes.decode("utf-8")
    except:
        return {"message": "Error: File must be a valid text (.txt) file."}
    
    # Clean text
    text_data = text_data.lower()
    text_data = re.sub(r'[^a-z\s]', '', text_data) # Remove numbers/symbols
    words_in_file = set(text_data.split())
    
    spell = SpellChecker() # Enforces English
    
    added_count = 0
    ignored_count = 0
    
    for word_text in words_in_file:
        # CHECK 1: Length > 1
        # CHECK 2: Is it English? (spell variable)
        # CHECK 3: Is it clean? (not profanity)
        if len(word_text) > 1 and \
           word_text in spell and \
           not profanity.contains_profanity(word_text):
            
            try:
                with db.begin_nested():
                    new_word = models.Word(text=word_text)
                    db.add(new_word)
                    db.flush()
                added_count += 1
            except:
                pass # Duplicate
        else:
            ignored_count += 1
    
    db.commit()
    
    return {
        "message": "Vocabulary updated",
        "new_words_added": added_count,
        "words_ignored": ignored_count, 
        "total_words_in_db": db.query(models.Word).count()
    }