import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, Column, Integer, String, Float, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel, field_validator
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
    name: str = ""
    amount: float = 0.0 # in grams or pieces
    calories_per_100g: float = 0.0
    protein_per_100g: float = 0.0
    fat_per_100g: float = 0.0
    carbs_per_100g: float = 0.0
    unit: str = "g"

    @field_validator('amount', 'calories_per_100g', 'protein_per_100g', 'fat_per_100g', 'carbs_per_100g', mode='before')
    @classmethod
    def parse_float_fields(cls, v):
        if v is None or v == '':
            return 0.0
        try:
            return float(str(v).replace(',', '.').strip())
        except (ValueError, TypeError):
            return 0.0

class RecipeCreate(BaseModel):
    title: str = "Новый рецепт"
    ingredients: list[Ingredient] = []
    steps: list[str] = []
    final_weight: float = 100.0

    @field_validator('final_weight', mode='before')
    @classmethod
    def parse_final_weight(cls, v):
        if v is None or v == '':
            return 100.0
        try:
            val = float(str(v).replace(',', '.').strip())
            return val if val > 0 else 100.0
        except (ValueError, TypeError):
            return 100.0

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

class StepsUpdate(BaseModel):
    steps: list[str]

@app.patch("/api/recipes/{recipe_id}/steps", response_model=RecipeResponse)
def update_recipe_steps(recipe_id: int, data: StepsUpdate, db: Session = Depends(get_db)):
    db_recipe = db.query(RecipeDB).filter(RecipeDB.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    filtered_steps = [s.strip() for s in data.steps if s.strip()]
    db_recipe.steps = json.dumps(filtered_steps)
    db.commit()
    db.refresh(db_recipe)
    return RecipeResponse(
        id=db_recipe.id,
        title=db_recipe.title,
        ingredients=json.loads(db_recipe.ingredients),
        steps=json.loads(db_recipe.steps),
        final_weight=db_recipe.final_weight
    )

@app.put("/api/recipes/{recipe_id}", response_model=RecipeResponse)
def update_recipe(recipe_id: int, recipe: RecipeCreate, db: Session = Depends(get_db)):
    db_recipe = db.query(RecipeDB).filter(RecipeDB.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db_recipe.title = recipe.title
    db_recipe.ingredients = json.dumps([i.model_dump() for i in recipe.ingredients])
    db_recipe.steps = json.dumps(recipe.steps)
    db_recipe.final_weight = recipe.final_weight
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
