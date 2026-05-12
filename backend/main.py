from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from auth import create_access_token, hash_password, verify_password
from database import Base, engine
from deps import get_current_user, get_db
from models import (
    Ingredient,
    Opex,
    OtherCost,
    Recipe,
    RecipeIngredient,
    RecipeOtherCost,
    User,
)
from schemas import (
    IngredientCreateIn,
    IngredientOut,
    OpexCreateIn,
    OpexOut,
    OtherCostCreateIn,
    OtherCostOut,
    RecipeCreateIn,
    RecipeDetailsOut,
    RecipeIngredientCreateIn,
    RecipeIngredientOut,
    RecipeOtherCostCreateIn,
    RecipeOtherCostOut,
    RecipeOut,
    TokenOut,
    UserOut,
    UserRegisterIn,
    convert_to_base,
)

app = FastAPI(title="PriceWise Backend", version="2.0.0")
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    # Any Vite / dev port on this machine (5175, 4173 preview, etc.)
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _ingredient_out(obj: Ingredient) -> IngredientOut:
    return IngredientOut.model_validate(obj)


def _other_out(obj: OtherCost) -> OtherCostOut:
    return OtherCostOut.model_validate(obj)


@app.get("/")
def root():
    return {"message": "PriceWise recipe costing API is running"}


@app.post("/auth/register", response_model=UserOut)
def register(payload: UserRegisterIn, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=payload.email.lower().strip(), password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=TokenOut)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == form_data.username.lower().strip()))
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(str(user.id))
    return TokenOut(access_token=token)


