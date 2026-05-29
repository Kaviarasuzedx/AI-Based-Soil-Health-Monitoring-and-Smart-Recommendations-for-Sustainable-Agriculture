"""
soil_logic.py
-------------
Pure business-logic functions for soil health analysis:
  - Nutrient severity classification
  - pH status classification
  - Crop recommendation scoring
  - Fertilizer recommendation
  - Amendment plan builder
  - Warning generator
  - Soil model loading
"""

import os
import math
from typing import List, Dict, Any, Optional

from core.constants import THRESHOLDS, BASE_DOSES, SAFETY_CAPS, CROP_DB, CROP_MULTIPLIERS, AMENDMENTS

# -------------------------
# LAZY IMPORTS (optional deps)
# -------------------------
try:
    import joblib as _joblib
except ImportError:
    _joblib = None

try:
    import pandas as _pd
except ImportError:
    _pd = None

joblib = _joblib
pd = _pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "rf_soil_model.pkl")
SOIL_MODEL = None


def ensure_soil_runtime():
    """Lazily import pandas/joblib and load the RF model if not yet done."""
    global pd, joblib, SOIL_MODEL
    if pd is None:
        try:
            import pandas as _p
            pd = _p
        except ImportError:
            pass
    if joblib is None:
        try:
            import joblib as _j
            joblib = _j
        except ImportError:
            pass
    if SOIL_MODEL is None and joblib is not None and os.path.exists(MODEL_PATH):
        try:
            SOIL_MODEL = joblib.load(MODEL_PATH)
            print(f"✓ Loaded soil model from {MODEL_PATH}")
        except Exception as e:
            print(f"⚠️ Failed to load soil model: {e}")


# -------------------------
# SCORING HELPERS
# -------------------------

def _range_distance(value: float, preferred_min: float, preferred_max: float) -> float:
    """Return 0.0 if *value* is inside the preferred range, else a positive penalty."""
    try:
        value = float(value)
    except Exception:
        return 1.0
    if math.isnan(value):
        return 1.0
    if preferred_min <= value <= preferred_max:
        return 0.0
    diff = preferred_min - value if value < preferred_min else value - preferred_max
    span = max(1.0, preferred_max - preferred_min)
    return min(3.0, diff / span)


def _nutrient_severity(nutrient: str, value: float) -> Dict[str, Any]:
    """Classify a nutrient level against threshold tiers."""
    t = THRESHOLDS[nutrient]
    if value <= t["critical"]:
        level, label = "critical", f"Critical deficiency - {nutrient} is dangerously low"
    elif value <= t["low"]:
        level, label = "low", f"Low - {nutrient} below recommended range"
    elif value <= t["good"]:
        level, label = "adequate", f"Adequate - {nutrient} in acceptable range"
    elif value <= t["excess"]:
        level, label = "good", f"Good - {nutrient} in optimal range"
    else:
        level, label = "excess", f"Excess - {nutrient} may be toxic at this level"
    return {"nutrient": nutrient, "value": value, "level": level, "label": label}


def _ph_status(ph: float) -> Dict[str, str]:
    """Return pH category, human label, and recommended corrective action."""
    if ph < 4.5:
        return {"category": "extremely_acid",     "label": "Extremely acid",     "action": "raise"}
    if ph < 5.5:
        return {"category": "strongly_acid",      "label": "Strongly acid",      "action": "raise"}
    if ph < 6.0:
        return {"category": "moderately_acid",    "label": "Moderately acid",    "action": "raise"}
    if ph < 6.5:
        return {"category": "slightly_acid",      "label": "Slightly acid",      "action": "optimal"}
    if ph <= 7.0:
        return {"category": "neutral",            "label": "Neutral",            "action": "optimal"}
    if ph <= 7.5:
        return {"category": "slightly_alkaline",  "label": "Slightly alkaline",  "action": "optimal"}
    if ph <= 8.0:
        return {"category": "moderately_alkaline","label": "Moderately alkaline","action": "lower"}
    return     {"category": "strongly_alkaline",  "label": "Strongly alkaline",  "action": "lower"}


# -------------------------
# CROP RECOMMENDATION
# -------------------------

