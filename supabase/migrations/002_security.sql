-- ================================================================
-- HOSPITAL SAN JUAN DE DIOS — PROJECT FARO
-- MIGRATION 002: SECURITY — Row Level Security Policies
-- ================================================================

-- ─── Enable RLS on all tables ───────────────────────────────
ALTER TABLE user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_queue       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE interconsults      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE imaging_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispensing_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;

-- ─── Helper functions (SECURITY DEFINER = bypass RLS for helpers) ──

-- Get current user's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

-- Check if current user is active
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(active, FALSE) FROM user_profiles WHERE id = auth.uid();
$$;

-- Check role membership (helper for cleaner policies)
CREATE OR REPLACE FUNCTION has_role(roles user_role[])
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT auth_role() = ANY(roles) AND is_active_user();
$$;

-- ================================================================
-- POLICIES: SPECIALTIES
-- ================================================================
-- All authenticated active users can read specialties
DROP POLICY IF EXISTS "sp_read" ON specialties;
CREATE POLICY "sp_read" ON specialties FOR SELECT TO authenticated
  USING (is_active_user());

-- Only admins can modify specialties
DROP POLICY IF EXISTS "sp_write" ON specialties;
CREATE POLICY "sp_write" ON specialties FOR ALL TO authenticated
  USING (has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR']::user_role[]));

-- ================================================================
-- POLICIES: USER PROFILES
-- ================================================================
-- Users see their own profile; admins/auditors see all
DROP POLICY IF EXISTS "up_read_own" ON user_profiles;
CREATE POLICY "up_read_own" ON user_profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR','AUDITOR']::user_role[])
  );

-- Users update only their own (non-role fields); admins update all
DROP POLICY IF EXISTS "up_update_own" ON user_profiles;
CREATE POLICY "up_update_own" ON user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "up_admin_all" ON user_profiles;
CREATE POLICY "up_admin_all" ON user_profiles FOR ALL TO authenticated
  USING (has_role(ARRAY['SUPER_ADMIN']::user_role[]));

-- ================================================================
-- POLICIES: PROFESSIONALS
-- ================================================================
-- Clinical staff can read professional directory
DROP POLICY IF EXISTS "prof_read" ON professionals;
CREATE POLICY "prof_read" ON professionals FOR SELECT TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT',
    'NURSE','AUDITOR','RECEPTIONIST','LAB_TECHNICIAN','RADIOLOGIST','PHARMACIST'
  ]::user_role[]));

-- Admins can insert new professionals
DROP POLICY IF EXISTS "prof_insert" ON professionals;
CREATE POLICY "prof_insert" ON professionals FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR']::user_role[]));

-- Admins can update; professionals can update own record
DROP POLICY IF EXISTS "prof_update" ON professionals;
CREATE POLICY "prof_update" ON professionals FOR UPDATE TO authenticated
  USING (
    has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR']::user_role[])
    OR user_id = auth.uid()
  );

-- Only super admin can delete (logical soft-delete preferred)
DROP POLICY IF EXISTS "prof_delete" ON professionals;
CREATE POLICY "prof_delete" ON professionals FOR DELETE TO authenticated
  USING (has_role(ARRAY['SUPER_ADMIN']::user_role[]));

-- ================================================================
-- POLICIES: PATIENTS
-- ================================================================
-- Clinical roles can read ALL patient data
DROP POLICY IF EXISTS "pat_clinical_read" ON patients;
CREATE POLICY "pat_clinical_read" ON patients FOR SELECT TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT','NURSE','AUDITOR'
  ]::user_role[]));

-- Receptionists/Billing see demographic data only (via view, not raw table)
-- Raw table access for reception: INSERT only, SELECT filtered
DROP POLICY IF EXISTS "pat_reception_read" ON patients;
CREATE POLICY "pat_reception_read" ON patients FOR SELECT TO authenticated
  USING (has_role(ARRAY['RECEPTIONIST','BILLING']::user_role[]));

-- Registration: reception, nurse, doctor, admin can admit new patients
DROP POLICY IF EXISTS "pat_insert" ON patients;
CREATE POLICY "pat_insert" ON patients FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','RECEPTIONIST','NURSE','DOCTOR'
  ]::user_role[]));

-- Update patient demographics: reception + above
DROP POLICY IF EXISTS "pat_update" ON patients;
CREATE POLICY "pat_update" ON patients FOR UPDATE TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','RECEPTIONIST','DOCTOR','NURSE'
  ]::user_role[]));

-- Hard delete: super admin only (use status='DECEASED' in practice)
DROP POLICY IF EXISTS "pat_delete" ON patients;
CREATE POLICY "pat_delete" ON patients FOR DELETE TO authenticated
  USING (has_role(ARRAY['SUPER_ADMIN']::user_role[]));

