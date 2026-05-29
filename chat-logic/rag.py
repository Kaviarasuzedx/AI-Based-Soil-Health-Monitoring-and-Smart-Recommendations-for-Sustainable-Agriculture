import os
from typing import List, Dict, Any, Tuple
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Global embedding store
embedding_store: Dict[str, Dict[str, Any]] = {}

async def generate_embedding_text(record: Dict[str, Any]) -> str:
    """Convert database record to detailed text for embedding"""
    return f"""
FIELD DATA REPORT
=================
Field Name: {record.get('place_name', 'Unknown')}
Analysis Date: {record.get('datetime', 'Unknown')}

VEGETATION INDICES:
- NDVI (Normalized Difference Vegetation Index): {record.get('mean_ndvi', 'N/A')}
  * Range: Min {record.get('min_ndvi', 'N/A')} to Max {record.get('max_ndvi', 'N/A')}
  * Standard Deviation: {record.get('std_ndvi', 'N/A')}
  * Interpretation: {interpret_ndvi(record.get('mean_ndvi', 0))}
- SAVI (Soil Adjusted Vegetation Index): {record.get('mean_savi', 'N/A')}
- EVI (Enhanced Vegetation Index): {record.get('mean_evi', 'N/A')}
- GNDVI (Green NDVI for chlorophyll): {record.get('mean_gndvi', 'N/A')}

SOIL HEALTH METRICS:
- Overall Soil Health Score: {record.get('soil_health_score', 'N/A')}/100
  * Status: {interpret_soil_health(record.get('soil_health_score', 0))}
- Moisture Index: {record.get('moisture_index', 'N/A')}
  * Status: {interpret_moisture(record.get('moisture_index', 0))}
- Organic Matter: {record.get('organic_matter', 'N/A')}%
  * Optimal range: 3.5-5.5%
- pH Level: {record.get('ph_level', 'N/A')}
  * Optimal range: 6.0-7.0
- Texture Score: {record.get('texture_score', 'N/A')}/100

CROP HEALTH METRICS:
- Crop Health Score: {record.get('crop_health_score', 'N/A')}/100
  * Status: {interpret_crop_health(record.get('crop_health_score', 0))}
- Vigor Index: {record.get('vigor_index', 'N/A')}
- Stress Level: {record.get('stress_level', 'N/A')}
  * Status: {interpret_stress(record.get('stress_level', 0))}
- Yield Potential: {record.get('yield_potential', 'N/A')} t/ha
- Chlorophyll Content: {record.get('chlorophyll_content', 'N/A')} µg/cm²
"""

def interpret_ndvi(value):
    if value is None: return "No data"
    if value < 0.2: return "Barren/Stressed - Critical attention needed"
    if value < 0.4: return "Unhealthy/Sparse - Improvement needed"
    if value < 0.6: return "Moderate Health - Monitor closely"
    return "Excellent Health - Optimal conditions"

def interpret_soil_health(value):
    if value is None: return "No data"
    if value < 40: return "Poor - Immediate soil management needed"
    if value < 70: return "Moderate - Room for improvement"
    return "Good - Healthy soil conditions"

def interpret_moisture(value):
    if value is None: return "No data"
    if value < 0.3: return "Drought Stress - Urgent irrigation needed"
    if value < 0.6: return "Moderate - Schedule irrigation soon"
    return "Adequate - Good moisture levels"

def interpret_crop_health(value):
    if value is None: return "No data"
    if value < 40: return "Poor - Crop failure risk"
    if value < 70: return "Moderate - Needs attention"
    return "Excellent - Thriving crop"

def interpret_stress(value):
    if value is None: return "No data"
    if value > 60: return "High stress - Immediate intervention required"
    if value > 30: return "Moderate stress - Monitor closely"
    return "Low stress - Healthy plants"

async def embed_analysis(analysis_id: int) -> Dict[str, Any]:
    """Embed a single analysis record from NeonDB"""
    try:
        from database import db
        
        print(f"📊 Fetching analysis {analysis_id} from NeonDB...")
        
        query = "SELECT * FROM ndvi_analyses WHERE analysis_id = $1 LIMIT 1"
        record = await db.fetchrow(query, analysis_id)
        
        if not record:
            return {'success': False, 'message': f'Analysis {analysis_id} not found in database'}
        
        record_dict = dict(record)
        print(f"✅ Found record for field: {record_dict.get('place_name', 'Unknown')}")
        
        # Generate embedding text
        embedding_text = await generate_embedding_text(record_dict)
        
        # Store in memory
        embedding_store[str(analysis_id)] = {
            'text': embedding_text,
            'metadata': record_dict,
            'embedded_at': str(datetime.now())
        }
        
        print(f"🧠 Embedded analysis {analysis_id} - Total embedded: {len(embedding_store)}")
        
        return {
            'success': True,
            'message': f'✅ Embedded {record_dict.get("place_name", f"Analysis {analysis_id}")}',
            'field_name': record_dict.get('place_name'),
            'ndvi': record_dict.get('mean_ndvi')
        }
    except Exception as e:
        print(f"❌ Embedding error: {str(e)}")
        return {'success': False, 'message': f'Failed to embed: {str(e)}'}

