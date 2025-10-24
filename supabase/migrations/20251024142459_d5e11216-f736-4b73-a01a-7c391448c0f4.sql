-- Update credit bundles with correct Stripe price IDs
UPDATE credit_bundles 
SET stripe_price_id = 'price_1SKP4tGwvNoo6Q8zD1T7LQ5n'
WHERE name = 'Small Bundle';

UPDATE credit_bundles 
SET stripe_price_id = 'price_1SKP4tGwvNoo6Q8zg5PYCgi8'
WHERE name = 'Medium Bundle';

UPDATE credit_bundles 
SET stripe_price_id = 'price_1SKP4uGwvNoo6Q8zc7nYeNTm'
WHERE name = 'Large Bundle';

-- Verify the update
SELECT name, credits, price, stripe_price_id 
FROM credit_bundles 
ORDER BY price;