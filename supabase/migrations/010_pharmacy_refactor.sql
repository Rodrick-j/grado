-- MIGRATION 010: PHARMACY REFACTOR
-- Drops old pharmacy_inventory logic and creates a robust ERP-like inventory system.

-- 1. Drop dependent objects
DROP TRIGGER IF EXISTS trg_deduct_stock ON dispensing_log;
DROP FUNCTION IF EXISTS fn_deduct_stock();
DROP TABLE IF EXISTS dispensing_log CASCADE;

-- We will rename pharmacy_inventory to pharmacy_products instead of dropping it to keep some basic info if it exists.
-- But first, let's remove the columns that no longer apply to the master product.

ALTER TABLE pharmacy_inventory RENAME TO pharmacy_products;

ALTER TABLE pharmacy_products
  DROP COLUMN IF EXISTS stock_current,
  DROP COLUMN IF EXISTS batch_number,
  DROP COLUMN IF EXISTS expiry_date;

ALTER TABLE pharmacy_products
  ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS format VARCHAR(50); -- e.g., Tablets, Syrup, IV

-- 2. Create Pharmacy Locations
CREATE TABLE pharmacy_locations (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(150) NOT NULL, -- e.g., "Estantería A, Cajón 3"
  zone                VARCHAR(100),
  aisle               VARCHAR(50),
  shelf_level         VARCHAR(50),
  special_conditions  VARCHAR(100), -- Refrigerated, Controlled, etc.
  active              BOOLEAN     DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Pharmacy Lots (Batches)
CREATE TYPE lot_status AS ENUM ('ACTIVE', 'QUARANTINE', 'EXPIRED', 'DEPLETED');

CREATE TABLE pharmacy_lots (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id          UUID        NOT NULL REFERENCES pharmacy_products(id) ON DELETE CASCADE,
  location_id         UUID        REFERENCES pharmacy_locations(id) ON DELETE SET NULL,
  batch_code          VARCHAR(100) NOT NULL,
  expiry_date         DATE,       -- NULL means it doesn't expire
  stock_current       INTEGER     NOT NULL DEFAULT 0,
  purchase_price      NUMERIC(10,2),
  sale_price          NUMERIC(10,2),
  status              lot_status  DEFAULT 'ACTIVE',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_lots_upd BEFORE UPDATE ON pharmacy_lots FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- 4. Create Pharmacy Movements (Audit)
CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'EXPIRED');

CREATE TABLE pharmacy_movements (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id              UUID        NOT NULL REFERENCES pharmacy_lots(id) ON DELETE CASCADE,
  movement_type       movement_type NOT NULL,
  quantity            INTEGER     NOT NULL, -- positive or negative
  user_id             UUID        REFERENCES user_profiles(id),
  observations        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Re-create Dispensing Log referring to LOTS
CREATE TABLE dispensing_log (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id     UUID        REFERENCES prescriptions(id),
  patient_id          UUID        NOT NULL REFERENCES patients(id),
  lot_id              UUID        NOT NULL REFERENCES pharmacy_lots(id), -- Changed from inventory_id
  quantity_dispensed  INTEGER     NOT NULL,
  pharmacist_id       UUID        NOT NULL REFERENCES user_profiles(id),
  notes               TEXT,
  dispensed_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Trigger to deduct stock from LOT when dispensed
CREATE OR REPLACE FUNCTION fn_deduct_lot_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE pharmacy_lots
  SET stock_current = stock_current - NEW.quantity_dispensed, updated_at = NOW()
  WHERE id = NEW.lot_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Lot not found'; END IF;
  
  -- Also log the movement automatically
  INSERT INTO pharmacy_movements (lot_id, movement_type, quantity, user_id, observations)
  VALUES (NEW.lot_id, 'OUT', -NEW.quantity_dispensed, NEW.pharmacist_id, 'Dispensación a paciente');

  RETURN NEW;
END;$$;

CREATE TRIGGER trg_deduct_lot_stock AFTER INSERT ON dispensing_log
  FOR EACH ROW EXECUTE FUNCTION fn_deduct_lot_stock();

-- 7. Views for the UI

-- View to get aggregated stock per product
CREATE OR REPLACE VIEW vw_pharmacy_stock AS
SELECT 
  p.id,
  p.drug_code,
  p.drug_name,
  p.generic_name,
  p.category,
  p.unit,
  p.stock_minimum,
  p.stock_maximum,
  p.supplier,
  p.requires_prescription,
  p.active,
  COALESCE(SUM(l.stock_current), 0) AS total_stock,
  (CASE WHEN COALESCE(SUM(l.stock_current), 0) <= p.stock_minimum THEN TRUE ELSE FALSE END) AS is_low_stock
FROM pharmacy_products p
LEFT JOIN pharmacy_lots l ON p.id = l.product_id AND l.status = 'ACTIVE'
GROUP BY p.id;

-- View for expiration alerts (Semáforo)
CREATE OR REPLACE VIEW vw_pharmacy_alerts AS
SELECT 
  l.id AS lot_id,
  p.id AS product_id,
  p.drug_name,
  l.batch_code,
  l.stock_current,
  l.expiry_date,
  CASE
    WHEN l.expiry_date IS NULL THEN 'GREEN' -- Does not expire
    WHEN l.expiry_date < CURRENT_DATE THEN 'RED'
    WHEN l.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'RED'
    WHEN l.expiry_date <= CURRENT_DATE + INTERVAL '6 months' THEN 'YELLOW'
    ELSE 'GREEN'
  END AS status_color,
  l.location_id
FROM pharmacy_lots l
JOIN pharmacy_products p ON l.product_id = p.id
WHERE l.status = 'ACTIVE' AND l.stock_current > 0;

-- Ensure RLS is enabled and policies are defined for new tables
ALTER TABLE pharmacy_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pharma_read_locations" ON pharmacy_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "pharma_write_locations" ON pharmacy_locations FOR ALL TO authenticated USING (true);

CREATE POLICY "pharma_read_lots" ON pharmacy_lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "pharma_write_lots" ON pharmacy_lots FOR ALL TO authenticated USING (true);

CREATE POLICY "pharma_read_movements" ON pharmacy_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "pharma_write_movements" ON pharmacy_movements FOR ALL TO authenticated USING (true);

-- Drop old policies on pharmacy_products (was pharmacy_inventory) and recreate
DROP POLICY IF EXISTS "pharma_read" ON pharmacy_products;
DROP POLICY IF EXISTS "pharma_write" ON pharmacy_products;

CREATE POLICY "pharma_read_products" ON pharmacy_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "pharma_write_products" ON pharmacy_products FOR ALL TO authenticated USING (true);

-- Seed some initial locations
INSERT INTO pharmacy_locations (name, zone, aisle, shelf_level, special_conditions)
VALUES 
('Vitrina Principal A1', 'Mostrador', '1', '1', 'Normal'),
('Vitrina Principal A2', 'Mostrador', '1', '2', 'Normal'),
('Refrigerador Central', 'Cadena Frío', '2', '1', 'Refrigerado 2-8°C'),
('Caja Fuerte Controlados', 'Controlados', '3', '1', 'Seguridad Máxima')
ON CONFLICT DO NOTHING;
