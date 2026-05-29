# AI-Based Soil Health Monitoring and Smart Recommendations for Sustainable Agriculture

This repository contains a full-stack proof-of-concept for precision farming powered by satellite NDVI analysis, soil health modeling, conversational agricultural advice, and PDF report generation.

## Repository Structure

Minimal folder layout:

```
.
├── frontend/
│   ├── package.json
│   ├── README.md
│   ├── public/
│   └── src/
├── chat-logic/
│   ├── main.py
│   ├── database.py
│   ├── rag.py
│   ├── requirements.txt
│   └── routes/
├── NDVI-logic/
│   ├── main.py
│   ├── core/
│   │   ├── database.py
│   │   ├── ndvi_logic.py
│   │   ├── soil_logic.py
│   │   ├── routes_ndvi.py
│   │   ├── routes_soil.py
│   │   └── routes_misc.py
│   └── static/
└── report-logic/
    ├── main.py
    ├── pdf_templates.py
    └── generated_reports/
```
![Alt text](https://github.com/Kaviarasuzedx/AI-Based-Soil-Health-Monitoring-and-Smart-Recommendations-for-Sustainable-Agriculture/blob/f5060dc9875f5c63674ac815627781af3e9e3955/screenshots/home.png)

![Alt text](https://github.com/Kaviarasuzedx/AI-Based-Soil-Health-Monitoring-and-Smart-Recommendations-for-Sustainable-Agriculture/blob/f5060dc9875f5c63674ac815627781af3e9e3955/screenshots/report.png)

![Alt text](https://github.com/Kaviarasuzedx/AI-Based-Soil-Health-Monitoring-and-Smart-Recommendations-for-Sustainable-Agriculture/blob/f5060dc9875f5c63674ac815627781af3e9e3955/screenshots/chat.png)



- `frontend/`
  - React + Vite application for the user interface.
  - Contains navigation, chat pages, analytics, soil analysis, and report UI.

- `chat-logic/`
  - FastAPI backend for the conversational AI assistant.
  - Includes RAG-enabled question answering, agricultural data retrieval, and embedding management.

- `NDVI-logic/`
  - FastAPI backend for NDVI processing, soil health calculations, and external service integration.
  - Uses Google Earth Engine, Supabase storage/metadata, and Neon DB for numerical data.

- `report-logic/`
  - FastAPI backend for agricultural PDF report generation.
  - Uses `reportlab` templates and helper functions.

## What This Project Does

- Analyzes satellite NDVI imagery to assess vegetation health.
- Provides soil health scoring and smart recommendations.
- Supports chat-based agricultural advice using retrieval-augmented generation (RAG).
- Generates professional PDF reports with charts, KPIs, and imagery.

## Prerequisites

- Node.js and npm installed
- Python 3.11+ installed
- `uvicorn` for running FastAPI servers
- Access to Google Earth Engine credentials (if using NDVI analysis)
- Supabase and Neon database credentials for cloud storage and time-series data

## Setup

### 1. Create a local `.env`

Copy the environment keys into a local `.env` file and fill in your credentials. Do not commit secrets to source control.

Required values include:

- `EE_PROJECT`
- `SUPABASE_URL1`
- `SUPABASE_KEY1`
- `SUPABASE_SERVICE_KEY`
- `DATABASE_URL`
- `GROQ_API_KEY`
- `REACT_APP_API_URL`
- `NEON_HOST`
- `NEON_DATABASE`
- `NEON_USER`
- `NEON_PASSWORD`

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Install chat logic dependencies

```bash
cd ../chat-logic
python -m pip install -r requirements.txt
```

### 4. Install NDVI backend dependencies

`NDVI-logic/` does not currently include a requirements file, so install the packages used by the code.

```bash
cd ../NDVI-logic
python -m pip install fastapi uvicorn python-dotenv earthengine-api supabase asyncpg pydantic
```

### 5. Install report logic dependencies

```bash
cd ../report-logic
python -m pip install reportlab
```

## Running the Project

### Run all services

1. Frontend development server:

```bash
cd frontend
npm run dev
```

2. Chat assistant backend:

```bash
cd chat-logic
uvicorn main:app --reload --port 8080
```

3. NDVI and soil health backend:

```bash
cd NDVI-logic
python -m uvicorn main:app --reload --port 8000
```

4. Report generation API server:

```bash
cd report-logic
python -m uvicorn main:app --reload --port 8070
```

### Service endpoints

- Frontend: `http://localhost:5173`
- Chat backend: `http://127.0.0.1:8080`
- NDVI backend: `http://127.0.0.1:8000`
- Report API backend: `http://127.0.0.1:8070`

### Chat assistant endpoints

- `GET /health`
- `GET /sessions`
- `POST /ask`
- `GET /agricultural/data`
- `GET /agricultural/embedded-ids`
- `POST /agricultural/embed/{analysis_id}`
- `DELETE /agricultural/embed/{analysis_id}`

### Report generation endpoints

- `POST /agricultural/report`
- `POST /agricultural/report/pdf`
- `POST /agricultural/report/csv`
- `GET /api/combined/all-data`
- `GET /api/combined/statistics`

### NDVI backend docs

The NDVI server exposes OpenAPI docs at `/docs` once it is running.

## Key Modules

### `frontend/`

- `src/App.jsx` and `src/main.jsx` initialize the React app.
- `src/pages/` contains page components such as `AnalysisPage`, `ChatPage`, `HistoryPage`, `SoilAnalysisPage`, `StatisticsPage`, and `ReportPage`.
- `public/` stores static assets.

### `chat-logic/`

- `main.py` defines the FastAPI app, CORS settings, and chat/data endpoints.
- `rag.py` contains embedding and retrieval logic.
- `database.py` manages the database connection and queries.
- `routes/` includes route modules for chat and agricultural data.

### `NDVI-logic/`

- `main.py` initializes the FastAPI app, mounts static files, and registers routers.
- `core/database.py` manages Supabase and Neon DB integration.
- `core/ndvi_logic.py` handles NDVI ingestion, analysis, and Supabase image upload.
- `core/soil_logic.py` contains soil health model initialization and recommendation logic.
- `core/routes_ndvi.py`, `core/routes_soil.py`, and `core/routes_misc.py` expose the API endpoints.

### `report-logic/`

- `pdf_templates.py` defines the A4 PDF layout, styles, charts, and report generation helpers.
- `generated_reports/` stores generated PDF files.

## Notes

- `frontend/README.md` remains the auto-generated Vite template README. This root README is the main project overview.
- The `.env` file contains sensitive values and should be kept private.
- Use `http://127.0.0.1:8000` as the API base URL for the NDVI backend unless configured otherwise.

## Future Improvements

- Add a dedicated `requirements.txt` for `NDVI-logic/`
- Add a test suite for each backend module
- Add a deploy script for production hosting
- Add more detailed integration documentation for the frontend and API services

---
"soil advisor develop by sriram p"

GitHub: [https://github.com/Sriramking2]

---

Made for sustainable agriculture workflows with satellite NDVI, soil health intelligence, AI chat, and PDF reporting.