def recommend_crops_for_soil(row: Dict[str, Any], top_k: int = 5) -> List[Dict[str, Any]]:
    """5-factor weighted scoring – returns top_k best-fit crops sorted by score (lower = better)."""
    soil_N   = float(row.get("N",      float("nan")))
    soil_P   = float(row.get("P",      float("nan")))
    soil_K   = float(row.get("K",      float("nan")))
    soil_pH  = float(row.get("pH",     float("nan")))
    season   = str(row.get("season",   "")).strip().lower()
    water    = str(row.get("water",    "")).strip().lower()

    results = []
    for crop, req in CROP_DB.items():
        dN  = _range_distance(soil_N,  req["N"][0],  req["N"][1])
        dP  = _range_distance(soil_P,  req["P"][0],  req["P"][1])
        dK  = _range_distance(soil_K,  req["K"][0],  req["K"][1])
        dpH = _range_distance(soil_pH, req["pH"][0], req["pH"][1])

        npk_score = 0.30*dN + 0.15*dP + 0.20*dK + 0.20*dpH

        context_penalty = 0.0
        if season and req["season"].lower() not in ("both", "annual", season):
            context_penalty += 0.15
        if water and req["water"] != water:
            context_penalty += 0.10

        score = npk_score + context_penalty

        reasons   = []
        strengths = []
        if dN  > 0: reasons.append(f"N outside preferred {req['N'][0]}-{req['N'][1]} kg/ha")
        if dP  > 0: reasons.append(f"P outside preferred {req['P'][0]}-{req['P'][1]} kg/ha")
        if dK  > 0: reasons.append(f"K outside preferred {req['K'][0]}-{req['K'][1]} kg/ha")
        if dpH > 0: reasons.append(f"pH outside preferred {req['pH'][0]}-{req['pH'][1]}")
        if dN  == 0: strengths.append("N level ideal")
        if dP  == 0: strengths.append("P level ideal")
        if dK  == 0: strengths.append("K level ideal")
        if dpH == 0: strengths.append("pH ideal")

        results.append({
            "crop":            crop,
            "score":           float(score),
            "suitability_pct": max(0.0, round(100 * (1 - min(score / 3.0, 1.0)), 1)),
            "season":          req["season"],
            "water_need":      req["water"],
            "reasons":         reasons,
            "strengths":       strengths,
            "notes":           req.get("notes", ""),
        })

    results.sort(key=lambda x: x["score"])
    return results[:top_k]


# -------------------------
# FERTILIZER RECOMMENDATION
# -------------------------

def simple_recommendation(
    row: Dict[str, Any],
    proba: Optional[List[float]] = None,
    crop_multiplier: float = 1.0,
) -> tuple:
    """Return (fertilizer_recs, confidence_label) for the given soil row."""
    recs = []
    for nutrient, fertilizer, scale, cap in [
        ("N", "Urea",    1.5, "N"),
        ("P", "DAP/SSP", 1.2, "P"),
        ("K", "MOP",     1.3, "K"),
    ]:
        tgt = THRESHOLDS[nutrient]["good"]
        val = row.get(nutrient, 0)
        sev = _nutrient_severity(nutrient, val)
        if val < tgt:
            deficit_pct = max(0.0, (tgt - val) / tgt)
            raw_dose    = BASE_DOSES[nutrient] * (1 + deficit_pct * scale)
            dose        = min(
                SAFETY_CAPS[cap]["max_per_application"],
                int(round(raw_dose * crop_multiplier)),
            )
            recs.append({
                "nutrient":       nutrient,
                "fertilizer":     fertilizer,
                "dose_kg_per_ha": dose,
                "severity":       sev["level"],
                "severity_label": sev["label"],
            })

    confidence = "Unknown"
    if proba:
        tp = max(proba)
        confidence = "High" if tp >= 0.8 else "Medium" if tp >= 0.6 else "Low"

    return recs, confidence


# -------------------------
# AMENDMENT PLAN
# -------------------------

def _lime_dose_kg(ph: float, target_ph: float = 6.5) -> int:
    return min(int(round(max(0, target_ph - ph) * 2500)), 6000)


def _sulfur_dose_kg(ph: float, target_ph: float = 7.0) -> int:
    return min(int(round(max(0, ph - target_ph) * 1500)), 4000)


