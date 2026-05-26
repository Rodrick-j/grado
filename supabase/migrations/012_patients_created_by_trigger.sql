-- Migration 012: Add trigger to automatically set created_by on patients

CREATE OR REPLACE FUNCTION fn_set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_created_by ON patients;
CREATE TRIGGER trg_set_created_by
BEFORE INSERT ON patients
FOR EACH ROW
EXECUTE FUNCTION fn_set_created_by();
