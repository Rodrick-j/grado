-- ================================================================
-- HOSPITAL SAN JUAN DE DIOS — PROJECT FARO
-- MIGRATION 013: AMBULANCE DISPATCH SYSTEM
-- ================================================================

-- 1. Create table for ambulance requests
CREATE TABLE IF NOT EXISTS ambulance_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  latitude              DOUBLE PRECISION NOT NULL,
  longitude             DOUBLE PRECISION NOT NULL,
  triage_level          TEXT NOT NULL CHECK (triage_level IN ('RED', 'ORANGE', 'YELLOW')),
  chief_complaint       TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DISPATCHED', 'ARRIVED', 'COMPLETED', 'CANCELLED')),
  assigned_vehicle_code VARCHAR(50) DEFAULT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE ambulance_requests ENABLE ROW LEVEL SECURITY;

-- 3. Create permissive policies for development and testing
CREATE POLICY "Allow public insert" ON ambulance_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select" ON ambulance_requests
  FOR SELECT USING (true);

CREATE POLICY "Allow public update" ON ambulance_requests
  FOR UPDATE USING (true);

-- 4. Create function to register patient and request ambulance
CREATE OR REPLACE FUNCTION register_and_request_ambulance(
    p_first_name TEXT,
    p_last_name TEXT,
    p_birth_date DATE,
    p_gender TEXT,
    p_ci_passport TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_triage_level TEXT,
    p_chief_complaint TEXT
) RETURNS SETOF ambulance_requests AS $$
DECLARE
    v_patient_id UUID;
    v_gender_enum gender_type;
BEGIN
    v_gender_enum := p_gender::gender_type;

    -- Buscar si el paciente ya existe por cédula/pasaporte
    SELECT id INTO v_patient_id FROM patients WHERE ci_passport = p_ci_passport LIMIT 1;

    -- Si no existe, registrarlo en la tabla de pacientes
    IF v_patient_id IS NULL THEN
        INSERT INTO patients (first_name, last_name, birth_date, gender, ci_passport, phone_primary, email)
        VALUES (p_first_name, p_last_name, p_birth_date, v_gender_enum, p_ci_passport, p_phone, p_email)
        RETURNING id INTO v_patient_id;
    END IF;

    -- Insertar la solicitud de ambulancia
    RETURN QUERY
    INSERT INTO ambulance_requests (patient_id, latitude, longitude, triage_level, chief_complaint, status)
    VALUES (v_patient_id, p_latitude, p_longitude, p_triage_level, p_chief_complaint, 'PENDING')
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enable Supabase Realtime for the table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ambulance_requests;
  END IF;
END $$;
