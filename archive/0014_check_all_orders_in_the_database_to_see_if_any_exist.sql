SELECT o.*, p.title as product_title 
FROM public.orders o
LEFT JOIN public.products p ON o.product_id = p.id
LIMIT 10;