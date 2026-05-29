"""
routes_misc.py
--------------
FastAPI router for:
  - Neon DB RAG endpoints       (/rag/*)
  - Statistics / dashboard      (/api/statistics/*)
  - System health check         (/health_check)
  - DB schema debug             (/debug_db_schema)
"""

import os
import sys
import asyncio
from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from core.database import supabase, neon_db, SUPABASE_INITIALIZED
from core.ndvi_logic import THREAD_POOL, STATIC_DIR
from core.utils import check_internet, sizeof_fmt, count_files_in_dir, get_dir_size

router = APIRouter()

# These are set by main.py after initialisation
EE_INITIALIZED  = False
SOIL_MODEL      = None
SERVER_START_TIME = datetime.now()
STORAGE_INITIALIZED = False
CONNECTION_LIMIT = 20


def get_uptime() -> str:
    uptime = datetime.now() - SERVER_START_TIME
    days   = uptime.days
    hours, remainder = divmod(uptime.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if days > 0:    return f"{days}d {hours}h {minutes}m"
    if hours > 0:   return f"{hours}h {minutes}m"
    if minutes > 0: return f"{minutes}m {seconds}s"
    return f"{seconds}s"


# -------------------------
# NEON DB RAG ENDPOINTS
# -------------------------

# @router.get("/rag/analysis/{analysis_id}")
# async def get_analysis_for_rag(analysis_id: int):
#     if not neon_db.pool:
#         raise HTTPException(status_code=503, detail="Neon DB not available")
#     analysis = await neon_db.get_analysis_by_id(analysis_id)
#     if not analysis:
#         raise HTTPException(status_code=404, detail="Analysis not found")
#     return JSONResponse(content={'success': True, 'analysis': analysis})


# @router.get("/rag/recent")
# async def get_recent_analyses(limit: int = 10):
#     if not neon_db.pool:
#         raise HTTPException(status_code=503, detail="Neon DB not available")
#     analyses = await neon_db.get_recent_analyses(limit)
#     return JSONResponse(content={'success': True, 'count': len(analyses), 'analyses': analyses})


# @router.get("/rag/location/{location}")
# async def get_analyses_by_location(location: str, limit: int = 10):
#     if not neon_db.pool:
#         raise HTTPException(status_code=503, detail="Neon DB not available")
#     analyses = await neon_db.get_analyses_by_location(location, limit)
#     return JSONResponse(content={'success': True, 'count': len(analyses), 'analyses': analyses})


# @router.get("/rag/compare")
# async def compare_analyses(analysis_ids: str):
#     if not neon_db.pool:
#         raise HTTPException(status_code=503, detail="Neon DB not available")
#     ids      = [int(i.strip()) for i in analysis_ids.split(',')]
#     analyses = await neon_db.compare_analyses(ids)
#     return JSONResponse(content={'success': True, 'comparison': analyses})


# -------------------------
# STATISTICS ENDPOINTS
# -------------------------

@router.get("/api/statistics/dashboard")
async def api_statistics_dashboard():
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            THREAD_POOL,
            lambda: supabase.table("ndvi_analyses_rag").select(
                "id, place_name, datetime, ndvi_png, rgb_png, savi_png, gndvi_png, evi_png, ndvi_tif"
            ).execute(),
        )
        rows = response.data or []

        today       = datetime.now().strftime("%Y-%m-%d")
        week_start  = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        month_start = datetime.now().strftime("%Y-%m-01")

        total_analyses  = len(rows)
        today_analyses  = sum(1 for r in rows if r.get('datetime', '').startswith(today))
        week_analyses   = sum(1 for r in rows if r.get('datetime', '') >= week_start)
        month_analyses  = sum(1 for r in rows if r.get('datetime', '') >= month_start)
        unique_locations = len({
            r.get('place_name') for r in rows
            if r.get('place_name') and r.get('place_name') != 'Unknown_Area'
        })

        location_counts = Counter(
            r.get('place_name') for r in rows
            if r.get('place_name') and r.get('place_name') != 'Unknown_Area'
        )
        top_locations = [{'name': n, 'count': c} for n, c in location_counts.most_common(5)]

        file_stats = {
            'ndvi_images':   sum(1 for r in rows if r.get('ndvi_png')),
            'rgb_images':    sum(1 for r in rows if r.get('rgb_png')),
            'savi_images':   sum(1 for r in rows if r.get('savi_png')),
            'gndvi_images':  sum(1 for r in rows if r.get('gndvi_png')),
            'evi_images':    sum(1 for r in rows if r.get('evi_png')),
            'geotiff_files': sum(1 for r in rows if r.get('ndvi_tif')),
        }
        file_stats['total_images'] = sum(file_stats.values())

        daily_counts = Counter(r.get('datetime', '')[:10] for r in rows if r.get('datetime'))
        daily_trend  = [
            {'date': (datetime.now() - timedelta(days=6 - i)).strftime("%Y-%m-%d"),
             'count': daily_counts.get((datetime.now() - timedelta(days=6 - i)).strftime("%Y-%m-%d"), 0)}
            for i in range(7)
        ]

        system_info = {
            'database_status':   'connected' if SUPABASE_INITIALIZED else 'not_initialized',
            'database_count':    total_analyses,
            'static_dir_size':   get_dir_size(STATIC_DIR),
            'earth_engine_status': EE_INITIALIZED,
            'internet_status':   check_internet(),
            'server_time':       datetime.now().isoformat(),
            'uptime':            get_uptime(),
        }

        return JSONResponse(content={
            'success': True,
            'statistics': {
                'total_analyses':   total_analyses,
                'today_analyses':   today_analyses,
                'week_analyses':    week_analyses,
                'month_analyses':   month_analyses,
                'unique_locations': unique_locations,
                'top_locations':    top_locations,
                'file_stats':       file_stats,
                'daily_trend':      daily_trend,
                'system_info':      system_info,
            },
        })
    except Exception as e:
        print(f"Error getting dashboard statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/statistics/system_health")
