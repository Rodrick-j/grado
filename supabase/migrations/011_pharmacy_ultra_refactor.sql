-- MIGRATION 011: PHARMACY ULTRA REFACTOR
-- Adds brand, presentation, target age, images, therapeutic action and statuses.

-- 0. Drop views first to avoid dependency errors
DROP VIEW IF EXISTS vw_pharmacy_alerts;
DROP VIEW IF EXISTS vw_pharmacy_stock;

-- 1. Add new fields to pharmacy_products
ALTER TABLE pharmacy_products
ADD COLUMN brand_name VARCHAR,
ADD COLUMN presentation VARCHAR,
ADD COLUMN therapeutic_action VARCHAR,
ADD COLUMN symptoms_indications TEXT,
ADD COLUMN target_age_group VARCHAR,
ADD COLUMN image_url VARCHAR;

-- 2. Migrate active to status
ALTER TABLE pharmacy_products RENAME COLUMN active TO active_old;
ALTER TABLE pharmacy_products ADD COLUMN status VARCHAR DEFAULT 'ACTIVO';
UPDATE pharmacy_products SET status = CASE WHEN active_old = true THEN 'ACTIVO' ELSE 'SUSPENDIDO' END;
ALTER TABLE pharmacy_products DROP COLUMN active_old;

-- 3. Add Storage Bucket for pharmacy images if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pharmacy-images', 'pharmacy-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public reading
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE policyname = 'Public Access to Pharmacy Images' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Public Access to Pharmacy Images"
        ON storage.objects FOR SELECT
        USING ( bucket_id = 'pharmacy-images' );
    END IF;
END
$$;

-- Allow authenticated uploads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE policyname = 'Auth Upload to Pharmacy Images' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Auth Upload to Pharmacy Images"
        ON storage.objects FOR INSERT
        WITH CHECK ( bucket_id = 'pharmacy-images' AND auth.role() = 'authenticated' );
    END IF;
END
$$;

-- 4. Re-create views to point to status instead of active
DROP VIEW IF EXISTS vw_pharmacy_alerts;
DROP VIEW IF EXISTS vw_pharmacy_stock;

CREATE VIEW vw_pharmacy_stock AS
SELECT 
    p.id as product_id,
    p.drug_code,
    p.drug_name,
    p.generic_name,
    p.category,
    p.unit,
    p.stock_minimum,
    p.status,
    p.brand_name,
    p.presentation,
    p.therapeutic_action,
    p.target_age_group,
    p.image_url,
    COALESCE(SUM(l.stock_current), 0) as total_stock,
    COUNT(l.id) as active_lots
FROM pharmacy_products p
LEFT JOIN pharmacy_lots l ON l.product_id = p.id AND l.status = 'ACTIVE'
GROUP BY p.id;

CREATE VIEW vw_pharmacy_alerts AS
SELECT 
    product_id,
    drug_code,
    drug_name,
    total_stock,
    stock_minimum,
    status
FROM vw_pharmacy_stock
WHERE total_stock <= stock_minimum 
  AND status = 'ACTIVO';
