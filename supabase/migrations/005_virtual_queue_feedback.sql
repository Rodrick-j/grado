-- ================================================================
-- HOSPITAL SAN JUAN DE DIOS — PROJECT FARO
-- MIGRATION 005: VIRTUAL QUEUE FEEDBACK & APPOINTMENT BOOKING
-- ================================================================

-- 1. Añadir columnas de retroalimentación a la tabla virtual_queue
ALTER TABLE virtual_queue
ADD COLUMN IF NOT EXISTS rating INT CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS feedback_comments TEXT,
ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMPTZ;

-- 2. Crear función RPC para registrar paciente y agendar cita (Doctoralia style)
CREATE OR REPLACE FUNCTION register_and_book_appointment(
    p_first_name VARCHAR(80),
    p_last_name VARCHAR(80),
    p_birth_date DATE,
    p_gender VARCHAR(20),
    p_ci_passport VARCHAR(40),
    p_phone VARCHAR(25),
    p_email VARCHAR(150),
    p_specialty_id UUID,
    p_starts_at TIMESTAMPTZ
)
RETURNS TABLE (
    appointment_id UUID,
    starts_at TIMESTAMPTZ,
    professional_name VARCHAR(150),
    patient_mrn VARCHAR(25)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_patient_id UUID;
    v_gender_enum gender_type;
    v_prof_id UUID;
    v_prof_name VARCHAR(150);
    v_mrn VARCHAR(25);
    v_ends_at TIMESTAMPTZ;
    v_appt_id UUID;
BEGIN
    -- 1. Validar e instanciar el tipo de género
    v_gender_enum := p_gender::gender_type;
    
    -- 2. Definir duración de la cita (30 minutos por defecto)
    v_ends_at := p_starts_at + INTERVAL '30 minutes';

    -- 3. Buscar si el paciente ya existe por DNI/Cédula
    SELECT id, mrn INTO v_patient_id, v_mrn FROM patients WHERE ci_passport = p_ci_passport LIMIT 1;

    -- 4. Si no existe, crear el registro del paciente
    IF v_patient_id IS NULL THEN
        INSERT INTO patients (first_name, last_name, birth_date, gender, ci_passport, phone_primary, email)
        VALUES (p_first_name, p_last_name, p_birth_date, v_gender_enum, p_ci_passport, p_phone, p_email)
        RETURNING id, mrn INTO v_patient_id, v_mrn;
    END IF;

    -- 5. Seleccionar un profesional activo asignado a esa especialidad
    SELECT p.id, up.full_name INTO v_prof_id, v_prof_name
    FROM professionals p
    JOIN user_profiles up ON p.user_id = up.id
    WHERE p.specialty_id = p_specialty_id AND up.active = TRUE
    LIMIT 1;

    -- 6. Si no hay profesionales en esa especialidad, lanzar excepción
    IF v_prof_id IS NULL THEN
        RAISE EXCEPTION 'No hay médicos disponibles para la especialidad seleccionada.';
    END IF;

    -- 7. Insertar la cita programada
    INSERT INTO appointments (patient_id, professional_id, specialty_id, starts_at, ends_at, visit_type, status, reason)
    VALUES (v_patient_id, v_prof_id, p_specialty_id, p_starts_at, v_ends_at, 'CONSULTATION', 'SCHEDULED', 'Cita agendada vía Portal Web PWA')
    RETURNING id INTO v_appt_id;

    -- 8. Retornar los datos de la cita registrada
    RETURN QUERY
    SELECT v_appt_id, p_starts_at, v_prof_name, v_mrn;
END;
$$;

-- 3. Otorgar permisos de ejecución de la nueva función a roles públicos
GRANT EXECUTE ON FUNCTION register_and_book_appointment TO anon;
GRANT EXECUTE ON FUNCTION register_and_book_appointment TO authenticated;
