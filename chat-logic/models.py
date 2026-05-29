from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    source: str
    relevance_score: Optional[float] = None
    retrieved_ids: Optional[List[int]] = None

class AgriculturalData(BaseModel):
    id: int
    analysis_id: int
    place_name: Optional[str]
    datetime: Optional[datetime]
    mean_ndvi: Optional[float]
    std_ndvi: Optional[float]
    min_ndvi: Optional[float]
    max_ndvi: Optional[float]
    mean_savi: Optional[float]
    mean_evi: Optional[float]
    mean_gndvi: Optional[float]
    soil_health_score: Optional[float]
    moisture_index: Optional[float]
    organic_matter: Optional[float]
    texture_score: Optional[float]
    ph_level: Optional[float]
    crop_health_score: Optional[float]
    vigor_index: Optional[float]
    stress_level: Optional[float]
    yield_potential: Optional[float]
    chlorophyll_content: Optional[float]

class EmbedSelectiveRequest(BaseModel):
    analysis_ids: List[int]

class SessionData(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]]
    created_at: datetime