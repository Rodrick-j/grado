-- ================================================================
-- HOSPITAL SAN JUAN DE DIOS — PROJECT FARO
-- MIGRATION 006: SECURITY FIXES
-- Resuelve todos los avisos del Supabase Security Advisor:
--   1. Security Definer View  → v_patients_demographics
--   2. Auth RLS Initialization Plan → todas las políticas con has_role()
-- ================================================================

-- ================================================================
-- FIX 1: SECURITY DEFINER VIEW (CRÍTICO)
-- La vista v_patients_demographics heredaba los privilegios del
-- creador (bypassing RLS). La solución es recrearla con
-- SECURITY INVOKER (predeterminado) para que respete el RLS del
-- usuario que la consulta.
-- ================================================================
DROP VIEW IF EXISTS v_patients_demographics;

CREATE VIEW v_patients_demographics
  WITH (security_invoker = true)   -- ← Respeta el RLS del caller
AS
  SELECT
    id, mrn, first_name, middle_name, last_name, second_last_name,
    birth_date, gender, ci_type, ci_passport, phone_primary, phone_secondary,
    email, address_line1, city, country, postal_code,
    emergency_name, emergency_relation, emergency_phone,
    insurance_provider, insurance_policy_num, insurance_valid_until,
    status, created_at
  FROM patients;

-- Otorgar acceso a roles autenticados (la vista hereda el RLS de patients)
GRANT SELECT ON v_patients_demographics TO authenticated;


-- ================================================================
-- FIX 2: AUTH RLS INITIALIZATION PLAN (Performance + Security)
--
-- El problema: auth.uid() y las funciones que lo llaman (auth_role,
-- is_active_user, has_role) se re-evalúan POR FILA en cada política.
-- Esto es ineficiente y activa la advertencia "Auth RLS
-- Initialization Plan" de Supabase.
--
-- La solución: envolver auth.uid() en (SELECT auth.uid()) para que
-- el planificador de PostgreSQL lo evalúe UNA SOLA VEZ por query
-- en lugar de por cada fila escaneada.
-- ================================================================

-- ─── Reemplazar funciones helper con (SELECT auth.uid()) ─────────

CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM user_profiles WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(active, FALSE) FROM user_profiles WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION has_role(roles user_role[])
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT auth_role() = ANY(roles) AND is_active_user();
$$;


-- ================================================================
-- FIX 3: POLÍTICAS user_profiles — reemplazar con (SELECT auth.uid())
-- Las políticas que llaman auth.uid() directamente causan el aviso
-- ================================================================

DROP POLICY IF EXISTS "up_read_own"   ON user_profiles;
DROP POLICY IF EXISTS "up_update_own" ON user_profiles;
DROP POLICY IF EXISTS "up_admin_all"  ON user_profiles;

CREATE POLICY "up_read_own" ON user_profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR','AUDITOR']::user_role[])
  );