async def api_system_health():
    try:
        loop = asyncio.get_event_loop()
        rows = await loop.run_in_executor(
            THREAD_POOL,
            lambda: supabase.table("ndvi_analyses_rag").select("id").execute(),
        )
        rows = rows.data or []

        from core.constants import CROP_DB, AMENDMENTS
        return JSONResponse(content={'success': True, 'health_check': {
            'application': {
                'status':       'running',
                'version':      '2.0.0-combined',
                'start_time':   SERVER_START_TIME.isoformat(),
                'uptime':       get_uptime(),
                'python_version': sys.version,
            },
            'database': {
                'supabase_status': 'connected' if SUPABASE_INITIALIZED else 'not_initialized',
                'neon_db_status':  'connected' if neon_db.pool else 'not_initialized',
                'record_count':    len(rows),
            },
            'soil_health': {
                'model_loaded':        SOIL_MODEL is not None,
                'crops_available':     len(CROP_DB),
                'amendments_available':len(AMENDMENTS),
            },
            'storage': {
                'static_dir':   STATIC_DIR,
                'exists':       os.path.exists(STATIC_DIR),
                'writable':     os.access(STATIC_DIR, os.W_OK),
                'size_bytes':   get_dir_size(STATIC_DIR),
                'size_human':   sizeof_fmt(get_dir_size(STATIC_DIR)),
                'file_count':   count_files_in_dir(STATIC_DIR),
            },
            'services': {
                'earth_engine': {'available': EE_INITIALIZED, 'status': 'online' if EE_INITIALIZED else 'offline'},
                'internet':     {'status': 'connected' if check_internet() else 'disconnected'},
            },
            'performance': {
                'thread_pool_workers':  8,
                'http_connection_limit': CONNECTION_LIMIT,
                'platform':             sys.platform,
            },
        }})
    except Exception as e:
        print(f"Error getting system health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/statistics/analyses_by_date")
async def api_analyses_by_date(period: str = 'week'):
    try:
        loop = asyncio.get_event_loop()
        rows = await loop.run_in_executor(
            THREAD_POOL,
            lambda: supabase.table("ndvi_analyses_rag").select("datetime").execute(),
        )
        rows   = rows.data or []
        period = period.lower()
        data   = []

        if period == 'week':
            counts = Counter(r.get('datetime', '')[:10] for r in rows if r.get('datetime'))
            for i in range(7):
                date = (datetime.now() - timedelta(days=6 - i)).strftime("%Y-%m-%d")
                data.append({'date': date, 'count': counts.get(date, 0)})
        elif period == 'month':
            counts  = Counter(r.get('datetime', '')[:7] for r in rows if r.get('datetime'))
            current = datetime.now()
            for i in range(12):
                month = (current.replace(day=1) - timedelta(days=i * 30)).strftime("%Y-%m")
                data.append({'period': month, 'count': counts.get(month, 0)})
        else:
            counts = Counter(r.get('datetime', '')[:4] for r in rows if r.get('datetime'))
            data   = [{'period': yr, 'count': counts[yr]} for yr in sorted(counts.keys())]

        return JSONResponse(content={'success': True, 'period': period, 'data': data})
    except Exception as e:
        print(f"Error getting analyses by date: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/statistics/location_distribution")
async def api_location_distribution():
    try:
        loop = asyncio.get_event_loop()
        rows = await loop.run_in_executor(
            THREAD_POOL,
            lambda: supabase.table("ndvi_analyses_rag").select("place_name").execute(),
        )
        rows   = rows.data or []
        counts = Counter(
            r.get('place_name') for r in rows
            if r.get('place_name') and r.get('place_name') != 'Unknown_Area'
        )
        top    = counts.most_common(10)
        data   = [{'name': n, 'count': c} for n, c in top]
        others = sum(c for n, c in counts.items() if n not in dict(top))
        if others > 0:
            data.append({'name': 'Other/Unknown', 'count': others})
        return JSONResponse(content={'success': True, 'data': data})
    except Exception as e:
        print(f"Error getting location distribution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------
# SYSTEM HEALTH / DEBUG
# -------------------------

@router.get("/health_check")
async def health_check():
    try:
        status = {
            'app':              'running',
            'version':          '2.0.0-combined',
            'earth_engine':     'initialized' if EE_INITIALIZED else 'not_initialized',
            'supabase_db':      'connected'   if SUPABASE_INITIALIZED else 'not_initialized',
            'neon_db':          'connected'   if neon_db.pool else 'not_initialized',
            'supabase_storage': 'connected'   if STORAGE_INITIALIZED else 'not_initialized',
            'soil_model':       'loaded'      if SOIL_MODEL else 'not_loaded',
            'storage_mode':     'Supabase Cloud Storage' if STORAGE_INITIALIZED else 'Local Fallback',
            'internet':         check_internet(),
            'timestamp':        datetime.now().isoformat(),
        }
        return JSONResponse(content={'success': True, 'status': status})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug_db_schema")
async def debug_db_schema():
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            THREAD_POOL,
            lambda: supabase.table("ndvi_analyses_rag").select("*").limit(1).execute(),
        )
        sample  = response.data[0] if response.data else None
        columns = list(sample.keys()) if sample else []
        return JSONResponse(content={
            'success':      True,
            'columns':      columns,
            'sample_record':sample,
            'column_count': len(columns),
            'record_count': len(response.data) if response.data else 0,
            'storage_mode': 'supabase_cloud' if STORAGE_INITIALIZED else 'local',
            'platform':     sys.platform,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
