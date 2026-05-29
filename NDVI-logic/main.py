"""
main.py
-------
Application entry point.
Responsibilities:
  - Create FastAPI app + CORS middleware
  - Mount static files
  - Initialise Earth Engine, Supabase, Neon DB, Soil Model
  - Register all routers
  - Startup / shutdown lifecycle hooks
  - Uvicorn launch when run directly
"""

import os
import sys
import socket
import asyncio
from datetime import datetime

import ee
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Windows asyncio compatibility
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()

# -------------------------
# APP INITIALISATION
# -------------------------
app = FastAPI(
    title="NDVI Analysis & Soil Health System",
    description="Satellite-based vegetation analysis and soil health recommendation system",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static/ndvi", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# -------------------------
# EXTERNAL SERVICE INIT
# -------------------------

from core.utils import check_internet
import core.database as _db
from core.database import init_supabase_table, init_supabase_storage, neon_db
from core.soil_logic import ensure_soil_runtime, SOIL_MODEL

# Supabase — flags are set inside the init functions on the database module
init_supabase_table()
init_supabase_storage()
SUPABASE_INITIALIZED = _db.SUPABASE_INITIALIZED
STORAGE_INITIALIZED  = _db.STORAGE_INITIALIZED

# Earth Engine
EE_INITIALIZED = False
if check_internet():
    try:
        ee.Initialize(project=os.getenv('EE_PROJECT'))
        EE_INITIALIZED = True
        print("✓ Earth Engine initialized successfully")
    except ee.EEException:
        print("⚠️ Need to authenticate Earth Engine")
    except Exception as e:
        print(f"Earth Engine error: {e}")
else:
    print("⚠️ Running in offline mode - Earth Engine disabled")

# Push resolved flags into router modules so they read the correct values
import core.routes_ndvi as _rn
import core.routes_misc as _rm
_rn.EE_INITIALIZED      = EE_INITIALIZED
_rn.STORAGE_INITIALIZED = STORAGE_INITIALIZED
_rm.EE_INITIALIZED      = EE_INITIALIZED
_rm.STORAGE_INITIALIZED = STORAGE_INITIALIZED
_rm.SUPABASE_INITIALIZED = SUPABASE_INITIALIZED
_rm.SERVER_START_TIME   = datetime.now()

# -------------------------
# REGISTER ROUTERS
# -------------------------
from core.routes_ndvi import router as ndvi_router
from core.routes_soil import router as soil_router
from core.routes_misc import router as misc_router

app.include_router(ndvi_router)
app.include_router(soil_router)
app.include_router(misc_router)

# -------------------------
# LIFECYCLE HOOKS
# -------------------------

@app.on_event("startup")
async def startup_event():
    print("\n🚀 Starting up Combined NDVI & Soil Health System...")
    neon_ok = await neon_db.initialize()
    if neon_ok:
        print("✅ Neon DB ready")
    else:
        print("⚠️ Neon DB not available")

    ensure_soil_runtime()
    from core.soil_logic import SOIL_MODEL as _sm
    _rm.SOIL_MODEL = _sm
    if _sm:
        print("✅ Soil Health model loaded")
    else:
        print("⚠️ Soil Health model not loaded")


@app.on_event("shutdown")
async def shutdown_event():
    print("\n🛑 Shutting down...")
    await neon_db.close()


# -------------------------
# MAIN ENTRY POINT
# -------------------------
if __name__ == "__main__":
    import uvicorn

    def get_local_ip() -> str:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"

    local_ip = get_local_ip()

    ensure_soil_runtime()
    from core.soil_logic import SOIL_MODEL as _sm_final

    print("\n" + "=" * 60)
    print("🌱 NDVI Analysis System with Soil Health Advisor")
    print("=" * 60)
    print(f"Earth Engine:         {'✓' if EE_INITIALIZED else '✗'}")
    print(f"Supabase DB:          {'✓' if SUPABASE_INITIALIZED else '✗'}")
    print(f"Neon DB:              {'✓ (Numerical Data)' if os.getenv('DATABASE_URL') else '✗'}")
    print(f"Supabase Storage:     {'✓' if STORAGE_INITIALIZED else '✗'}")
    print(f"Soil Health Model:    {'✓' if _sm_final else '✗'}")
    print(f"Storage Mode:         {'☁️  Cloud' if STORAGE_INITIALIZED else '💾 Local'}")
    print(f"Filename Sanitization: ✅ Enabled (Converts non-English to ASCII)")
    print(f"Async Mode:           ✅ Enabled")
    print(f"Platform:             {sys.platform}")
    print("=" * 60)
    print("\n✨ SERVER STARTING...")
    print(f"\n📍 ACCESS:\n   → http://localhost:8000")
    print(f"   → http://127.0.0.1:8000")
    if local_ip != "127.0.0.1":
        print(f"   → http://{local_ip}:8000")
    print(f"\n📚 Docs:  http://localhost:8000/docs")
    print(f"💚 Health: http://localhost:8000/health_check")
    print("=" * 60 + "\n")

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info",
        access_log=True,
        workers=1,
        limit_concurrency=100,
        limit_max_requests=1000,
        timeout_keep_alive=5,
    )