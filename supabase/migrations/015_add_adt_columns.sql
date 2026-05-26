-- MIGRATION 015: Add ADT specific columns to patients
ALTER TABLE public.patients
ADD COLUMN current_location VARCHAR(120),
ADD COLUMN triage_level triage_level,
ADD COLUMN chief_complaint TEXT,
ADD COLUMN critical_alerts TEXT;
