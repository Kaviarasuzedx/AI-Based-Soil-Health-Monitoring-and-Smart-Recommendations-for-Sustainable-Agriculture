# test.py - Complete Agricultural Data API with Professional PDF Reports
# v7: Fixed rate limiting, added retry logic, improved fallback handling

from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
import os
import asyncio
from dotenv import load_dotenv
import json
import csv
import io
import httpx
from supabase import create_client
import asyncpg
from contextlib import asynccontextmanager

# Import the PDF template system
from pdf_templates import ProfessionalPDFReport, AgColors, ProfessionalAgReport

# Load environment variables
load_dotenv(override=True)

# ─────────────────────────────────────────
# LIFESPAN CONTEXT MANAGER
# ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("\n" + "=" * 60)
    print("🚀 Starting Agricultural Data API v7.0 — Professional PDF Reports")
    print("=" * 60)
    await neon_db.initialize()
    print(f"🤖 LLM: {'Together AI (' + LLAMA_MODEL_TOGETHER + ')' if TOGETHER_API_KEY else 'Not configured'}")
    print(f"   Fallback: {'Groq (' + LLAMA_MODEL_GROQ + ')' if GROQ_API_KEY else 'Not configured'}")
    print("✅ API ready!")
    print(f"📍 http://localhost:8070")
    print("=" * 60 + "\n")
    
    yield
    
    # Shutdown
    print("\n🛑 Shutting down...")
    await neon_db.close()


app = FastAPI(
    title="Agricultural Data API",
    description="Complete NeonDB + Supabase + LLM agricultural analytics",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8081",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# SUPABASE CONFIG
# ─────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL1")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✓ Supabase client initialized")
    except Exception as e:
        print(f"❌ Supabase initialization error: {e}")
        supabase = None
else:
    print("⚠️  Supabase not configured - missing URL or KEY")
    supabase = None

# ─────────────────────────────────────────
# NEON DB CONFIG
# ─────────────────────────────────────────
NEON_DATABASE_URL = os.getenv("DATABASE_URL")

# ─────────────────────────────────────────
# LLM CONFIG
# ─────────────────────────────────────────
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
GROQ_API_KEY     = os.getenv("GROQ_API_KEY")
LLAMA_MODEL_TOGETHER = "meta-llama/Llama-3.3-70B-Instruct-Turbo"
LLAMA_MODEL_GROQ     = "llama-3.3-70b-versatile"


# ─────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────
class ReportRequest(BaseModel):
    report_type: str = Field(default="comprehensive", description="comprehensive | water | yield | soil")
    analysis_ids: List[Union[str, int]] = Field(default=[], description="List of analysis IDs to include")
    include_charts: bool = Field(default=True, description="Include charts in report")
    include_recommendations: bool = Field(default=True, description="Include AI recommendations")
    include_images: bool = Field(default=True, description="Include images in report")
    format: str = Field(default="pdf", description="pdf | csv | json")
    date_range: str = Field(default="all", description="all | week | month | year")


# ─────────────────────────────────────────
# NEON DB MANAGER
# ─────────────────────────────────────────
class NeonDBManager:
    def __init__(self):
        self.pool = None

    async def initialize(self):
        if not NEON_DATABASE_URL:
            print("❌ NEON_DATABASE_URL not configured")
            return False
        try:
            self.pool = await asyncpg.create_pool(
                NEON_DATABASE_URL,
                min_size=2,
                max_size=10,
                command_timeout=60,
            )
            print("✓ Neon DB connection pool created")
            return True
        except Exception as e:
            print(f"❌ Neon DB connection failed: {e}")
            return False

    async def get_all_analyses(self, limit: int = 1000, offset: int = 0):
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT
                        analysis_id, place_name, datetime,
                        mean_ndvi, std_ndvi, min_ndvi, max_ndvi,
                        mean_savi, std_savi, min_savi, max_savi,
                        mean_evi, std_evi, min_evi, max_evi,
                        mean_gndvi, std_gndvi, min_gndvi, max_gndvi,
                        soil_health_score, moisture_index, organic_matter,
                        texture_score, ph_level,
                        crop_health_score, vigor_index, stress_level,
                        yield_potential, chlorophyll_content,
                        cloud_cover, collection_size, created_at, updated_at
                    FROM ndvi_analyses
                    ORDER BY datetime DESC
                    LIMIT $1 OFFSET $2
                """, limit, offset)
                result = []
                for row in rows:
                    record = dict(row)
                    for k, v in record.items():
                        if isinstance(v, datetime):
                            record[k] = v.isoformat()
                    result.append(record)
                return result
        except Exception as e:
            print(f"❌ Neon DB query error: {e}")
            return []

    async def get_analyses_by_ids(self, ids: List[Union[str, int]]):
        if not ids:
            return []
        try:
            int_ids = []
            for id_val in ids:
                try:
                    int_ids.append(int(id_val))
                except (ValueError, TypeError):
                    print(f"⚠️ Could not convert ID to integer: {id_val}")
                    continue
            
            if not int_ids:
                return []
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT
                        analysis_id, place_name, datetime,
                        mean_ndvi, std_ndvi, min_ndvi, max_ndvi,
                        mean_savi, std_savi, min_savi, max_savi,
                        mean_evi, std_evi, min_evi, max_evi,
                        mean_gndvi, std_gndvi, min_gndvi, max_gndvi,
                        soil_health_score, moisture_index, organic_matter,
                        texture_score, ph_level,
                        crop_health_score, vigor_index, stress_level,
                        yield_potential, chlorophyll_content,
                        cloud_cover, collection_size, created_at, updated_at
                    FROM ndvi_analyses
                    WHERE analysis_id = ANY($1::integer[])
                    ORDER BY datetime DESC
                """, int_ids)
                
                result = []
                for row in rows:
                    record = dict(row)
                    for k, v in record.items():
                        if isinstance(v, datetime):
                            record[k] = v.isoformat()
                    result.append(record)
                return result
        except Exception as e:
            print(f"❌ Neon DB ids query error: {e}")
            return []

    async def get_all_supabase_images(self):
        if not supabase:
            return {}
        try:
            response = supabase.table("ndvi_analyses_rag").select(
                "id, place_name, datetime, ndvi_png, rgb_png, savi_png, gndvi_png, evi_png, soil_health_png, crop_health_png"
            ).execute()
            images_dict = {}
            for record in response.data:
                images_dict[str(record["id"])] = {
                    "ndvi_png": record.get("ndvi_png"),
                    "rgb_png": record.get("rgb_png"),
                    "savi_png": record.get("savi_png"),
                    "gndvi_png": record.get("gndvi_png"),
                    "evi_png": record.get("evi_png"),
                    "soil_health_png": record.get("soil_health_png"),
                    "crop_health_png": record.get("crop_health_png"),
                }
            return images_dict
        except Exception as e:
            print(f"❌ Supabase images fetch error: {e}")
            return {}

    async def get_images_for_records(self, records: List[Dict]) -> Dict:
        if not supabase:
            return {}
        try:
            analysis_ids = [str(r.get("analysis_id")) for r in records if r.get("analysis_id")]
            if not analysis_ids:
                return {}
            response = supabase.table("ndvi_analyses_rag").select(
                "id, ndvi_png, rgb_png, savi_png, gndvi_png, evi_png, soil_health_png, crop_health_png"
            ).in_("id", analysis_ids).execute()
            images_dict = {}
            for record in response.data:
                images_dict[str(record["id"])] = {
                    "ndvi_png": record.get("ndvi_png"),
                    "rgb_png": record.get("rgb_png"),
                    "savi_png": record.get("savi_png"),
                    "gndvi_png": record.get("gndvi_png"),
                    "evi_png": record.get("evi_png"),
                    "soil_health_png": record.get("soil_health_png"),
                    "crop_health_png": record.get("crop_health_png"),
                }
            return images_dict
        except Exception as e:
            print(f"❌ Error fetching images: {e}")
            return {}

    async def get_analyses_count(self):
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow("SELECT COUNT(*) as count FROM ndvi_analyses")
                return row["count"] if row else 0
        except Exception as e:
            print(f"❌ Neon DB count error: {e}")
            return 0

    async def close(self):
        if self.pool:
            await self.pool.close()
            print("✓ Neon DB connection pool closed")


