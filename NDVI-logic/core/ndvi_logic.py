"""
ndvi_logic.py
-------------
All Earth Engine computation helpers and async image-generation utilities:
  - Vegetation index statistics (NDVI, SAVI, EVI, GNDVI)
  - Soil health metrics
  - Crop health metrics
  - Async image download helpers (NDVI, RGB, generic index)
  - Health recommendation text generator
  - Supabase async image uploader
"""

import os
import asyncio
import aiohttp
import aiofiles
import traceback
import math
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor


import ee

from core.utils import normalize_value, sanitize_filename
from core.constants import COLOR_PALETTES
STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')
# -------------------------
# THREAD POOL (shared)
# -------------------------
THREAD_POOL = ThreadPoolExecutor(max_workers=8)

CONNECTION_LIMIT = 20
MAX_RETRIES      = 3
RETRY_DELAY      = 1


# -------------------------
# VEGETATION INDEX STATISTICS
# -------------------------

async def calculate_ndvi_statistics_optimized(image, polygon) -> dict:
    """Single Earth Engine call returning mean/std/min/max + histogram for NDVI."""
    try:
        nir  = image.select('B8')
        red  = image.select('B4')
        ndvi = nir.subtract(red).divide(nir.add(red)).rename('ndvi')

        reducers = (
            ee.Reducer.mean()
            .combine(reducer2=ee.Reducer.stdDev(), sharedInputs=True)
            .combine(reducer2=ee.Reducer.minMax(),  sharedInputs=True)
            .combine(reducer2=ee.Reducer.histogram(20), sharedInputs=True)
        )

        stats = ndvi.reduceRegion(
            reducer=reducers, geometry=polygon,
            scale=20, maxPixels=1e9, bestEffort=True, tileScale=4,
        ).getInfo()

        return {
            'mean_ndvi':      float(stats.get('ndvi_mean',   0) or 0),
            'std_ndvi':       float(stats.get('ndvi_stdDev', 0) or 0),
            'min_ndvi':       float(stats.get('ndvi_min',    0) or 0),
            'max_ndvi':       float(stats.get('ndvi_max',    0) or 0),
            'ndvi_histogram': stats.get('ndvi_histogram', {}),
        }
    except Exception as e:
        print(f"❌ NDVI stats error: {e}")
        return {'mean_ndvi': 0.0, 'std_ndvi': 0.0, 'min_ndvi': 0.0, 'max_ndvi': 0.0, 'ndvi_histogram': {}}


async def calculate_savi_statistics_optimized(image, polygon) -> dict:
    try:
        nir  = image.select('B8')
        red  = image.select('B4')
        savi = nir.subtract(red).divide(nir.add(red).add(0.5)).multiply(1.5).rename('savi')

        reducers = (
            ee.Reducer.mean()
            .combine(reducer2=ee.Reducer.stdDev(), sharedInputs=True)
            .combine(reducer2=ee.Reducer.minMax(),  sharedInputs=True)
        )
        stats = savi.reduceRegion(
            reducer=reducers, geometry=polygon,
            scale=20, maxPixels=1e9, bestEffort=True, tileScale=4,
        ).getInfo()

        return {
            'mean_savi': float(stats.get('savi_mean',   0) or 0),
            'std_savi':  float(stats.get('savi_stdDev', 0) or 0),
            'min_savi':  float(stats.get('savi_min',    0) or 0),
            'max_savi':  float(stats.get('savi_max',    0) or 0),
        }
    except Exception as e:
        print(f"❌ SAVI stats error: {e}")
        return {'mean_savi': 0.0, 'std_savi': 0.0, 'min_savi': 0.0, 'max_savi': 0.0}


