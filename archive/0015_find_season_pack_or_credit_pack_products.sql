SELECT id, title, price, product_type, credit_amount, track_type 
FROM public.products 
WHERE title ILIKE '%season%' OR title ILIKE '%pack%' OR product_type = 'credit_pack';