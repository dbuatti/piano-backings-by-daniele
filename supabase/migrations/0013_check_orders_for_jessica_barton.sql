SELECT o.*, p.title as product_title, p.product_type, p.credit_amount, p.track_type
FROM public.orders o
LEFT JOIN public.products p ON o.product_id = p.id
WHERE o.customer_email ILIKE '%jessica%' OR o.user_id = 'ee43a21d-65aa-4f3a-b96a-c85b8f6ee91a';