-- Shop deferred cleanup: data hygiene + duration metadata
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- idempotent; safe to re-run.

-- 1) Trim stray whitespace from titles and show names
UPDATE products SET title = TRIM(title), artist_name = TRIM(artist_name)
WHERE title <> TRIM(title) OR artist_name <> TRIM(artist_name);

-- 2) Fix inconsistent capitalisation / typo on the "She Loves Me" entries
UPDATE products SET title = 'She Loves Me', artist_name = 'She Loves Me'
WHERE id IN ('8a9c1308-359b-4598-9f93-6f15af89cfe6');

-- 3) Add duration column (audition cuts: length is a purchase-deciding fact)
ALTER TABLE products ADD COLUMN IF NOT EXISTS duration_seconds numeric(10,1);

-- 4) Backfill durations from the actual audio files
UPDATE products SET duration_seconds = 68.1 WHERE id = '03165ce0-4654-4a2d-b2dd-a89b26b86072'; -- She Loves Me
UPDATE products SET duration_seconds = 109.6 WHERE id = 'd960b7ab-0269-40a4-a36a-5a71482ee1a7'; -- How It Ends
UPDATE products SET duration_seconds = 208.7 WHERE id = 'ceb2b47d-3a81-46a9-a36e-54974b1f9cd6'; -- Congratulations Professor Higgins 
UPDATE products SET duration_seconds = 102.5 WHERE id = 'a44e4eb6-2bd4-40a3-b748-0d779586a028'; -- Congratulations Professor Higgins 
UPDATE products SET duration_seconds = 67 WHERE id = 'd93a2af6-e80e-4ab4-8c3b-f145eff39cef'; -- With a Little Bit of Luck
UPDATE products SET duration_seconds = 251.9 WHERE id = '5938a5e1-dc0b-4d14-87a7-3c317b227d79'; -- With a Little Bit of Luck
UPDATE products SET duration_seconds = 107.2 WHERE id = 'cf9bdc00-a40f-47a2-99d7-274b39041459'; -- For Better Or Worse
UPDATE products SET duration_seconds = 254.6 WHERE id = '80561dec-0ae2-45c9-94b6-0940158fbeb2'; -- Love on the Rocks
UPDATE products SET duration_seconds = 213.1 WHERE id = '64c0520a-d80c-4320-b87c-1d3d3fbc5c72'; -- Silver Moon
UPDATE products SET duration_seconds = 123 WHERE id = '0080cf41-6797-4a5e-b73c-e06613eed4b8'; -- Stars
UPDATE products SET duration_seconds = 80.1 WHERE id = '56e9b8f9-7896-4407-ab62-ef941e81c282'; -- Listen to the Rain
UPDATE products SET duration_seconds = 52.1 WHERE id = 'a4be44c9-e525-42e7-ad95-4f3025dd2372'; -- Tonight At Eight
UPDATE products SET duration_seconds = 206.9 WHERE id = 'fbd41891-39dd-4add-bea4-b3d87990ac97'; -- Summer
UPDATE products SET duration_seconds = 145.6 WHERE id = 'b6ecec45-d184-401f-96ad-0bb2c7427c20'; -- Earth, Sea, Sky
UPDATE products SET duration_seconds = 83.4 WHERE id = 'f5705cb6-cbb8-4702-80b3-912e9681f466'; -- Naughty 
UPDATE products SET duration_seconds = 309.5 WHERE id = '807b6cb3-eccb-443c-a33c-0ac7265059d6'; -- Make a wish 
UPDATE products SET duration_seconds = 97.5 WHERE id = '24d7d534-1ee4-4b27-b04b-e506cd260ad4'; -- Will He Like Me
UPDATE products SET duration_seconds = 62.3 WHERE id = 'b9c7c91a-0cfc-4258-8ab5-c946c6947083'; -- Underground
UPDATE products SET duration_seconds = 96.2 WHERE id = '7f042afa-37ee-4cc6-9ef8-a4a84deeb466'; -- Glitter and Be Gay
UPDATE products SET duration_seconds = 127.9 WHERE id = 'a5125920-1524-45c9-b4d1-ea596d4477d4'; -- At The Fountain
UPDATE products SET duration_seconds = 111.3 WHERE id = 'a997ecc6-01b3-4213-9d6f-1f5bb490ee59'; -- Make Them Hear You
UPDATE products SET duration_seconds = 147.2 WHERE id = '93afc4fe-4013-4281-8448-0458679870de'; -- Streets of Dublin
UPDATE products SET duration_seconds = 120.9 WHERE id = '216ef839-65ff-4f62-b7a8-c76237d133c5'; -- Taylor the Latte Boy
UPDATE products SET duration_seconds = 68.1 WHERE id = '8a9c1308-359b-4598-9f93-6f15af89cfe6'; -- She love Me
UPDATE products SET duration_seconds = 143.8 WHERE id = '9b950820-f286-473f-81d4-4d883e13d41a'; -- I Need More
UPDATE products SET duration_seconds = 102.6 WHERE id = '1f5a9947-c3d4-4175-a11d-25914cd607d1'; -- Born To Entertain
UPDATE products SET duration_seconds = 206.4 WHERE id = 'efab4add-0fd6-4883-917a-6fe64296e4ef'; -- Die On This Hill
UPDATE products SET duration_seconds = 219.8 WHERE id = '23a278df-63bc-4b2f-897b-74751c1d6fe3'; -- Bye Room
UPDATE products SET duration_seconds = 212.6 WHERE id = 'e066b846-544f-420f-8a07-368610a1c3da'; -- I Like Christmas for the Food
UPDATE products SET duration_seconds = 221.8 WHERE id = 'da66c139-1660-4823-9394-3de1b01505fd'; -- Bundle: COME ALIVE, TIGHTROPE, FROM NOW ON...
UPDATE products SET duration_seconds = 267.9 WHERE id = '4be273d9-fd97-49b8-bee9-e353a5b23345'; -- I Need More
UPDATE products SET duration_seconds = 237.8 WHERE id = '99b4df49-dd76-4773-8991-89044019171c'; -- Through The Mountain

-- 5) Voice-type backfill for tracks silently excluded from the Voice filter.
--    Review the values below before running and adjust if any are wrong:
--      * Lin Marsh pieces are unison children's choir songs  -> Soprano
--      * Naughty (Matilda Jr) is sung by a child lead       -> Soprano
--      * She Loves Me (polished) matches its sibling variant -> Tenor/Bass
--      * Season Pack is a bundle, not a song -> intentionally left unset
UPDATE products SET vocal_ranges = ARRAY['Soprano'] WHERE id IN (
  '64c0520a-d80c-4320-b87c-1d3d3fbc5c72', -- Silver Moon
  '0080cf41-6797-4a5e-b73c-e06613eed4b8', -- Stars
  '56e9b8f9-7896-4407-ab62-ef941e81c282', -- Listen to the Rain
  'fbd41891-39dd-4add-bea4-b3d87990ac97', -- Summer
  'b6ecec45-d184-401f-96ad-0bb2c7427c20', -- Earth, Sea, Sky
  'f5705cb6-cbb8-4702-80b3-912e9681f466'  -- Naughty
);
UPDATE products SET vocal_ranges = ARRAY['Tenor','Bass']
WHERE id = '03165ce0-4654-4a2d-b2dd-a89b26b86072'; -- She Loves Me (polished)
