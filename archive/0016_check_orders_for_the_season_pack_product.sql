SELECT o.*, p.title as product_title
FROM public.orders o
JOIN public.products p ON o.product_id = p.id
WHERE o.product_id = 'f094633c-2bcd-4164-8a61-2519bb80c11c';