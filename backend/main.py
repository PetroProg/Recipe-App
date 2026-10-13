import os
import json
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, Column, Integer, String, Float, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel, Field, field_validator

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
    ingredients = Column(Text)  # JSON string
    steps = Column(Text)        # JSON string
    final_weight = Column(Float)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Recipe App API")

# Safe CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://petroprog.tail703e6c.ts.net:9443",
        "https://petroprog.tail703e6c.ts.net",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:9090",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"https?://.*\.ts\.net(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models with validation limits
class Ingredient(BaseModel):
    name: str = Field(default="", max_length=150)
    amount: float = Field(default=0.0, ge=0, le=100000)
    calories_per_100g: float = Field(default=0.0, ge=0, le=10000)
    protein_per_100g: float = Field(default=0.0, ge=0, le=10000)
    fat_per_100g: float = Field(default=0.0, ge=0, le=10000)
    carbs_per_100g: float = Field(default=0.0, ge=0, le=10000)
    unit: str = Field(default="g", max_length=20)

    @field_validator('name', mode='before')
    @classmethod
    def clean_name(cls, v):
        return str(v or "").strip()[:150]

    @field_validator('amount', 'calories_per_100g', 'protein_per_100g', 'fat_per_100g', 'carbs_per_100g', mode='before')
    @classmethod
    def parse_float_fields(cls, v):
        if v is None or v == '':
            return 0.0
        try:
            val = float(str(v).replace(',', '.').strip())
            return max(0.0, min(100000.0, val))
        except (ValueError, TypeError):
            return 0.0

class RecipeCreate(BaseModel):
    title: str = Field(default="Новый рецепт", min_length=1, max_length=150)
    ingredients: list[Ingredient] = Field(default=[], max_length=100)
    steps: list[str] = Field(default=[], max_length=50)
    final_weight: float = Field(default=100.0, ge=1, le=100000)

    @field_validator('title', mode='before')
    @classmethod
    def clean_title(cls, v):
        cleaned = str(v or "").strip()
        return cleaned[:150] if cleaned else "Новый рецепт"

    @field_validator('steps', mode='before')
    @classmethod
    def clean_steps(cls, v):
        if not isinstance(v, list):
            return []
        cleaned = []
        for step in v:
            s = str(step or "").strip()
            if s:
                cleaned.append(s[:5000])
        return cleaned[:50]

    @field_validator('final_weight', mode='before')
    @classmethod
    def parse_final_weight(cls, v):
        if v is None or v == '':
            return 100.0
        try:
            val = float(str(v).replace(',', '.').strip())
            return max(1.0, min(100000.0, val))
        except (ValueError, TypeError):
            return 100.0

class RecipeResponse(RecipeCreate):
    id: int

class StepsUpdate(BaseModel):
    steps: list[str] = Field(default=[], max_length=50)

    @field_validator('steps', mode='before')
    @classmethod
    def clean_steps(cls, v):
        if not isinstance(v, list):
            return []
        cleaned = []
        for step in v:
            s = str(step or "").strip()
            if s:
                cleaned.append(s[:5000])
        return cleaned[:50]

# --- API Endpoints ---

@app.get("/api/recipes", response_model=list[RecipeResponse])
def get_recipes(db: Session = Depends(get_db)):
    try:
        recipes = db.query(RecipeDB).order_by(RecipeDB.id.desc()).all()
        result = []
        for r in recipes:
            try:
                ing = json.loads(r.ingredients) if r.ingredients else []
            except Exception:
                ing = []
            try:
                st = json.loads(r.steps) if r.steps else []
            except Exception:
                st = []
            result.append(RecipeResponse(
                id=r.id,
                title=r.title or "Без названия",
                ingredients=ing,
                steps=st,
                final_weight=r.final_weight or 100.0
            ))
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка чтения рецептов из базы: {str(e)}"
        )

@app.post("/api/recipes", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
def create_recipe(recipe: RecipeCreate, db: Session = Depends(get_db)):
    try:
        db_recipe = RecipeDB(
            title=recipe.title,
            ingredients=json.dumps([i.model_dump() for i in recipe.ingredients], ensure_ascii=False),
            steps=json.dumps(recipe.steps, ensure_ascii=False),
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
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка сохранения рецепта: {str(e)}"
        )

@app.patch("/api/recipes/{recipe_id}/steps", response_model=RecipeResponse)
def update_recipe_steps(recipe_id: int, data: StepsUpdate, db: Session = Depends(get_db)):
    db_recipe = db.query(RecipeDB).filter(RecipeDB.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Рецепт не найден")
    
    try:
        db_recipe.steps = json.dumps(data.steps, ensure_ascii=False)
        db.commit()
        db.refresh(db_recipe)
        return RecipeResponse(
            id=db_recipe.id,
            title=db_recipe.title,
            ingredients=json.loads(db_recipe.ingredients),
            steps=json.loads(db_recipe.steps),
            final_weight=db_recipe.final_weight
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка обновления шагов: {str(e)}"
        )

@app.put("/api/recipes/{recipe_id}", response_model=RecipeResponse)
def update_recipe(recipe_id: int, recipe: RecipeCreate, db: Session = Depends(get_db)):
    db_recipe = db.query(RecipeDB).filter(RecipeDB.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Рецепт не найден")
    
    try:
        db_recipe.title = recipe.title
        db_recipe.ingredients = json.dumps([i.model_dump() for i in recipe.ingredients], ensure_ascii=False)
        db_recipe.steps = json.dumps(recipe.steps, ensure_ascii=False)
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
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка обновления рецепта: {str(e)}"
        )

@app.delete("/api/recipes/{recipe_id}")
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    db_recipe = db.query(RecipeDB).filter(RecipeDB.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Рецепт не найден")
    
    try:
        db.delete(db_recipe)
        db.commit()
        return {"ok": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка удаления рецепта: {str(e)}"
        )

# Backup / Export all recipes
@app.get("/api/backup/export")
def export_backup(db: Session = Depends(get_db)):
    try:
        recipes = db.query(RecipeDB).all()
        backup_data = []
        for r in recipes:
            backup_data.append({
                "title": r.title,
                "ingredients": json.loads(r.ingredients) if r.ingredients else [],
                "steps": json.loads(r.steps) if r.steps else [],
                "final_weight": r.final_weight
            })
        return {"version": 1, "recipes": backup_data}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка создания резервной копии: {str(e)}"
        )

# Serve React App
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
