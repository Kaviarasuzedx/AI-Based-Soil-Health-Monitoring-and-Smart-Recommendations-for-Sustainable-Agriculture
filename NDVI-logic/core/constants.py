"""
constants.py
------------
Static lookup tables and configuration constants used throughout the application:
  - Nutrient thresholds & safety caps
  - Crop database (20 crops)
  - Crop NPK multipliers
  - Soil amendment database
  - Color palette definitions for vegetation index maps
"""

# -------------------------
# NUTRIENT THRESHOLDS & DOSES
# -------------------------

THRESHOLDS = {
    "N": {"critical": 20, "low": 40, "good": 80, "excess": 200},
    "P": {"critical": 8,  "low": 15, "good": 30, "excess": 80},
    "K": {"critical": 40, "low": 80, "good": 150, "excess": 350},
}

BASE_DOSES = {"N": 60, "P": 30, "K": 80}

SAFETY_CAPS = {
    "N": {"max_per_application": 200, "max_per_year": 250},
    "P": {"max_per_application": 150, "max_per_year": 200},
    "K": {"max_per_application": 250, "max_per_year": 300},
}

# -------------------------
# CROP DATABASE  (20 crops)
# -------------------------

CROP_DB = {
    # Cereals
    "rice":         {"N": (80, 160),  "P": (30, 60),  "K": (100, 300), "pH": (5.5, 6.5),
                     "season": "Kharif",  "water": "high",   "notes": "Waterlogged conditions preferred"},
    "wheat":        {"N": (80, 140),  "P": (30, 60),  "K": (80, 200),  "pH": (6.0, 7.5),
                     "season": "Rabi",    "water": "medium", "notes": "Cool-season; frost tolerant"},
    "maize":        {"N": (80, 200),  "P": (30, 70),  "K": (100, 250), "pH": (5.5, 7.0),
                     "season": "Kharif",  "water": "medium", "notes": "Highly responsive to N fertilization"},
    "sorghum":      {"N": (60, 120),  "P": (20, 50),  "K": (80, 180),  "pH": (5.5, 7.5),
                     "season": "Kharif",  "water": "low",    "notes": "Drought-tolerant; good for dryland farming"},
    "pearl_millet": {"N": (40, 100),  "P": (20, 40),  "K": (60, 150),  "pH": (5.5, 7.0),
                     "season": "Kharif",  "water": "low",    "notes": "Thrives in sandy, low-fertility soils"},
    "barley":       {"N": (60, 100),  "P": (20, 50),  "K": (60, 150),  "pH": (6.0, 7.5),
                     "season": "Rabi",    "water": "low",    "notes": "Tolerates salinity better than wheat"},
    # Pulses / Legumes
    "soybean":      {"N": (20, 60),   "P": (20, 50),  "K": (50, 150),  "pH": (5.5, 7.0),
                     "season": "Kharif",  "water": "medium", "notes": "Fixes atmospheric N; reduces fertilizer need"},
    "groundnut":    {"N": (40, 80),   "P": (20, 50),  "K": (60, 150),  "pH": (5.0, 6.5),
                     "season": "Kharif",  "water": "medium", "notes": "Needs well-drained sandy-loam soil"},
    "chickpea":     {"N": (15, 40),   "P": (30, 60),  "K": (40, 100),  "pH": (6.0, 8.0),
                     "season": "Rabi",    "water": "low",    "notes": "Tolerates alkaline soils well"},
    "lentil":       {"N": (15, 30),   "P": (25, 50),  "K": (40, 80),   "pH": (6.0, 8.0),
                     "season": "Rabi",    "water": "low",    "notes": "Sensitive to waterlogging"},
    "pulses":       {"N": (10, 40),   "P": (15, 40),  "K": (50, 120),  "pH": (6.0, 7.5),
                     "season": "Both",    "water": "low",    "notes": "General legume category"},
    # Oilseeds
    "sunflower":    {"N": (40, 100),  "P": (30, 60),  "K": (80, 160),  "pH": (6.0, 7.5),
                     "season": "Rabi",    "water": "medium", "notes": "Deep taproot; drought semi-tolerant"},
    "mustard":      {"N": (60, 120),  "P": (25, 50),  "K": (60, 120),  "pH": (6.0, 7.5),
                     "season": "Rabi",    "water": "low",    "notes": "Good for cool, dry climates"},
    "sesame":       {"N": (30, 60),   "P": (20, 40),  "K": (40, 80),   "pH": (5.5, 7.0),
                     "season": "Kharif",  "water": "low",    "notes": "Very drought-tolerant oilseed"},
    # Cash / Commercial
    "cotton":       {"N": (60, 120),  "P": (30, 60),  "K": (80, 200),  "pH": (5.5, 7.5),
                     "season": "Kharif",  "water": "medium", "notes": "Heavy feeder; watch micronutrient deficiency"},
    "sugarcane":    {"N": (100, 250), "P": (30, 80),  "K": (200, 400), "pH": (5.5, 7.0),
                     "season": "Annual",  "water": "high",   "notes": "High K demand; benefits from organic matter"},
    "tobacco":      {"N": (40, 80),   "P": (20, 50),  "K": (100, 200), "pH": (5.5, 6.5),
                     "season": "Rabi",    "water": "medium", "notes": "High K demand; chloride-sensitive"},
    # Vegetables
    "tomato":       {"N": (80, 150),  "P": (40, 80),  "K": (150, 300), "pH": (5.5, 7.0),
                     "season": "Both",    "water": "medium", "notes": "High K improves fruit quality"},
    "potato":       {"N": (100, 180), "P": (50, 100), "K": (150, 300), "pH": (5.0, 6.5),
                     "season": "Rabi",    "water": "medium", "notes": "Sensitive to alkaline pH; scab risk above 6.5"},
    "onion":        {"N": (60, 120),  "P": (30, 60),  "K": (80, 160),  "pH": (6.0, 7.5),
                     "season": "Rabi",    "water": "medium", "notes": "Shallow roots; frequent irrigation needed"},
}