neon_db = NeonDBManager()


# ─────────────────────────────────────────
# LLM HELPER FUNCTIONS with Rate Limiting
# ─────────────────────────────────────────

# Simple rate limiter for LLM calls
class RateLimiter:
    def __init__(self, calls_per_second=1):
        self.calls_per_second = calls_per_second
        self.last_call_time = 0
        self.lock = asyncio.Lock()
    
    async def wait_if_needed(self):
        async with self.lock:
            now = asyncio.get_event_loop().time()
            time_since_last = now - self.last_call_time
            if time_since_last < 1.0 / self.calls_per_second:
                wait_time = (1.0 / self.calls_per_second) - time_since_last
                await asyncio.sleep(wait_time)
            self.last_call_time = asyncio.get_event_loop().time()

rate_limiter = RateLimiter(calls_per_second=0.5)  # 2 seconds between calls to avoid rate limiting


async def call_llm_with_retry(prompt: str, system: str, max_retries: int = 3) -> str:
    """Call LLM with retry logic for rate limits"""
    await rate_limiter.wait_if_needed()
    
    for attempt in range(max_retries):
        try:
            # Try Together AI first
            if TOGETHER_API_KEY:
                try:
                    async with httpx.AsyncClient(timeout=90) as client:
                        resp = await client.post(
                            "https://api.together.xyz/v1/chat/completions",
                            headers={"Authorization": f"Bearer {TOGETHER_API_KEY}", "Content-Type": "application/json"},
                            json={
                                "model": LLAMA_MODEL_TOGETHER,
                                "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                                "max_tokens": 1500,
                                "temperature": 0.3,
                            },
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            return data["choices"][0]["message"]["content"].strip()
                        else:
                            print(f"⚠️ Together AI attempt {attempt + 1} failed: {resp.status_code}")
                except Exception as e:
                    print(f"⚠️ Together AI error attempt {attempt + 1}: {e}")
            
            # Try Groq as fallback
            if GROQ_API_KEY:
                try:
                    async with httpx.AsyncClient(timeout=90) as client:
                        resp = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                            json={
                                "model": LLAMA_MODEL_GROQ,
                                "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                                "max_tokens": 1500,
                                "temperature": 0.3,
                            },
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            return data["choices"][0]["message"]["content"].strip()
                        elif resp.status_code == 429:
                            print(f"⚠️ Groq rate limit (attempt {attempt + 1}), waiting 3 seconds...")
                            await asyncio.sleep(3)  # Wait longer for rate limit
                        else:
                            print(f"⚠️ Groq attempt {attempt + 1} failed: {resp.status_code}")
                except Exception as e:
                    print(f"⚠️ Groq error attempt {attempt + 1}: {e}")
            
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff: 1, 2, 4 seconds
                await asyncio.sleep(wait_time)
                
        except Exception as e:
            print(f"⚠️ LLM call attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
    
    raise RuntimeError("No LLM provider available after retries")


def _safe_float(v, decimals=3):
    try:
        return round(float(v), decimals) if v is not None else None
    except Exception:
        return None


def avg_list(vals):
    v = [x for x in vals if x is not None]
    return round(sum(v) / len(v), 3) if v else None


def _build_data_summary(records: List[Dict]) -> str:
    if not records:
        return "No field data available."

    n = len(records)
    locations = list({r.get("place_name", "Unknown") for r in records})

    def avg(key):
        vals = [r[key] for r in records if r.get(key) is not None]
        return round(sum(vals) / len(vals), 3) if vals else None

    ndvi_avg = avg("mean_ndvi")
    soil_avg = avg("soil_health_score")
    crop_avg = avg("crop_health_score")
    yield_avg = avg("yield_potential")
    moisture_avg = avg("moisture_index")
    organic_avg = avg("organic_matter")
    ph_avg = avg("ph_level")
    stress_avg = avg("stress_level")
    vigor_avg = avg("vigor_index")

    lines = [
        f"Total analyses: {n}",
        f"Locations: {', '.join(locations[:5])}",
        "",
        f"Average NDVI: {ndvi_avg if ndvi_avg else 'N/A'}",
        f"Average Soil Health: {soil_avg if soil_avg else 'N/A'}%",
        f"Average Crop Health: {crop_avg if crop_avg else 'N/A'}%",
        f"Average Yield Potential: {yield_avg if yield_avg else 'N/A'}%",
        f"Average Moisture Index: {moisture_avg if moisture_avg else 'N/A'}%",
        f"Average Organic Matter: {organic_avg if organic_avg else 'N/A'}%",
        f"Average pH Level: {ph_avg if ph_avg else 'N/A'}",
        f"Average Stress Level: {stress_avg if stress_avg else 'N/A'}%",
        f"Average Vigor Index: {vigor_avg if vigor_avg else 'N/A'}%",
    ]

    return "\n".join(lines)


def _parse_llm_sections(llm_text: str) -> List[Dict]:
    sections = []
    current_title = "Summary"
    current_items = []

    for line in llm_text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("## "):
            if current_items:
                sections.append({"title": current_title, "items": current_items})
            current_title = line[3:].strip()
            current_items = []
        elif line.startswith("- ") or line.startswith("* "):
            text = line[2:].strip()
            if text:
                current_items.append(text)
        elif line and not line.startswith("#"):
            current_items.append(line)

    if current_items:
        sections.append({"title": current_title, "items": current_items})
    if not sections:
        sections = [{"title": "Analysis", "items": [llm_text[:1000]]}]
    return sections


def extract_recommendations_from_sections(sections: List[Dict]) -> List[Dict]:
    """Extract structured recommendations from LLM sections"""
    recommendations = []
    
    for section in sections:
        if 'Recommend' in section.get('title', '') or 'Action' in section.get('title', ''):
            for item in section.get('items', []):
                priority = 'MEDIUM'
                if 'urgent' in item.lower() or 'immediate' in item.lower() or 'critical' in item.lower():
                    priority = 'HIGH'
                elif 'consider' in item.lower() or 'optional' in item.lower():
                    priority = 'LOW'
                
                actions = [item]
                
                recommendations.append({
                    'priority': priority,
                    'title': item[:50] + '...' if len(item) > 50 else item,
                    'description': item[:200],
                    'actions': actions
                })
    
    return recommendations[:5]


def _get_detailed_solution(metric_name: str, value: float, unit: str, status: str) -> Dict:
    """Get detailed solution without LLM call to avoid rate limiting"""
    
    solutions = {
        "NDVI (Vegetation Health)": {
            "Good / Healthy": {
                "cause": f"NDVI value of {value:.3f} indicates excellent vegetation cover and photosynthetic activity.",
                "solution": "Maintain current management practices. Continue regular monitoring to detect any early signs of decline."
            },
            "Moderate / Needs Attention": {
                "cause": f"NDVI value of {value:.3f} suggests moderate vegetation stress. Possible causes include nutrient deficiency, mild water stress, or early pest infestation.",
                "solution": "Apply targeted nitrogen fertilizer in low-NDVI zones. Increase irrigation frequency by 15-20%. Conduct field scouting for pest/disease presence."
            },
            "Poor / Critical": {
                "cause": f"NDVI value of {value:.3f} indicates severe vegetation stress. Root causes may include nutrient deficiency, water stress, pest damage, or poor soil conditions.",
                "solution": "URGENT: Apply balanced NPK fertilizer immediately. Increase irrigation by 30-40%. Test soil for specific deficiencies. Consider replanting in severely affected areas."
            }
        },
        "Soil Health Score": {
            "Good / Healthy": {
                "cause": f"Soil health score of {value:.1f}% indicates good soil structure and biological activity.",
                "solution": "Maintain cover cropping and minimum tillage practices. Continue regular organic matter additions."
            },
            "Moderate / Needs Attention": {
                "cause": f"Soil health score of {value:.1f}% suggests soil degradation from intensive tillage or reduced organic matter.",
                "solution": "Implement cover cropping between cash crops. Reduce tillage intensity. Apply compost or manure at 5-10 tons/hectare."
            },
            "Poor / Critical": {
                "cause": f"Soil health score of {value:.1f}% indicates severe soil degradation with poor structure and low biological activity.",
                "solution": "URGENT: Stop conventional tillage immediately. Establish permanent cover crops. Apply 15-20 tons/hectare of compost. Implement rotational grazing if applicable."
            }
        },
        "Crop Health Score": {
            "Good / Healthy": {
                "cause": f"Crop health score of {value:.1f}% indicates favorable growing conditions with minimal stress.",
                "solution": "Continue current nutrient and water management. Monitor for early signs of stress using weekly field inspections."
            },
            "Moderate / Needs Attention": {
                "cause": f"Crop health score of {value:.1f}% suggests suboptimal growing conditions affecting crop vigor.",
                "solution": "Optimize irrigation scheduling based on crop stage. Apply micronutrients (Zn, Fe, Mn) as foliar spray. Monitor for pest pressure weekly."
            },
            "Poor / Critical": {
                "cause": f"Crop health score of {value:.1f}% indicates severe stress compromising yield potential.",
                "solution": "URGENT: Apply stress-reduction measures including increased irrigation, complete nutrient application, and immediate pest control if detected."
            }
        },
        "Yield Potential": {
            "Good / Healthy": {
                "cause": f"Yield potential of {value:.1f}% indicates optimal growing conditions for maximum yield.",
                "solution": "Maintain optimal management. Ensure harvest timing is optimized for maximum quality and quantity."
            },
            "Moderate / Needs Attention": {
                "cause": f"Yield potential of {value:.1f}% suggests moderate yield-limiting factors present.",
                "solution": "Address identified constraints (nutrient, water, pest). Implement variable-rate technology for input application. Optimize plant population where needed."
            },
            "Poor / Critical": {
                "cause": f"Yield potential of {value:.1f}% indicates severe constraints limiting crop production.",
                "solution": "URGENT: Conduct comprehensive field audit. Consider alternative crops better suited to conditions. Implement soil remediation before next planting season."
            }
        },
        "Moisture Index": {
            "Good / Healthy": {
                "cause": f"Moisture index of {value:.1f}% indicates optimal soil moisture for crop growth.",
                "solution": "Maintain current irrigation schedule. Monitor soil moisture weekly to detect changes."
            },
            "Moderate / Needs Attention": {
                "cause": f"Moisture index of {value:.1f}% suggests {'deficit' if value < 40 else 'excess'} soil moisture conditions.",
                "solution": f"{'Increase irrigation frequency and duration by 25%' if value < 40 else 'Reduce irrigation and improve drainage'} to optimize moisture levels."
            },
            "Poor / Critical": {
                "cause": f"Moisture index of {value:.1f}% indicates {'severe drought stress' if value < 30 else 'waterlogging conditions'} affecting crop health.",
                "solution": f"{'URGENT: Apply emergency irrigation immediately. Consider deficit irrigation strategies.' if value < 30 else 'URGENT: Stop irrigation. Install drainage tiles or create surface drainage channels.'}"
            }
        },
        "Organic Matter": {
            "Good / Healthy": {
                "cause": f"Organic matter content of {value:.1f}% indicates good soil carbon levels for fertility and water retention.",
                "solution": "Maintain residue retention and cover cropping. Continue organic matter additions annually."
            },
            "Moderate / Needs Attention": {
                "cause": f"Organic matter of {value:.1f}% suggests declining soil carbon from intensive tillage or removal of crop residues.",
                "solution": "Implement no-till or reduced tillage. Add cover crops in rotation. Apply compost or manure annually."
            },
            "Poor / Critical": {
                "cause": f"Organic matter of {value:.1f}% indicates severely depleted soil carbon affecting all soil functions.",
                "solution": "URGENT: Convert to permanent cover cropping system. Apply 20-30 tons/hectare of compost. Stop all tillage operations. Consider 3-5 year soil building rotation."
            }
        },
        "pH Level": {
            "Good / Healthy": {
                "cause": f"pH level of {value:.1f} indicates optimal range for nutrient availability.",
                "solution": "Maintain pH with regular testing every 2-3 years. Continue current liming/sulfur program if any."
            },
            "Moderate / Needs Attention": {
                "cause": f"pH level of {value:.1f} indicates {'acidic' if value < 6.0 else 'alkaline'} conditions limiting nutrient availability.",
                "solution": f"{'Apply agricultural lime at 2-4 tons/hectare to raise pH' if value < 6.0 else 'Apply elemental sulfur at 500-1000 kg/hectare to lower pH'} based on soil test recommendations."
            },
            "Poor / Critical": {
                "cause": f"pH level of {value:.1f} indicates severe {'acidity' if value < 5.5 else 'alkalinity'} causing major nutrient lockup.",
                "solution": f"{'URGENT: Apply lime at 6-8 tons/hectare immediately' if value < 5.5 else 'URGENT: Apply sulfur at 1500-2000 kg/hectare and use acidifying fertilizers'}"
            }
        },
        "Stress Level": {
            "Good / Healthy": {
                "cause": f"Stress level of {value:.1f}% indicates minimal crop stress from environmental or biological factors.",
                "solution": "Continue monitoring for early warning signs. Maintain preventative management practices."
            },
            "Moderate / Needs Attention": {
                "cause": f"Stress level of {value:.1f}% suggests moderate stress from water, nutrient, or pest pressure.",
                "solution": "Identify primary stress source through field scouting. Apply targeted intervention (irrigation, fertilizer, pesticide) based on diagnosis."
            },
            "Poor / Critical": {
                "cause": f"Stress level of {value:.1f}% indicates severe multiple stress factors impacting survival and yield.",
                "solution": "URGENT: Comprehensive stress audit needed. Apply broad-spectrum solutions including full irrigation, complete nutrition, and pest control. Consider salvage harvest if severe."
            }
        }
    }
    
    # Get status category
    if "Good" in status or "Optimal" in status:
        status_category = "Good / Healthy"
    elif "Moderate" in status or "Low" in status or "Acidic" in status or "Alkaline" in status:
        status_category = "Moderate / Needs Attention"
    else:
        status_category = "Poor / Critical"
    
    # Get solution for metric
    metric_solutions = solutions.get(metric_name, {})
    default = {
        "cause": f"{metric_name} value of {value}{unit} requires attention based on current conditions.",
        "solution": "Monitor field conditions and consult local agricultural extension for specific recommendations."
    }
    
    result = metric_solutions.get(status_category, default)
    return result


async def generate_detailed_metric_solutions(records: List[Dict], metrics: Dict) -> List[Dict]:
    """Generate detailed root cause and solution analysis for each metric - Using fallback to avoid rate limits"""
    solutions = []
    
    # Define metric thresholds and descriptions
    metric_definitions = [
        {"name": "NDVI (Vegetation Health)", "key": "avg_ndvi", "unit": "", 
         "low_threshold": 0.3, "medium_threshold": 0.5},
        {"name": "Soil Health Score", "key": "avg_soil_health", "unit": "%",
         "low_threshold": 50, "medium_threshold": 70},
        {"name": "Crop Health Score", "key": "avg_crop_health", "unit": "%",
         "low_threshold": 50, "medium_threshold": 70},
        {"name": "Yield Potential", "key": "avg_yield", "unit": "%",
         "low_threshold": 50, "medium_threshold": 70},
        {"name": "Moisture Index", "key": "avg_moisture", "unit": "%",
         "low_threshold": 40, "medium_threshold": 80},
        {"name": "Organic Matter", "key": "avg_organic_matter", "unit": "%",
         "low_threshold": 3, "medium_threshold": 6},
        {"name": "pH Level", "key": "avg_ph", "unit": "",
         "low_threshold": 6.0, "medium_threshold": 7.5},
        {"name": "Stress Level", "key": "avg_stress", "unit": "%",
         "low_threshold": 30, "medium_threshold": 60}
    ]
    
    for metric_def in metric_definitions:
        key = metric_def["key"]
        value = metrics.get(key, 0)
        if value == 0:
            continue
        
        unit = metric_def["unit"]
            
        # Determine status and urgency
        if key == "avg_ph":
            if 6.0 <= value <= 7.5:
                status = "Optimal"
                urgency = "LOW"
            elif value < 6.0:
                status = "Acidic"
                urgency = "HIGH" if value < 5.5 else "MEDIUM"
            else:
                status = "Alkaline"
                urgency = "HIGH" if value > 8.0 else "MEDIUM"
        elif key == "avg_moisture":
            if 40 <= value <= 80:
                status = "Optimal"
                urgency = "LOW"
            elif value < 40:
                status = "Low / Drought Stress"
                urgency = "HIGH" if value < 20 else "MEDIUM"
            else:
                status = "Excess / Waterlogging"
                urgency = "HIGH" if value > 90 else "MEDIUM"
        else:
            if value >= metric_def["medium_threshold"]:
                status = "Good / Healthy"
                urgency = "LOW"
            elif value >= metric_def["low_threshold"]:
                status = "Moderate / Needs Attention"
                urgency = "MEDIUM"
            else:
                status = "Poor / Critical"
                urgency = "HIGH"
        
        # Use fallback solution system to avoid rate limiting
        solution_data = _get_detailed_solution(metric_def["name"], value, unit, status)
        
        solutions.append({
            "metric_name": metric_def['name'],
            "current_value": f"{value}{unit}",
            "status": status,
            "cause": solution_data["cause"],
            "solution": solution_data["solution"],
            "urgency": urgency
        })
    
    return solutions


# ─────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "Agricultural Data API — Professional PDF Reports",
        "version": "7.0.0",
        "endpoints": {
            "report_json": "POST /agricultural/report",
            "report_pdf": "POST /agricultural/report/pdf",
            "all_data": "GET /api/combined/all-data",
            "statistics": "GET /api/combined/statistics",
            "health": "GET /api/combined/health",
        },
    }


@app.get("/api/combined/all-data")
async def get_all_combined_data(limit: int = Query(1000, ge=1, le=10000), offset: int = Query(0, ge=0)):
    try:
        print("\n📊 Fetching all data...")
        if not neon_db.pool:
            return JSONResponse(content={"success": False, "error": "Neon DB not connected", "data": []}, status_code=503)

        neon_data = await neon_db.get_all_analyses(limit, offset)
        supabase_images = await neon_db.get_all_supabase_images()
        
        combined_results = []
        for record in neon_data:
            analysis_id = record.get("analysis_id")
            images = supabase_images.get(str(analysis_id), {})
            combined_results.append({
                "analysis_id": analysis_id,
                "place_name":  record.get("place_name", "Unknown"),
                "datetime":    record.get("datetime", ""),
                "source":      "neon",
                "mean_ndvi":   record.get("mean_ndvi"),
                "std_ndvi":    record.get("std_ndvi"),
                "min_ndvi":    record.get("min_ndvi"),
                "max_ndvi":    record.get("max_ndvi"),
                "mean_savi":   record.get("mean_savi"),
                "std_savi":    record.get("std_savi"),
                "min_savi":    record.get("min_savi"),
                "max_savi":    record.get("max_savi"),
                "mean_evi":    record.get("mean_evi"),
                "std_evi":     record.get("std_evi"),
                "min_evi":     record.get("min_evi"),
                "max_evi":     record.get("max_evi"),
                "mean_gndvi":  record.get("mean_gndvi"),
                "std_gndvi":   record.get("std_gndvi"),
                "min_gndvi":   record.get("min_gndvi"),
                "max_gndvi":   record.get("max_gndvi"),
                "soil_health_score":  record.get("soil_health_score"),
                "moisture_index":     record.get("moisture_index"),
                "organic_matter":     record.get("organic_matter"),
                "texture_score":      record.get("texture_score"),
                "ph_level":           record.get("ph_level"),
                "crop_health_score":  record.get("crop_health_score"),
                "vigor_index":        record.get("vigor_index"),
                "stress_level":       record.get("stress_level"),
                "yield_potential":    record.get("yield_potential"),
                "chlorophyll_content":record.get("chlorophyll_content"),
                "cloud_cover":        record.get("cloud_cover"),
                "collection_size":    record.get("collection_size"),
                "created_at":         record.get("created_at"),
                "images": {k: v for k, v in images.items() if v},
            })

        total_count = await neon_db.get_analyses_count()
        return JSONResponse(content={"success": True, "data": combined_results, "total": total_count})

    except Exception as e:
        print(f"❌ Error: {e}")
        return JSONResponse(content={"success": False, "error": str(e), "data": []}, status_code=500)


@app.get("/api/combined/statistics")
async def get_complete_statistics():
    try:
        if not neon_db.pool:
            return JSONResponse(content={"success": False, "error": "Neon DB not connected"}, status_code=503)

        async with neon_db.pool.acquire() as conn:
            overall_stats = await conn.fetchrow("""
                SELECT COUNT(*) as total_analyses, COUNT(DISTINCT place_name) as unique_locations,
                       AVG(mean_ndvi) as avg_ndvi, AVG(soil_health_score) as avg_soil_health,
                       AVG(crop_health_score) as avg_crop_health, AVG(yield_potential) as avg_yield,
                       AVG(moisture_index) as avg_moisture, AVG(organic_matter) as avg_organic_matter,
                       AVG(ph_level) as avg_ph, AVG(stress_level) as avg_stress, AVG(vigor_index) as avg_vigor
                FROM ndvi_analyses
            """)
            return JSONResponse(content={"success": True, "statistics": {"overall": dict(overall_stats)}})
    except Exception as e:
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)


