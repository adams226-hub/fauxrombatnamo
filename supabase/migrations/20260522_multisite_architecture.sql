-- ============================================================
-- ROMBAT Mining Platform - Architecture Multi-Sites
-- Migration: 2026-05-22
-- Objectif: une seule plateforme, deux carrières, filtrage par site_id
-- ============================================================

-- ============================================================
-- TABLE SITES
-- ============================================================

CREATE TABLE IF NOT EXISTS sites (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL UNIQUE,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  color       VARCHAR(20)  NOT NULL DEFAULT '#2C5530',
  bg_color    VARCHAR(40)  DEFAULT 'rgba(44,85,48,0.12)',
  location    VARCHAR(255),
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMP    DEFAULT NOW(),
  updated_at  TIMESTAMP    DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DONNÉES INITIALES : DEUX CARRIÈRES
-- IDs fixes pour cohérence frontend ↔ backend
-- ============================================================

INSERT INTO sites (id, name, code, color, bg_color, location) VALUES
  ('a1b2c3d4-0001-0000-0000-000000000001', 'Carrière 1', 'C1', '#2C5530', 'rgba(44,85,48,0.12)', 'Burkina Faso - Site 1'),
  ('a1b2c3d4-0002-0000-0000-000000000002', 'Carrière 2', 'C2', '#3182CE', 'rgba(49,130,206,0.12)', 'Burkina Faso - Site 2')
ON CONFLICT (id) DO UPDATE SET
  name     = EXCLUDED.name,
  code     = EXCLUDED.code,
  color    = EXCLUDED.color,
  bg_color = EXCLUDED.bg_color,
  location = EXCLUDED.location;

-- ============================================================
-- AJOUT DU CHAMP site_id AUX TABLES MÉTIER
-- ============================================================

-- Profiles : assigner chaque utilisateur à son site
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Production
ALTER TABLE production ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Sorties de production
ALTER TABLE production_exits ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Stock entrées (site_id existe déjà sans FK — on ajoute la contrainte)
DO $$ BEGIN
  ALTER TABLE stock_entries
    ADD CONSTRAINT fk_stock_entries_site
    FOREIGN KEY (site_id) REFERENCES sites(id);
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_column THEN
           ALTER TABLE stock_entries ADD COLUMN site_id UUID REFERENCES sites(id);
END $$;

-- Stock sorties
ALTER TABLE stock_exits ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Carburant
ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Transactions financières
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Équipements
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Maintenance
ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Objectifs
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Huile
DO $$ BEGIN
  ALTER TABLE oil_transactions ADD COLUMN site_id UUID REFERENCES sites(id);
EXCEPTION WHEN duplicate_column THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

-- Consommables
DO $$ BEGIN
  ALTER TABLE consumable_movements ADD COLUMN site_id UUID REFERENCES sites(id);
EXCEPTION WHEN duplicate_column THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

-- Pièces de rechange
DO $$ BEGIN
  ALTER TABLE spare_parts ADD COLUMN site_id UUID REFERENCES sites(id);
EXCEPTION WHEN duplicate_column THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

-- Plans de maintenance préventive
DO $$ BEGIN
  ALTER TABLE maintenance_plans ADD COLUMN site_id UUID REFERENCES sites(id);
EXCEPTION WHEN duplicate_column THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

-- ============================================================
-- FONCTIONS HELPERS RLS MULTI-SITES
-- ============================================================

-- Retourne le site_id du profil connecté
CREATE OR REPLACE FUNCTION get_user_site_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT site_id FROM profiles WHERE id = auth.uid()
$$;

-- Vérifie si l'utilisateur peut accéder à un site donné
-- Rôles globaux (admin, directeur, comptable) → accès à tout
-- Rôles site-spécifiques → seulement leur site, ou si pas de site assigné
CREATE OR REPLACE FUNCTION can_access_site(p_site_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    get_user_role() IN ('admin', 'directeur', 'comptable')
    OR get_user_site_id() IS NULL
    OR get_user_site_id() = p_site_id
$$;

-- ============================================================
-- RLS POUR LA TABLE SITES
-- ============================================================

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sites_select" ON sites;
DROP POLICY IF EXISTS "sites_insert" ON sites;
DROP POLICY IF EXISTS "sites_update" ON sites;
DROP POLICY IF EXISTS "sites_delete" ON sites;

CREATE POLICY "sites_select" ON sites FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sites_insert" ON sites FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "sites_update" ON sites FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "sites_delete" ON sites FOR DELETE USING (get_user_role() = 'admin');

-- ============================================================
-- MISE À JOUR DES POLITIQUES RLS EXISTANTES AVEC FILTRAGE SITE
-- ============================================================

-- PRODUCTION
DROP POLICY IF EXISTS "production_select" ON production;
CREATE POLICY "production_select" ON production FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "production_insert" ON production;
CREATE POLICY "production_insert" ON production FOR INSERT WITH CHECK (
  get_user_role() IN ('admin','directeur','supervisor','operator')
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "production_update" ON production;
CREATE POLICY "production_update" ON production FOR UPDATE USING (
  get_user_role() IN ('admin','directeur','supervisor')
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "production_delete" ON production;
CREATE POLICY "production_delete" ON production FOR DELETE USING (
  get_user_role() IN ('admin','directeur')
);

-- SORTIES DE PRODUCTION
DROP POLICY IF EXISTS "production_exits_select" ON production_exits;
CREATE POLICY "production_exits_select" ON production_exits FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "production_exits_insert" ON production_exits;
CREATE POLICY "production_exits_insert" ON production_exits FOR INSERT WITH CHECK (
  get_user_role() IN ('admin','directeur','supervisor','operator')
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "production_exits_delete" ON production_exits;
CREATE POLICY "production_exits_delete" ON production_exits FOR DELETE USING (
  get_user_role() IN ('admin','directeur')
);

-- STOCK ENTRIES
DROP POLICY IF EXISTS "stock_entries_select" ON stock_entries;
CREATE POLICY "stock_entries_select" ON stock_entries FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "stock_entries_insert" ON stock_entries;
CREATE POLICY "stock_entries_insert" ON stock_entries FOR INSERT WITH CHECK (
  get_user_role() IN ('admin','directeur','supervisor','operator')
  AND (site_id IS NULL OR can_access_site(site_id))
);

-- STOCK EXITS
DROP POLICY IF EXISTS "stock_exits_select" ON stock_exits;
CREATE POLICY "stock_exits_select" ON stock_exits FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "stock_exits_insert" ON stock_exits;
CREATE POLICY "stock_exits_insert" ON stock_exits FOR INSERT WITH CHECK (
  get_user_role() IN ('admin','directeur','supervisor','operator')
  AND (site_id IS NULL OR can_access_site(site_id))
);

-- CARBURANT
DROP POLICY IF EXISTS "fuel_select" ON fuel_transactions;
CREATE POLICY "fuel_select" ON fuel_transactions FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "fuel_insert" ON fuel_transactions;
CREATE POLICY "fuel_insert" ON fuel_transactions FOR INSERT WITH CHECK (
  get_user_role() IN ('admin','directeur','supervisor','operator')
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "fuel_update" ON fuel_transactions;
CREATE POLICY "fuel_update" ON fuel_transactions FOR UPDATE USING (
  get_user_role() IN ('admin','directeur')
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "fuel_delete" ON fuel_transactions;
CREATE POLICY "fuel_delete" ON fuel_transactions FOR DELETE USING (
  get_user_role() IN ('admin','directeur')
);

-- TRANSACTIONS FINANCIÈRES
DROP POLICY IF EXISTS "financial_select" ON financial_transactions;
CREATE POLICY "financial_select" ON financial_transactions FOR SELECT USING (
  get_user_role() IN ('admin','directeur','comptable','equipement')
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "financial_insert" ON financial_transactions;
CREATE POLICY "financial_insert" ON financial_transactions FOR INSERT WITH CHECK (
  get_user_role() IN ('admin','directeur','comptable')
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "financial_update" ON financial_transactions;
CREATE POLICY "financial_update" ON financial_transactions FOR UPDATE USING (
  get_user_role() IN ('admin','directeur','comptable')
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "financial_delete" ON financial_transactions;
CREATE POLICY "financial_delete" ON financial_transactions FOR DELETE USING (
  get_user_role() IN ('admin','directeur')
);

-- ÉQUIPEMENTS
DROP POLICY IF EXISTS "equipment_select" ON equipment;
CREATE POLICY "equipment_select" ON equipment FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "equipment_insert" ON equipment;
CREATE POLICY "equipment_insert" ON equipment FOR INSERT WITH CHECK (
  get_user_role() IN ('admin','chef_de_site','equipement','directeur')
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "equipment_update" ON equipment;
CREATE POLICY "equipment_update" ON equipment FOR UPDATE USING (
  get_user_role() IN ('admin','chef_de_site','equipement','directeur')
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "equipment_delete" ON equipment;
CREATE POLICY "equipment_delete" ON equipment FOR DELETE USING (
  get_user_role() = 'admin'
);

-- MAINTENANCE
DROP POLICY IF EXISTS "maintenance_select" ON maintenance;
CREATE POLICY "maintenance_select" ON maintenance FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "maintenance_insert" ON maintenance;
CREATE POLICY "maintenance_insert" ON maintenance FOR INSERT WITH CHECK (
  get_user_role() IN ('admin','chef_de_site','equipement','directeur','supervisor')
  AND (site_id IS NULL OR can_access_site(site_id))
);

DROP POLICY IF EXISTS "maintenance_update" ON maintenance;
CREATE POLICY "maintenance_update" ON maintenance FOR UPDATE USING (
  get_user_role() IN ('admin','chef_de_site','equipement','directeur')
  AND (site_id IS NULL OR can_access_site(site_id))
);

-- ============================================================
-- INDEX POUR LES PERFORMANCES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_production_site_id        ON production(site_id);
CREATE INDEX IF NOT EXISTS idx_production_exits_site_id  ON production_exits(site_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_site_id     ON stock_entries(site_id);
CREATE INDEX IF NOT EXISTS idx_stock_exits_site_id       ON stock_exits(site_id);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_site_id ON fuel_transactions(site_id);
CREATE INDEX IF NOT EXISTS idx_financial_site_id         ON financial_transactions(site_id);
CREATE INDEX IF NOT EXISTS idx_equipment_site_id         ON equipment(site_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_site_id       ON maintenance(site_id);
CREATE INDEX IF NOT EXISTS idx_profiles_site_id          ON profiles(site_id);