CROP_MULTIPLIERS = {
    "rice": 1.0, "wheat": 1.0, "maize": 1.15, "sorghum": 0.95,
    "pearl_millet": 0.85, "barley": 0.90,
    "soybean": 0.80, "groundnut": 0.90, "chickpea": 0.75,
    "lentil": 0.70, "pulses": 0.70,
    "sunflower": 0.95, "mustard": 0.90, "sesame": 0.80,
    "cotton": 1.05, "sugarcane": 1.20, "tobacco": 1.00,
    "tomato": 1.10, "potato": 1.10, "onion": 1.00,
}

# -------------------------
# SOIL AMENDMENT DATABASE
# -------------------------

AMENDMENTS = {
    "agricultural_lime": {
        "purpose": "Raise pH (neutralise acidity)",
        "notes": (
            "Apply 3-6 months before planting; incorporate 15-20 cm deep. "
            "Calcitic lime (CaCO3) preferred for Ca-deficient soils; "
            "dolomitic lime if Mg is also low."
        ),
        "caution": "Do not apply with ammonium fertilizers - causes N loss.",
    },
    "wood_ash": {
        "purpose": "Raise pH mildly + supply K and Ca",
        "notes": "Useful when pH and K are both low. Leaches quickly - incorporate before rain.",
        "caution": "Avoid heavy rates on sandy soils.",
    },
    "elemental_sulfur": {
        "purpose": "Lower pH (acidify alkaline soil)",
        "notes": (
            "Bacteria oxidise S to sulfuric acid over 2-3 months. "
            "Apply 6+ months before planting. Combine with organic matter for faster action."
        ),
        "caution": "Overuse can over-acidify; recheck pH after each season.",
    },
    "ferrous_sulfate": {
        "purpose": "Lower pH quickly + supply Fe",
        "notes": (
            "Faster-acting than elemental S but costlier. "
            "Good for Fe-deficient alkaline soils (yellowing between veins)."
        ),
        "caution": "Can stain equipment; wear protective gear.",
    },
    "farmyard_manure": {
        "purpose": "Improve organic matter, microbial activity, and water-holding capacity",
        "notes": (
            "Well-composted FYM (4-6 months) preferred to avoid weed seeds and pathogens. "
            "Supplies slow-release N, P, K and micro-nutrients."
        ),
        "caution": "Fresh manure can burn roots - compost first.",
    },
    "compost": {
        "purpose": "Boost organic matter, improve soil structure and CEC",
        "notes": (
            "Apply 2-4 weeks before sowing. Rich in humus; "
            "improves moisture retention in sandy soils and drainage in clay soils."
        ),
        "caution": "Check compost maturity - immature compost depletes soil N.",
    },
    "vermicompost": {
        "purpose": "Concentrated nutrients + beneficial microorganisms",
        "notes": (
            "Higher nutrient density than FYM. Excellent for high-value vegetable crops. "
            "Contains growth hormones and enzymes."
        ),
        "caution": "Store in cool, moist conditions before application.",
    },
    "green_manure": {
        "purpose": "Fix atmospheric N + add organic matter",
        "crop_examples": "Dhaincha (Sesbania), sunhemp (Crotalaria), cowpea",
        "notes": (
            "Plough in at 45-50 days (before flowering). "
            "Can supply 60-150 kg N/ha. Best before a rice crop."
        ),
        "caution": "Needs 2-3 weeks decomposition time before next planting.",
    },
    "gypsum": {
        "purpose": "Supply Ca and S; improve sodic/saline-sodic soils",
        "notes": (
            "Unlike lime, gypsum does NOT raise pH. "
            "Flocculates clay particles - improves aeration and reduces crusting. "
            "Ideal for reclaiming sodic (high Na) soils."
        ),
        "caution": "Over-application in well-drained soils causes SO4 leaching.",
    },
    "biochar": {
        "purpose": "Long-term carbon sequestration + improve CEC and water retention",
        "notes": (
            "Highly stable in soil (100+ years). "
            "Charge with nutrients (fertichar) before application to avoid initial N draw-down. "
            "Best suited for sandy, degraded soils."
        ),
        "caution": "Avoid high rates without nutrient charging - can initially reduce yield.",
    },
}