@app.get("/api/combined/health")
async def health_check():
    return JSONResponse(content={
        "neon_db": {"configured": bool(NEON_DATABASE_URL), "connected": neon_db.pool is not None},
        "supabase": {"configured": bool(supabase)},
        "llm": {"together_ai": bool(TOGETHER_API_KEY), "groq": bool(GROQ_API_KEY)},
        "api": "healthy",
    })


@app.post("/agricultural/report")
async def generate_agricultural_report(req: ReportRequest):
    string_ids = [str(id) for id in req.analysis_ids if id]
    print(f"\n🤖 Generating report: type={req.report_type}, ids={len(string_ids)}")

    if not neon_db.pool:
        raise HTTPException(status_code=503, detail="Neon DB not connected")

    if string_ids:
        records = await neon_db.get_analyses_by_ids(string_ids)
    else:
        records = await neon_db.get_all_analyses(limit=100)

    if not records:
        raise HTTPException(status_code=404, detail="No field data found")

    # Build summary
    def safe_avg(key):
        vals = [r[key] for r in records if r.get(key) is not None]
        return round(sum(vals) / len(vals), 2) if vals else 0

    summary_metrics = {
        "avg_ndvi": safe_avg("mean_ndvi"),
        "avg_soil_health": safe_avg("soil_health_score"),
        "avg_crop_health": safe_avg("crop_health_score"),
        "avg_yield": safe_avg("yield_potential"),
        "avg_moisture": safe_avg("moisture_index"),
        "avg_organic_matter": safe_avg("organic_matter"),
        "avg_ph": safe_avg("ph_level"),
        "avg_stress": safe_avg("stress_level"),
        "avg_vigor": safe_avg("vigor_index"),
    }

    # Generate LLM content with retry
    data_summary = _build_data_summary(records)
    system_prompt = "You are an expert agricultural analyst. Provide concise, professional analysis with clear recommendations."
    user_prompt = f"Analyze this agricultural data:\n{data_summary}\n\nProvide: Executive Summary, Key Findings, and Actionable Recommendations. Use bullet points."

    try:
        llm_response = await call_llm_with_retry(user_prompt, system_prompt)
    except:
        llm_response = f"Executive Summary\n- Analyzed {len(records)} fields\n- Average NDVI: {summary_metrics['avg_ndvi']:.3f}\n\nRecommendations\n- Monitor fields with low NDVI\n- Optimize irrigation schedules"

    sections = _parse_llm_sections(llm_response)
    
    # Fetch images for records
    supabase_images = {}
    if req.include_images and supabase:
        supabase_images = await neon_db.get_images_for_records(records)
    
    detailed_records = [{
        "analysis_id": r.get("analysis_id"),
        "place_name": r.get("place_name"),
        "datetime": r.get("datetime"),
        "mean_ndvi": r.get("mean_ndvi"),
        "std_ndvi": r.get("std_ndvi"),
        "min_ndvi": r.get("min_ndvi"),
        "max_ndvi": r.get("max_ndvi"),
        "mean_savi": r.get("mean_savi"),
        "std_savi": r.get("std_savi"),
        "min_savi": r.get("min_savi"),
        "max_savi": r.get("max_savi"),
        "mean_evi": r.get("mean_evi"),
        "std_evi": r.get("std_evi"),
        "min_evi": r.get("min_evi"),
        "max_evi": r.get("max_evi"),
        "mean_gndvi": r.get("mean_gndvi"),
        "std_gndvi": r.get("std_gndvi"),
        "min_gndvi": r.get("min_gndvi"),
        "max_gndvi": r.get("max_gndvi"),
        "soil_health_score": r.get("soil_health_score"),
        "moisture_index": r.get("moisture_index"),
        "organic_matter": r.get("organic_matter"),
        "texture_score": r.get("texture_score"),
        "ph_level": r.get("ph_level"),
        "crop_health_score": r.get("crop_health_score"),
        "vigor_index": r.get("vigor_index"),
        "stress_level": r.get("stress_level"),
        "yield_potential": r.get("yield_potential"),
        "chlorophyll_content": r.get("chlorophyll_content"),
        "cloud_cover": r.get("cloud_cover"),
        "images": supabase_images.get(str(r.get("analysis_id")), {}),
    } for r in records]

    report = {
        "title": "Agricultural Field Analysis Report",
        "subtitle": f"{req.report_type.title()} Analysis Report",
        "report_type": req.report_type,
        "field_count": len(records),
        "locations": sorted({r.get("place_name") for r in records if r.get("place_name")}),
        "generated_at": datetime.now().isoformat(),
        "report_date": datetime.now().strftime("%B %d, %Y"),
        "organization": "Agricultural Intelligence System",
        "summary_metrics": summary_metrics,
        "sections": sections,
        "detailed_records": detailed_records,
    }

    return JSONResponse(content={"success": True, "report": report})


