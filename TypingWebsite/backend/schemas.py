from pydantic import BaseModel

class ResultCreate(BaseModel):
    user_id: int
    wpm: int
    accuracy: float