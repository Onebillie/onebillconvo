-- Fix Starter tier overage rate from 3 cents to 2 cents
UPDATE voice_pricing_config
SET overage_inbound_cents = 2
WHERE tier = 'starter' AND overage_inbound_cents = 3;