async def calculate_evi_statistics_optimized(image, polygon) -> dict:
    try:
        nir  = image.select('B8')
        red  = image.select('B4')
        blue = image.select('B2')
        evi  = image.expression(
            '2.5 * ((NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1))',
            {'NIR': nir, 'RED': red, 'BLUE': blue},
        ).rename('evi')

        reducers = (
            ee.Reducer.mean()
            .combine(reducer2=ee.Reducer.stdDev(), sharedInputs=True)
            .combine(reducer2=ee.Reducer.minMax(),  sharedInputs=True)
        )
        stats = evi.reduceRegion(
            reducer=reducers, geometry=polygon,
            scale=20, maxPixels=1e9, bestEffort=True, tileScale=4,
        ).getInfo()

        return {
            'mean_evi': float(stats.get('evi_mean',   0) or 0),
            'std_evi':  float(stats.get('evi_stdDev', 0) or 0),
            'min_evi':  float(stats.get('evi_min',    0) or 0),
            'max_evi':  float(stats.get('evi_max',    0) or 0),
        }
    except Exception as e:
        print(f"❌ EVI stats error: {e}")
        return {'mean_evi': 0.0, 'std_evi': 0.0, 'min_evi': 0.0, 'max_evi': 0.0}


async def calculate_gndvi_statistics_optimized(image, polygon) -> dict:
    try:
        nir   = image.select('B8')
        green = image.select('B3')
        gndvi = nir.subtract(green).divide(nir.add(green)).rename('gndvi')

        reducers = (
            ee.Reducer.mean()
            .combine(reducer2=ee.Reducer.stdDev(), sharedInputs=True)
            .combine(reducer2=ee.Reducer.minMax(),  sharedInputs=True)
        )
        stats = gndvi.reduceRegion(
            reducer=reducers, geometry=polygon,
            scale=20, maxPixels=1e9, bestEffort=True, tileScale=4,
        ).getInfo()

        return {
            'mean_gndvi': float(stats.get('gndvi_mean',   0) or 0),
            'std_gndvi':  float(stats.get('gndvi_stdDev', 0) or 0),
            'min_gndvi':  float(stats.get('gndvi_min',    0) or 0),
            'max_gndvi':  float(stats.get('gndvi_max',    0) or 0),
        }
    except Exception as e:
        print(f"❌ GNDVI stats error: {e}")
        return {'mean_gndvi': 0.0, 'std_gndvi': 0.0, 'min_gndvi': 0.0, 'max_gndvi': 0.0}


# -------------------------
# SOIL HEALTH METRICS
# -------------------------

async def calculate_soil_health_metrics_async(image, polygon) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(THREAD_POOL, calculate_soil_health_metrics, image, polygon)


