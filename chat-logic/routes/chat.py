from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4
import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db
from rag import answer_with_rag

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    source: str
    relevance_score: Optional[float] = None
    retrieved_ids: Optional[List[int]] = None

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
        # Return session_id even if DB fails (fallback)
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
        # Don't raise exception - just log error
        return False

async def load_conversation_history(session_id: str, limit: int = 50):
    """Load conversation history from NeonDB"""
    try:
        query = """
            SELECT role, content, sources, timestamp
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
            if row['sources']:
                sources = json.loads(row['sources']) if isinstance(row['sources'], str) else row['sources']
                message['source'] = sources.get('source')
                message['relevance_score'] = sources.get('relevance_score')
                message['retrieved_ids'] = sources.get('retrieved_ids')
            history.append(message)
        
        print(f"📚 Loaded {len(history)} messages from session {session_id}")
        return history
        
    except Exception as e:
        print(f"❌ Error loading history: {str(e)}")
        return []

@router.post("/ask")
async def ask_question(request: ChatRequest):
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
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{session_id}")
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

@router.delete("/history/{session_id}")
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

@router.get("/sessions")
async def list_sessions():
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

@router.get("/documents")
async def list_documents():
    """List all embedded documents"""
    try:
        # Return empty array for now - you can implement document storage later
        return []
    except Exception as e:
        print(f"❌ Error listing documents: {str(e)}")
        return []

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload PDF - placeholder implementation"""
    try:
        # Just return success for now
        return {
            "success": True, 
            "filename": file.filename,
            "chunks_created": 0,
            "message": "PDF upload endpoint - implement your document processing here"
        }
    except Exception as e:
        print(f"❌ Error uploading file: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "agricultural-ai", "database": "neon"}