-- ================================================================
-- POLICIES: APPOINTMENTS
-- ================================================================
DROP POLICY IF EXISTS "appt_read" ON appointments;
CREATE POLICY "appt_read" ON appointments FOR SELECT TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT',
    'NURSE','RECEPTIONIST','AUDITOR'
  ]::user_role[]));

DROP POLICY IF EXISTS "appt_insert" ON appointments;
CREATE POLICY "appt_insert" ON appointments FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RECEPTIONIST'
  ]::user_role[]));

DROP POLICY IF EXISTS "appt_update" ON appointments;
CREATE POLICY "appt_update" ON appointments FOR UPDATE TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RECEPTIONIST'
  ]::user_role[]));

-- ================================================================
-- POLICIES: TRIAGE QUEUE
-- ================================================================
DROP POLICY IF EXISTS "triage_read" ON triage_queue;
CREATE POLICY "triage_read" ON triage_queue FOR SELECT TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT','NURSE','AUDITOR'
  ]::user_role[]));

DROP POLICY IF EXISTS "triage_insert" ON triage_queue;
CREATE POLICY "triage_insert" ON triage_queue FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','NURSE'
  ]::user_role[]));

DROP POLICY IF EXISTS "triage_update" ON triage_queue;
CREATE POLICY "triage_update" ON triage_queue FOR UPDATE TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','NURSE'
  ]::user_role[]));

-- ================================================================
-- POLICIES: CLINICAL RECORDS (EHR) — Most sensitive
-- ================================================================
-- Doctors/residents/nurses can read EHR
DROP POLICY IF EXISTS "cr_read" ON clinical_records;
CREATE POLICY "cr_read" ON clinical_records FOR SELECT TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT',
    'NURSE','RADIOLOGIST','LAB_TECHNICIAN','PHARMACIST','AUDITOR'
  ]::user_role[]));

-- Only doctors/residents can create new records
DROP POLICY IF EXISTS "cr_insert" ON clinical_records;
CREATE POLICY "cr_insert" ON clinical_records FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT'
  ]::user_role[]));

-- Can only update UNLOCKED records; residents flagged for review
DROP POLICY IF EXISTS "cr_update" ON clinical_records;
CREATE POLICY "cr_update" ON clinical_records FOR UPDATE TO authenticated
  USING (
    NOT is_locked
    AND has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT']::user_role[])
  );

-- No hard deletes on clinical records — EVER
DROP POLICY IF EXISTS "cr_no_delete" ON clinical_records;
CREATE POLICY "cr_no_delete" ON clinical_records FOR DELETE TO authenticated
  USING (FALSE); -- Blocks ALL deletes

-- ================================================================
-- POLICIES: PRESCRIPTIONS
-- ================================================================
DROP POLICY IF EXISTS "rx_read" ON prescriptions;
CREATE POLICY "rx_read" ON prescriptions FOR SELECT TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT',
    'NURSE','PHARMACIST','AUDITOR'
  ]::user_role[]));

DROP POLICY IF EXISTS "rx_insert" ON prescriptions;
CREATE POLICY "rx_insert" ON prescriptions FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT'
  ]::user_role[]));

DROP POLICY IF EXISTS "rx_update" ON prescriptions;
CREATE POLICY "rx_update" ON prescriptions FOR UPDATE TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','DOCTOR','PHARMACIST'
  ]::user_role[]));

-- ================================================================
-- POLICIES: INTERCONSULTAS
-- ================================================================
DROP POLICY IF EXISTS "ic_read" ON interconsults;
CREATE POLICY "ic_read" ON interconsults FOR SELECT TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT','AUDITOR'
  ]::user_role[]));

DROP POLICY IF EXISTS "ic_insert" ON interconsults;
CREATE POLICY "ic_insert" ON interconsults FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT'
  ]::user_role[]));

DROP POLICY IF EXISTS "ic_update" ON interconsults;
CREATE POLICY "ic_update" ON interconsults FOR UPDATE TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR'
  ]::user_role[]));

-- ================================================================
-- POLICIES: LAB ORDERS
-- ================================================================
DROP POLICY IF EXISTS "lab_read" ON lab_orders;
CREATE POLICY "lab_read" ON lab_orders FOR SELECT TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT',
    'NURSE','LAB_TECHNICIAN','AUDITOR'
  ]::user_role[]));

DROP POLICY IF EXISTS "lab_insert" ON lab_orders;
CREATE POLICY "lab_insert" ON lab_orders FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT'
  ]::user_role[]));