def build_amendment_plan(row: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate a prioritised list of soil amendment recommendations."""
    ph  = float(row.get("pH", 7.0))
    n   = float(row.get("N",  0))
    k   = float(row.get("K",  0))
    plan: List[Dict[str, Any]] = []
    ph_info = _ph_status(ph)

    # pH correction
    if ph_info["action"] == "raise":
        a = AMENDMENTS["agricultural_lime"]
        plan.append({
            "amendment": "Agricultural Lime",
            "purpose":   a["purpose"],
            "dose":      _lime_dose_kg(ph),
            "unit":      "kg/ha",
            "priority":  "High",
            "notes":     a["notes"],
            "caution":   a["caution"],
        })
        if k < THRESHOLDS["K"]["low"]:
            wa = AMENDMENTS["wood_ash"]
            plan.append({
                "amendment": "Wood Ash",
                "purpose":   wa["purpose"],
                "dose":      750,
                "unit":      "kg/ha",
                "priority":  "Medium",
                "notes":     wa["notes"],
                "caution":   wa["caution"],
            })

    elif ph_info["action"] == "lower":
        s = AMENDMENTS["elemental_sulfur"]
        plan.append({
            "amendment": "Elemental Sulfur",
            "purpose":   s["purpose"],
            "dose":      _sulfur_dose_kg(ph),
            "unit":      "kg/ha",
            "priority":  "High",
            "notes":     s["notes"],
            "caution":   s["caution"],
        })
        if ph > 7.8:
            fs = AMENDMENTS["ferrous_sulfate"]
            plan.append({
                "amendment": "Ferrous Sulfate (FeSO4)",
                "purpose":   fs["purpose"],
                "dose":      30,
                "unit":      "kg/ha",
                "priority":  "Medium",
                "notes":     fs["notes"],
                "caution":   fs["caution"],
            })
        gy = AMENDMENTS["gypsum"]
        plan.append({
            "amendment": "Gypsum",
            "purpose":   gy["purpose"],
            "dose":      350,
            "unit":      "kg/ha",
            "priority":  "Medium",
            "notes":     gy["notes"],
            "caution":   gy["caution"],
        })

    # Organic matter (always recommended)
    for name, label, dose in [
        ("farmyard_manure", "Farmyard Manure (FYM)", 7500),
        ("compost",         "Compost",               5000),
    ]:
        am = AMENDMENTS[name]
        plan.append({
            "amendment": label,
            "purpose":   am["purpose"],
            "dose":      dose,
            "unit":      "kg/ha",
            "priority":  "Medium",
            "notes":     am["notes"],
            "caution":   am["caution"],
        })

    # Green manure when N is low
    if n < THRESHOLDS["N"]["low"]:
        gm = AMENDMENTS["green_manure"]
        plan.append({
            "amendment": "Green Manure (Dhaincha / Sunhemp / Cowpea)",
            "purpose":   gm["purpose"],
            "dose":      20,
            "unit":      "kg seed/ha",
            "priority":  "High" if n < THRESHOLDS["N"]["critical"] else "Medium",
            "notes":     gm["notes"] + f" Crop examples: {gm['crop_examples']}.",
            "caution":   gm["caution"],
        })

    # Vermicompost (lower priority, high value crops)
    vc = AMENDMENTS["vermicompost"]
    plan.append({
        "amendment": "Vermicompost",
        "purpose":   vc["purpose"],
        "dose":      2000,
        "unit":      "kg/ha",
        "priority":  "Low",
        "notes":     vc["notes"],
        "caution":   vc["caution"],
    })

    order = {"High": 0, "Medium": 1, "Low": 2}
    plan.sort(key=lambda x: order.get(x["priority"], 9))
    return plan


# -------------------------
# WARNINGS
# -------------------------

def build_warnings(row: Dict[str, Any]) -> List[Dict[str, str]]:
    """Flag dangerous excesses or extreme pH values."""
    warnings: List[Dict[str, str]] = []
    n, p, k, ph = (float(row.get(x, 0)) for x in ("N", "P", "K", "pH"))

    if n > THRESHOLDS["N"]["excess"]:
        warnings.append({
            "type": "excess", "nutrient": "N",
            "message": f"N = {n} kg/ha is very high - risk of nitrogen toxicity and groundwater pollution.",
        })
    if p > THRESHOLDS["P"]["excess"]:
        warnings.append({
            "type": "excess", "nutrient": "P",
            "message": f"P = {p} kg/ha is excessive - can lock out Zn and Fe.",
        })
    if k > THRESHOLDS["K"]["excess"]:
        warnings.append({
            "type": "excess", "nutrient": "K",
            "message": f"K = {k} kg/ha is very high - may interfere with Mg and Ca uptake.",
        })
    if ph < 4.5:
        warnings.append({
            "type": "ph",
            "message": "pH < 4.5 - Al and Mn toxicity likely; most crops will fail without pH correction.",
        })
    elif ph > 8.5:
        warnings.append({
            "type": "ph",
            "message": "pH > 8.5 - severe micronutrient deficiency expected (Fe, Zn, Mn).",
        })
    return warnings