def calculate_soil_health_metrics(image, polygon) -> dict:
    try:
        print("Calculating soil health metrics...")
        nir   = image.select('B8')
        red   = image.select('B4')
        green = image.select('B3')
        blue  = image.select('B2')
        swir1 = image.select('B11')
        swir2 = image.select('B12')

        moisture_index = nir.subtract(swir1).divide(nir.add(swir1)).rename('moisture')
        brightness     = red.add(green).add(blue).divide(3)
        color_ratio    = red.divide(green.add(blue).divide(2).add(0.001))
        organic_matter = brightness.multiply(color_ratio).rename('organic_matter')
        texture_score  = swir1.subtract(swir2).divide(swir1.add(swir2).add(0.001)).rename('texture')
        ph_estimation  = red.divide(green.add(blue).divide(2).add(0.001)).rename('ph')
        savi           = nir.subtract(red).divide(nir.add(red).add(0.5)).multiply(1.5).rename('savi')

        def _mean(band_img, band_name):
            return band_img.reduceRegion(
                reducer=ee.Reducer.mean(), geometry=polygon, scale=30, maxPixels=1e9
            ).get(band_name)

        stats = ee.Dictionary({
            'moisture':     _mean(moisture_index, 'moisture'),
            'organic_matter': _mean(organic_matter, 'organic_matter'),
            'texture':      _mean(texture_score, 'texture'),
            'ph':           _mean(ph_estimation, 'ph'),
            'savi':         _mean(savi, 'savi'),
        }).getInfo()

        moisture_val = stats.get('moisture',      0.1) or 0.1
        organic_val  = stats.get('organic_matter',0.2) or 0.2
        texture_val  = stats.get('texture',       0.05) or 0.05
        ph_val       = stats.get('ph',            1.2) or 1.2
        savi_val     = stats.get('savi',          0.1) or 0.1

        moisture_norm = normalize_value(moisture_val, -0.3, 0.5) * 100
        organic_norm  = normalize_value(organic_val,   0,   0.8) * 100
        texture_norm  = normalize_value(texture_val, -0.2, 0.2) * 100
        ph_approx     = 6.0 + (ph_val - 0.8) * 2.5
        ph_norm       = max(0, min(100, 100 - abs(ph_approx - 7.0) * 20))
        soil_exposure = max(0, min(100, (0.3 - savi_val) * 333))

        soil_health_score = max(0, min(100,
            moisture_norm * 0.25 + organic_norm * 0.35 +
            texture_norm * 0.15 + ph_norm * 0.15 + soil_exposure * 0.10
        ))

        return {
            'soil_health_score': round(soil_health_score, 1),
            'moisture_index':    round(moisture_norm,     1),
            'organic_matter':    round(organic_norm,      1),
            'texture_score':     round(texture_norm,      1),
            'ph_level':          round(ph_approx,         1),
        }

    except Exception as e:
        print(f"❌ Error calculating soil metrics: {e}")
        traceback.print_exc()
        return {
            'soil_health_score': 50.0, 'moisture_index': 50.0,
            'organic_matter': 50.0, 'texture_score': 50.0, 'ph_level': 7.0,
        }


# -------------------------
# CROP HEALTH METRICS
# -------------------------

async def calculate_crop_health_metrics_async(image, polygon) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(THREAD_POOL, calculate_crop_health_metrics, image, polygon)


def calculate_crop_health_metrics(image, polygon) -> dict:
    try:
        print("Calculating crop health metrics...")
        nir   = image.select('B8')
        red   = image.select('B4')
        green = image.select('B3')
        blue  = image.select('B2')

        ndvi  = nir.subtract(red).divide(nir.add(red)).rename('ndvi')
        gndvi = nir.subtract(green).divide(nir.add(green)).rename('gndvi')
        evi   = image.expression(
            '2.5 * ((NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1))',
            {'NIR': nir, 'RED': red, 'BLUE': blue},
        ).rename('evi')

        try:
            red_edge = image.select('B5')
            ndre     = nir.subtract(red_edge).divide(nir.add(red_edge)).rename('ndre')
        except Exception:
            ndre = nir.subtract(red).divide(nir.add(red).add(0.1)).multiply(0.8).rename('ndre')

        stress_index = image.expression(
            '1.0 - (0.7*NDVI + 0.3*GNDVI)', {'NDVI': ndvi, 'GNDVI': gndvi}
        ).rename('stress')

        def _mean(band_img, band_name):
            return band_img.reduceRegion(
                reducer=ee.Reducer.mean(), geometry=polygon, scale=20, maxPixels=1e9
            ).get(band_name)

        stats = ee.Dictionary({
            'ndvi':   _mean(ndvi,         'ndvi'),
            'gndvi':  _mean(gndvi,        'gndvi'),
            'evi':    _mean(evi,          'evi'),
            'ndre':   _mean(ndre,         'ndre'),
            'stress': _mean(stress_index, 'stress'),
        }).getInfo()

        ndvi_val   = stats.get('ndvi',   0.3)  or 0.3
        gndvi_val  = stats.get('gndvi',  0.2)  or 0.2
        evi_val    = stats.get('evi',    0.2)  or 0.2
        ndre_val   = stats.get('ndre',   0.15) or 0.15
        stress_val = stats.get('stress', 0.5)  or 0.5

        vigor_index      = max(0, min(100, (ndvi_val  + 0.3)                   * 100))
        chlorophyll      = max(0, min(100, (gndvi_val * 0.7 + ndre_val * 0.3)  * 100))
        stress_level     = max(0, min(100, stress_val                           * 100))
        canopy_structure = max(0, min(100, (evi_val   + 0.2)                   * 100))

        yield_potential = (
            vigor_index * 0.30 + chlorophyll * 0.25 +
            canopy_structure * 0.25 + (100 - stress_level) * 0.20
        )
        crop_health_score = max(0, min(100,
            vigor_index * 0.25 + chlorophyll * 0.25 +
            canopy_structure * 0.20 + (100 - stress_level) * 0.20 +
            yield_potential * 0.10
        ))

        return {
            'crop_health_score':  round(crop_health_score, 1),
            'vigor_index':        round(vigor_index,       1),
            'chlorophyll_content':round(chlorophyll,       1),
            'stress_level':       round(stress_level,      1),
            'yield_potential':    round(yield_potential,   1),
        }

    except Exception as e:
        print(f"❌ Error calculating crop metrics: {e}")
        traceback.print_exc()
        return {
            'crop_health_score': 50.0, 'vigor_index': 50.0,
            'chlorophyll_content': 50.0, 'stress_level': 50.0, 'yield_potential': 50.0,
        }


