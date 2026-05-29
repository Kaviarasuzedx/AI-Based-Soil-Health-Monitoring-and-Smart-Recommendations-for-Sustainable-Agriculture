from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db
from rag import embed_analysis, remove_embedding, get_embedded_ids, get_embedding_count

router = APIRouter()

class EmbedSelectiveRequest(BaseModel):
    analysis_ids: List[int]

@router.get("/agricultural/data")
async def list_agricultural_data():
    """List all agricultural data from NeonDB"""
    try:
        print("\n" + "="*50)
        print("📊 FETCHING AGRICULTURAL DATA FROM NEONDB")
        print("="*50)
        
        query = """
            SELECT * FROM ndvi_analyses 
            ORDER BY datetime DESC 
            LIMIT 100
        """
        rows = await db.fetch(query)
        
        data = []
        for row in rows:
            data.append(dict(row))
        
        print(f"✅ Retrieved {len(data)} records from database")
        return {
            "success": True,
            "count": len(data),
            "data": data
        }
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agricultural/embed-selective")
async def embed_selective(request: EmbedSelectiveRequest):
    """Embed selected agricultural records"""
    try:
        print("\n" + "="*50)
        print(f"🧠 EMBEDDING {len(request.analysis_ids)} RECORDS")
        print("="*50)
        
        results = []
        for analysis_id in request.analysis_ids:
            print(f"\nProcessing ID: {analysis_id}")
            result = await embed_analysis(analysis_id)
            results.append(result)
        
        success_count = sum(1 for r in results if r['success'])
        
        print(f"\n✅ Successfully embedded: {success_count}/{len(request.analysis_ids)}")
        
        return {
            "success": True,
            "message": f"✅ Embedded {success_count}/{len(request.analysis_ids)} records",
            "results": results
        }
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agricultural/embed/{analysis_id}")
async def embed_single(analysis_id: int):
    """Embed a single agricultural record"""
    try:
        print(f"\n🧠 Embedding single record {analysis_id}...")
        result = await embed_analysis(analysis_id)
        return result
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/agricultural/embed/{analysis_id}")
async def delete_embedding(analysis_id: int):
    """Remove embedding for a record"""
    try:
        result = await remove_embedding(analysis_id)
        return result
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agricultural/embedded-ids")
async def get_embedded_ids_endpoint():
    """Get list of embedded analysis IDs"""
    try:
        ids = await get_embedded_ids()
        count = await get_embedding_count()
        print(f"📋 Embedded IDs: {ids} (Total: {count})")
        return {"embedded_ids": ids, "count": count}
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))