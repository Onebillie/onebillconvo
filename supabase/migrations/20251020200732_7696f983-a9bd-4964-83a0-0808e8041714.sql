-- Fix function search_path for check_auto_topup_trigger
CREATE OR REPLACE FUNCTION check_auto_topup_trigger()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
BEGIN
  -- Only check when credits decrease
  IF NEW.credit_balance < OLD.credit_balance THEN
    -- Check if auto topup is enabled for this business
    SELECT * INTO v_settings
    FROM auto_topup_settings
    WHERE business_id = NEW.id
      AND enabled = true
      AND NEW.credit_balance < threshold_credits;
    
    IF FOUND THEN
      RAISE NOTICE 'Auto topup should trigger for business %: credits % < threshold %', 
        NEW.id, NEW.credit_balance, v_settings.threshold_credits;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;