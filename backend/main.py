import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, Column, Integer, String, Float, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel
import json

# Database setup
os.makedirs("data", exist_ok=True)
SQLALCHEMY_DATABASE_URL = "sqlite:///./data/database.sqlite"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class RecipeDB(Base):
    __tablename__ = "recipes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    ingredients = Column(Text) # JSON string
    steps = Column(Text) # JSON string
    final_weight = Column(Float)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Recipe App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class Ingredient(BaseModel):
    name: str
    amount: float # in grams or pieces
    calories_per_100g: float
    protein_per_100g: float
    fat_per_100g: float
    carbs_per_100g: float
    unit: str = "g"

class RecipeCreate(BaseModel):
    title: str
    ingredients: list[Ingredient]
    steps: list[str]
    final_weight: float

class RecipeResponse(RecipeCreate):
    id: int

@app.get("/api/recipes", response_model=list[RecipeResponse])
def get_recipes(db: Session = Depends(get_db)):
    recipes = db.query(RecipeDB).all()
    result = []
    for r in recipes:
        result.append(RecipeResponse(
            id=r.id,
            title=r.title,
            ingredients=json.loads(r.ingredients),
            steps=json.loads(r.steps),
            final_weight=r.final_weight
        ))
    return result

@app.post("/api/recipes", response_model=RecipeResponse)
def create_recipe(recipe: RecipeCreate, db: Session = Depends(get_db)):
    db_recipe = RecipeDB(
        title=recipe.title,
        ingredients=json.dumps([i.model_dump() for i in recipe.ingredients]),
        steps=json.dumps(recipe.steps),
        final_weight=recipe.final_weight
    )
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    
    return RecipeResponse(
        id=db_recipe.id,
        title=db_recipe.title,
        ingredients=json.loads(db_recipe.ingredients),
        steps=json.loads(db_recipe.steps),
        final_weight=db_recipe.final_weight
    )

@app.delete("/api/recipes/{recipe_id}")
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    db_recipe = db.query(RecipeDB).filter(RecipeDB.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(db_recipe)
    db.commit()
    return {"ok": True}

# Serve React App
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
