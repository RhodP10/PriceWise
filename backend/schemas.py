from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

PACKAGE_UNITS = {"kg", "g", "L", "ml", "piece"}
BASE_UNITS = {"g", "ml", "piece"}


def convert_to_base(package_size: float, package_unit: str) -> tuple[float, str]:
    if package_unit == "kg":
        return package_size * 1000, "g"
    if package_unit == "g":
        return package_size, "g"
    if package_unit == "L":
        return package_size * 1000, "ml"
    if package_unit == "ml":
        return package_size, "ml"
    if package_unit == "piece":
        return package_size, "piece"
    raise ValueError("Invalid package unit")


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=6)


class UserOut(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RecipeCreateIn(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""


class RecipeOut(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


class IngredientBaseIn(BaseModel):
    name: str = Field(min_length=1)
    supplier: str = ""
    package_price: float = Field(gt=0)
    shipping_fee: float = Field(ge=0, default=0)
    package_size: float = Field(gt=0)
    package_unit: str

    @field_validator("package_unit")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        if v not in PACKAGE_UNITS:
            raise ValueError(f"package_unit must be one of: {sorted(PACKAGE_UNITS)}")
        return v


class IngredientCreateIn(IngredientBaseIn):
    pass


class IngredientOut(BaseModel):
    id: int
    name: str
    supplier: str
    package_price: float
    shipping_fee: float
    package_size: float
    package_unit: str
    base_quantity: float
    base_unit: str
    cost_per_unit: float
    created_at: datetime

    model_config = {"from_attributes": True}


class RecipeIngredientCreateIn(BaseModel):
    ingredient_id: int
    quantity: float = Field(gt=0)


class RecipeIngredientOut(BaseModel):
    id: int
    ingredient_id: int
    ingredient_name: str
    quantity: float
    unit: str
    cost_per_unit: float
    line_cost: float


class OpexCreateIn(BaseModel):
    name: str = Field(min_length=1)
    amount: float = Field(ge=0)
    type: Literal["fixed", "variable"]


class OpexOut(BaseModel):
    id: int
    name: str
    amount: float
    type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class OtherCostCreateIn(IngredientBaseIn):
    pass


class OtherCostOut(BaseModel):
    id: int
    name: str
    supplier: str
    package_price: float
    shipping_fee: float
    package_size: float
    package_unit: str
    base_quantity: float
    base_unit: str
    cost_per_unit: float
    created_at: datetime

    model_config = {"from_attributes": True}


class RecipeOtherCostCreateIn(BaseModel):
    other_cost_id: int
    quantity: float = Field(gt=0)


class RecipeOtherCostOut(BaseModel):
    id: int
    other_cost_id: int
    other_cost_name: str
    quantity: float
    unit: str
    cost_per_unit: float
    line_cost: float


class RecipeCostSummaryOut(BaseModel):
    total_ingredient_cost: float
    total_other_cost: float
    total_cogs: float
    allocated_opex: float
    total_cost_per_recipe: float
    suggested_price: float
    margin_percent: float


class RecipeDetailsOut(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime
    ingredients: list[RecipeIngredientOut]
    other_costs: list[RecipeOtherCostOut]
    costing: RecipeCostSummaryOut