# -------------------------
# ASYNC IMAGE GENERATION
# -------------------------

async def generate_image_async(image, polygon, index_name, index_expr, filepath, palette_info=None, session=None):
    """Download a single vegetation index thumbnail from Earth Engine."""
    try:
        thumb_params = {"region": polygon, "dimensions": 350, "format": "png"}
        if palette_info:
            thumb_params.update({
                "min": palette_info['min'],
                "max": palette_info['max'],
                "palette": palette_info['palette'],
            })

        loop = asyncio.get_event_loop()
        url  = await loop.run_in_executor(THREAD_POOL, lambda: index_expr.getThumbURL(thumb_params))

        for attempt in range(MAX_RETRIES):
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
                    if resp.status == 200:
                        content = await resp.read()
                        async with aiofiles.open(filepath, "wb") as f:
                            await f.write(content)
                        return {index_name.lower(): filepath}
                    if attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                    else:
                        print(f"Failed to generate {index_name}: HTTP {resp.status}")
                        return None
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                else:
                    print(f"Error generating {index_name}: {e}")
                    return None
        return None
    except Exception as e:
        print(f"Error generating {index_name}: {e}")
        return None


async def generate_ndvi_async(image, polygon, filepath, session):
    """Download the NDVI colour-mapped thumbnail."""
    try:
        loop = asyncio.get_event_loop()
        nir       = image.select("B8")
        red       = image.select("B4")
        ndvi_raw  = nir.subtract(red).divide(nir.add(red)).rename("NDVI")
        ndvi_clip = ndvi_raw.max(0).rename("NDVI")

        thumb_params = {
            "region": polygon, "dimensions": 350, "format": "png",
            "min": COLOR_PALETTES['NDVI']['min'],
            "max": COLOR_PALETTES['NDVI']['max'],
            "palette": COLOR_PALETTES['NDVI']['palette'],
        }
        url = await loop.run_in_executor(THREAD_POOL, lambda: ndvi_clip.getThumbURL(thumb_params))

        async with session.get(url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            if resp.status == 200:
                content = await resp.read()
                async with aiofiles.open(filepath, "wb") as f:
                    await f.write(content)
                return {"ndvi": filepath}
        return None
    except Exception as e:
        print(f"NDVI generation error: {e}")
        return None


async def generate_rgb_async(image, polygon, filepath, session):
    """Download a natural-colour (RGB) thumbnail."""
    try:
        loop = asyncio.get_event_loop()
        rgb_params = {
            'region': polygon, 'dimensions': 350, 'format': 'png',
            'bands': ['B4', 'B3', 'B2'],
            'min': 0, 'max': 3000, 'gamma': 1.4,
        }
        url = await loop.run_in_executor(THREAD_POOL, lambda: image.getThumbURL(rgb_params))

        async with session.get(url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            if resp.status == 200:
                content = await resp.read()
                async with aiofiles.open(filepath, "wb") as f:
                    await f.write(content)
                return {"rgb": filepath}
        return None
    except Exception as e:
        print(f"RGB generation error: {e}")
        return None


# -------------------------
# SUPABASE IMAGE UPLOAD
# -------------------------

async def upload_image_to_supabase_async(filepath, supabase_client, bucket_name="ndvi-images"):
    """Async upload of a local image to Supabase Storage. Returns public URL or None."""
    try:
        if not os.path.exists(filepath):
            return None

        original_filename = os.path.basename(filepath)
        sanitized_filename = sanitize_filename(original_filename)
        print(f"   📤 Uploading: {sanitized_filename}")

        async with aiofiles.open(filepath, "rb") as f:
            file_content = await f.read()

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            THREAD_POOL,
            lambda: supabase_client.storage.from_(bucket_name).upload(
                sanitized_filename, file_content, {"content-type": "image/png"}
            ),
        )
        public_url = supabase_client.storage.from_(bucket_name).get_public_url(sanitized_filename)
        print(f"   ✓ Uploaded: {sanitized_filename}")
        return public_url

    except Exception as e:
        print(f"   ❌ Upload error: {e}")
        return None


# -------------------------
# HEALTH RECOMMENDATION TEXT
# -------------------------

def get_health_recommendations(soil_metrics: dict, crop_metrics: dict) -> list:
    """Return a list of human-readable recommendation strings."""
    recommendations = []

    soil_score = soil_metrics.get('soil_health_score', 50)
    moisture   = soil_metrics.get('moisture_index',    50)
    organic    = soil_metrics.get('organic_matter',    50)
    ph         = soil_metrics.get('ph_level',          7.0)

    if soil_score < 40:
        recommendations.append("🚨 **Urgent Soil Improvement Needed**: Soil health is critically low.")
    elif soil_score < 60:
        recommendations.append("⚠️ **Soil Improvement Recommended**: Soil health is below optimal.")

    if moisture < 30:
        recommendations.append("💧 **Low Soil Moisture**: Consider irrigation.")
    elif moisture > 80:
        recommendations.append("🌧️ **High Soil Moisture**: Ensure proper drainage.")

    if organic < 40:
        recommendations.append("🌱 **Low Organic Matter**: Add compost or manure.")

    if ph < 6.0:
        recommendations.append("🧪 **Acidic Soil**: Consider adding lime.")
    elif ph > 7.5:
        recommendations.append("🧪 **Alkaline Soil**: Consider adding sulfur.")

    crop_score = crop_metrics.get('crop_health_score', 50)
    if crop_score < 40:
        recommendations.append("🚨 **Critical Crop Health**: Immediate intervention needed.")
    elif crop_score < 60:
        recommendations.append("⚠️ **Moderate Crop Stress**: Monitor closely.")

    if not recommendations:
        recommendations.append("✅ **Good overall conditions**: Continue current practices.")

    return recommendations


# -------------------------
# POLYGON HELPERS
# -------------------------

def calculate_polygon_area(bounds) -> float:
    min_lon, max_lon = bounds[0][0], bounds[2][0]
    min_lat, max_lat = bounds[0][1], bounds[2][1]
    return abs(max_lon - min_lon) * abs(max_lat - min_lat)


def reduce_polygon_size(polygon, target_area: float = 0.1):
    """Return a smaller square polygon centred on the original."""
    center = polygon.centroid().coordinates().getInfo()
    radius = math.sqrt(target_area) / 2
    smaller_coords = [
        [center[0] - radius, center[1] - radius],
        [center[0] + radius, center[1] - radius],
        [center[0] + radius, center[1] + radius],
        [center[0] - radius, center[1] + radius],
        [center[0] - radius, center[1] - radius],
    ]
    return ee.Geometry.Polygon(smaller_coords)
