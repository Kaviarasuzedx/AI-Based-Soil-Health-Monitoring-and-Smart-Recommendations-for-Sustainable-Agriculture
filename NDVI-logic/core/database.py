"""
database.py
-----------
Database layer:
  - Supabase client (metadata + cloud storage)
  - NeonDBManager (asyncpg connection pool for numerical time-series data)
  - Startup helpers: init_supabase_table(), init_supabase_storage()
"""

import os
import asyncio
import asyncpg
import json
import traceback
from datetime import datetime
from typing import List, Dict, Any

from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# -------------------------
# SUPABASE
# -------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL1")
SUPABASE_KEY = os.getenv("SUPABASE_KEY1")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Module-level flags — set to True by init_* functions when successful.
# Imported by main.py, routes_ndvi.py, routes_misc.py.
SUPABASE_INITIALIZED: bool = False
STORAGE_INITIALIZED: bool  = False


def init_supabase_table() -> bool:
    """Verify the ndvi_analyses_rag table is reachable."""
    global SUPABASE_INITIALIZED
    try:
        supabase.table("ndvi_analyses_rag").select("id").limit(1).execute()
        print("✓ Connected to Supabase ndvi_analyses_rag table")
        SUPABASE_INITIALIZED = True
        return True
    except Exception as e:
        print(f"❌ Error accessing Supabase table: {e}")
        return False


def init_supabase_storage() -> bool:
    """Ensure the 'ndvi-images' bucket exists and is public."""
    global STORAGE_INITIALIZED
    try:
        print("\n🔧 Initializing Supabase Storage...")
        buckets = supabase.storage.list_buckets()
        bucket_exists = any(b.name == "ndvi-images" for b in buckets)

        if not bucket_exists:
            print("   📦 Creating 'ndvi-images' bucket...")
            try:
                supabase.storage.create_bucket("ndvi-images", {"public": True})
                print("   ✓ Bucket created successfully!")
            except Exception as create_error:
                print(f"   ❌ Could not create bucket: {create_error}")
                return False
        else:
            print("   ✓ Found 'ndvi-images' bucket")
            try:
                supabase.storage.update_bucket("ndvi-images", {"public": True})
                print("   ✓ Bucket is public")
            except Exception:
                pass

        print("✅ Supabase Storage ready!\n")
        STORAGE_INITIALIZED = True
        return True

    except Exception as e:
        print(f"❌ Storage initialization error: {e}")
        return False


# -------------------------
# NEON DB
# -------------------------

NEON_DATABASE_URL = os.getenv("DATABASE_URL")


