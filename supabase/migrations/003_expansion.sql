-- ================================================================
-- HOSPITAL SAN JUAN DE DIOS — PROJECT FARO
-- MIGRATION 003: EXPANSION — Módulos Enterprise v3.0
-- Nuevas tablas: Quirófano, MAR, Balance Hídrico, Alertas,
--                Notificaciones, Documentos, Dietas, Vitales
-- Alteraciones en tablas existentes
-- ================================================================

-- ─── ENUMS NUEVOS ────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE surgical_priority AS ENUM ('ELECTIVE','URGENT','EMERGENCY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE surgical_status AS ENUM ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','POSTPONED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mar_status AS ENUM ('PENDING','GIVEN','OMITTED','REFUSED','HELD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM (
    'CRITICAL_LAB','ALLERGY_RISK','DRUG_INTERACTION',
    'VITAL_DETERIORATION','TRIAGE_WAIT_EXCEEDED',
    'SEPSIS_RISK','STOCK_CRITICAL','DISCHARGE_PENDING'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('INFO','WARNING','CRITICAL','EMERGENCY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'DISCHARGE_SUMMARY','MEDICAL_CERT','PRESCRIPTION_PRINT',
    'IMAGING_REPORT','REFERRAL_LETTER','SICK_LEAVE','AUTOPSY'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE diet_type AS ENUM (
    'NORMAL','SOFT','LIQUID','NPO','DIABETIC',
    'LOW_SODIUM','LOW_FAT','HIGH_PROTEIN','RENAL','ONCOLOGIC'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE diet_status AS ENUM ('ACTIVE','SUSPENDED','MODIFIED','DISCONTINUED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE or_status AS ENUM ('AVAILABLE','IN_USE','CLEANING','MAINTENANCE','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- NUEVAS TABLAS
-- ================================================================

-- ─── 1. OPERATING ROOMS (Salas de Quirófano) ─────────────────
CREATE TABLE IF NOT EXISTS operating_rooms (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(20) NOT NULL UNIQUE,
  name            VARCHAR(100)NOT NULL,
  floor           SMALLINT    NOT NULL DEFAULT 4,
  wing            VARCHAR(60),
  specialty_id    UUID        REFERENCES specialties(id) ON DELETE SET NULL,
  status          or_status   DEFAULT 'AVAILABLE',
  equipment       TEXT[]      DEFAULT '{}',
  capacity        SMALLINT    DEFAULT 1,
  notes           TEXT,
  active          BOOLEAN     DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. SURGICAL SCHEDULES (Programación Quirúrgica) ─────────
CREATE TABLE IF NOT EXISTS surgical_schedules (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id              UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  surgeon_id              UUID        NOT NULL REFERENCES professionals(id),
  anesthesiologist_id     UUID        REFERENCES professionals(id),
  assistant_surgeon_id    UUID        REFERENCES professionals(id),
  scrub_nurse_id          UUID        REFERENCES user_profiles(id),
  room_id                 UUID        REFERENCES operating_rooms(id) ON DELETE SET NULL,
  specialty_id            UUID        REFERENCES specialties(id),
  procedure_name          VARCHAR(200)NOT NULL,
  icd_procedure_code      VARCHAR(20),
  scheduled_start         TIMESTAMPTZ NOT NULL,
  estimated_duration_min  SMALLINT    NOT NULL DEFAULT 60,
  actual_start            TIMESTAMPTZ,
  actual_end              TIMESTAMPTZ,
  priority                surgical_priority DEFAULT 'ELECTIVE',
  status                  surgical_status   DEFAULT 'SCHEDULED',
  -- WHO Safety Checklist
  who_sign_in             JSONB       DEFAULT '{"checked": false, "verified_by": null, "time": null}',
  who_time_out            JSONB       DEFAULT '{"checked": false, "verified_by": null, "time": null}',
  who_sign_out            JSONB       DEFAULT '{"checked": false, "verified_by": null, "time": null}',
  -- Intraoperative data
  anesthesia_type         VARCHAR(50),
  blood_loss_ml           INTEGER,
  transfusions_units      SMALLINT    DEFAULT 0,
  implants_used           TEXT[]      DEFAULT '{}',
  complications           TEXT,
  post_op_diagnosis       TEXT,
  pathology_sent          BOOLEAN     DEFAULT FALSE,
  -- Audit
  created_by              UUID        REFERENCES user_profiles(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. SURGICAL WAITLIST (Lista de Espera Quirúrgica) ───────
CREATE TABLE IF NOT EXISTS surgical_waitlist (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  procedure_name      VARCHAR(200)NOT NULL,
  referring_doctor_id UUID        REFERENCES professionals(id),
  specialty_id        UUID        REFERENCES specialties(id),
  priority            surgical_priority DEFAULT 'ELECTIVE',
  icd_procedure_code  VARCHAR(20),
  clinical_notes      TEXT,
  listed_at           TIMESTAMPTZ DEFAULT NOW(),
  estimated_wait_days SMALLINT,
  scheduled_surgery_id UUID       REFERENCES surgical_schedules(id) ON DELETE SET NULL,
  status              VARCHAR(30) DEFAULT 'WAITING', -- WAITING, SCHEDULED, COMPLETED, REMOVED
  removed_reason      TEXT,
  created_by          UUID        REFERENCES user_profiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. MEDICATION ADMINISTRATIONS (MAR - Enfermería) ────────
CREATE TABLE IF NOT EXISTS medication_administrations (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id            UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescription_id       UUID        REFERENCES prescriptions(id) ON DELETE SET NULL,
  nurse_id              UUID        NOT NULL REFERENCES user_profiles(id),
  clinical_record_id    UUID        REFERENCES clinical_records(id),
  drug_name             VARCHAR(150)NOT NULL,
  dose                  VARCHAR(60) NOT NULL,
  route                 VARCHAR(50) NOT NULL,
  scheduled_at          TIMESTAMPTZ NOT NULL,
  administered_at       TIMESTAMPTZ,
  status                mar_status  DEFAULT 'PENDING',
  -- 5 Rights verification
  right_patient         BOOLEAN     DEFAULT FALSE,
  right_drug            BOOLEAN     DEFAULT FALSE,
  right_dose            BOOLEAN     DEFAULT FALSE,
  right_route           BOOLEAN     DEFAULT FALSE,
  right_time            BOOLEAN     DEFAULT FALSE,
  five_rights_verified  BOOLEAN     GENERATED ALWAYS AS (
    right_patient AND right_drug AND right_dose AND right_route AND right_time
  ) STORED,
  omission_reason       TEXT,
  notes                 TEXT,
  shift                 VARCHAR(20) DEFAULT 'MORNING', -- MORNING, AFTERNOON, NIGHT
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. FLUID BALANCE (Balance Hídrico) ──────────────────────
CREATE TABLE IF NOT EXISTS fluid_balance (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id            UUID        NOT NULL REFERENCES user_profiles(id),
  clinical_record_id  UUID        REFERENCES clinical_records(id),
  recorded_at         TIMESTAMPTZ DEFAULT NOW(),
  period_hours        SMALLINT    DEFAULT 8, -- 8h shifts
  -- Intakes (ml)
  intake_oral_ml      INTEGER     NOT NULL DEFAULT 0,
  intake_iv_ml        INTEGER     NOT NULL DEFAULT 0,
  intake_sng_ml       INTEGER     NOT NULL DEFAULT 0,  -- nasogástrico
  intake_other_ml     INTEGER     NOT NULL DEFAULT 0,
  -- Outputs (ml)
  output_urine_ml     INTEGER     NOT NULL DEFAULT 0,
  output_drain_ml     INTEGER     NOT NULL DEFAULT 0,
  output_emesis_ml    INTEGER     NOT NULL DEFAULT 0,
  output_other_ml     INTEGER     NOT NULL DEFAULT 0,
  -- Calculated fields
  total_intake_ml     INTEGER     GENERATED ALWAYS AS (
    intake_oral_ml + intake_iv_ml + intake_sng_ml + intake_other_ml
  ) STORED,
  total_output_ml     INTEGER     GENERATED ALWAYS AS (
    output_urine_ml + output_drain_ml + output_emesis_ml + output_other_ml
  ) STORED,
  balance_ml          INTEGER     GENERATED ALWAYS AS (
    (intake_oral_ml + intake_iv_ml + intake_sng_ml + intake_other_ml) -
    (output_urine_ml + output_drain_ml + output_emesis_ml + output_other_ml)
  ) STORED,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. CLINICAL ALERTS (Alertas Clínicas en Tiempo Real) ────
CREATE TABLE IF NOT EXISTS clinical_alerts (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID        REFERENCES patients(id) ON DELETE CASCADE,
  type                alert_type  NOT NULL,
  severity            alert_severity NOT NULL DEFAULT 'WARNING',
  title               VARCHAR(200)NOT NULL,
  message             TEXT        NOT NULL,
  source_table        VARCHAR(60),
  source_id           UUID,
  assigned_to         UUID        REFERENCES user_profiles(id),
  acknowledged_by     UUID        REFERENCES user_profiles(id),
  acknowledged_at     TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  is_active           BOOLEAN     DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. CLINICAL DOCUMENTS (Documentos PDF Generados) ────────
CREATE TABLE IF NOT EXISTS clinical_documents (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type                document_type NOT NULL,
  title               VARCHAR(200)NOT NULL,
  content_json        JSONB       DEFAULT '{}',
  generated_by        UUID        NOT NULL REFERENCES user_profiles(id),
  professional_id     UUID        REFERENCES professionals(id),
  clinical_record_id  UUID        REFERENCES clinical_records(id),
  pdf_url             TEXT,
  signed_at           TIMESTAMPTZ,
  signed_by           UUID        REFERENCES user_profiles(id),
  is_valid            BOOLEAN     DEFAULT TRUE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. NOTIFICATIONS (Notificaciones In-App) ─────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title               VARCHAR(200)NOT NULL,
  body                TEXT        NOT NULL,
  type                VARCHAR(60) NOT NULL DEFAULT 'INFO', -- INFO, SUCCESS, WARNING, ERROR, ALERT
  icon                VARCHAR(50) DEFAULT 'Bell',
  action_url          TEXT,
  source_table        VARCHAR(60),
  source_id           UUID,
  read_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. DIET ORDERS (Prescripciones Dietéticas) ───────────────
CREATE TABLE IF NOT EXISTS diet_orders (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  ordered_by          UUID        NOT NULL REFERENCES professionals(id),
  clinical_record_id  UUID        REFERENCES clinical_records(id),
  diet_type           diet_type   NOT NULL DEFAULT 'NORMAL',
  calories_target     SMALLINT,
  protein_g           SMALLINT,
  carbs_g             SMALLINT,
  fat_g               SMALLINT,
  fluid_restriction_ml INTEGER,
  restrictions        TEXT[]      DEFAULT '{}', -- ['sin gluten', 'sin lactosa']
  texture             VARCHAR(50) DEFAULT 'NORMAL', -- NORMAL, MINCED, PUREED, LIQUID
  supplements         TEXT[]      DEFAULT '{}',
  status              diet_status DEFAULT 'ACTIVE',
  start_date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date            DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 10. VITAL SIGNS HISTORY (Serie temporal de vitales) ──────
CREATE TABLE IF NOT EXISTS vital_signs_history (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by         UUID        REFERENCES user_profiles(id),
  clinical_record_id  UUID        REFERENCES clinical_records(id),
  recorded_at         TIMESTAMPTZ DEFAULT NOW(),
  -- Vitals
  heart_rate          SMALLINT,   -- bpm
  spo2                NUMERIC(5,2), -- %
  bp_systolic         SMALLINT,   -- mmHg
  bp_diastolic        SMALLINT,   -- mmHg
  temperature_c       NUMERIC(4,1), -- °C
  respiratory_rate    SMALLINT,   -- rpm
  gcs_score           SMALLINT,   -- 3-15
  pain_scale          SMALLINT,   -- 0-10
  blood_glucose       INTEGER,    -- mg/dL
  weight_kg           NUMERIC(5,1),
  height_cm           SMALLINT,
  -- Calculated
  bmi                 NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN height_cm > 0 AND weight_kg IS NOT NULL
    THEN ROUND((weight_kg / ((height_cm::NUMERIC/100)^2))::NUMERIC, 2)
    ELSE NULL END
  ) STORED,
  -- NEWS2 score components (auto-calculated on insert via trigger)
  news2_score         SMALLINT,
  news2_risk          VARCHAR(20), -- LOW, MEDIUM, HIGH, CRITICAL
  source              VARCHAR(30) DEFAULT 'NURSING', -- NURSING, UCI_MONITOR, TRIAGE
  notes               TEXT
);

-- ================================================================
-- ALTERACIONES EN TABLAS EXISTENTES
-- ================================================================

-- patients: campos adicionales
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS preferred_language  VARCHAR(30)  DEFAULT 'ES',
  ADD COLUMN IF NOT EXISTS disability_code     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_vip              BOOLEAN      DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS advance_directive   TEXT,
  ADD COLUMN IF NOT EXISTS occupation          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS education_level     VARCHAR(50);

-- clinical_records: campos adicionales
ALTER TABLE clinical_records
  ADD COLUMN IF NOT EXISTS severity_score      SMALLINT,    -- SOFA/NEWS/APACHE
  ADD COLUMN IF NOT EXISTS severity_scale      VARCHAR(20), -- SOFA, NEWS2, APACHE_II
  ADD COLUMN IF NOT EXISTS visit_duration_min  SMALLINT,
  ADD COLUMN IF NOT EXISTS discharge_summary   TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_date      DATE,
  ADD COLUMN IF NOT EXISTS follow_up_notes     TEXT;

-- triage_queue: campos adicionales
ALTER TABLE triage_queue
  ADD COLUMN IF NOT EXISTS max_wait_exceeded   BOOLEAN      DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS transport_mode      VARCHAR(30),  -- AMBULANCE, WALK, WHEELCHAIR
  ADD COLUMN IF NOT EXISTS pain_scale          SMALLINT,
  ADD COLUMN IF NOT EXISTS mechanism_of_injury TEXT;

-- appointments: soporte telemedicina
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS is_telemedicine     BOOLEAN      DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS video_room_url      TEXT,
  ADD COLUMN IF NOT EXISTS check_in_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS teleconsult_notes   TEXT;

-- pharmacy_inventory: clasificación farmacológica
ALTER TABLE pharmacy_inventory
  ADD COLUMN IF NOT EXISTS atc_code            VARCHAR(20),  -- ATC Classification
  ADD COLUMN IF NOT EXISTS controlled_schedule VARCHAR(10),  -- Schedule I-V
  ADD COLUMN IF NOT EXISTS temperature_min_c   SMALLINT,
  ADD COLUMN IF NOT EXISTS temperature_max_c   SMALLINT,
  ADD COLUMN IF NOT EXISTS refrigerated        BOOLEAN      DEFAULT FALSE;

-- ================================================================
-- INDEXES NUEVOS
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_surgical_patient   ON surgical_schedules(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgical_surgeon   ON surgical_schedules(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_surgical_room      ON surgical_schedules(room_id);
CREATE INDEX IF NOT EXISTS idx_surgical_start     ON surgical_schedules(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_surgical_status    ON surgical_schedules(status);

CREATE INDEX IF NOT EXISTS idx_mar_patient        ON medication_administrations(patient_id);
CREATE INDEX IF NOT EXISTS idx_mar_nurse          ON medication_administrations(nurse_id);
CREATE INDEX IF NOT EXISTS idx_mar_scheduled      ON medication_administrations(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_mar_status         ON medication_administrations(status);

CREATE INDEX IF NOT EXISTS idx_fluid_patient      ON fluid_balance(patient_id);
CREATE INDEX IF NOT EXISTS idx_fluid_recorded     ON fluid_balance(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_patient     ON clinical_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active      ON clinical_alerts(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_alerts_severity    ON clinical_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created     ON clinical_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_user         ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read         ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_created      ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_diet_patient       ON diet_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_diet_status        ON diet_orders(status);

CREATE INDEX IF NOT EXISTS idx_vitals_patient     ON vital_signs_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded    ON vital_signs_history(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_docs_patient       ON clinical_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_docs_type          ON clinical_documents(type);

CREATE INDEX IF NOT EXISTS idx_waitlist_patient   ON surgical_waitlist(patient_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_priority  ON surgical_waitlist(priority);
CREATE INDEX IF NOT EXISTS idx_waitlist_status    ON surgical_waitlist(status);

CREATE INDEX IF NOT EXISTS idx_or_status          ON operating_rooms(status);

-- ================================================================
-- TRIGGERS NUEVOS (idempotentes — DROP IF EXISTS antes de CREATE)
-- ================================================================

-- Eliminar triggers si ya existen (para re-ejecución segura)
DROP TRIGGER IF EXISTS trg_or_upd        ON operating_rooms;
DROP TRIGGER IF EXISTS trg_surgical_upd  ON surgical_schedules;
DROP TRIGGER IF EXISTS trg_diet_upd      ON diet_orders;
DROP TRIGGER IF EXISTS trg_news2_calc    ON vital_signs_history;
DROP TRIGGER IF EXISTS trg_qsofa_check   ON vital_signs_history;

-- Auto updated_at para nuevas tablas
CREATE TRIGGER trg_or_upd        BEFORE UPDATE ON operating_rooms         FOR EACH ROW EXECUTE FUNCTION fn_updated_at_or();
CREATE TRIGGER trg_surgical_upd  BEFORE UPDATE ON surgical_schedules      FOR EACH ROW EXECUTE FUNCTION fn_updated_at_surgical();
CREATE TRIGGER trg_diet_upd      BEFORE UPDATE ON diet_orders             FOR EACH ROW EXECUTE FUNCTION fn_updated_at_diet();

-- Función para calcular NEWS2 score al insertar vitales
CREATE OR REPLACE FUNCTION fn_calculate_news2()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  score INT := 0;
BEGIN
  -- Respiratory rate
  IF NEW.respiratory_rate IS NOT NULL THEN
    IF    NEW.respiratory_rate <= 8  THEN score := score + 3;
    ELSIF NEW.respiratory_rate <= 11 THEN score := score + 1;
    ELSIF NEW.respiratory_rate <= 20 THEN score := score + 0;
    ELSIF NEW.respiratory_rate <= 24 THEN score := score + 2;
    ELSE  score := score + 3; END IF;
  END IF;
  -- SpO2
  IF NEW.spo2 IS NOT NULL THEN
    IF    NEW.spo2 <= 91 THEN score := score + 3;
    ELSIF NEW.spo2 <= 93 THEN score := score + 2;
    ELSIF NEW.spo2 <= 95 THEN score := score + 1;
    ELSE  score := score + 0; END IF;
  END IF;
  -- Systolic BP
  IF NEW.bp_systolic IS NOT NULL THEN
    IF    NEW.bp_systolic <= 90  THEN score := score + 3;
    ELSIF NEW.bp_systolic <= 100 THEN score := score + 2;
    ELSIF NEW.bp_systolic <= 110 THEN score := score + 1;
    ELSIF NEW.bp_systolic <= 219 THEN score := score + 0;
    ELSE  score := score + 3; END IF;
  END IF;
  -- Heart rate
  IF NEW.heart_rate IS NOT NULL THEN
    IF    NEW.heart_rate <= 40  THEN score := score + 3;
    ELSIF NEW.heart_rate <= 50  THEN score := score + 1;
    ELSIF NEW.heart_rate <= 90  THEN score := score + 0;
    ELSIF NEW.heart_rate <= 110 THEN score := score + 1;
    ELSIF NEW.heart_rate <= 130 THEN score := score + 2;
    ELSE  score := score + 3; END IF;
  END IF;
  -- Temperature
  IF NEW.temperature_c IS NOT NULL THEN
    IF    NEW.temperature_c <= 35.0 THEN score := score + 3;
    ELSIF NEW.temperature_c <= 36.0 THEN score := score + 1;
    ELSIF NEW.temperature_c <= 38.0 THEN score := score + 0;
    ELSIF NEW.temperature_c <= 39.0 THEN score := score + 1;
    ELSE  score := score + 2; END IF;
  END IF;
  -- GCS
  IF NEW.gcs_score IS NOT NULL THEN
    IF NEW.gcs_score < 15 THEN score := score + 3; END IF;
  END IF;

  NEW.news2_score := score;
  NEW.news2_risk  := CASE
    WHEN score >= 7 THEN 'CRITICAL'
    WHEN score >= 5 THEN 'HIGH'
    WHEN score >= 1 THEN 'MEDIUM'
    ELSE 'LOW'
  END;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_news2_calc BEFORE INSERT OR UPDATE ON vital_signs_history
  FOR EACH ROW EXECUTE FUNCTION fn_calculate_news2();

-- Función para detectar sepsis qSOFA y crear alerta automática
CREATE OR REPLACE FUNCTION fn_check_qsofa()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  qsofa_score INT := 0;
BEGIN
  IF NEW.respiratory_rate IS NOT NULL AND NEW.respiratory_rate > 22 THEN
    qsofa_score := qsofa_score + 1;
  END IF;
  IF NEW.gcs_score IS NOT NULL AND NEW.gcs_score < 15 THEN
    qsofa_score := qsofa_score + 1;
  END IF;
  IF NEW.bp_systolic IS NOT NULL AND NEW.bp_systolic < 100 THEN
    qsofa_score := qsofa_score + 1;
  END IF;

  IF qsofa_score >= 2 THEN
    INSERT INTO clinical_alerts (patient_id, type, severity, title, message, source_table, source_id)
    VALUES (
      NEW.patient_id,
      'SEPSIS_RISK',
      'EMERGENCY',
      'ALERTA SEPSIS — qSOFA ≥ 2',
      FORMAT('Paciente con score qSOFA = %s. Criterios positivos: FR>22=%s, GCS<15=%s, PAS<100=%s. Evaluar protocolo de sepsis inmediatamente.',
        qsofa_score,
        (NEW.respiratory_rate IS NOT NULL AND NEW.respiratory_rate > 22),
        (NEW.gcs_score IS NOT NULL AND NEW.gcs_score < 15),
        (NEW.bp_systolic IS NOT NULL AND NEW.bp_systolic < 100)
      ),
      'vital_signs_history',
      NEW.id
    ) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_qsofa_check AFTER INSERT ON vital_signs_history
  FOR EACH ROW EXECUTE FUNCTION fn_check_qsofa();

-- Función para alerta de triage cuando se supera tiempo máximo OMS
CREATE OR REPLACE FUNCTION fn_check_triage_wait()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  wait_min     INT;
  max_wait     INT;
  exceeded     BOOLEAN := FALSE;
BEGIN
  IF NEW.arrived_at IS NOT NULL THEN
    wait_min := EXTRACT(EPOCH FROM (NOW() - NEW.arrived_at)) / 60;
    max_wait := CASE NEW.level
      WHEN 'RED'    THEN 0
      WHEN 'ORANGE' THEN 10
      WHEN 'YELLOW' THEN 60
      WHEN 'GREEN'  THEN 120
      WHEN 'BLUE'   THEN 240
      ELSE 240
    END;
    IF wait_min > max_wait AND NOT COALESCE(OLD.max_wait_exceeded, FALSE) THEN
      exceeded := TRUE;
      UPDATE triage_queue SET max_wait_exceeded = TRUE WHERE id = NEW.id;
      INSERT INTO clinical_alerts (patient_id, type, severity, title, message, source_table, source_id)
      VALUES (
        NEW.patient_id, 'TRIAGE_WAIT_EXCEEDED', 'CRITICAL',
        FORMAT('Triage %s — Tiempo de espera superado', NEW.level),
        FORMAT('Código %s lleva %s minutos esperando (máx. OMS: %s min). Atención requerida.',
          NEW.triage_code, wait_min, max_wait),
        'triage_queue', NEW.id
      ) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;$$;

-- ================================================================
-- RLS POLICIES para nuevas tablas (idempotentes — DROP IF EXISTS)
-- ================================================================
ALTER TABLE operating_rooms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgical_schedules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgical_waitlist         ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_administrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluid_balance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs_history       ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas si ya existen (para re-ejecución segura)
DROP POLICY IF EXISTS "auth_read_or"        ON operating_rooms;
DROP POLICY IF EXISTS "auth_all_or"         ON operating_rooms;
DROP POLICY IF EXISTS "auth_read_surgical"  ON surgical_schedules;
DROP POLICY IF EXISTS "auth_all_surgical"   ON surgical_schedules;
DROP POLICY IF EXISTS "auth_read_waitlist"  ON surgical_waitlist;
DROP POLICY IF EXISTS "auth_all_waitlist"   ON surgical_waitlist;
DROP POLICY IF EXISTS "auth_read_mar"       ON medication_administrations;
DROP POLICY IF EXISTS "auth_all_mar"        ON medication_administrations;
DROP POLICY IF EXISTS "auth_read_fluid"     ON fluid_balance;
DROP POLICY IF EXISTS "auth_all_fluid"      ON fluid_balance;
DROP POLICY IF EXISTS "auth_read_alerts"    ON clinical_alerts;
DROP POLICY IF EXISTS "auth_all_alerts"     ON clinical_alerts;
DROP POLICY IF EXISTS "auth_read_docs"      ON clinical_documents;
DROP POLICY IF EXISTS "auth_all_docs"       ON clinical_documents;
DROP POLICY IF EXISTS "auth_read_notif"     ON notifications;
DROP POLICY IF EXISTS "auth_all_notif"      ON notifications;
DROP POLICY IF EXISTS "auth_insert_notif"   ON notifications;
DROP POLICY IF EXISTS "auth_update_notif"   ON notifications;
DROP POLICY IF EXISTS "auth_read_diet"      ON diet_orders;
DROP POLICY IF EXISTS "auth_all_diet"       ON diet_orders;
DROP POLICY IF EXISTS "auth_read_vitals"    ON vital_signs_history;
DROP POLICY IF EXISTS "auth_all_vitals"     ON vital_signs_history;

-- Crear políticas limpias
CREATE POLICY "auth_all_or"         ON operating_rooms           FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_surgical"   ON surgical_schedules        FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_waitlist"   ON surgical_waitlist         FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_mar"        ON medication_administrations FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_fluid"      ON fluid_balance             FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_alerts"     ON clinical_alerts           FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_docs"       ON clinical_documents        FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_read_notif"     ON notifications             FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_insert_notif"   ON notifications             FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update_notif"   ON notifications             FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_all_diet"       ON diet_orders               FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_vitals"     ON vital_signs_history       FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ================================================================
-- DATOS SEMILLA — Quirófanos
-- ================================================================
INSERT INTO operating_rooms (code, name, floor, wing, status, equipment) VALUES
  ('OR-01', 'Quirófano 1 — Cirugía General',      4, 'Ala Sur',  'AVAILABLE', ARRAY['Mesa quirúrgica hidráulica','Lámpara cialítica LED','Respirador Dräger','Monitor multiparámetro','Bisturí armónico']),
  ('OR-02', 'Quirófano 2 — Cirugía Laparoscópica', 4, 'Ala Sur',  'AVAILABLE', ARRAY['Torre laparoscópica 4K','Mesa de carbono','Coagulador Ligasure','Insuflador CO2','Monitor hemodinámico']),
  ('OR-03', 'Quirófano 3 — Traumatología',         4, 'Ala Sur',  'AVAILABLE', ARRAY['Mesa ortopédica Jackson','Arco en C fluoroscopía','Sistema de tracción','Taladro ortopédico Stryker']),
  ('OR-04', 'Quirófano 4 — Cardiología',           4, 'Ala Norte','AVAILABLE', ARRAY['Bomba de circulación extracorpórea','Ecocardiógrafo intraoperatorio','Desfibrilador','Monitor EEG continuo']),
  ('OR-05', 'Quirófano 5 — Neurocirugia',          4, 'Ala Norte','AVAILABLE', ARRAY['Neuronavegador Medtronic','Microscopio quirúrgico Zeiss','Monitor PIC','Mesa neuroquirúrgica Mayfield']),
  ('OR-06', 'Quirófano 6 — Ginecología & OBS',     4, 'Ala Este', 'AVAILABLE', ARRAY['Histeroscopio 4K','Mesa ginecológica eléctrica','Fórceps obstétrico','Monitor fetal']),
  ('OR-E1', 'Sala de Emergencia Quirúrgica',        0, 'Acceso Principal','AVAILABLE', ARRAY['Equipo de trauma completo','Respirador portátil','Desfibrilador DEA','Carro de paro'])
ON CONFLICT (code) DO NOTHING;
