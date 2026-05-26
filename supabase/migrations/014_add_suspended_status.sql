-- Alter patient_status enum to add SUSPENDED
ALTER TYPE patient_status ADD VALUE IF NOT EXISTS 'SUSPENDED';
