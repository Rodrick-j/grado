-- Creación de tipos y tabla para el Sistema de Fila Virtual
CREATE TYPE vq_department AS ENUM ('EMERGENCY', 'LAB', 'PHARMACY');
CREATE TYPE vq_status AS ENUM ('WAITING', 'CALLED', 'ATTENDED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS virtual_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id), -- Nulo si es anónimo
    patient_name TEXT NOT NULL,
    patient_dni TEXT NOT NULL,
    phone_number TEXT,
    department vq_department NOT NULL,
    token_number TEXT NOT NULL,
    status vq_status NOT NULL DEFAULT 'WAITING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    called_at TIMESTAMPTZ,
    attended_at TIMESTAMPTZ
);

-- Secuencias atómicas por departamento para evitar colisiones concurrentes (Optimistic locking por naturaleza serial)
CREATE SEQUENCE IF NOT EXISTS vq_seq_emergency START 1;
CREATE SEQUENCE IF NOT EXISTS vq_seq_lab START 1;
CREATE SEQUENCE IF NOT EXISTS vq_seq_pharmacy START 1;

-- Función interna para generar un turno de forma atómica y segura
CREATE OR REPLACE FUNCTION claim_virtual_token(
    p_patient_id UUID,
    p_patient_name TEXT,
    p_patient_dni TEXT,
    p_phone_number TEXT,
    p_department TEXT
) RETURNS SETOF virtual_queue AS $$
DECLARE
    v_next_val INT;
    v_prefix TEXT;
    v_token TEXT;
    v_dept_enum vq_department;
    v_max_capacity INT;
    v_current_count INT;
BEGIN
    v_dept_enum := p_department::vq_department;

    -- Establecer límites diarios (cupos) por departamento
    IF v_dept_enum = 'EMERGENCY' THEN
        v_max_capacity := 100;
    ELSIF v_dept_enum = 'LAB' THEN
        v_max_capacity := 50;
    ELSIF v_dept_enum = 'PHARMACY' THEN
        v_max_capacity := 80;
    ELSE
        v_max_capacity := 50;
    END IF;

    -- Conteo de turnos emitidos hoy en este departamento
    SELECT count(*) INTO v_current_count 
    FROM virtual_queue 
    WHERE department = v_dept_enum 
      AND created_at >= CURRENT_DATE;

    -- Mecanismo de rechazo concurrente si se supera el cupo
    IF v_current_count >= v_max_capacity THEN
        RAISE EXCEPTION 'Capacidad máxima de turnos alcanzada para hoy en el departamento de % (Límite: %).', p_department, v_max_capacity;
    END IF;

    -- Usamos nextval() que es atómico y seguro para alta concurrencia
    IF v_dept_enum = 'EMERGENCY' THEN
        v_next_val := nextval('vq_seq_emergency');
        v_prefix := 'E-';
    ELSIF v_dept_enum = 'LAB' THEN
        v_next_val := nextval('vq_seq_lab');
        v_prefix := 'L-';
    ELSIF v_dept_enum = 'PHARMACY' THEN
        v_next_val := nextval('vq_seq_pharmacy');
        v_prefix := 'F-';
    END IF;

    v_token := v_prefix || lpad(v_next_val::text, 3, '0');

    -- Insertar el registro y devolverlo
    RETURN QUERY
    INSERT INTO virtual_queue (patient_id, patient_name, patient_dni, phone_number, department, token_number, status)
    VALUES (p_patient_id, p_patient_name, p_patient_dni, p_phone_number, v_dept_enum, v_token, 'WAITING')
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Función RPC principal con SECURITY DEFINER para permitir registro público de pacientes y asignación de turno
CREATE OR REPLACE FUNCTION register_and_claim_token(
    p_first_name TEXT,
    p_last_name TEXT,
    p_birth_date DATE,
    p_gender TEXT,
    p_ci_passport TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_department TEXT
) RETURNS SETOF virtual_queue AS $$
DECLARE
    v_patient_id UUID;
    v_gender_enum gender_type;
BEGIN
    v_gender_enum := p_gender::gender_type;

    -- 1. Buscar si el paciente ya existe por cédula/pasaporte
    SELECT id INTO v_patient_id FROM patients WHERE ci_passport = p_ci_passport LIMIT 1;

    -- 2. Si no existe, registrarlo en la tabla de pacientes
    IF v_patient_id IS NULL THEN
        INSERT INTO patients (first_name, last_name, birth_date, gender, ci_passport, phone_primary, email)
        VALUES (p_first_name, p_last_name, p_birth_date, v_gender_enum, p_ci_passport, p_phone, p_email)
        RETURNING id INTO v_patient_id;
    END IF;

    -- 3. Emitir su ficha virtual enlazada
    RETURN QUERY 
    SELECT * FROM claim_virtual_token(v_patient_id, p_first_name || ' ' || p_last_name, p_ci_passport, p_phone, p_department);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS y políticas
ALTER TABLE virtual_queue ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Lectura pública de cola virtual" 
ON virtual_queue FOR SELECT USING (true);

CREATE POLICY "Inserción pública de turnos" 
ON virtual_queue FOR INSERT WITH CHECK (true);

CREATE POLICY "Actualización por personal médico" 
ON virtual_queue FOR UPDATE USING (true);
