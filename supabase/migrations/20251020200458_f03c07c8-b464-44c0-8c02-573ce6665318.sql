-- Create function to check and trigger auto topup
CREATE OR REPLACE FUNCTION check_auto_topup_trigger()
RETURNS TRIGGER AS $$
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
      -- Log that we need to trigger auto topup
      -- The actual topup will be handled by the edge function asynchronously
      RAISE NOTICE 'Auto topup should trigger for business %: credits % < threshold %', 
        NEW.id, NEW.credit_balance, v_settings.threshold_credits;
      
      -- We could call the edge function here via pg_net extension
      -- For now, we'll rely on the UI or periodic checks to trigger it
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on businesses table
DROP TRIGGER IF EXISTS trigger_check_auto_topup ON businesses;
CREATE TRIGGER trigger_check_auto_topup
  AFTER UPDATE OF credit_balance ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION check_auto_topup_trigger();