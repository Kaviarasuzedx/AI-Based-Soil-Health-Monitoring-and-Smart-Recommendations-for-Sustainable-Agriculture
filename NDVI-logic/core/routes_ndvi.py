"""
routes_ndvi.py
--------------
FastAPI router for all NDVI / satellite-imagery endpoints:
  POST /get_ndvi
  GET  /get_color_palettes
  POST /download_all_images
"""

import os
import io
import json
import shutil
import tempfile
import zipfile
import asyncio
import aiohttp
import time
from datetime import datetime, timedelta

import ee
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from geopy.geocoders import Nominatim

from core.models import PolygonRequest, DownloadRequest
from core.constants import COLOR_PALETTES
from core.database import supabase, neon_db, SUPABASE_INITIALIZED
from core.ndvi_logic import (
    THREAD_POOL, CONNECTION_LIMIT,
    calculate_ndvi_statistics_optimized,
    calculate_savi_statistics_optimized,
    calculate_evi_statistics_optimized,
    calculate_gndvi_statistics_optimized,
    calculate_soil_health_metrics_async,
    calculate_crop_health_metrics_async,
    generate_ndvi_async, generate_rgb_async, generate_image_async,
    upload_image_to_supabase_async,
    get_health_recommendations,
    calculate_polygon_area, reduce_polygon_size,
)
from core.utils import sanitize_place_name

router = APIRouter()

geolocator = Nominatim(user_agent="ndvi_app")

STATIC_DIR = "static/ndvi"
os.makedirs(STATIC_DIR, exist_ok=True)

# Resolved at import time by main.py after EE init
EE_INITIALIZED       = False
STORAGE_INITIALIZED  = False


# -------------------------
# NDVI ANALYSIS
# -------------------------

