from fastapi import FastAPI, Request, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import sys
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db
from rag import embed_analysis, remove_embedding, get_embedded_ids, answer_with_rag

app = FastAPI(title="AgriChat API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== CHAT SESSION MANAGEMENT FUNCTIONS ====================

async def get_or_create_session(session_id: Optional[str]) -> str:
    """Get existing session or create new one in NeonDB"""
    try:
        if session_id:
            # Check if session exists
            query = "SELECT session_id FROM chat_sessions WHERE session_id = $1"
            existing = await db.fetchval(query, session_id)
            if existing:
                print(f"✅ Found existing session: {session_id}")
                return session_id
        
        # Create new session
        new_session_id = session_id if session_id else f"session_{int(datetime.utcnow().timestamp() * 1000)}"
        query = """
            INSERT INTO chat_sessions (session_id, created_at, updated_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (session_id) DO NOTHING
        """
        await db.execute(query, new_session_id, datetime.utcnow(), datetime.utcnow())
        print(f"✅ Created new session: {new_session_id}")
        return new_session_id
        
    except Exception as e:
        print(f"❌ Error in get_or_create_session: {str(e)}")
        return session_id if session_id else f"session_{int(datetime.utcnow().timestamp() * 1000)}"

async def save_message(session_id: str, role: str, content: str, sources: Optional[Dict] = None):
    """Save message to NeonDB"""
    try:
        sources_json = json.dumps(sources) if sources else None
        
        query = """
            INSERT INTO chat_messages 
            (session_id, role, content, sources, timestamp)
            VALUES ($1, $2, $3, $4, $5)
        """
        await db.execute(query, session_id, role, content, sources_json, datetime.utcnow())
        
        # Update session's updated_at
        update_query = """
            UPDATE chat_sessions 
            SET updated_at = $1 
            WHERE session_id = $2
        """
        await db.execute(update_query, datetime.utcnow(), session_id)
        
        print(f"💾 Saved {role} message to session {session_id}")
        return True
        
    except Exception as e:
        print(f"❌ Error saving message: {str(e)}")
        return False

async def load_conversation_history(session_id: str, limit: int = 50):
    """Load conversation history from NeonDB"""
    try:
        query = """
            SELECT role, content, timestamp
            FROM chat_messages
            WHERE session_id = $1
            ORDER BY timestamp ASC
            LIMIT $2
        """
        rows = await db.fetch(query, session_id, limit)
        
        history = []
        for row in rows:
            message = {
                'role': row['role'],
                'content': row['content'],
                'timestamp': row['timestamp'].isoformat() if row['timestamp'] else None
            }
            history.append(message)
        
        print(f"📚 Loaded {len(history)} messages from session {session_id}")
        return history
        
    except Exception as e:
        print(f"❌ Error loading history: {str(e)}")
        return []

# ==================== REQUEST MODELS ====================

class AskRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class EmbedSelectiveRequest(BaseModel):
    analysis_ids: List[int]

# ==================== STARTUP & SHUTDOWN ====================

@app.on_event("startup")
async def startup():
    await db.connect()
    print("\n✅ Server Started!")
    print("📍 Available endpoints:")
    print("   POST /ask")
    print("   GET /sessions")
    print("   GET /history/{session_id}")
    print("   DELETE /history/{session_id}")
    print("   GET /health")
    print("   GET /agricultural/data")
    print("   POST /agricultural/embed/{id}")
    print("   DELETE /agricultural/embed/{id}")
    print("   GET /agricultural/embedded-ids")
    print("   POST /agricultural/embed-selective")
    print("   GET /documents")
    print("   POST /upload\n")

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()

# ==================== HEALTH CHECK ====================

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "AgriChat API", "database": "NeonDB"}

# ==================== CHAT ENDPOINTS ====================

@app.post("/ask")
async def ask_question(request: AskRequest):
    """Process user question and return answer with NeonDB persistence"""
    try:
        print(f"\n{'='*50}")
        print(f"📝 Question: {request.query}")
        print(f"🆔 Session ID: {request.session_id}")
        print(f"{'='*50}")
        
        # Get or create session in NeonDB
        session_id = await get_or_create_session(request.session_id)
        
        # Load conversation history
        conversation_history = await load_conversation_history(session_id)
        
        # Save user message
        await save_message(session_id, 'user', request.query)
        
        # Get answer from RAG system
        result = await answer_with_rag(request.query, conversation_history)
        
        # Prepare sources
        sources_data = {
            'source': result.get('source', 'database'),
            'relevance_score': result.get('relevance_score'),
            'retrieved_ids': result.get('retrieved_ids', [])
        }
        
        # Save assistant message
        await save_message(session_id, 'assistant', result['answer'], sources_data)
        
        print(f"✅ Generated answer for session {session_id}")
        
        return {
            "answer": result['answer'],
            "source": result.get('source', 'database'),
            "relevance_score": result.get('relevance_score'),
            "retrieved_ids": result.get('retrieved_ids', [])
        }
        
    except Exception as e:
        print(f"❌ Error in ask_question: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions")
