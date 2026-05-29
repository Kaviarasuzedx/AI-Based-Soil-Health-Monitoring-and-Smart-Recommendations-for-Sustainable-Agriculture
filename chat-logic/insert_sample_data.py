import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from datetime import datetime
import random

load_dotenv()

async def insert_sample_data():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    
    # Sample field names
    fields = [
        "North Field", "South Field", "East Field", "West Field", 
        "Central Valley", "Riverside Farm", "Hilltop Acres", "Sunrise Ranch"
    ]
    
    for i, field in enumerate(fields, 1):
        # Generate realistic agricultural data
        ndvi = round(random.uniform(0.2, 0.8), 3)
        soil_health = round(random.uniform(30, 90), 1)
        moisture = round(random.uniform(0.2, 0.8), 3)
        
        await conn.execute("""
            INSERT INTO ndvi_analyses (
                analysis_id, place_name, datetime, timestamp,
                mean_ndvi, std_ndvi, min_ndvi, max_ndvi,
                mean_savi, mean_evi, mean_gndvi,
                soil_health_score, moisture_index, organic_matter, 
                texture_score, ph_level,
                crop_health_score, vigor_index, stress_level, 
                yield_potential, chlorophyll_content,
                cloud_cover, collection_size
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8,
                $9, $10, $11,
                $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21,
                $22, $23
            )
        """,
            i,  # analysis_id
            field,  # place_name
            datetime.now(),  # datetime
            datetime.now().isoformat(),  # timestamp
            ndvi,  # mean_ndvi
            round(ndvi * 0.1, 3),  # std_ndvi
            round(ndvi - 0.1, 3),  # min_ndvi
            round(ndvi + 0.1, 3),  # max_ndvi
            round(ndvi * 0.9, 3),  # mean_savi
            round(ndvi * 1.1, 3),  # mean_evi
            round(ndvi * 1.05, 3),  # mean_gndvi
            soil_health,  # soil_health_score
            moisture,  # moisture_index
            round(random.uniform(1.5, 4.5), 1),  # organic_matter
            round(random.uniform(40, 85), 1),  # texture_score
            round(random.uniform(5.5, 7.5), 1),  # ph_level
            round(soil_health * 0.9, 1),  # crop_health_score
            round(ndvi * 1.2, 3),  # vigor_index
            round((1 - ndvi) * 100, 1),  # stress_level
            round(ndvi * 100, 1),  # yield_potential
            round(ndvi * 50, 1),  # chlorophyll_content
            round(random.uniform(0, 30), 1),  # cloud_cover
            random.randint(1, 10)  # collection_size
        )
        print(f"✅ Inserted data for {field}")
    
    await conn.close()
    print("\n🎉 Sample data inserted successfully!")

if __name__ == "__main__":
    asyncio.run(insert_sample_data())