@router.post("/get_ndvi")
async def get_ndvi(request: PolygonRequest):
    """Run the full NDVI pipeline for a user-drawn polygon."""
    start_time     = time.time()
    polygon_coords = request.polygon

    # Build EE polygon, clamp if too large
    try:
        polygon = ee.Geometry.Polygon([polygon_coords])
        bounds  = polygon.bounds().getInfo()['coordinates'][0]
        area    = calculate_polygon_area(bounds)
        if area > 0.25:
            polygon = reduce_polygon_size(polygon, target_area=0.1)
            print("[WARN] Reduced polygon size to ~0.1 sq degrees")
    except Exception as e:
        print(f"Error creating polygon: {e}")
        raise HTTPException(status_code=400, detail="Invalid polygon coordinates")

    loop = asyncio.get_event_loop()

    # Reverse-geocode the centroid
    try:
        center   = polygon.centroid().coordinates().getInfo()
        location = await loop.run_in_executor(
            THREAD_POOL,
            lambda: geolocator.reverse(f"{center[1]}, {center[0]}", timeout=5),
        )
        original_place_name = location.address.split(",")[0] if location else "Unknown_Area"
        place_name          = sanitize_place_name(original_place_name)
        if place_name != original_place_name:
            print(f"   Sanitized place name: '{original_place_name}' -> '{place_name}'")
    except Exception as e:
        print(f"Geocoding error: {e}")
        place_name          = f"location_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        original_place_name = place_name

    timestamp    = datetime.now().strftime("%Y_%m_%d_%H%M%S")
    display_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    temp_dir     = tempfile.mkdtemp()

    files = {
        idx.lower(): os.path.join(temp_dir, f"{place_name}_{timestamp}_{idx}.png")
        for idx in ['NDVI', 'RGB', 'SAVI', 'GNDVI', 'EVI', 'SOIL_HEALTH', 'CROP_HEALTH']
    }

    # Fetch Sentinel-2 collection
    try:
        end_date   = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")

        def _build_collection(cloud_pct):
            return (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(polygon)
                .filterDate(start_date, end_date)
                .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud_pct))
                .sort('CLOUDY_PIXEL_PERCENTAGE')
            )

        collection      = _build_collection(20)
        collection_size = collection.size().getInfo()

        if collection_size == 0:
            collection      = _build_collection(30)
            collection_size = collection.size().getInfo()

        if collection_size == 0:
            shutil.rmtree(temp_dir)
            return JSONResponse(content={"no_data": True, "message": "No cloud-free satellite imagery available."})

        image       = collection.first().clip(polygon)
        cloud_cover = image.get('CLOUDY_PIXEL_PERCENTAGE').getInfo() if collection_size > 0 else 100

    except Exception as e:
        print(f"Error getting image collection: {e}")
        shutil.rmtree(temp_dir)
        raise HTTPException(status_code=500, detail=f"Failed to get satellite imagery: {str(e)}")

    # Parallel metric calculations
    print("\n=== Calculating Health Metrics ===")
    (soil_metrics, crop_metrics,
     ndvi_stats, savi_stats, evi_stats, gndvi_stats) = await asyncio.gather(
        calculate_soil_health_metrics_async(image, polygon),
        calculate_crop_health_metrics_async(image, polygon),
        calculate_ndvi_statistics_optimized(image, polygon),
        calculate_savi_statistics_optimized(image, polygon),
        calculate_evi_statistics_optimized(image, polygon),
        calculate_gndvi_statistics_optimized(image, polygon),
    )

    # Sanity-check pH
    if soil_metrics.get('ph_level', 7.0) > 14:
        soil_metrics['ph_level'] = max(0, min(14, soil_metrics['ph_level'] / 100))
        print(f"[WARN] Corrected abnormal pH value to: {soil_metrics['ph_level']}")

    # Build index expressions
    savi_expr = image.expression(
        '((NIR - RED) / (NIR + RED + 0.5)) * (1 + 0.5)',
        {'NIR': image.select('B8'), 'RED': image.select('B4')},
    ).rename('SAVI')

    gndvi_expr = image.normalizedDifference(["B8", "B3"]).rename('GNDVI')

    evi_expr = image.expression(
        '2.5 * ((NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1))',
        {'NIR': image.select('B8'), 'RED': image.select('B4'), 'BLUE': image.select('B2')},
    ).rename('EVI')

    soil_health_expr = image.expression(
        '50 + ((((NIR - RED) / (NIR + RED + 0.5)) * (1 + 0.5)) * 50)',
        {'NIR': image.select('B8'), 'RED': image.select('B4')},
    ).rename('SOIL_HEALTH')

    crop_health_expr = image.expression(
        '50 + ((NIR - RED) / (NIR + RED) * 50)',
        {'NIR': image.select('B8'), 'RED': image.select('B4')},
    ).rename('CROP_HEALTH')

    # Parallel image generation
    print("\n=== Generating Images ===")
    connector = aiohttp.TCPConnector(limit=CONNECTION_LIMIT)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [
            generate_ndvi_async(image, polygon, files['ndvi'], session),
            generate_rgb_async(image, polygon, files['rgb'], session),
            generate_image_async(image, polygon, 'SAVI',        savi_expr,        files['savi'],        COLOR_PALETTES.get('SAVI'),        session),
            generate_image_async(image, polygon, 'GNDVI',       gndvi_expr,       files['gndvi'],       COLOR_PALETTES.get('GNDVI'),       session),
            generate_image_async(image, polygon, 'EVI',         evi_expr,         files['evi'],         COLOR_PALETTES.get('EVI'),         session),
            generate_image_async(image, polygon, 'SOIL_HEALTH', soil_health_expr, files['soil_health'], COLOR_PALETTES.get('SOIL_HEALTH'), session),
            generate_image_async(image, polygon, 'CROP_HEALTH', crop_health_expr, files['crop_health'], COLOR_PALETTES.get('CROP_HEALTH'), session),
        ]
        results_list = await asyncio.gather(*tasks, return_exceptions=True)

    results = {}
    errors  = []
    for result in results_list:
        if isinstance(result, Exception):
            errors.append(str(result))
        elif result:
            results.update(result)
        else:
            errors.append("Failed to generate image")

    # Upload to Supabase Storage (or fall back to local)
    print("\n=== Uploading to Supabase Cloud Storage ===")
    image_urls: dict = {}

    if STORAGE_INITIALIZED and results:
        upload_tasks  = []
        valid_results = []
        for img_type, local_path in results.items():
            if local_path and os.path.exists(local_path):
                upload_tasks.append(upload_image_to_supabase_async(local_path, supabase))
                valid_results.append((img_type, local_path))

        if upload_tasks:
            uploaded_urls = await asyncio.gather(*upload_tasks, return_exceptions=True)
            for (img_type, local_path), url in zip(valid_results, uploaded_urls):
                if isinstance(url, Exception) or not url:
                    perm = f"{STATIC_DIR}/{os.path.basename(local_path)}"
                    shutil.copy(local_path, perm)
                    image_urls[img_type] = f"/{perm}"
                    print(f"   [WARN] Local fallback for {img_type}: {image_urls[img_type]}")
                else:
                    image_urls[img_type] = url

        print(f"\n[OK] Processed {len(upload_tasks)} images with Supabase Cloud")
    else:
        print("[WARN] Storage not available, saving locally")
        for img_type, local_path in results.items():
            if local_path and os.path.exists(local_path):
                perm = f"{STATIC_DIR}/{os.path.basename(local_path)}"
                shutil.move(local_path, perm)
                image_urls[img_type] = f"/{perm}"

    try:
        shutil.rmtree(temp_dir)
        print("[CLEAN] Cleaned up temporary files")
    except Exception:
        pass

    # Persist to Supabase metadata table
    analysis_id = None
    if results and SUPABASE_INITIALIZED:
        try:
            analysis_data = {
                "place_name":         place_name,
                "datetime":           display_date,
                "timestamp":          timestamp,
                "ndvi_png":           image_urls.get('ndvi'),
                "ndvi_tif":           None,
                "polygon":            json.dumps(polygon_coords),
                "rgb_png":            image_urls.get('rgb'),
                "savi_png":           image_urls.get('savi'),
                "gndvi_png":          image_urls.get('gndvi'),
                "evi_png":            image_urls.get('evi'),
                "soil_health_png":    image_urls.get('soil_health'),
                "crop_health_png":    image_urls.get('crop_health'),
                "soil_health_score":  float(soil_metrics['soil_health_score']),
                "moisture_index":     float(soil_metrics['moisture_index']),
                "organic_matter":     float(soil_metrics['organic_matter']),
                "texture_score":      float(soil_metrics['texture_score']),
                "ph_level":           float(soil_metrics['ph_level']),
                "crop_health_score":  float(crop_metrics['crop_health_score']),
                "vigor_index":        float(crop_metrics['vigor_index']),
                "stress_level":       float(crop_metrics['stress_level']),
                "yield_potential":    float(crop_metrics['yield_potential']),
                "chlorophyll_content":float(crop_metrics['chlorophyll_content']),
            }
            response = await loop.run_in_executor(
                THREAD_POOL,
                lambda: supabase.table("ndvi_analyses_rag").insert(analysis_data).execute(),
            )
            if response.data:
                analysis_id = response.data[0]['id']
                print(f"\n[OK] Saved to Supabase! Analysis ID: {analysis_id}")
                results['analysis_id']   = analysis_id
                results['storage_mode']  = 'supabase_cloud' if STORAGE_INITIALIZED else 'local'
        except Exception as e:
            print(f"\n[ERROR] Supabase DB error: {e}")

    # Persist numerical data to Neon DB
    if analysis_id and neon_db.pool:
        try:
            neon_data = {
                'analysis_id':         analysis_id,
                'place_name':          place_name,
                'datetime':            display_date,
                'timestamp':           timestamp,
                **ndvi_stats,
                **savi_stats,
                **evi_stats,
                **gndvi_stats,
                'soil_health_score':   float(soil_metrics['soil_health_score']),
                'moisture_index':      float(soil_metrics['moisture_index']),
                'organic_matter':      float(soil_metrics['organic_matter']),
                'texture_score':       float(soil_metrics['texture_score']),
                'ph_level':            float(soil_metrics['ph_level']),
                'crop_health_score':   float(crop_metrics['crop_health_score']),
                'vigor_index':         float(crop_metrics['vigor_index']),
                'stress_level':        float(crop_metrics['stress_level']),
                'yield_potential':     float(crop_metrics['yield_potential']),
                'chlorophyll_content': float(crop_metrics['chlorophyll_content']),
                'polygon_coords':      polygon_coords,
                'cloud_cover':         cloud_cover,
                'collection_size':     collection_size,
            }
            neon_ok = await neon_db.store_analysis_data(neon_data)
            results['neon_db_stored'] = neon_ok
        except Exception as e:
            print(f"[ERROR] Error storing in Neon DB: {e}")
            results['neon_db_stored'] = False

    if errors:
        results['warnings'] = f"Failed to generate: {', '.join(errors)}"

    results['place']               = place_name
    results['original_place_name'] = original_place_name
    results['timestamp']           = display_date
    results['soil_metrics']        = soil_metrics
    results['crop_metrics']        = crop_metrics
    results['recommendations']     = get_health_recommendations(soil_metrics, crop_metrics)
    results['numerical_statistics']= {'ndvi': ndvi_stats, 'savi': savi_stats, 'evi': evi_stats, 'gndvi': gndvi_stats}
    results['color_info']          = {k: {'ranges': v['ranges']} for k, v in COLOR_PALETTES.items()}
    results['image_urls']          = image_urls

    print(f"\n[OK] Total processing time: {time.time() - start_time:.2f}s")
    return JSONResponse(content=results)


