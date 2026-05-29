"""
models.py
---------
All Pydantic request and response models for the NDVI & Soil Health API.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Optional


# -------------------------
# NDVI / POLYGON MODELS
# -------------------------

class PolygonRequest(BaseModel):
    polygon: List[List[float]]


class AnalysisResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DownloadRequest(BaseModel):
    image_paths: Dict[str, str]
    place_name: str


# -------------------------
# SOIL HEALTH MODELS
# -------------------------

class SoilInput(BaseModel):
    """Input payload for the soil prediction endpoint."""
    N: float = Field(..., ge=0, le=500, description="Nitrogen level (kg/ha)")
    P: float = Field(..., ge=0, le=200, description="Phosphorus level (kg/ha)")
    K: float = Field(..., ge=0, le=500, description="Potassium level (kg/ha)")
    pH: float = Field(..., ge=0, le=14, description="Soil pH")
    season: Optional[str] = Field(None, description="Growing season: Kharif, Rabi, Both, Annual")
    water: Optional[str] = Field(None, description="Water availability: low, medium, high")

    @field_validator('pH')
    @classmethod
    def validate_ph(cls, v: float) -> float:
        if v < 0 or v > 14:
            raise ValueError('pH must be between 0 and 14')
        return v

    @field_validator('season')
    @classmethod
    def validate_season(cls, v: Optional[str]) -> Optional[str]:
        if v and v.lower() not in ('kharif', 'rabi', 'both', 'annual', ''):
            raise ValueError('Season must be one of: Kharif, Rabi, Both, Annual')
        return v.lower() if v else v

    @field_validator('water')
    @classmethod
    def validate_water(cls, v: Optional[str]) -> Optional[str]:
        if v and v.lower() not in ('low', 'medium', 'high', ''):
            raise ValueError('Water must be one of: low, medium, high')
        return v.lower() if v else v


class SoilPredictResponse(BaseModel):
    """Complete soil analysis response."""
    predicted_label: str
    predicted_prob: List[float]
    fertilizer_confidence: str
    crop_recs: List[Dict[str, Any]]
    fertilizer_recs: List[Dict[str, Any]]
    amendment_plan: List[Dict[str, Any]]
    nutrient_status: List[Dict[str, Any]]
    ph_status: Dict[str, str]
    warnings: List[Dict[str, str]]
