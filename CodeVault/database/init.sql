-- CodeVault Database Initialization
-- This runs when the PostgreSQL container first starts.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Trigram fuzzy search
CREATE EXTENSION IF NOT EXISTS "vector";     -- pgvector for embeddings
