-- ==============================================================================
-- Migration: 010_adt_triggers_sanitization.sql
-- Description: Sanitization (UPPERCASE, TRIM), Regex validation, and Duplicate blocking
-- ==============================================================================

-- 1. Function to sanitize and validate patient data
CREATE OR REPLACE FUNCTION sanitize_patient_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove excessive spaces and trim edges
    NEW.first_name = TRIM(REGEXP_REPLACE(NEW.first_name, '\s+', ' ', 'g'));
    NEW.middle_name = TRIM(REGEXP_REPLACE(NEW.middle_name, '\s+', ' ', 'g'));
    NEW.last_name = TRIM(REGEXP_REPLACE(NEW.last_name, '\s+', ' ', 'g'));
    NEW.second_last_name = TRIM(REGEXP_REPLACE(NEW.second_last_name, '\s+', ' ', 'g'));

    -- Convert all to UPPERCASE
    IF NEW.first_name IS NOT NULL THEN NEW.first_name = UPPER(NEW.first_name); END IF;
    IF NEW.middle_name IS NOT NULL THEN NEW.middle_name = UPPER(NEW.middle_name); END IF;
    IF NEW.last_name IS NOT NULL THEN NEW.last_name = UPPER(NEW.last_name); END IF;
    IF NEW.second_last_name IS NOT NULL THEN NEW.second_last_name = UPPER(NEW.second_last_name); END IF;

    -- Validate Names (Only letters and spaces)
    IF NEW.first_name IS NOT NULL AND NEW.first_name !~ '^[A-ZÁÉÍÓÚÑ ]+$' THEN
        RAISE EXCEPTION 'El nombre solo puede contener letras y espacios.';
    END IF;
    IF NEW.middle_name IS NOT NULL AND NEW.middle_name != '' AND NEW.middle_name !~ '^[A-ZÁÉÍÓÚÑ ]+$' THEN
        RAISE EXCEPTION 'El segundo nombre solo puede contener letras y espacios.';
    END IF;
    IF NEW.last_name IS NOT NULL AND NEW.last_name !~ '^[A-ZÁÉÍÓÚÑ ]+$' THEN
        RAISE EXCEPTION 'El apellido paterno solo puede contener letras y espacios.';
    END IF;
    IF NEW.second_last_name IS NOT NULL AND NEW.second_last_name != '' AND NEW.second_last_name !~ '^[A-ZÁÉÍÓÚÑ ]+$' THEN
        RAISE EXCEPTION 'El apellido materno solo puede contener letras y espacios.';
    END IF;

    -- Validate Numbers (ci_passport, phones)
    IF NEW.ci_passport IS NOT NULL AND NEW.ci_passport != '' AND NEW.ci_passport !~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'El documento de identidad (CI/Pasaporte) solo puede contener números.';
    END IF;
    IF NEW.phone_primary IS NOT NULL AND NEW.phone_primary != '' AND NEW.phone_primary !~ '^[0-9+ \-]+$' THEN
        RAISE EXCEPTION 'El teléfono principal solo puede contener números y signos permitidos.';
    END IF;
    IF NEW.phone_secondary IS NOT NULL AND NEW.phone_secondary != '' AND NEW.phone_secondary !~ '^[0-9+ \-]+$' THEN
        RAISE EXCEPTION 'El teléfono secundario solo puede contener números y signos permitidos.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS before_insert_update_patient ON patients;
CREATE TRIGGER before_insert_update_patient
BEFORE INSERT OR UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION sanitize_patient_data();

-- 3. Unique Constraints

-- Candado 1: Documento Único (ignorar strings vacíos si existieran, pero en general unique constraint)
-- Eliminamos la restricción si ya existía para evitar errores al re-correr
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_ci_passport_key;
ALTER TABLE patients ADD CONSTRAINT patients_ci_passport_key UNIQUE (ci_passport);

-- Candado 2: Identidad Única (Primer Nombre + Apellido Paterno + Fecha de Nacimiento)
DROP INDEX IF EXISTS idx_patients_unique_identity;
CREATE UNIQUE INDEX idx_patients_unique_identity 
ON patients (first_name, last_name, birth_date);

