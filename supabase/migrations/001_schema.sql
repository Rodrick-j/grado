-- ================================================================
-- HOSPITAL SAN JUAN DE DIOS — PROJECT FARO
-- MIGRATION 001: SCHEMA — Types, Tables, Indexes, Triggers
-- PostgreSQL / Supabase — Ordered for zero FK conflicts
-- ================================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── ENUMS ──────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT',
  'NURSE','LAB_TECHNICIAN','RADIOLOGIST','PHARMACIST',
  'RECEPTIONIST','BILLING','AUDITOR'
);
CREATE TYPE gender_type       AS ENUM ('MALE','FEMALE','OTHER','PREFER_NOT_SAY');
CREATE TYPE blood_type        AS ENUM ('A+','A-','B+','B-','AB+','AB-','O+','O-','UNKNOWN');
CREATE TYPE marital_status    AS ENUM ('SINGLE','MARRIED','DIVORCED','WIDOWED','OTHER');
CREATE TYPE contract_type     AS ENUM ('PERMANENT','FEES','RESIDENT','INTERN','CONTRACT');
CREATE TYPE shift_type        AS ENUM ('MORNING','AFTERNOON','NIGHT','ROTATING');
CREATE TYPE patient_status    AS ENUM ('ACTIVE','HOSPITALIZED','OUTPATIENT','DISCHARGED','DECEASED');
CREATE TYPE appt_status       AS ENUM ('SCHEDULED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW');
CREATE TYPE triage_level      AS ENUM ('RED','ORANGE','YELLOW','GREEN','BLUE');
CREATE TYPE lab_priority      AS ENUM ('ROUTINE','URGENT','STAT');
CREATE TYPE lab_status        AS ENUM ('ORDERED','SAMPLE_COLLECTED','PROCESSING','COMPLETED','CANCELLED');
CREATE TYPE imaging_modality  AS ENUM ('XR','CT','MRI','US','PET','MAMMO','FLUORO');
CREATE TYPE imaging_status    AS ENUM ('ORDERED','SCHEDULED','COMPLETED','REPORTED','CANCELLED');
CREATE TYPE allergy_severity  AS ENUM ('MILD','MODERATE','SEVERE','ANAPHYLAXIS');
CREATE TYPE rx_status         AS ENUM ('ACTIVE','COMPLETED','CANCELLED','SUSPENDED');
CREATE TYPE audit_outcome     AS ENUM ('SUCCESS','FAILED','BLOCKED');
CREATE TYPE consult_status    AS ENUM ('PENDING','ACCEPTED','IN_PROGRESS','COMPLETED','REJECTED');
CREATE TYPE consult_priority  AS ENUM ('ROUTINE','URGENT','STAT');

-- ================================================================
-- LAYER 1: No foreign key dependencies
-- ================================================================

