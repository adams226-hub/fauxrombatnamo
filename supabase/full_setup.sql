-- ============================================================
-- ROMBAT MINING PLATFORM - SCHÉMA COMPLET
-- Projet vierge Supabase - tout créer depuis zéro
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN CREATE TYPE user_role AS ENUM (
  'admin','supervisor','operator','viewer','directeur','chef_de_site','comptable','equipement'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE equipment_status AS ENUM ('active','maintenance','offline','retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE equipment_type AS ENUM ('excavator','drill','conveyor','crusher','loader','truck','pump','generator');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE fuel_type AS ENUM ('diesel','essence','gasoil','hybrid','electric');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE transaction_type AS ENUM ('income','expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('pending','paid','overdue','cancelled','partial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE maintenance_type AS ENUM ('preventive','corrective','emergency','inspection','overhaul');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE maintenance_status AS ENUM ('planned','in_progress','completed','cancelled','deferred');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE report_type AS ENUM ('production','financial','maintenance','safety','summary','audit','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE report_status AS ENUM ('generating','completed','failed','scheduled','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE exit_type AS ENUM ('sale','transfer','loss','sample','return');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- FONCTION updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROFILES (liée à auth.users - remplace le custom auth)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    VARCHAR(50)  UNIQUE,
  full_name   VARCHAR(255) NOT NULL,
  role        user_role    NOT NULL DEFAULT 'operator',
  department  VARCHAR(100),
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMP    DEFAULT NOW(),
  updated_at  TIMESTAMP    DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ÉQUIPEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS equipment (
  id                   UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 VARCHAR(255)     NOT NULL,
  type                 equipment_type   NOT NULL,
  model                VARCHAR(255),
  manufacturer         VARCHAR(255),
  serial_number        VARCHAR(100)     UNIQUE,
  status               equipment_status DEFAULT 'active',
  capacity             DECIMAL(10,2),
  purchase_date        DATE,
  purchase_cost        DECIMAL(12,2),
  last_maintenance     TIMESTAMP,
  next_maintenance     TIMESTAMP,
  operating_hours      DECIMAL(10,2)    DEFAULT 0,
  fuel_consumption_rate DECIMAL(8,2),
  notes                TEXT,
  created_at           TIMESTAMP        DEFAULT NOW(),
  updated_at           TIMESTAMP        DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MAINTENANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS maintenance (
  id               UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id     UUID               NOT NULL REFERENCES equipment(id),
  maintenance_type maintenance_type   NOT NULL,
  start_date       TIMESTAMP          NOT NULL,
  end_date         TIMESTAMP,
  description      TEXT               NOT NULL,
  technician_id    UUID               REFERENCES auth.users(id),
  labor_cost       DECIMAL(10,2),
  parts_cost       DECIMAL(10,2),
  status           maintenance_status DEFAULT 'planned',
  notes            TEXT,
  created_at       TIMESTAMP          DEFAULT NOW(),
  updated_at       TIMESTAMP          DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_maintenance_updated_at
  BEFORE UPDATE ON maintenance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PRODUCTION
-- ============================================================

CREATE TABLE IF NOT EXISTS production (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  date        DATE          NOT NULL,
  site        VARCHAR(255)  NOT NULL,
  shift       VARCHAR(50),
  operator    VARCHAR(255),
  notes       TEXT,
  total       DECIMAL(12,3) DEFAULT 0,
  created_by  UUID          REFERENCES auth.users(id),
  created_at  TIMESTAMP     DEFAULT NOW(),
  updated_at  TIMESTAMP     DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_production_updated_at
  BEFORE UPDATE ON production FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS production_details (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_id UUID          NOT NULL REFERENCES production(id) ON DELETE CASCADE,
  dimension     VARCHAR(50)   NOT NULL,
  quantity      DECIMAL(12,3) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- SORTIES DE PRODUCTION
-- ============================================================

CREATE TABLE IF NOT EXISTS production_exits (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  date        DATE          NOT NULL,
  destination VARCHAR(255),
  exit_type   VARCHAR(50)   DEFAULT 'sale',
  client_name VARCHAR(255),
  notes       TEXT,
  total       DECIMAL(12,3) DEFAULT 0,
  created_by  UUID          REFERENCES auth.users(id),
  created_at  TIMESTAMP     DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_exit_details (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  exit_id     UUID          NOT NULL REFERENCES production_exits(id) ON DELETE CASCADE,
  dimension   VARCHAR(50)   NOT NULL,
  quantity    DECIMAL(12,3) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL,
  code         VARCHAR(50)  UNIQUE,
  contact_name VARCHAR(255),
  email        VARCHAR(255),
  phone        VARCHAR(30),
  address      TEXT,
  is_active    BOOLEAN      DEFAULT true,
  created_at   TIMESTAMP    DEFAULT NOW(),
  updated_at   TIMESTAMP    DEFAULT NOW()
);

-- ============================================================
-- STOCK ENTRÉES
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_entries (
  id           UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_date   DATE      NOT NULL,
  source       VARCHAR(255) NOT NULL,
  site_id      UUID,
  equipment_id UUID      REFERENCES equipment(id),
  operator_id  UUID      REFERENCES auth.users(id),
  shift        VARCHAR(20),
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_stock_entries_updated_at
  BEFORE UPDATE ON stock_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS stock_entry_details (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_entry_id  UUID          NOT NULL REFERENCES stock_entries(id) ON DELETE CASCADE,
  dimension       VARCHAR(50),
  quantity        DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
  created_at      TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- STOCK SORTIES
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_exits (
  id           UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  exit_date    DATE      NOT NULL,
  destination  VARCHAR(255) NOT NULL,
  exit_type    exit_type NOT NULL DEFAULT 'sale',
  client_name  VARCHAR(255),
  client_id    UUID      REFERENCES clients(id),
  operator_id  UUID      REFERENCES auth.users(id),
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_stock_exits_updated_at
  BEFORE UPDATE ON stock_exits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS stock_exit_details (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_exit_id UUID          NOT NULL REFERENCES stock_exits(id) ON DELETE CASCADE,
  dimension     VARCHAR(50),
  quantity      DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
  unit_price    DECIMAL(10,2),
  created_at    TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS CARBURANT
-- ============================================================

CREATE TABLE IF NOT EXISTS fuel_transactions (
  id               UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date DATE      NOT NULL,
  equipment_id     UUID      NOT NULL REFERENCES equipment(id),
  fuel_type        fuel_type NOT NULL DEFAULT 'diesel',
  quantity         DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  cost_per_liter   DECIMAL(8,3)  NOT NULL CHECK (cost_per_liter > 0),
  total_cost       DECIMAL(12,2) GENERATED ALWAYS AS (quantity * cost_per_liter) STORED,
  operator_id      UUID      REFERENCES auth.users(id),
  supplier         VARCHAR(255),
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_fuel_transactions_updated_at
  BEFORE UPDATE ON fuel_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRANSACTIONS FINANCIÈRES
-- ============================================================

CREATE TABLE IF NOT EXISTS financial_transactions (
  id               UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date DATE             NOT NULL,
  type             transaction_type NOT NULL,
  category         VARCHAR(100)     NOT NULL,
  description      TEXT             NOT NULL,
  amount           DECIMAL(12,2)    NOT NULL CHECK (amount > 0),
  currency         VARCHAR(3)       DEFAULT 'XOF',
  reference        VARCHAR(100),
  client_supplier  VARCHAR(255),
  payment_method   VARCHAR(50)      CHECK (payment_method IN ('cash','bank_transfer','check','mobile_money','card')),
  payment_status   payment_status   DEFAULT 'pending',
  due_date         DATE,
  notes            TEXT,
  created_by       UUID             REFERENCES auth.users(id),
  created_at       TIMESTAMP        DEFAULT NOW(),
  updated_at       TIMESTAMP        DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON financial_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RAPPORTS
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255)  NOT NULL,
  type         report_type   NOT NULL,
  period       VARCHAR(100)  NOT NULL,
  report_date  DATE          NOT NULL,
  status       report_status DEFAULT 'completed',
  format       VARCHAR(20)   DEFAULT 'PDF',
  created_by   UUID          REFERENCES auth.users(id),
  parameters   JSONB,
  created_at   TIMESTAMP     DEFAULT NOW(),
  updated_at   TIMESTAMP     DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- OBJECTIFS
-- ============================================================

CREATE TABLE IF NOT EXISTS objectives (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  dimension   VARCHAR(50)   NOT NULL,
  site        VARCHAR(255)  DEFAULT 'all',
  period_type VARCHAR(20)   CHECK (period_type IN ('daily','weekly','monthly','quarterly','yearly')) DEFAULT 'daily',
  value       DECIMAL(12,3) NOT NULL,
  unit        VARCHAR(10)   DEFAULT 'tonne',
  active      BOOLEAN       DEFAULT true,
  created_by  UUID          REFERENCES auth.users(id),
  created_at  TIMESTAMP     DEFAULT NOW(),
  updated_at  TIMESTAMP     DEFAULT NOW(),
  UNIQUE(dimension, site, period_type)
);

CREATE OR REPLACE TRIGGER update_objectives_updated_at
  BEFORE UPDATE ON objectives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FONCTION helper RLS : get_user_role()
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment              ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance            ENABLE ROW LEVEL SECURITY;
ALTER TABLE production             ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_details     ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_exits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_exit_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entry_details    ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_exits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_exit_details     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports                ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (get_user_role() = 'admin');

-- Equipment
CREATE POLICY "equipment_select" ON equipment FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "equipment_insert" ON equipment FOR INSERT WITH CHECK (get_user_role() IN ('admin','chef_de_site','equipement','directeur'));
CREATE POLICY "equipment_update" ON equipment FOR UPDATE USING (get_user_role() IN ('admin','chef_de_site','equipement','directeur'));
CREATE POLICY "equipment_delete" ON equipment FOR DELETE USING (get_user_role() = 'admin');

-- Maintenance
CREATE POLICY "maintenance_select" ON maintenance FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "maintenance_insert" ON maintenance FOR INSERT WITH CHECK (get_user_role() IN ('admin','chef_de_site','equipement','directeur','supervisor'));
CREATE POLICY "maintenance_update" ON maintenance FOR UPDATE USING (get_user_role() IN ('admin','chef_de_site','equipement','directeur'));

-- Production
CREATE POLICY "production_select" ON production FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "production_insert" ON production FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor','operator'));
CREATE POLICY "production_update" ON production FOR UPDATE USING (get_user_role() IN ('admin','directeur','supervisor'));
CREATE POLICY "production_delete" ON production FOR DELETE USING (get_user_role() IN ('admin','directeur'));

CREATE POLICY "production_details_select" ON production_details FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "production_details_insert" ON production_details FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "production_details_delete" ON production_details FOR DELETE USING (get_user_role() IN ('admin','directeur'));

CREATE POLICY "production_exits_select" ON production_exits FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "production_exits_insert" ON production_exits FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor','operator'));
CREATE POLICY "production_exits_delete" ON production_exits FOR DELETE USING (get_user_role() IN ('admin','directeur'));

CREATE POLICY "production_exit_details_select" ON production_exit_details FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "production_exit_details_insert" ON production_exit_details FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Stock
CREATE POLICY "stock_entries_select" ON stock_entries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_entries_insert" ON stock_entries FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor','operator'));
CREATE POLICY "stock_entry_details_select" ON stock_entry_details FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_entry_details_insert" ON stock_entry_details FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "stock_exits_select" ON stock_exits FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_exits_insert" ON stock_exits FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor','operator'));
CREATE POLICY "stock_exit_details_select" ON stock_exit_details FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_exit_details_insert" ON stock_exit_details FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Fuel
CREATE POLICY "fuel_select" ON fuel_transactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "fuel_insert" ON fuel_transactions FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor','operator'));
CREATE POLICY "fuel_update" ON fuel_transactions FOR UPDATE USING (get_user_role() IN ('admin','directeur'));
CREATE POLICY "fuel_delete" ON fuel_transactions FOR DELETE USING (get_user_role() IN ('admin','directeur'));

-- Financial
CREATE POLICY "financial_select" ON financial_transactions FOR SELECT USING (get_user_role() IN ('admin','directeur','comptable','equipement'));
CREATE POLICY "financial_insert" ON financial_transactions FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','comptable'));
CREATE POLICY "financial_update" ON financial_transactions FOR UPDATE USING (get_user_role() IN ('admin','directeur','comptable'));
CREATE POLICY "financial_delete" ON financial_transactions FOR DELETE USING (get_user_role() IN ('admin','directeur'));

-- Reports
CREATE POLICY "reports_select" ON reports FOR SELECT USING (get_user_role() IN ('admin','directeur'));
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur'));
CREATE POLICY "reports_update" ON reports FOR UPDATE USING (get_user_role() IN ('admin','directeur'));

-- Objectives
CREATE POLICY "objectives_select" ON objectives FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "objectives_insert" ON objectives FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor'));
CREATE POLICY "objectives_update" ON objectives FOR UPDATE USING (get_user_role() IN ('admin','directeur','supervisor'));
CREATE POLICY "objectives_delete" ON objectives FOR DELETE USING (get_user_role() IN ('admin','directeur'));

-- Clients
CREATE POLICY "clients_select" ON clients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor'));

-- ============================================================
-- TRIGGER : auto-créer profil à l'inscription
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'operator'),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- DONNÉES INITIALES : OBJECTIFS PAR DÉFAUT
-- ============================================================

INSERT INTO objectives (dimension, site, period_type, value, unit) VALUES
  ('Minerai', 'all', 'daily',  300, 'tonne'),
  ('Forage',  'all', 'daily',  150, 'tonne'),
  ('0/4',     'all', 'daily',  200, 'tonne'),
  ('0/5',     'all', 'daily',  180, 'tonne'),
  ('0/6',     'all', 'daily',  160, 'tonne'),
  ('5/15',    'all', 'daily',  140, 'tonne'),
  ('8/15',    'all', 'daily',  120, 'tonne'),
  ('15/25',   'all', 'daily',  100, 'tonne'),
  ('4/6',         'all', 'daily',   90, 'tonne'),
  ('4/6 ENROBÉ',  'all', 'daily',   75, 'tonne'),
  ('10/14',       'all', 'daily',   80, 'tonne'),
  ('6/10',    'all', 'daily',   70, 'tonne'),
  ('0/31,5',  'all', 'daily',   60, 'tonne')
ON CONFLICT (dimension, site, period_type) DO NOTHING;
