from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import sys
import os
import PyPDF2
from io import BytesIO

router = APIRouter()

documents = []

@router.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process PDF document"""
    try:
        print(f"📄 Uploading document: {file.filename}")
        
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files allowed")
        
        contents = await file.read()
        pdf_reader = PyPDF2.PdfReader(BytesIO(contents))
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        
        doc_info = {
            "filename": file.filename,
            "chunks": len(pdf_reader.pages),
            "size": len(contents),
            "preview": text[:500] + "..." if len(text) > 500 else text
        }
        
        documents.append(doc_info)
        
        print(f"✅ Uploaded {file.filename} with {len(pdf_reader.pages)} pages")
        
        return {
            "success": True,
            "message": f"✅ Uploaded {file.filename}",
            "chunks_created": len(pdf_reader.pages)
        }
        
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/documents")
async def list_documents():
    """List uploaded documents"""
    print(f"📋 Returning {len(documents)} documents")
    return documents