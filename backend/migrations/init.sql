-- KolayKOBİ initial schema
-- This file runs once when the Docker postgres container starts fresh.
-- EF Core migrations handle subsequent schema changes.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Seed plans (EF Core also seeds these via HasData, this is a fallback)
-- The actual schema tables are created by EF Core migrations on app start.
