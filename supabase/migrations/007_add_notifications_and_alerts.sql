-- Migration 007: Added notifications, clinical alerts and lookup RPC

-- Create clinical alerts table
CREATE TABLE IF NOT EXISTS clinical_alerts (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID        REFERENCES patients(id) ON DELETE CASCADE,
  type            VARCHAR(100),
  severity        VARCHAR(20) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  message         TEXT        NOT NULL,
  source_table    VARCHAR(100),
  source_id       UUID,
  assigned_to     UUID        REFERENCES user_profiles(id),
  acknowledged_by UUID        REFERENCES user_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  is_active       BOOLEAN     DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_alerts_active ON clinical_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_created ON clinical_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE clinical_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow read access to clinical alerts"
    ON clinical_alerts FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow update access to clinical alerts"
    ON clinical_alerts FOR UPDATE
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow insert access to clinical alerts"
    ON clinical_alerts FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  body            TEXT        NOT NULL,
  type            VARCHAR(50),
  icon            VARCHAR(50),
  action_url      TEXT,
  source_table    VARCHAR(100),
  source_id       UUID,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow insert access to notifications"
    ON notifications FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  
-- Add Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE clinical_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create RPC for looking up a user profile by email securely
CREATE OR REPLACE FUNCTION public.get_profile_by_email(p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result jsonb;
BEGIN
  -- Find the user ID from auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Join user_profiles with specialties
  SELECT jsonb_build_object(
    'found', true,
    'full_name', p.full_name,
    'role', p.role,
    'specialty', s.name
  ) INTO v_result
  FROM public.user_profiles p
  LEFT JOIN public.specialties s ON p.specialty_id = s.id
  WHERE p.id = v_user_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN v_result;
END;
$$;