DROP POLICY IF EXISTS "lab_update" ON lab_orders;
CREATE POLICY "lab_update" ON lab_orders FOR UPDATE TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','DOCTOR','LAB_TECHNICIAN'
  ]::user_role[]));

-- ================================================================
-- POLICIES: IMAGING ORDERS
-- ================================================================
DROP POLICY IF EXISTS "img_read" ON imaging_orders;
CREATE POLICY "img_read" ON imaging_orders FOR SELECT TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT',
    'NURSE','RADIOLOGIST','AUDITOR'
  ]::user_role[]));

DROP POLICY IF EXISTS "img_insert" ON imaging_orders;
CREATE POLICY "img_insert" ON imaging_orders FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT'
  ]::user_role[]));

DROP POLICY IF EXISTS "img_update" ON imaging_orders;
CREATE POLICY "img_update" ON imaging_orders FOR UPDATE TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','DOCTOR','RADIOLOGIST'
  ]::user_role[]));

-- ================================================================
-- POLICIES: PHARMACY INVENTORY
-- ================================================================
DROP POLICY IF EXISTS "pharma_read" ON pharmacy_inventory;
CREATE POLICY "pharma_read" ON pharmacy_inventory FOR SELECT TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','PHARMACIST','DOCTOR','AUDITOR'
  ]::user_role[]));

DROP POLICY IF EXISTS "pharma_write" ON pharmacy_inventory;
CREATE POLICY "pharma_write" ON pharmacy_inventory FOR ALL TO authenticated
  USING (has_role(ARRAY['SUPER_ADMIN','PHARMACIST']::user_role[]));

-- ================================================================
-- POLICIES: DISPENSING LOG (APPEND-ONLY)
-- ================================================================
DROP POLICY IF EXISTS "disp_read" ON dispensing_log;
CREATE POLICY "disp_read" ON dispensing_log FOR SELECT TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','PHARMACIST','AUDITOR'
  ]::user_role[]));

DROP POLICY IF EXISTS "disp_insert" ON dispensing_log;
CREATE POLICY "disp_insert" ON dispensing_log FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['SUPER_ADMIN','PHARMACIST']::user_role[]));

-- NO UPDATE / DELETE on dispensing_log (audit compliance)
DROP POLICY IF EXISTS "disp_no_update" ON dispensing_log;
CREATE POLICY "disp_no_update" ON dispensing_log FOR UPDATE TO authenticated
  USING (FALSE);
DROP POLICY IF EXISTS "disp_no_delete" ON dispensing_log;
CREATE POLICY "disp_no_delete" ON dispensing_log FOR DELETE TO authenticated
  USING (FALSE);

