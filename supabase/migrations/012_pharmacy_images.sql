-- MIGRATION 012: PHARMACY IMAGES
-- Adds image_url column to store compressed base64 images

ALTER TABLE pharmacy_products
  ADD COLUMN IF NOT EXISTS image_data TEXT;