async def remove_embedding(analysis_id: int) -> Dict[str, Any]:
    """Remove embedding from store"""
    if str(analysis_id) in embedding_store:
        del embedding_store[str(analysis_id)]
        return {'success': True, 'message': f'✅ Removed embedding for analysis {analysis_id}'}
    return {'success': False, 'message': f'Embedding not found for analysis {analysis_id}'}

async def get_embedded_ids() -> List[int]:
    """Get list of embedded analysis IDs"""
    return [int(id_str) for id_str in embedding_store.keys()]

async def get_embedding_count() -> int:
    """Get total number of embedded records"""
    return len(embedding_store)

async def retrieve_relevant_embeddings(query: str, top_k: int = 5) -> List[Tuple[str, Dict[str, Any], float]]:
    """Retrieve most relevant embeddings based on query"""
    if not embedding_store:
        print("⚠️ No embeddings in store. Please embed records first.")
        return []
    
    print(f"🔍 Searching through {len(embedding_store)} embedded records...")
    
    query_terms = query.lower().split()
    scored = []
    
    for analysis_id, data in embedding_store.items():
        score = 0
        text_lower = data['text'].lower()
        metadata = data['metadata']
        
        # Keyword matching
        for term in query_terms:
            if len(term) > 2:  # Ignore short words
                if term in text_lower:
                    score += 2
                if term in metadata.get('place_name', '').lower():
                    score += 5
        
        # Boost for specific agricultural terms
        if any(term in query.lower() for term in ['water', 'irrigation', 'moisture', 'dry']):
            if metadata.get('moisture_index', 1) < 0.4:
                score += 3
        
        if any(term in query.lower() for term in ['health', 'ndvi', 'vegetation', 'crop']):
            if metadata.get('crop_health_score', 0) < 50:
                score += 3
        
        if score > 0:
            scored.append((analysis_id, data, score))
    
    scored.sort(key=lambda x: x[2], reverse=True)
    results = scored[:top_k]
    
    print(f"✅ Found {len(results)} relevant records")
    for aid, data, score in results:
        print(f"   - {data['metadata'].get('place_name', aid)} (score: {score})")
    
    return results

async def answer_with_rag(query: str, conversation_history: List[Dict] = None) -> Dict[str, Any]:
    """Generate answer using RAG with Groq Llama 3.3"""
    
    # Get relevant embeddings
    relevant = await retrieve_relevant_embeddings(query)
    
    # Prepare context
    context = ""
    retrieved_ids = []
    
    if relevant:
        for analysis_id, data, score in relevant:
            context += f"\n\n{'='*50}\n"
            context += f"FIELD DATA #{analysis_id} (Relevance Score: {score})\n"
            context += f"{'='*50}\n"
            context += data['text']
            context += "\n"
            retrieved_ids.append(int(analysis_id))
    else:
        context = """
⚠️ No field data has been embedded yet.

To get personalized advice:
1. Look at the Agricultural Field Data table below
2. Select fields by checking the checkboxes
3. Click "Embed Selected" button
4. Then ask your question again

Available data in your database includes:
- NDVI (vegetation health index)
- Soil health scores and moisture levels
- Crop health and stress indicators
- Yield potential estimates
"""
    
    system_prompt = f"""You are an expert agricultural advisor with access to REAL field data from the user's farm.

REAL-TIME FIELD DATA FROM NEONDB:
{context}

IMPORTANT RULES:
1. ALWAYS reference specific data from the fields above when answering
2. If multiple fields are shown, compare them directly
3. Provide SPECIFIC, ACTIONABLE recommendations based on the numbers
4. If no data is embedded, guide user to embed fields from the table

INTERPRETATION GUIDELINES:
- NDVI < 0.2: Critical - Bare soil or dead vegetation
- NDVI 0.2-0.4: Poor - Unhealthy/sparse vegetation  
- NDVI 0.4-0.6: Moderate - Acceptable but can improve
- NDVI > 0.6: Excellent - Very healthy vegetation

- Moisture Index < 0.3: Drought stress - Irrigate immediately
- Moisture Index 0.3-0.6: Moderate - Schedule irrigation
- Moisture Index > 0.6: Good - No immediate water need

- Soil Health < 40: Poor - Requires amendment
- Soil Health 40-70: Moderate - Room for improvement
- Soil Health > 70: Good - Maintain practices

- Crop Health < 40: Critical risk
- Crop Health 40-70: Monitor closely
- Crop Health > 70: Excellent condition

Answer in a helpful, practical way for farmers. Use emojis for visual appeal. Include specific numbers from their data."""

    messages = [{"role": "system", "content": system_prompt}]
    
    # Add conversation history
    if conversation_history:
        for msg in conversation_history[-6:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
    
    messages.append({"role": "user", "content": query})
    
    try:
        print(f"🤖 Sending to Groq Llama 3.3...")
        
        completion = groq_client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1500,
            top_p=0.95
        )
        
        answer = completion.choices[0].message.content
        relevance_score = len(relevant) / 5 if relevant else 0
        
        print(f"✅ Generated answer with {len(relevant)} relevant records")
        
        return {
            'answer': answer,
            'source': 'database' if relevant else 'guide',
            'relevance_score': min(relevance_score, 1.0),
            'retrieved_ids': retrieved_ids
        }
    except Exception as e:
        print(f"❌ Groq API error: {str(e)}")
        return {
            'answer': f"⚠️ Error: {str(e)}",
            'source': 'error',
            'relevance_score': 0,
            'retrieved_ids': []
        }

from datetime import datetime