CREATE POLICY "up_update_own" ON user_profiles FOR UPDATE TO authenticated
  USING     (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "up_admin_all" ON user_profiles FOR ALL TO authenticated
  USING (has_role(ARRAY['SUPER_ADMIN']::user_role[]));


-- ================================================================
-- FIX 4: POLÍTICAS professionals — reemplazar con (SELECT auth.uid())
-- ================================================================

DROP POLICY IF EXISTS "prof_read"   ON professionals;
DROP POLICY IF EXISTS "prof_insert" ON professionals;
DROP POLICY IF EXISTS "prof_update" ON professionals;
DROP POLICY IF EXISTS "prof_delete" ON professionals;

CREATE POLICY "prof_read" ON professionals FOR SELECT TO authenticated
  USING (has_role(ARRAY[
    'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT',
    'NURSE','AUDITOR','RECEPTIONIST','LAB_TECHNICIAN','RADIOLOGIST','PHARMACIST'
  ]::user_role[]));

CREATE POLICY "prof_insert" ON professionals FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR']::user_role[]));

CREATE POLICY "prof_update" ON professionals FOR UPDATE TO authenticated
  USING (
    has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR']::user_role[])
    OR user_id = (SELECT auth.uid())  -- ← (SELECT ...) en lugar de auth.uid()
  );

CREATE POLICY "prof_delete" ON professionals FOR DELETE TO authenticated
  USING (has_role(ARRAY['SUPER_ADMIN']::user_role[]));


-- ================================================================
-- FIX 5: POLÍTICAS recibos (tabla del módulo Caja/Billing)
-- Verificar si la tabla existe y recrear políticas
-- ================================================================

DO $$
BEGIN
  -- recibos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recibos' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "recibos_read"   ON recibos';
    EXECUTE 'DROP POLICY IF EXISTS "recibos_insert" ON recibos';
    EXECUTE 'DROP POLICY IF EXISTS "recibos_update" ON recibos';
    EXECUTE 'DROP POLICY IF EXISTS "recibos_delete" ON recibos';
    EXECUTE 'DROP POLICY IF EXISTS "recibos_all"    ON recibos';

    -- Recrear con has_role (que ya usa SELECT auth.uid() internamente)
    EXECUTE $policy$
      CREATE POLICY "recibos_read" ON recibos FOR SELECT TO authenticated
        USING (has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR','BILLING','AUDITOR','RECEPTIONIST']::user_role[]))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "recibos_insert" ON recibos FOR INSERT TO authenticated
        WITH CHECK (has_role(ARRAY['SUPER_ADMIN','BILLING','RECEPTIONIST']::user_role[]))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "recibos_update" ON recibos FOR UPDATE TO authenticated
        USING (has_role(ARRAY['SUPER_ADMIN','BILLING']::user_role[]))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "recibos_delete" ON recibos FOR DELETE TO authenticated
        USING (has_role(ARRAY['SUPER_ADMIN']::user_role[]))
    $policy$;
  END IF;
END $$;


-- ================================================================
-- FIX 6: POLÍTICAS camas (tabla del módulo Camas/Hospitalización)
-- ================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'camas' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "camas_read"   ON camas';
    EXECUTE 'DROP POLICY IF EXISTS "camas_insert" ON camas';
    EXECUTE 'DROP POLICY IF EXISTS "camas_update" ON camas';
    EXECUTE 'DROP POLICY IF EXISTS "camas_delete" ON camas';
    EXECUTE 'DROP POLICY IF EXISTS "camas_all"    ON camas';

    EXECUTE $policy$
      CREATE POLICY "camas_read" ON camas FOR SELECT TO authenticated
        USING (has_role(ARRAY[
          'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT',
          'NURSE','AUDITOR','RECEPTIONIST'
        ]::user_role[]))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "camas_insert" ON camas FOR INSERT TO authenticated
        WITH CHECK (has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR','NURSE']::user_role[]))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "camas_update" ON camas FOR UPDATE TO authenticated
        USING (has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','NURSE']::user_role[]))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "camas_delete" ON camas FOR DELETE TO authenticated
        USING (has_role(ARRAY['SUPER_ADMIN']::user_role[]))
    $policy$;
  END IF;
END $$;


-- ================================================================
-- FIX 7: POLÍTICAS uci_patients (Unidad de Cuidados Intensivos)
-- ================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uci_patients' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "uci_read"   ON uci_patients';
    EXECUTE 'DROP POLICY IF EXISTS "uci_insert" ON uci_patients';
    EXECUTE 'DROP POLICY IF EXISTS "uci_update" ON uci_patients';
    EXECUTE 'DROP POLICY IF EXISTS "uci_delete" ON uci_patients';
    EXECUTE 'DROP POLICY IF EXISTS "uci_all"    ON uci_patients';

    EXECUTE $policy$
      CREATE POLICY "uci_read" ON uci_patients FOR SELECT TO authenticated
        USING (has_role(ARRAY[
          'SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','RESIDENT','NURSE','AUDITOR'
        ]::user_role[]))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "uci_insert" ON uci_patients FOR INSERT TO authenticated
        WITH CHECK (has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','NURSE']::user_role[]))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "uci_update" ON uci_patients FOR UPDATE TO authenticated
        USING (has_role(ARRAY['SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','NURSE']::user_role[]))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "uci_delete" ON uci_patients FOR DELETE TO authenticated
        USING (has_role(ARRAY['SUPER_ADMIN']::user_role[]))
    $policy$;
  END IF;
END $$;


-- ================================================================
-- FIX 8: NOTIFICACIONES — política ya usa auth.uid() directamente
-- Reemplazar con (SELECT auth.uid())
-- ================================================================

DROP POLICY IF EXISTS "auth_read_notif"   ON notifications;
DROP POLICY IF EXISTS "auth_insert_notif" ON notifications;
DROP POLICY IF EXISTS "auth_update_notif" ON notifications;

CREATE POLICY "auth_read_notif" ON notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "auth_insert_notif" ON notifications FOR INSERT TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "auth_update_notif" ON notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));


-- ================================================================
-- FIX 9: fn_audit_insert — asegurar que use (SELECT auth.uid())
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
  VALUES (
    (SELECT auth.uid()),    -- ← Optimizado
    auth_role(),
    p_action, p_resource_type, p_resource_id,
    p_old_values, p_new_values, p_outcome, p_error
  );
END;
$$;


-- ================================================================
-- VERIFICACIÓN FINAL
-- Lista las políticas activas para confirmar que se aplicaron
-- ================================================================
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