async def get_sessions():
    """List all active sessions from NeonDB"""
    try:
        query = """
            SELECT cs.session_id, cs.created_at, cs.updated_at,
                   COUNT(cm.id) as message_count
            FROM chat_sessions cs
            LEFT JOIN chat_messages cm ON cs.session_id = cm.session_id
            GROUP BY cs.session_id, cs.created_at, cs.updated_at
            ORDER BY cs.updated_at DESC
        """
        rows = await db.fetch(query)
        
        session_list = []
        for row in rows:
            session_list.append({
                "session_id": row['session_id'],
                "message_count": row['message_count'],
                "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                "updated_at": row['updated_at'].isoformat() if row['updated_at'] else None
            })
        
        print(f"📋 Returning {len(session_list)} sessions from NeonDB")
        return {"sessions": session_list}
        
    except Exception as e:
        print(f"❌ Error listing sessions: {str(e)}")
        return {"sessions": []}

@app.get("/history/{session_id}")
async def get_history(session_id: str):
    """Get chat history for a session from NeonDB"""
    try:
        messages = await load_conversation_history(session_id, limit=100)
        
        return {
            "session_id": session_id,
            "messages": messages,
            "message_count": len(messages)
        }
        
    except Exception as e:
        print(f"❌ Error getting history: {str(e)}")
        return {"session_id": session_id, "messages": [], "message_count": 0}

@app.delete("/history/{session_id}")
async def clear_history(session_id: str):
    """Clear chat history for a session from NeonDB"""
    try:
        # Delete all messages for this session
        delete_messages = "DELETE FROM chat_messages WHERE session_id = $1"
        await db.execute(delete_messages, session_id)
        
        # Update session's updated_at
        update_session = """
            UPDATE chat_sessions 
            SET updated_at = $1 
            WHERE session_id = $2
        """
        await db.execute(update_session, datetime.utcnow(), session_id)
        
        print(f"🗑️ Cleared history for session {session_id}")
        return {"success": True, "message": f"History cleared for session {session_id}"}
        
    except Exception as e:
        print(f"❌ Error clearing history: {str(e)}")
        return {"success": False, "message": str(e)}

# ==================== AGRICULTURAL ENDPOINTS ====================

@app.get("/agricultural/data")
async def get_agricultural_data():
    """List all agricultural data from NeonDB"""
    try:
        query = "SELECT * FROM ndvi_analyses ORDER BY datetime DESC LIMIT 100"
        rows = await db.fetch(query)
        data = [dict(row) for row in rows]
        print(f"✅ Retrieved {len(data)} agricultural records")
        return {"success": True, "count": len(data), "data": data}
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {"success": False, "error": str(e), "data": []}

@app.get("/agricultural/embedded-ids")
async def get_embedded():
    """Get list of embedded analysis IDs"""
    try:
        ids = await get_embedded_ids()
        print(f"📋 Embedded IDs: {ids}")
        return {"embedded_ids": ids, "count": len(ids)}
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {"embedded_ids": [], "count": 0}

@app.post("/agricultural/embed/{analysis_id}")
async def embed_record(analysis_id: int):
    """Embed a single agricultural record"""
    try:
        print(f"🧠 Embedding record {analysis_id}...")
        result = await embed_analysis(analysis_id)
        return result
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/agricultural/embed/{analysis_id}")
async def remove_record(analysis_id: int):
    """Remove embedding for a record"""
    try:
        print(f"🗑️ Removing embedding for record {analysis_id}...")
        result = await remove_embedding(analysis_id)
        return result
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agricultural/embed-selective")
async def embed_selective(request: EmbedSelectiveRequest):
    """Embed multiple selected agricultural records"""
    try:
        print(f"\n🧠 EMBEDDING {len(request.analysis_ids)} RECORDS")
        results = []
        for analysis_id in request.analysis_ids:
            print(f"Processing ID: {analysis_id}")
            result = await embed_analysis(analysis_id)
            results.append(result)
        
        success_count = sum(1 for r in results if r.get('success', False))
        print(f"✅ Successfully embedded: {success_count}/{len(request.analysis_ids)}")
        
        return {
            "success": True,
            "message": f"✅ Embedded {success_count}/{len(request.analysis_ids)} records",
            "results": results
        }
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DOCUMENT ENDPOINTS ====================

@app.get("/documents")
async def list_documents():
    """List all documents (placeholder)"""
    return []

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file (placeholder)"""
    return {
        "success": True,
        "filename": file.filename,
        "chunks_created": 0,
        "message": "File upload endpoint - implement your document processing here"
    }

# ==================== ROOT ENDPOINT ====================

@app.get("/")
async def root():
    return {
        "message": "AgriChat API is running",
        "version": "1.0.0",
        "endpoints": [
            "/ask - Ask questions",
            "/sessions - List chat sessions",
            "/history/{session_id} - Get session history",
            "/agricultural/data - Get agricultural data",
            "/agricultural/embedded-ids - Get embedded IDs",
            "/health - Health check"
        ]
    }

# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)