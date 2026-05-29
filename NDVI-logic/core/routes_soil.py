"""
routes_soil.py
--------------
FastAPI router for all soil health endpoints:
  GET  /soil/health
  GET  /soil/crops
  GET  /soil/amendments
  POST /soil/predict
"""

import sys

from fastapi import APIRouter, HTTPException

from core.models import SoilInput, SoilPredictResponse
from core.constants import CROP_DB, AMENDMENTS, CROP_MULTIPLIERS
from core.soil_logic import (
    ensure_soil_runtime, SOIL_MODEL, pd,
    recommend_crops_for_soil,
    simple_recommendation,
    build_amendment_plan,
    build_warnings,
    _nutrient_severity,
    _ph_status,
)

router = APIRouter(prefix="/soil")


@router.get("/health")
async def soil_health_check():
    """Health check for the soil health module."""
    ensure_soil_runtime()
    return {
        "status":           "healthy",
        "model_loaded":     SOIL_MODEL is not None,
        "pandas_available": pd is not None,
        "crops_available":  len(CROP_DB),
    }


@router.get("/crops")
async def soil_list_crops():
    """List all 20 supported crops with their NPK and pH requirements."""
    return {
        "total_crops": len(CROP_DB),
        "crops": [
            {
                "name":       crop,
                "season":     req["season"],
                "water_need": req["water"],
                "n_range":    req["N"],
                "p_range":    req["P"],
                "k_range":    req["K"],
                "ph_range":   req["pH"],
                "notes":      req["notes"],
            }
            for crop, req in CROP_DB.items()
        ],
    }


@router.get("/amendments")
async def soil_list_amendments():
    """List all soil amendments with purpose, notes, and cautions."""
    return {
        "total_amendments": len(AMENDMENTS),
        "amendments": [
            {
                "name":    name,
                "purpose": info["purpose"],
                "notes":   info["notes"],
                "caution": info.get("caution", "None"),
            }
            for name, info in AMENDMENTS.items()
        ],
    }


@router.post("/predict", response_model=SoilPredictResponse)
async def soil_predict(soil_input: SoilInput):
    """
    Full soil analysis:
    - ML-based soil-type prediction
    - Crop suitability scores
    - Fertilizer recommendations
    - Amendment plan
    - Nutrient status
    - pH status
    - Safety warnings
    """
    ensure_soil_runtime()

    # Re-read module-level globals after ensure_soil_runtime() may have updated them
    from core.soil_logic import SOIL_MODEL as _model, pd as _pd

    if _pd is None:
        raise HTTPException(
            status_code=500,
            detail=f"pandas not installed ({sys.executable})",
        )
    if _model is None:
        from core.soil_logic import MODEL_PATH
        raise HTTPException(
            status_code=500,
            detail=f"Soil model not loaded (expected: {MODEL_PATH})",
        )

    soil_dict = soil_input.model_dump()
    n_val, p_val, k_val, ph_val = soil_input.N, soil_input.P, soil_input.K, soil_input.pH

    x_row = _pd.DataFrame([{
        "N":         n_val,
        "P":         p_val,
        "K":         k_val,
        "pH":        ph_val,
        "N_P_ratio": n_val / (p_val + 1e-6),
        "N_K_ratio": n_val / (k_val + 1e-6),
        "sum_NPK":   n_val + p_val + k_val,
    }])

    try:
        pred  = _model.predict(x_row)[0]
        proba = _model.predict_proba(x_row)[0].tolist()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {str(e)}")

    crop_recs  = recommend_crops_for_soil(soil_dict, top_k=5)
    top_crop   = crop_recs[0]["crop"] if crop_recs else None
    crop_mult  = CROP_MULTIPLIERS.get(top_crop, 1.0)
    fert_recs, fert_conf = simple_recommendation(soil_dict, proba=proba, crop_multiplier=crop_mult)

    return SoilPredictResponse(
        predicted_label=str(pred),
        predicted_prob=proba,
        fertilizer_confidence=fert_conf,
        crop_recs=crop_recs,
        fertilizer_recs=fert_recs,
        amendment_plan=build_amendment_plan(soil_dict),
        nutrient_status=[
            _nutrient_severity("N", n_val),
            _nutrient_severity("P", p_val),
            _nutrient_severity("K", k_val),
        ],
        ph_status=_ph_status(ph_val),
        warnings=build_warnings(soil_dict),
    )
