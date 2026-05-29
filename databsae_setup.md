neon db table creation 



CREATE TABLE IF NOT EXISTS ndvi_analyses (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER UNIQUE NOT NULL,
    place_name VARCHAR(200),
    datetime TIMESTAMP,
    timestamp VARCHAR(50),
    
    -- NDVI statistics
    mean_ndvi FLOAT,
    std_ndvi FLOAT,
    min_ndvi FLOAT,
    max_ndvi FLOAT,
    ndvi_histogram JSONB,
    
    -- SAVI statistics
    mean_savi FLOAT,
    std_savi FLOAT,
    min_savi FLOAT,
    max_savi FLOAT,
    
    -- EVI statistics
    mean_evi FLOAT,
    std_evi FLOAT,
    min_evi FLOAT,
    max_evi FLOAT,
    
    -- GNDVI statistics
    mean_gndvi FLOAT,
    std_gndvi FLOAT,
    min_gndvi FLOAT,
    max_gndvi FLOAT,
    
    -- Soil health metrics
    soil_health_score FLOAT,
    moisture_index FLOAT,
    organic_matter FLOAT,
    texture_score FLOAT,
    ph_level FLOAT,
    
    -- Crop health metrics
    crop_health_score FLOAT,
    vigor_index FLOAT,
    stress_level FLOAT,
    yield_potential FLOAT,
    chlorophyll_content FLOAT,
    
    -- Metadata
    polygon_coords JSONB,
    cloud_cover FLOAT,
    collection_size INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_id ON ndvi_analyses(analysis_id);
CREATE INDEX IF NOT EXISTS idx_place_name ON ndvi_analyses(place_name);
CREATE INDEX IF NOT EXISTS idx_datetime ON ndvi_analyses(datetime);

-------------------------------------------------------------------------
chat setup
--------------------------------------------------------------------------
chat messages**
------------
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    sources JSON,
    timestamp TIMESTAMP
);

-- Indexes
CREATE INDEX ix_chat_messages_session_id ON chat_messages (session_id);
CREATE INDEX ix_chat_messages_timestamp ON chat_messages (timestamp);


chat sessions**
--------------
CREATE TABLE chat_messages (
    id SERIAL,
    session_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    sources JSON,
    timestamp TIMESTAMP
);

-- Add the PRIMARY KEY constraint
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);

-- Create the explicit UNIQUE INDEX (redundant but as specified)
CREATE UNIQUE INDEX chat_messages_pkey ON chat_messages USING BTREE (id);

-- Create the session_id index
CREATE INDEX ix_chat_messages_session_id ON chat_messages USING BTREE (session_id);

-- Create the timestamp index
CREATE INDEX ix_chat_messages_timestamp ON chat_messages USING BTREE (timestamp);



------------------------------------------------------------------
Supabase table creation and bucket setup
------------------------------------------------------------------
create bucket name - ndvi-images

table creation


create table public.ndvi_analyses_rag (
  id bigserial not null,
  place_name text null,
  datetime text null,
  timestamp text null,
  ndvi_png text null,
  ndvi_tif text null,
  polygon text null,
  rgb_png text null,
  savi_png text null,
  gndvi_png text null,
  evi_png text null,
  soil_health_png text null,
  crop_health_png text null,
  soil_health_score real null,
  moisture_index real null,
  organic_matter real null,
  texture_score real null,
  ph_level real null,
  crop_health_score real null,
  vigor_index real null,
  stress_level real null,
  yield_potential real null,
  chlorophyll_content real null,
  created_at timestamp without time zone null default now(),
  constraint ndvi_analyses_rag_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_ndvi_place_name on public.ndvi_analyses_rag using btree (place_name) TABLESPACE pg_default;

create index IF not exists idx_ndvi_datetime on public.ndvi_analyses_rag using btree (datetime) TABLESPACE pg_default;


