-- ========================================
-- ROMBAT - Coordonnées légales du client (projects)
-- À exécuter une fois dans le SQL Editor de Supabase
-- Compatible Supabase
-- ========================================

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS client_address TEXT,
    ADD COLUMN IF NOT EXISTS client_rccm    TEXT,
    ADD COLUMN IF NOT EXISTS client_ifu     TEXT,
    ADD COLUMN IF NOT EXISTS client_phone   TEXT;