@app.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/recipes", response_model=RecipeOut)
def create_recipe(
    payload: RecipeCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipe = Recipe(
        user_id=current_user.id, name=payload.name.strip(), description=payload.description.strip()
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


@app.get("/recipes", response_model=list[RecipeOut])
def list_recipes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list(
        db.scalars(select(Recipe).where(Recipe.user_id == current_user.id).order_by(Recipe.created_at.desc()))
    )


@app.post("/ingredients", response_model=IngredientOut)
def create_ingredient(
    payload: IngredientCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base_qty, base_unit = convert_to_base(payload.package_size, payload.package_unit)
    if base_qty <= 0:
        raise HTTPException(status_code=400, detail="package_size must be > 0")
    cpu = (payload.package_price + payload.shipping_fee) / base_qty
    row = Ingredient(
        user_id=current_user.id,
        name=payload.name.strip(),
        supplier=payload.supplier.strip(),
        package_price=payload.package_price,
        shipping_fee=payload.shipping_fee,
        package_size=payload.package_size,
        package_unit=payload.package_unit,
        base_quantity=base_qty,
        base_unit=base_unit,
        cost_per_unit=cpu,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ingredient_out(row)


@app.get("/ingredients", response_model=list[IngredientOut])
def list_ingredients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.scalars(select(Ingredient).where(Ingredient.user_id == current_user.id)).all()
    return [_ingredient_out(x) for x in rows]


@app.post("/recipes/{recipe_id}/ingredients", response_model=RecipeIngredientOut)
def add_recipe_ingredient(
    recipe_id: int,
    payload: RecipeIngredientCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id, Recipe.user_id == current_user.id))
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    ing = db.scalar(
        select(Ingredient).where(Ingredient.id == payload.ingredient_id, Ingredient.user_id == current_user.id)
    )
    if not ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    if payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity must be >= 0")
    row = RecipeIngredient(recipe_id=recipe.id, ingredient_id=ing.id, quantity=payload.quantity)
    db.add(row)
    db.commit()
    db.refresh(row)
    return RecipeIngredientOut(
        id=row.id,
        ingredient_id=ing.id,
        ingredient_name=ing.name,
        quantity=row.quantity,
        unit=ing.base_unit,
        cost_per_unit=ing.cost_per_unit,
        line_cost=row.quantity * ing.cost_per_unit,
    )


@app.post("/opex", response_model=OpexOut)
def create_opex(
    payload: OpexCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = Opex(
        user_id=current_user.id, name=payload.name.strip(), amount=payload.amount, type=payload.type
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get("/opex", response_model=list[OpexOut])
def list_opex(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list(db.scalars(select(Opex).where(Opex.user_id == current_user.id)))


@app.post("/other-costs", response_model=OtherCostOut)
def create_other_cost(
    payload: OtherCostCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base_qty, base_unit = convert_to_base(payload.package_size, payload.package_unit)
    if base_qty <= 0:
        raise HTTPException(status_code=400, detail="package_size must be > 0")
    cpu = (payload.package_price + payload.shipping_fee) / base_qty
    row = OtherCost(
        user_id=current_user.id,
        name=payload.name.strip(),
        supplier=payload.supplier.strip(),
        package_price=payload.package_price,
        shipping_fee=payload.shipping_fee,
        package_size=payload.package_size,
        package_unit=payload.package_unit,
        base_quantity=base_qty,
        base_unit=base_unit,
        cost_per_unit=cpu,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _other_out(row)


@app.get("/other-costs", response_model=list[OtherCostOut])
def list_other_costs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.scalars(select(OtherCost).where(OtherCost.user_id == current_user.id)).all()
    return [_other_out(x) for x in rows]


@app.post("/recipes/{recipe_id}/other-costs", response_model=RecipeOtherCostOut)
def add_recipe_other_cost(
    recipe_id: int,
    payload: RecipeOtherCostCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id, Recipe.user_id == current_user.id))
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    other = db.scalar(
        select(OtherCost).where(OtherCost.id == payload.other_cost_id, OtherCost.user_id == current_user.id)
    )
    if not other:
        raise HTTPException(status_code=404, detail="Other cost not found")
    row = RecipeOtherCost(recipe_id=recipe.id, other_cost_id=other.id, quantity=payload.quantity)
    db.add(row)
    db.commit()
    db.refresh(row)
    return RecipeOtherCostOut(
        id=row.id,
        other_cost_id=other.id,
        other_cost_name=other.name,
        quantity=row.quantity,
        unit=other.base_unit,
        cost_per_unit=other.cost_per_unit,
        line_cost=row.quantity * other.cost_per_unit,
    )


@app.get("/recipes/{recipe_id}", response_model=RecipeDetailsOut)
def get_recipe_details(
    recipe_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    recipe = db.scalar(
        select(Recipe)
        .where(Recipe.id == recipe_id, Recipe.user_id == current_user.id)
        .options(
            joinedload(Recipe.recipe_ingredients).joinedload(RecipeIngredient.ingredient),
            joinedload(Recipe.recipe_other_costs).joinedload(RecipeOtherCost.other_cost),
        )
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    ingredient_items: list[RecipeIngredientOut] = []
    total_ingredient_cost = 0.0
    for link in recipe.recipe_ingredients:
        ing = link.ingredient
        line_cost = link.quantity * ing.cost_per_unit
        total_ingredient_cost += line_cost
        ingredient_items.append(
            RecipeIngredientOut(
                id=link.id,
                ingredient_id=ing.id,
                ingredient_name=ing.name,
                quantity=link.quantity,
                unit=ing.base_unit,
                cost_per_unit=ing.cost_per_unit,
                line_cost=line_cost,
            )
        )

    other_items: list[RecipeOtherCostOut] = []
    total_other_cost = 0.0
    for link in recipe.recipe_other_costs:
        oc = link.other_cost
        line_cost = link.quantity * oc.cost_per_unit
        total_other_cost += line_cost
        other_items.append(
            RecipeOtherCostOut(
                id=link.id,
                other_cost_id=oc.id,
                other_cost_name=oc.name,
                quantity=link.quantity,
                unit=oc.base_unit,
                cost_per_unit=oc.cost_per_unit,
                line_cost=line_cost,
            )
        )

    total_cogs = total_ingredient_cost + total_other_cost
    recipe_count = db.scalar(select(func.count(Recipe.id)).where(Recipe.user_id == current_user.id)) or 1
    total_opex = db.scalar(select(func.coalesce(func.sum(Opex.amount), 0)).where(Opex.user_id == current_user.id)) or 0
    allocated_opex = float(total_opex) / float(recipe_count)
    total_cost_per_recipe = total_cogs + allocated_opex
    margin_percent = 25.0
    suggested_price = total_cost_per_recipe * (1 + margin_percent / 100)

    return RecipeDetailsOut(
        id=recipe.id,
        name=recipe.name,
        description=recipe.description,
        created_at=recipe.created_at,
        ingredients=ingredient_items,
        other_costs=other_items,
        costing={
            "total_ingredient_cost": total_ingredient_cost,
            "total_other_cost": total_other_cost,
            "total_cogs": total_cogs,
            "allocated_opex": allocated_opex,
            "total_cost_per_recipe": total_cost_per_recipe,
            "suggested_price": suggested_price,
            "margin_percent": margin_percent,
        },
    )