# -------------------------
# COLOR PALETTES FOR IMAGE MAPS
# -------------------------

COLOR_PALETTES = {
    'NDVI': {
        'palette': ['#8B0000', '#FF0000', '#FF8C00', '#FFD700', '#ADFF2F', '#32CD32', '#228B22', '#006400'],
        'min': 0, 'max': 1,
        'ranges': [
            {'min': 0.0, 'max': 0.2, 'color': '#8B0000', 'label': 'Severe Stress'},
            {'min': 0.2, 'max': 0.3, 'color': '#FF0000', 'label': 'High Stress'},
            {'min': 0.3, 'max': 0.4, 'color': '#FF8C00', 'label': 'Moderate Stress'},
            {'min': 0.4, 'max': 0.5, 'color': '#FFD700', 'label': 'Fair'},
            {'min': 0.5, 'max': 0.6, 'color': '#ADFF2F', 'label': 'Good'},
            {'min': 0.6, 'max': 0.7, 'color': '#32CD32', 'label': 'Very Good'},
            {'min': 0.7, 'max': 0.8, 'color': '#228B22', 'label': 'Excellent'},
            {'min': 0.8, 'max': 1.0, 'color': '#006400', 'label': 'Optimal'},
        ],
    },
    'SOIL_HEALTH': {
        'palette': ['#654321', '#8B4513', '#D2691E', '#F4A460', '#D2B48C', '#F5DEB3'],
        'min': 0, 'max': 100,
        'ranges': [
            {'min': 0,  'max': 20,  'color': '#654321', 'label': 'Very Poor (0-20)'},
            {'min': 20, 'max': 40,  'color': '#8B4513', 'label': 'Poor (20-40)'},
            {'min': 40, 'max': 60,  'color': '#D2691E', 'label': 'Fair (40-60)'},
            {'min': 60, 'max': 75,  'color': '#F4A460', 'label': 'Good (60-75)'},
            {'min': 75, 'max': 90,  'color': '#D2B48C', 'label': 'Very Good (75-90)'},
            {'min': 90, 'max': 100, 'color': '#F5DEB3', 'label': 'Excellent (90-100)'},
        ],
    },
    'CROP_HEALTH': {
        'palette': ['#8B0000', '#FF0000', '#FF8C00', '#FFD700', '#9ACD32', '#32CD32', '#228B22', '#006400'],
        'min': 0, 'max': 100,
        'ranges': [
            {'min': 0,  'max': 20,  'color': '#8B0000', 'label': 'Critical (0-20)'},
            {'min': 20, 'max': 40,  'color': '#FF0000', 'label': 'Poor (20-40)'},
            {'min': 40, 'max': 60,  'color': '#FF8C00', 'label': 'Fair (40-60)'},
            {'min': 60, 'max': 75,  'color': '#FFD700', 'label': 'Good (60-75)'},
            {'min': 75, 'max': 85,  'color': '#9ACD32', 'label': 'Very Good (75-85)'},
            {'min': 85, 'max': 95,  'color': '#32CD32', 'label': 'Excellent (85-95)'},
            {'min': 95, 'max': 100, 'color': '#006400', 'label': 'Optimal (95-100)'},
        ],
    },
    'GNDVI': {
        'palette': ['#2c3e50', '#95a5a6', '#f1c40f', '#f39c12', '#27ae60', '#2ecc71', '#1e8449'],
        'min': -1, 'max': 1,
        'ranges': [
            {'min': -1.0, 'max': 0.0, 'color': '#2c3e50', 'label': 'Water/Clouds'},
            {'min': 0.0,  'max': 0.3, 'color': '#f1c40f', 'label': 'Stress/Chlorophyll Deficiency'},
            {'min': 0.3,  'max': 0.6, 'color': '#27ae60', 'label': 'Light to Medium Greens'},
            {'min': 0.6,  'max': 0.8, 'color': '#2ecc71', 'label': 'Healthy Vegetation'},
            {'min': 0.8,  'max': 1.0, 'color': '#1e8449', 'label': 'Very Healthy, High Chlorophyll'},
        ],
    },
    'SAVI': {
        'palette': ['#8B4513', '#D2B48C', '#F4A460', '#90EE90', '#32CD32', '#228B22'],
        'min': -1, 'max': 1,
        'ranges': [
            {'min': -1.0, 'max': 0.1, 'color': '#8B4513', 'label': 'Bare Soil, Water'},
            {'min': 0.1,  'max': 0.3, 'color': '#F4A460', 'label': 'Sparse Vegetation'},
            {'min': 0.3,  'max': 0.5, 'color': '#90EE90', 'label': 'Yellow-Greens'},
            {'min': 0.5,  'max': 0.7, 'color': '#32CD32', 'label': 'Medium Greens'},
            {'min': 0.7,  'max': 1.0, 'color': '#228B22', 'label': 'Dense Vegetation'},
        ],
    },
    'EVI': {
        'palette': ['#4B0082', '#4169E1', '#FF4500', '#FF8C00', '#FFD700', '#9ACD32', '#006400'],
        'min': -1, 'max': 1,
        'ranges': [
            {'min': -1.0, 'max': 0.1, 'color': '#4B0082', 'label': 'Water, Clouds, Snow'},
            {'min': 0.1,  'max': 0.3, 'color': '#FF4500', 'label': 'Sparse Vegetation, Soil'},
            {'min': 0.3,  'max': 0.5, 'color': '#FFD700', 'label': 'Yellows/Light Greens'},
            {'min': 0.5,  'max': 0.7, 'color': '#9ACD32', 'label': 'Medium to Bright Greens'},
            {'min': 0.7,  'max': 1.0, 'color': '#006400', 'label': 'Very Dense Canopy'},
        ],
    },
}
