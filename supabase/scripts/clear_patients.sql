-- clear_patients.sql
-- Borrar todos los registros relacionados con pacientes.
BEGIN;

-- 1. Dispensing Log
DELETE FROM dispensing_log WHERE patient_id IS NOT NULL;

-- 2. Appointments (ejemplo de tabla que referencia pacientes)
DELETE FROM appointments WHERE patient_id IS NOT NULL;

-- 3. Consultations
DELETE FROM consultations WHERE patient_id IS NOT NULL;

-- 4. Medical Records
DELETE FROM medical_records WHERE patient_id IS NOT NULL;

-- 5. Admissions
DELETE FROM admissions WHERE patient_id IS NOT NULL;

-- 6. Prescriptions
DELETE FROM prescriptions WHERE patient_id IS NOT NULL;

-- 7. Pharmacy Inventory (si tiene patient_id)
DELETE FROM pharmacy_inventory WHERE patient_id IS NOT NULL;

-- 8. Patients (tabla principal)
DELETE FROM patients;

COMMIT;