@app.post("/agricultural/report/pdf")
async def generate_pdf_report(req: ReportRequest = Body(...)):
    print(f"\n📄 Generating professional PDF report with enhanced solutions...")
    
    if not neon_db.pool:
        raise HTTPException(status_code=503, detail="Neon DB not connected")

    # Get data
    string_ids = [str(id) for id in req.analysis_ids if id]
    if string_ids:
        records = await neon_db.get_analyses_by_ids(string_ids)
    else:
        records = await neon_db.get_all_analyses(limit=100)

    if not records:
        raise HTTPException(status_code=404, detail="No field data found")

    # Build metrics
    def safe_avg(key):
        vals = [r[key] for r in records if r.get(key) is not None]
        return round(sum(vals) / len(vals), 2) if vals else 0

    def safe_min(key):
        vals = [r[key] for r in records if r.get(key) is not None]
        return round(min(vals), 2) if vals else 0

    def safe_max(key):
        vals = [r[key] for r in records if r.get(key) is not None]
        return round(max(vals), 2) if vals else 0

    summary_metrics = {
        "avg_ndvi": safe_avg("mean_ndvi"),
        "avg_soil_health": safe_avg("soil_health_score"),
        "avg_crop_health": safe_avg("crop_health_score"),
        "avg_yield": safe_avg("yield_potential"),
        "avg_moisture": safe_avg("moisture_index"),
        "avg_organic_matter": safe_avg("organic_matter"),
        "avg_ph": safe_avg("ph_level"),
        "avg_stress": safe_avg("stress_level"),
        "avg_vigor": safe_avg("vigor_index"),
        "min_ndvi": safe_min("mean_ndvi"),
        "max_ndvi": safe_max("mean_ndvi"),
    }

    # Generate NDVI trend data
    sorted_records = sorted(records, key=lambda x: x.get('datetime', ''), reverse=False)
    ndvi_trend = [r.get('mean_ndvi', 0) for r in sorted_records[-10:] if r.get('mean_ndvi') is not None]
    
    # Fetch images for records
    supabase_images = {}
    if req.include_images and supabase:
        supabase_images = await neon_db.get_images_for_records(records)
    
    # Generate LLM analysis for executive summary and recommendations
    data_summary = _build_data_summary(records)
    system_prompt = "You are an expert agricultural analyst. Provide concise analysis with clear recommendations."
    user_prompt = f"Analyze this data and provide Executive Summary, Key Findings, and Recommendations with priority levels:\n{data_summary}"

    try:
        llm_response = await call_llm_with_retry(user_prompt, system_prompt, max_retries=2)
        sections = _parse_llm_sections(llm_response)
        recommendations = extract_recommendations_from_sections(sections)
    except:
        print("⚠️ Using fallback recommendations due to LLM unavailability")
        llm_response = f"Executive Summary\n- Total fields analyzed: {len(records)}\n- Average NDVI: {summary_metrics['avg_ndvi']:.3f}\n\nRecommendations\n- Continue monitoring vegetation health\n- Optimize irrigation based on soil moisture"
        sections = [{"title": "Executive Summary", "items": [f"Total fields analyzed: {len(records)}", f"Average NDVI: {summary_metrics['avg_ndvi']:.3f}"]}]
        recommendations = [
            {
                'priority': 'HIGH',
                'title': 'Monitor Critical Fields',
                'description': 'Fields with NDVI below 0.3 require immediate attention',
                'actions': ['Schedule additional field inspection', 'Check irrigation systems', 'Verify soil moisture levels']
            },
            {
                'priority': 'MEDIUM',
                'title': 'Optimize Irrigation',
                'description': 'Adjust watering schedules based on moisture index readings',
                'actions': ['Review current irrigation schedule', 'Install additional moisture sensors', 'Implement zone-specific watering']
            },
            {
                'priority': 'LOW',
                'title': 'Maintain Healthy Areas',
                'description': 'Continue best practices in high-performing fields',
                'actions': ['Document successful practices', 'Share learnings with team', 'Maintain regular monitoring']
            }
        ]

    # Extract executive summary and highlights
    executive_summary = ""
    highlights = []
    
    for section in sections:
        if 'Executive' in section.get('title', ''):
            executive_summary = ' '.join(section.get('items', []))[:500]
        elif 'Finding' in section.get('title', '') or 'Key' in section.get('title', ''):
            highlights = section.get('items', [])[:3]

    if not executive_summary:
        executive_summary = f"This report analyzes {len(records)} agricultural fields across {len(set(r.get('place_name') for r in records))} locations. Overall NDVI is {summary_metrics['avg_ndvi']:.3f}, indicating {'healthy' if summary_metrics['avg_ndvi'] > 0.5 else 'moderate' if summary_metrics['avg_ndvi'] > 0.3 else 'poor'} vegetation health."
    
    if not highlights:
        highlights = [
            f"Average NDVI: {summary_metrics['avg_ndvi']:.3f}",
            f"Soil Health Score: {summary_metrics['avg_soil_health']:.1f}%",
            f"Crop Health Score: {summary_metrics['avg_crop_health']:.1f}%",
            f"Yield Potential: {summary_metrics['avg_yield']:.1f}%"
        ]

    # Generate detailed metric-based solutions (using fallback to avoid rate limits)
    detailed_metric_solutions = await generate_detailed_metric_solutions(records, summary_metrics)

    detailed_records = [{
        "place_name": r.get("place_name", "Unknown"),
        "datetime": r.get("datetime", "")[:10] if r.get("datetime") else "",
        "mean_ndvi": r.get("mean_ndvi"),
        "std_ndvi": r.get("std_ndvi"),
        "min_ndvi": r.get("min_ndvi"),
        "max_ndvi": r.get("max_ndvi"),
        "mean_savi": r.get("mean_savi"),
        "std_savi": r.get("std_savi"),
        "min_savi": r.get("min_savi"),
        "max_savi": r.get("max_savi"),
        "mean_evi": r.get("mean_evi"),
        "std_evi": r.get("std_evi"),
        "min_evi": r.get("min_evi"),
        "max_evi": r.get("max_evi"),
        "mean_gndvi": r.get("mean_gndvi"),
        "std_gndvi": r.get("std_gndvi"),
        "min_gndvi": r.get("min_gndvi"),
        "max_gndvi": r.get("max_gndvi"),
        "soil_health_score": r.get("soil_health_score"),
        "moisture_index": r.get("moisture_index"),
        "organic_matter": r.get("organic_matter"),
        "texture_score": r.get("texture_score"),
        "ph_level": r.get("ph_level"),
        "crop_health_score": r.get("crop_health_score"),
        "vigor_index": r.get("vigor_index"),
        "stress_level": r.get("stress_level"),
        "yield_potential": r.get("yield_potential"),
        "chlorophyll_content": r.get("chlorophyll_content"),
        "cloud_cover": r.get("cloud_cover"),
        "collection_size": r.get("collection_size"),
        "images": supabase_images.get(str(r.get("analysis_id")), {}),
    } for r in records[:50]]

    # Prepare data for template
    report_data = {
        "title": "Agricultural Field Analysis Report",
        "subtitle": f"{req.report_type.title()} Analysis Report",
        "report_type": req.report_type,
        "field_count": len(records),
        "locations": list({r.get("place_name") for r in records}),
        "generated_at": datetime.now().isoformat(),
        "executive_summary": executive_summary,
        "highlights": highlights,
        "metrics": summary_metrics,
        "ndvi_data": {
            "current": summary_metrics['avg_ndvi'],
            "previous": summary_metrics['avg_ndvi'] * 0.95,
            "trend": ndvi_trend if ndvi_trend else [0.35, 0.38, 0.42, 0.43, summary_metrics['avg_ndvi']]
        },
        "soil_data": {
            "health_score": summary_metrics['avg_soil_health'],
            "moisture": summary_metrics['avg_moisture'],
            "organic_matter": summary_metrics['avg_organic_matter'],
            "ph": summary_metrics['avg_ph']
        },
        "crop_data": {
            "health_score": summary_metrics['avg_crop_health'],
            "vigor_index": summary_metrics['avg_vigor'],
            "stress_level": summary_metrics['avg_stress']
        },
        "yield_data": {
            "potential": summary_metrics['avg_yield'],
            "forecast": "Above Average" if summary_metrics['avg_yield'] > 70 else "Average" if summary_metrics['avg_yield'] > 50 else "Below Average",
            "factors": ["Favorable growing conditions", "Optimal soil moisture", "Good vegetation health"]
        },
        "recommendations": recommendations,
        "detailed_metric_solutions": detailed_metric_solutions,
        "detailed_records": detailed_records,
        "sections": sections,
        "report_date": datetime.now().strftime('%B %d, %Y'),
        "organization": "Agricultural Intelligence System"
    }

    # Generate PDF using template system
    try:
        local_save_dir = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "generated_reports"
        )
        os.makedirs(local_save_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"agricultural_report_{timestamp}.pdf"
        local_path = os.path.join(local_save_dir, filename)

        pdf_generator = ProfessionalPDFReport(report_data)
        pdf_generator.generate(local_path)
        print(f"\n📄 PDF saved locally → {local_path}")

        def _iter_pdf():
            with open(local_path, "rb") as fh:
                yield from iter(lambda: fh.read(65536), b"")
            # File is intentionally kept on disk (local archive)

        return StreamingResponse(
            _iter_pdf(),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        print(f"❌ PDF generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@app.post("/agricultural/report/csv")
async def generate_csv_report(req: ReportRequest):
    """Generate CSV export of the report data"""
    print(f"\n📊 Generating CSV report...")
    
    if not neon_db.pool:
        raise HTTPException(status_code=503, detail="Neon DB not connected")

    string_ids = [str(id) for id in req.analysis_ids if id]
    if string_ids:
        records = await neon_db.get_analyses_by_ids(string_ids)
    else:
        records = await neon_db.get_all_analyses(limit=1000)

    if not records:
        raise HTTPException(status_code=404, detail="No field data found")

    # Create CSV in memory
    output = io.StringIO()
    if records:
        fieldnames = ['analysis_id', 'place_name', 'datetime', 'mean_ndvi', 'soil_health_score', 
                     'crop_health_score', 'yield_potential', 'moisture_index', 'organic_matter', 
                     'ph_level', 'stress_level', 'vigor_index', 'mean_savi', 'mean_evi', 'mean_gndvi']
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for record in records:
            row = {k: record.get(k, '') for k in fieldnames}
            writer.writerow(row)
    
    # Return CSV as downloadable response
    csv_content = output.getvalue()
    csv_bytes = io.BytesIO(csv_content.encode('utf-8'))
    
    return StreamingResponse(
        csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=agricultural_data_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 60)
    print("🌱 Agricultural Data API v7.0 - Professional PDF Reports")
    print("=" * 60)
    print(f"Neon DB    : {'✓ Configured' if NEON_DATABASE_URL else '✗ Not configured'}")
    print(f"Supabase   : {'✓ Configured' if SUPABASE_URL else '✗ Not configured'}")
    print(f"Together AI: {'✓ Configured' if TOGETHER_API_KEY else '✗ Not configured'}")
    print(f"Groq       : {'✓ Configured' if GROQ_API_KEY else '✗ Not configured'}")
    print("=" * 60)
    print("\n📍 Endpoints:")
    print("   POST /agricultural/report      - JSON Report Preview")
    print("   POST /agricultural/report/pdf  - Professional PDF Report")
    print("   POST /agricultural/report/csv  - CSV Data Export")
    print("   GET  /api/combined/all-data    - All Field Data")
    print("   GET  /api/combined/statistics  - Statistics")
    print("=" * 60 + "\n")

    uvicorn.run(app, host="127.0.0.1", port=8070, reload=False, log_level="info")