# -------------------------
# UTILITY ENDPOINTS
# -------------------------

@router.get("/get_color_palettes")
async def get_color_palettes():
    return JSONResponse(content=COLOR_PALETTES)


@router.post("/download_all_images")
async def download_all_images(request: DownloadRequest):
    try:
        image_paths = request.image_paths
        place_name  = sanitize_place_name(request.place_name)
        memory_file = io.BytesIO()

        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            readme = (
                f"NDVI Analysis Results\nLocation: {request.place_name}\nDate: {datetime.now()}\n\n"
                f"Images included:\n"
                + "\n".join(f"- {k}: {v}" for k, v in image_paths.items() if v)
                + "\n\nNote: Images from Supabase Cloud Storage or local fallback."
            )
            zf.writestr("README.txt", readme)

            async with aiohttp.ClientSession() as session:
                for key, path_or_url in image_paths.items():
                    if not path_or_url:
                        continue
                    try:
                        filename = f"{place_name}_{key}.png"
                        if path_or_url.startswith('http'):
                            async with session.get(path_or_url) as resp:
                                if resp.status == 200:
                                    zf.writestr(filename, await resp.read())
                                    print(f"[OK] Added: {filename}")
                        elif os.path.exists(path_or_url):
                            zf.writestr(filename, open(path_or_url, 'rb').read())
                        elif path_or_url.startswith('/') and os.path.exists(path_or_url[1:]):
                            zf.writestr(filename, open(path_or_url[1:], 'rb').read())
                        else:
                            print(f"[WARN] File not found: {path_or_url}")
                    except Exception as e:
                        print(f"[ERROR] Error adding {key}: {e}")

        memory_file.seek(0)
        safe = place_name.replace(' ', '_').replace('/', '_')
        zip_filename = f"ndvi_analysis_{safe}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"

        return FileResponse(memory_file, media_type='application/zip', filename=zip_filename)

    except Exception as e:
        print(f"Error creating zip: {e}")
        raise HTTPException(status_code=500, detail=str(e))