-- ================================================================
-- POLICIES: AUDIT LOGS (READ-ONLY for non-admins)
-- ================================================================
DROP POLICY IF EXISTS "audit_read" ON audit_logs;
CREATE POLICY "audit_read" ON audit_logs FOR SELECT TO authenticated
  USING (has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR','AUDITOR']::user_role[]));

-- System inserts via SECURITY DEFINER functions only; no user inserts
DROP POLICY IF EXISTS "audit_no_user_insert" ON audit_logs;
CREATE POLICY "audit_no_user_insert" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (FALSE); -- Only fn_audit_insert (SECURITY DEFINER) bypasses this

DROP POLICY IF EXISTS "audit_no_update" ON audit_logs;
CREATE POLICY "audit_no_update" ON audit_logs FOR UPDATE TO authenticated
  USING (FALSE);
DROP POLICY IF EXISTS "audit_no_delete" ON audit_logs;
CREATE POLICY "audit_no_delete" ON audit_logs FOR DELETE TO authenticated
  USING (FALSE);

-- ================================================================
-- AUDIT INSERT FUNCTION (bypasses RLS via SECURITY DEFINER)
-- ================================================================
CREATE OR REPLACE FUNCTION fn_audit_insert(
  p_action        VARCHAR,
  p_resource_type VARCHAR DEFAULT NULL,
  p_resource_id   UUID    DEFAULT NULL,
  p_old_values    JSONB   DEFAULT NULL,
  p_new_values    JSONB   DEFAULT NULL,
  p_outcome       audit_outcome DEFAULT 'SUCCESS',
  p_error         TEXT    DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_logs(user_id, user_role, action, resource_type, resource_id,
                         old_values, new_values, outcome, error_detail)
  VALUES (auth.uid(), auth_role(), p_action, p_resource_type, p_resource_id,
          p_old_values, p_new_values, p_outcome, p_error);
END;
$$;

-- ================================================================
-- SECURITY VIEW: Patients (Receptionist — demographics only)
-- ================================================================
CREATE OR REPLACE VIEW v_patients_demographics AS
  SELECT id, mrn, first_name, middle_name, last_name, second_last_name,
         birth_date, gender, ci_type, ci_passport, phone_primary, phone_secondary,
         email, address_line1, city, country, postal_code,
         emergency_name, emergency_relation, emergency_phone,
         insurance_provider, insurance_policy_num, insurance_valid_until,
         status, created_at
  FROM patients;

-- ================================================================
-- SEED: 20 Medical Specialties
-- ================================================================
INSERT INTO specialties (code,name,description,wing,floor,rooms,color,emergency_capable) VALUES
('CARD','Cardiología','Diagnóstico y tratamiento de enfermedades cardiovasculares','Ala Norte',3,ARRAY['CN-301','CN-302','CN-303','CN-304'],'#F44336',TRUE),
('PED','Pediatría','Atención médica integral para pacientes desde recién nacidos hasta 18 años','Ala Este',2,ARRAY['CE-201','CE-202','CE-203','CE-204','CE-205'],'#FF9800',TRUE),
('CIRUG','Cirugía General','Procedimientos quirúrgicos abdominales, laparoscópicos y de urgencias','Ala Sur',4,ARRAY['CS-401','CS-402','CS-403'],'#9C27B0',TRUE),
('MINT','Medicina Interna','Diagnóstico y manejo de enfermedades sistémicas complejas','Ala Norte',2,ARRAY['CN-201','CN-202','CN-203','CN-204','CN-205','CN-206'],'#1E88E5',FALSE),
('GOBS','Ginecología & Obstetricia','Salud de la mujer, control prenatal, partos y cirugías','Ala Este',3,ARRAY['CE-301','CE-302','CE-303','CE-304'],'#E91E63',TRUE),
('TRAU','Traumatología & Ortopedia','Lesiones óseas, musculares y articulares','Ala Sur',2,ARRAY['CS-201','CS-202','CS-203','CS-204'],'#795548',TRUE),
('ONCO','Oncología','Diagnóstico, tratamiento y seguimiento de neoplasias','Ala Oeste',5,ARRAY['CO-501','CO-502','CO-503'],'#673AB7',FALSE),
('GAST','Gastroenterología','Enfermedades del aparato digestivo','Ala Norte',3,ARRAY['CN-305','CN-306'],'#4CAF50',FALSE),
('NEFR','Nefrología','Enfermedades renales y hemodiálisis','Ala Oeste',3,ARRAY['CO-301','CO-302','CO-303'],'#00BCD4',FALSE),
('RAD','Radiología & Imágenes','Diagnóstico por imágenes: RX, TAC, RM, Ecografías','Ala Sur',1,ARRAY['CS-101','CS-102','CS-103','CS-104'],'#607D8B',TRUE),
('NEUR','Neurología','Sistema nervioso central y periférico','Ala Norte',4,ARRAY['CN-401','CN-402','CN-403'],'#FF5722',TRUE),
('PSIQ','Psiquiatría','Salud mental y trastornos psiquiátricos','Ala Oeste',4,ARRAY['CO-401','CO-402','CO-403'],'#3F51B5',FALSE),
('DERM','Dermatología','Enfermedades de la piel y cirugía dermatológica','Ala Este',1,ARRAY['CE-101','CE-102'],'#FFC107',FALSE),
('OFTAL','Oftalmología','Salud ocular: cataratas, glaucoma, retina','Ala Este',2,ARRAY['CE-206','CE-207'],'#009688',FALSE),
('ORL','Otorrinolaringología','Oído, nariz y garganta','Ala Norte',2,ARRAY['CN-207','CN-208'],'#8BC34A',FALSE),
('UROL','Urología','Sistema urinario y cirugía mínima invasiva','Ala Sur',3,ARRAY['CS-301','CS-302'],'#2196F3',FALSE),
('NEUM','Neumología','Enfermedades respiratorias y sueño','Ala Oeste',2,ARRAY['CO-201','CO-202'],'#00BCD4',TRUE),
('ENDO','Endocrinología','Sistema endocrino: diabetes, tiroides, metabolismo','Ala Norte',1,ARRAY['CN-101','CN-102'],'#FF9800',FALSE),
('REUM','Reumatología','Artritis, lupus y enfermedades autoinmunes','Ala Oeste',1,ARRAY['CO-101','CO-102'],'#E91E63',FALSE),
('EMER','Medicina de Emergencias','Urgencias médicas 24/7, trauma y reanimación','Acceso Principal',0,ARRAY['ER-001','ER-002','ER-003','ER-004','ER-005','ER-006','ER-007','ER-008'],'#F44336',TRUE)
ON CONFLICT (code) DO NOTHING;