class NeonDBManager:
    """Async connection pool manager for the Neon PostgreSQL database."""

    def __init__(self):
        self.pool = None

    async def initialize(self) -> bool:
        """Create the asyncpg connection pool and ensure the table exists."""
        try:
            self.pool = await asyncpg.create_pool(
                NEON_DATABASE_URL,
                min_size=2,
                max_size=10,
                command_timeout=60,
            )
            print("✓ Neon DB connection pool created")
            await self.create_table_if_not_exists()
            return True
        except Exception as e:
            print(f"❌ Neon DB connection failed: {e}")
            return False

    async def create_table_if_not_exists(self):
        """DDL – create ndvi_analyses table and indexes when missing."""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS ndvi_analyses (
                    id                 SERIAL PRIMARY KEY,
                    analysis_id        INTEGER UNIQUE,
                    place_name         TEXT,
                    datetime           TIMESTAMP,
                    timestamp          TEXT,
                    mean_ndvi          FLOAT,
                    std_ndvi           FLOAT,
                    min_ndvi           FLOAT,
                    max_ndvi           FLOAT,
                    ndvi_histogram     JSONB,
                    mean_savi          FLOAT,
                    std_savi           FLOAT,
                    min_savi           FLOAT,
                    max_savi           FLOAT,
                    mean_evi           FLOAT,
                    std_evi            FLOAT,
                    min_evi            FLOAT,
                    max_evi            FLOAT,
                    mean_gndvi         FLOAT,
                    std_gndvi          FLOAT,
                    min_gndvi          FLOAT,
                    max_gndvi          FLOAT,
                    soil_health_score  FLOAT,
                    moisture_index     FLOAT,
                    organic_matter     FLOAT,
                    texture_score      FLOAT,
                    ph_level           FLOAT,
                    crop_health_score  FLOAT,
                    vigor_index        FLOAT,
                    stress_level       FLOAT,
                    yield_potential    FLOAT,
                    chlorophyll_content FLOAT,
                    polygon_coords     JSONB,
                    cloud_cover        FLOAT,
                    collection_size    INTEGER,
                    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            for idx_sql in [
                "CREATE INDEX IF NOT EXISTS idx_ndvi_analyses_analysis_id ON ndvi_analyses(analysis_id)",
                "CREATE INDEX IF NOT EXISTS idx_ndvi_analyses_place_name   ON ndvi_analyses(place_name)",
                "CREATE INDEX IF NOT EXISTS idx_ndvi_analyses_datetime      ON ndvi_analyses(datetime DESC)",
            ]:
                await conn.execute(idx_sql)
            print("✓ Neon DB table 'ndvi_analyses' is ready")

    async def store_analysis_data(self, analysis_data: dict) -> bool:
        """Upsert a vegetation analysis record."""
        try:
            async with self.pool.acquire() as conn:
                # Normalise datetime
                dt_str = analysis_data.get('datetime')
                if isinstance(dt_str, str):
                    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f"):
                        try:
                            dt_obj = datetime.strptime(dt_str, fmt)
                            break
                        except ValueError:
                            dt_obj = datetime.now()
                else:
                    dt_obj = dt_str or datetime.now()

                ndvi_histogram_json = json.dumps(analysis_data.get('ndvi_histogram', {}))
                polygon_json = json.dumps(analysis_data.get('polygon_coords', []))

                query = """
                INSERT INTO ndvi_analyses (
                    analysis_id, place_name, datetime, timestamp,
                    mean_ndvi, std_ndvi, min_ndvi, max_ndvi, ndvi_histogram,
                    mean_savi, std_savi, min_savi, max_savi,
                    mean_evi, std_evi, min_evi, max_evi,
                    mean_gndvi, std_gndvi, min_gndvi, max_gndvi,
                    soil_health_score, moisture_index, organic_matter,
                    texture_score, ph_level,
                    crop_health_score, vigor_index, stress_level,
                    yield_potential, chlorophyll_content,
                    polygon_coords, cloud_cover, collection_size
                ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,
                    $10,$11,$12,$13,$14,$15,$16,$17,
                    $18,$19,$20,$21,$22,$23,$24,$25,
                    $26,$27,$28,$29,$30,$31,$32,$33,$34
                )
                ON CONFLICT (analysis_id) DO UPDATE SET
                    mean_ndvi=EXCLUDED.mean_ndvi, std_ndvi=EXCLUDED.std_ndvi,
                    min_ndvi=EXCLUDED.min_ndvi,   max_ndvi=EXCLUDED.max_ndvi,
                    ndvi_histogram=EXCLUDED.ndvi_histogram,
                    mean_savi=EXCLUDED.mean_savi,  std_savi=EXCLUDED.std_savi,
                    min_savi=EXCLUDED.min_savi,    max_savi=EXCLUDED.max_savi,
                    mean_evi=EXCLUDED.mean_evi,    std_evi=EXCLUDED.std_evi,
                    min_evi=EXCLUDED.min_evi,      max_evi=EXCLUDED.max_evi,
                    mean_gndvi=EXCLUDED.mean_gndvi, std_gndvi=EXCLUDED.std_gndvi,
                    min_gndvi=EXCLUDED.min_gndvi,  max_gndvi=EXCLUDED.max_gndvi,
                    soil_health_score=EXCLUDED.soil_health_score,
                    moisture_index=EXCLUDED.moisture_index,
                    organic_matter=EXCLUDED.organic_matter,
                    texture_score=EXCLUDED.texture_score,
                    ph_level=EXCLUDED.ph_level,
                    crop_health_score=EXCLUDED.crop_health_score,
                    vigor_index=EXCLUDED.vigor_index,
                    stress_level=EXCLUDED.stress_level,
                    yield_potential=EXCLUDED.yield_potential,
                    chlorophyll_content=EXCLUDED.chlorophyll_content,
                    polygon_coords=EXCLUDED.polygon_coords,
                    cloud_cover=EXCLUDED.cloud_cover,
                    collection_size=EXCLUDED.collection_size,
                    updated_at=NOW()
                """

                g = analysis_data.get
                await conn.execute(
                    query,
                    g('analysis_id'), g('place_name'), dt_obj, g('timestamp'),
                    float(g('mean_ndvi', 0)),  float(g('std_ndvi', 0)),
                    float(g('min_ndvi', 0)),   float(g('max_ndvi', 0)),
                    ndvi_histogram_json,
                    float(g('mean_savi', 0)),  float(g('std_savi', 0)),
                    float(g('min_savi', 0)),   float(g('max_savi', 0)),
                    float(g('mean_evi', 0)),   float(g('std_evi', 0)),
                    float(g('min_evi', 0)),    float(g('max_evi', 0)),
                    float(g('mean_gndvi', 0)), float(g('std_gndvi', 0)),
                    float(g('min_gndvi', 0)),  float(g('max_gndvi', 0)),
                    float(g('soil_health_score', 50)),
                    float(g('moisture_index', 50)),
                    float(g('organic_matter', 50)),
                    float(g('texture_score', 50)),
                    float(g('ph_level', 7.0)),
                    float(g('crop_health_score', 50)),
                    float(g('vigor_index', 50)),
                    float(g('stress_level', 50)),
                    float(g('yield_potential', 50)),
                    float(g('chlorophyll_content', 50)),
                    polygon_json,
                    float(g('cloud_cover', 0)) if g('cloud_cover') else None,
                    int(g('collection_size', 0)) if g('collection_size') else None,
                )
                print(f"✓ Stored analysis {g('analysis_id')} in Neon DB")
                return True

        except Exception as e:
            print(f"❌ Neon DB store error: {e}")
            traceback.print_exc()
            return False

    async def get_analysis_by_id(self, analysis_id: int) -> dict | None:
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM ndvi_analyses WHERE analysis_id = $1", analysis_id
                )
                return dict(row) if row else None
        except Exception as e:
            print(f"❌ Neon DB retrieve error: {e}")
            return None

    async def get_recent_analyses(self, limit: int = 10) -> List[dict]:
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM ndvi_analyses ORDER BY datetime DESC LIMIT $1", limit
                )
                return [dict(r) for r in rows]
        except Exception as e:
            print(f"❌ Neon DB retrieve error: {e}")
            return []

    async def get_analyses_by_location(self, location: str, limit: int = 10) -> List[dict]:
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM ndvi_analyses WHERE place_name ILIKE $1 ORDER BY datetime DESC LIMIT $2",
                    f"%{location}%", limit,
                )
                return [dict(r) for r in rows]
        except Exception as e:
            print(f"❌ Neon DB retrieve error: {e}")
            return []

    async def compare_analyses(self, analysis_ids: List[int]) -> List[dict]:
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM ndvi_analyses WHERE analysis_id = ANY($1) ORDER BY datetime DESC",
                    analysis_ids,
                )
                return [dict(r) for r in rows]
        except Exception as e:
            print(f"❌ Neon DB compare error: {e}")
            return []

    async def close(self):
        if self.pool:
            await self.pool.close()
            print("✓ Neon DB connection pool closed")


# Module-level singleton – imported by routes and main
neon_db = NeonDBManager()