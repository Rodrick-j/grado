-- 1. Epidemiological Reports
CREATE TABLE IF NOT EXISTS epidemiological_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfermedad TEXT NOT NULL,
  paciente TEXT NOT NULL,
  ubicacion TEXT NOT NULL,
  severidad TEXT NOT NULL CHECK (severidad IN ('ALTA', 'MEDIA', 'BAJA')),
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  observaciones TEXT
);

-- 2. Vital Monitors
CREATE TABLE IF NOT EXISTS vital_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id TEXT NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  hr INTEGER NOT NULL,
  spo2 INTEGER NOT NULL,
  sys INTEGER NOT NULL,
  dia INTEGER NOT NULL,
  resp_rate INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- We need to enable realtime on this table:
ALTER PUBLICATION supabase_realtime ADD TABLE vital_monitors;

-- 3. Vacation Requests
CREATE TABLE IF NOT EXISTS vacation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  fechas TEXT NOT NULL,
  riesgo TEXT NOT NULL CHECK (riesgo IN ('ALTO', 'MEDIO', 'BAJO')),
  ai_recomendacion TEXT NOT NULL CHECK (ai_recomendacion IN ('APROBAR', 'DENEGAR', 'REVISIÓN MANUAL')),
  motivo TEXT NOT NULL,
  estado TEXT DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Sepsis Assessments
CREATE TABLE IF NOT EXISTS sepsis_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  resp_rate INTEGER NOT NULL,
  spo2 INTEGER NOT NULL,
  temp INTEGER NOT NULL,
  sbp INTEGER NOT NULL,
  hr INTEGER NOT NULL,
  avpu INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Telemedicine Calls
CREATE TABLE IF NOT EXISTS telemedicine_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS telemedicine_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES telemedicine_calls(id) ON DELETE CASCADE NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('DOCTOR', 'PATIENT')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER PUBLICATION supabase_realtime ADD TABLE telemedicine_messages;

-- RLS Enablement
ALTER TABLE epidemiological_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sepsis_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicine_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicine_messages ENABLE ROW LEVEL SECURITY;

-- Creating permissive policies for these tables
CREATE POLICY "Enable all for epidemiological_reports" ON epidemiological_reports FOR ALL USING (true);
CREATE POLICY "Enable all for vital_monitors" ON vital_monitors FOR ALL USING (true);
CREATE POLICY "Enable all for vacation_requests" ON vacation_requests FOR ALL USING (true);
CREATE POLICY "Enable all for sepsis_assessments" ON sepsis_assessments FOR ALL USING (true);
CREATE POLICY "Enable all for system_settings" ON system_settings FOR ALL USING (true);
CREATE POLICY "Enable all for telemedicine_calls" ON telemedicine_calls FOR ALL USING (true);
CREATE POLICY "Enable all for telemedicine_messages" ON telemedicine_messages FOR ALL USING (true);