-- 1. SPECIALTIES
CREATE TABLE specialties (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code              VARCHAR(10) NOT NULL UNIQUE,
  name              VARCHAR(100)NOT NULL,
  description       TEXT,
  wing              VARCHAR(60),
  floor             SMALLINT    DEFAULT 0,
  rooms             TEXT[]      DEFAULT '{}',
  color             VARCHAR(7)  DEFAULT '#1E88E5',
  emergency_capable BOOLEAN     DEFAULT FALSE,
  active            BOOLEAN     DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- LAYER 2: Depends on auth.users + specialties
-- ================================================================

-- 2. USER PROFILES (extends Supabase auth.users 1:1)
CREATE TABLE user_profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       VARCHAR(150)NOT NULL,
  role            user_role   NOT NULL DEFAULT 'RECEPTIONIST',
  specialty_id    UUID        REFERENCES specialties(id) ON DELETE SET NULL,
  avatar_url      TEXT,
  phone           VARCHAR(25),
  active          BOOLEAN     DEFAULT TRUE,
  must_change_pwd BOOLEAN     DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- LAYER 3: Depends on user_profiles + specialties
-- ================================================================

-- 3. PROFESSIONALS
CREATE TABLE professionals (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  title               VARCHAR(20) DEFAULT 'Dr.',
  license_number      VARCHAR(60) NOT NULL UNIQUE,
  license_country     VARCHAR(60),
  license_expires     DATE,
  license_verified    BOOLEAN     DEFAULT FALSE,
  specialty_id        UUID        NOT NULL REFERENCES specialties(id),
  subspecialty        VARCHAR(120),
  certifications      TEXT[]      DEFAULT '{}',
  years_experience    SMALLINT,
  graduated_from      VARCHAR(150),
  graduation_year     SMALLINT,
  contract_type       contract_type DEFAULT 'PERMANENT',
  hire_date           DATE,
  shift_preference    shift_type  DEFAULT 'MORNING',
  max_weekly_hours    SMALLINT    DEFAULT 48,
  on_call             BOOLEAN     DEFAULT FALSE,
  consulting_rooms    TEXT[]      DEFAULT '{}',
  specialty_extra     JSONB       DEFAULT '{}',
  status              VARCHAR(20) DEFAULT 'active',
  created_by          UUID        REFERENCES user_profiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- LAYER 4: Depends on professionals
-- ================================================================

-- 4. PATIENTS
CREATE TABLE patients (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  mrn                     VARCHAR(25) UNIQUE, -- auto-generated SJD-YYYY-NNNNN
  qr_code                 TEXT        UNIQUE,
  -- Identity
  first_name              VARCHAR(80) NOT NULL,
  middle_name             VARCHAR(80),
  last_name               VARCHAR(80) NOT NULL,
  second_last_name        VARCHAR(80),
  birth_date              DATE        NOT NULL,
  gender                  gender_type NOT NULL,
  blood_type              blood_type  DEFAULT 'UNKNOWN',
  marital_status          marital_status,
  nationality             VARCHAR(60),
  ci_type                 VARCHAR(20) DEFAULT 'CI', -- CI, PASSPORT, DL
  ci_passport             VARCHAR(40) NOT NULL,
  photo_url               TEXT,
  -- Contact
  email                   VARCHAR(150),
  phone_primary           VARCHAR(25) NOT NULL,
  phone_secondary         VARCHAR(25),
  -- Address
  address_line1           TEXT,
  address_line2           TEXT,
  city                    VARCHAR(80),
  state_province          VARCHAR(80),
  country                 VARCHAR(60) DEFAULT 'USA',
  postal_code             VARCHAR(15),
  -- Emergency Contact
  emergency_name          VARCHAR(150),
  emergency_relation      VARCHAR(60),
  emergency_phone         VARCHAR(25),
  emergency_email         VARCHAR(150),
  -- Insurance
  insurance_provider      VARCHAR(120),
  insurance_policy_num    VARCHAR(60),
  insurance_group_num     VARCHAR(60),
  insurance_holder        VARCHAR(150),
  insurance_valid_until   DATE,
  secondary_insurance     JSONB       DEFAULT '{}',
  -- Clinical Summary
  allergies               JSONB       DEFAULT '[]', -- [{drug,severity,reaction}]
  chronic_conditions      TEXT[]      DEFAULT '{}',
  current_medications     JSONB       DEFAULT '[]', -- [{name,dose,frequency}]
  surgical_history        JSONB       DEFAULT '[]', -- [{procedure,date,hospital}]
  family_history          TEXT,
  -- Consents
  consent_treatment       BOOLEAN     DEFAULT FALSE,
  consent_data            BOOLEAN     DEFAULT FALSE,
  consent_signature_url   TEXT,
  consent_signed_at       TIMESTAMPTZ,
  -- Status
  status                  patient_status DEFAULT 'ACTIVE',
  primary_doctor_id       UUID        REFERENCES professionals(id) ON DELETE SET NULL,
  -- Audit
  created_by              UUID        REFERENCES user_profiles(id),
  updated_by              UUID        REFERENCES user_profiles(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 5. APPOINTMENTS
CREATE TABLE appointments (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID        NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  specialty_id    UUID        REFERENCES specialties(id),
  room            VARCHAR(20),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  visit_type      VARCHAR(50) DEFAULT 'CONSULTATION',
  status          appt_status DEFAULT 'SCHEDULED',
  reason          TEXT,
  notes           TEXT,
  created_by      UUID        REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT appt_time_valid CHECK (ends_at > starts_at)
);

-- 6. TRIAGE QUEUE
CREATE TABLE triage_queue (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  triage_code     VARCHAR(20) NOT NULL UNIQUE DEFAULT ('TR-' || upper(substr(gen_random_uuid()::text,1,6))),
  patient_id      UUID        REFERENCES patients(id) ON DELETE SET NULL,
  level           triage_level NOT NULL,
  chief_complaint TEXT        NOT NULL,
  arrived_at      TIMESTAMPTZ DEFAULT NOW(),
  triaged_at      TIMESTAMPTZ,
  triaged_by      UUID        REFERENCES user_profiles(id),
  assigned_room   VARCHAR(20),
  assigned_nurse  UUID        REFERENCES user_profiles(id),
  vitals          JSONB       DEFAULT '{}', -- {hr,spo2,bp_sys,bp_dia,temp_c,resp,weight_kg,height_cm}
  resolved_at     TIMESTAMPTZ,
  disposition     VARCHAR(50), -- DISCHARGED,ADMITTED,TRANSFERRED,LEFT_AMA
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- LAYER 5: Depends on patients + professionals + specialties
-- ================================================================

-- 7. CLINICAL RECORDS (EHR — Immutable)
CREATE TABLE clinical_records (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  professional_id     UUID        NOT NULL REFERENCES professionals(id),
  specialty_id        UUID        REFERENCES specialties(id),
  appointment_id      UUID        REFERENCES appointments(id),
  triage_id           UUID        REFERENCES triage_queue(id),
  visit_type          VARCHAR(50) NOT NULL DEFAULT 'CONSULTATION',
  visit_date          TIMESTAMPTZ DEFAULT NOW(),
  -- Anamnesis
  chief_complaint     TEXT,
  hpi                 TEXT,
  -- Vitals (snapshot at visit)
  vitals              JSONB       DEFAULT '{}',
  bmi                 NUMERIC(5,2),
  -- Clinical Content
  physical_exam       TEXT,
  assessment          TEXT,
  plan                TEXT,
  -- Diagnoses ICD-11
  diagnoses           JSONB       DEFAULT '[]', -- [{code,title,type:"primary"|"secondary"}]
  -- Resident flag
  requires_review     BOOLEAN     DEFAULT FALSE,
  reviewed_by         UUID        REFERENCES professionals(id),
  reviewed_at         TIMESTAMPTZ,
  -- Immutability
  is_locked           BOOLEAN     DEFAULT FALSE,
  locked_at           TIMESTAMPTZ,
  locked_by           UUID        REFERENCES user_profiles(id),
  addendums           JSONB       DEFAULT '[]', -- [{text,author_id,created_at}] append-only
  -- Audit
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PRESCRIPTIONS
CREATE TABLE prescriptions (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinical_record_id  UUID        REFERENCES clinical_records(id),
  patient_id          UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescribed_by       UUID        NOT NULL REFERENCES professionals(id),
  drug_name           VARCHAR(150)NOT NULL,
  drug_generic        VARCHAR(150),
  dose                VARCHAR(60) NOT NULL,
  route               VARCHAR(50),  -- oral, IV, IM, topical, inhaled
  frequency           VARCHAR(80) NOT NULL,
  duration            VARCHAR(80),
  quantity            INTEGER,
  refills             SMALLINT    DEFAULT 0,
  instructions        TEXT,
  status              rx_status   DEFAULT 'ACTIVE',
  dispensed_at        TIMESTAMPTZ,
  dispensed_by        UUID        REFERENCES user_profiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 9. INTERCONSULTAS
CREATE TABLE interconsults (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  from_professional   UUID        NOT NULL REFERENCES professionals(id),
  to_specialty_id     UUID        NOT NULL REFERENCES specialties(id),
  to_professional_id  UUID        REFERENCES professionals(id),
  clinical_record_id  UUID        REFERENCES clinical_records(id),
  reason              TEXT        NOT NULL,
  clinical_context    TEXT,
  priority            consult_priority DEFAULT 'ROUTINE',
  status              consult_status   DEFAULT 'PENDING',
  response_notes      TEXT,
  responded_at        TIMESTAMPTZ,
  responded_by        UUID        REFERENCES professionals(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 10. LAB ORDERS
CREATE TABLE lab_orders (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  ordered_by          UUID        NOT NULL REFERENCES professionals(id),
  clinical_record_id  UUID        REFERENCES clinical_records(id),
  barcode             VARCHAR(60) UNIQUE DEFAULT ('SJD-LAB-' || upper(substr(gen_random_uuid()::text,1,8))),
  panel_name          VARCHAR(150)NOT NULL,
  tests_requested     TEXT[]      NOT NULL DEFAULT '{}',
  priority            lab_priority DEFAULT 'ROUTINE',
  status              lab_status   DEFAULT 'ORDERED',
  sample_collected_at TIMESTAMPTZ,
  sample_collected_by UUID        REFERENCES user_profiles(id),
  results             JSONB       DEFAULT '{}',
  critical_values     JSONB       DEFAULT '[]',
  notified_at         TIMESTAMPTZ,
  technician_id       UUID        REFERENCES user_profiles(id),
  notes               TEXT,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 11. IMAGING ORDERS
CREATE TABLE imaging_orders (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  ordered_by          UUID        NOT NULL REFERENCES professionals(id),
  clinical_record_id  UUID        REFERENCES clinical_records(id),
  modality            imaging_modality NOT NULL,
  study_description   TEXT        NOT NULL,
  body_part           VARCHAR(80),
  clinical_indication TEXT,
  priority            lab_priority DEFAULT 'ROUTINE',
  status              imaging_status DEFAULT 'ORDERED',
  scheduled_at        TIMESTAMPTZ,
  radiologist_id      UUID        REFERENCES professionals(id),
  technique           TEXT,
  findings            TEXT,
  conclusion          TEXT,
  report_signed_at    TIMESTAMPTZ,
  dicom_url           TEXT,
  reported_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 12. PHARMACY INVENTORY
CREATE TABLE pharmacy_inventory (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_code           VARCHAR(40) NOT NULL UNIQUE,
  drug_name           VARCHAR(150)NOT NULL,
  generic_name        VARCHAR(150),
  category            VARCHAR(80),
  controlled          BOOLEAN     DEFAULT FALSE,
  unit                VARCHAR(20) NOT NULL,
  stock_current       INTEGER     NOT NULL DEFAULT 0,
  stock_minimum       INTEGER     NOT NULL DEFAULT 10,
  stock_maximum       INTEGER,
  unit_cost           NUMERIC(10,2),
  supplier            VARCHAR(120),
  batch_number        VARCHAR(60),
  expiry_date         DATE,
  storage_conditions  VARCHAR(120),
  active              BOOLEAN     DEFAULT TRUE,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 13. DISPENSING LOG (APPEND-ONLY)
CREATE TABLE dispensing_log (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id     UUID        REFERENCES prescriptions(id),
  patient_id          UUID        NOT NULL REFERENCES patients(id),
  inventory_id        UUID        NOT NULL REFERENCES pharmacy_inventory(id),
  quantity_dispensed  INTEGER     NOT NULL,
  pharmacist_id       UUID        NOT NULL REFERENCES user_profiles(id),
  notes               TEXT,
  dispensed_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 14. AUDIT LOG (IMMUTABLE — append-only)
CREATE TABLE audit_logs (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       UUID        REFERENCES user_profiles(id) ON DELETE SET NULL,
  user_role     user_role,
  action        VARCHAR(60) NOT NULL,
  resource_type VARCHAR(60),
  resource_id   UUID,
  old_values    JSONB,
  new_values    JSONB,
  ip_address    INET,
  user_agent    TEXT,
  outcome       audit_outcome DEFAULT 'SUCCESS',
  error_detail  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX idx_patients_mrn       ON patients(mrn);
CREATE INDEX idx_patients_ci        ON patients(ci_passport);
CREATE INDEX idx_patients_name      ON patients USING gin(to_tsvector('simple', first_name||' '||last_name));
CREATE INDEX idx_patients_status    ON patients(status);
CREATE INDEX idx_patients_created   ON patients(created_at DESC);

CREATE INDEX idx_prof_license       ON professionals(license_number);
CREATE INDEX idx_prof_specialty     ON professionals(specialty_id);
CREATE INDEX idx_prof_user          ON professionals(user_id);

CREATE INDEX idx_appt_patient       ON appointments(patient_id);
CREATE INDEX idx_appt_professional  ON appointments(professional_id);
CREATE INDEX idx_appt_starts        ON appointments(starts_at);
CREATE INDEX idx_appt_status        ON appointments(status);

CREATE INDEX idx_triage_level       ON triage_queue(level);
CREATE INDEX idx_triage_arrived     ON triage_queue(arrived_at DESC);
CREATE INDEX idx_triage_resolved    ON triage_queue(resolved_at) WHERE resolved_at IS NULL;

CREATE INDEX idx_cr_patient         ON clinical_records(patient_id);
CREATE INDEX idx_cr_professional    ON clinical_records(professional_id);
CREATE INDEX idx_cr_date            ON clinical_records(visit_date DESC);
CREATE INDEX idx_cr_locked          ON clinical_records(is_locked);

CREATE INDEX idx_rx_patient         ON prescriptions(patient_id);
CREATE INDEX idx_rx_status          ON prescriptions(status);

CREATE INDEX idx_lab_patient        ON lab_orders(patient_id);
CREATE INDEX idx_lab_status         ON lab_orders(status);
CREATE INDEX idx_lab_priority       ON lab_orders(priority);

CREATE INDEX idx_img_patient        ON imaging_orders(patient_id);
CREATE INDEX idx_img_status         ON imaging_orders(status);

CREATE INDEX idx_audit_user         ON audit_logs(user_id);
CREATE INDEX idx_audit_action       ON audit_logs(action);
CREATE INDEX idx_audit_created      ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_resource     ON audit_logs(resource_type, resource_id);

-- ================================================================
-- FUNCTIONS & TRIGGERS
-- ================================================================

-- Auto-generate MRN + QR code
CREATE OR REPLACE FUNCTION fn_generate_mrn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
        v_seq  TEXT;
BEGIN
  SELECT LPAD((COALESCE(MAX(CAST(SPLIT_PART(mrn,'-',3) AS INT)),0)+1)::TEXT,5,'0')
  INTO v_seq FROM patients WHERE mrn LIKE 'SJD-'||v_year||'-%';
  NEW.mrn := 'SJD-'||v_year||'-'||v_seq;
  NEW.qr_code := NEW.mrn;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_mrn BEFORE INSERT ON patients
  FOR EACH ROW WHEN (NEW.mrn IS NULL OR NEW.mrn = '')
  EXECUTE FUNCTION fn_generate_mrn();

-- Auto-lock EHR after 24h
CREATE OR REPLACE FUNCTION fn_auto_lock_ehr()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT NEW.is_locked AND NEW.created_at < NOW() - INTERVAL '24 hours' THEN
    NEW.is_locked := TRUE; NEW.locked_at := NOW();
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_lock_ehr BEFORE UPDATE ON clinical_records
  FOR EACH ROW EXECUTE FUNCTION fn_auto_lock_ehr();

-- Auto updated_at
CREATE OR REPLACE FUNCTION fn_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_patients_upd    BEFORE UPDATE ON patients          FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_prof_upd        BEFORE UPDATE ON professionals      FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_appt_upd        BEFORE UPDATE ON appointments       FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_cr_upd          BEFORE UPDATE ON clinical_records   FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_profiles_upd    BEFORE UPDATE ON user_profiles      FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_inventory_upd   BEFORE UPDATE ON pharmacy_inventory FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- Deduct stock on dispense
CREATE OR REPLACE FUNCTION fn_deduct_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE pharmacy_inventory
  SET stock_current = stock_current - NEW.quantity_dispensed, updated_at = NOW()
  WHERE id = NEW.inventory_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Drug not found in inventory'; END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_deduct_stock AFTER INSERT ON dispensing_log
  FOR EACH ROW EXECUTE FUNCTION fn_deduct_stock();

-- Auto-create user_profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_profiles(id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'RECEPTIONIST')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_new_user AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();
