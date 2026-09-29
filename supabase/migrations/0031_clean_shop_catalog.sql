-- 0031_clean_shop_catalog.sql
-- Shop catalogue clean-up (data only, no schema changes). Safe to run more than once.
--
-- * "Show" (products.artist_name) holds the musical a song comes from. Songs that
--   aren't from a show keep their artist or songwriter there, and the shop labels
--   the column "Show / artist".
-- * Fixes typos and title casing, e.g. "Flloyd Collins" -> "Floyd Collins".
-- * One key format everywhere: note name + "major"/"minor" ("B♭ major", "F♯ minor").
--   The site also normalises keys on display and when a product is saved in admin,
--   so new entries stay consistent.
--
-- Blank keys, voice types and durations, and shows that couldn't be confirmed, are
-- NOT guessed here; they're listed in docs/shop-catalog-review.md.
--
-- updated_at is bumped so the sitemap dates are right and the site stops serving
-- song pages that were prerendered before this clean-up.

BEGIN;

-- At The Fountain / Sweet Smell of Success
UPDATE public.products SET key_signature = 'D major', updated_at = now() WHERE id = 'a5125920-1524-45c9-b4d1-ea596d4477d4';
-- Born To Entertain / Ruthless
UPDATE public.products SET key_signature = 'C major', updated_at = now() WHERE id = '1f5a9947-c3d4-4175-a11d-25914cd607d1';
-- Bundle: COME ALIVE, TIGHTROPE, FROM NOW ON... / COME ALIVE
UPDATE public.products SET title = 'Bundle: Come Alive, Tightrope, From Now On', artist_name = 'The Greatest Showman', updated_at = now() WHERE id = 'da66c139-1660-4823-9394-3de1b01505fd';
-- Bye Room / John and Jen
UPDATE public.products SET key_signature = 'G major', updated_at = now() WHERE id = '23a278df-63bc-4b2f-897b-74751c1d6fe3';
-- Congratulations Professor Higgins / My Fair Lady
UPDATE public.products SET key_signature = 'F major', updated_at = now() WHERE id = 'ceb2b47d-3a81-46a9-a36e-54974b1f9cd6';
-- Congratulations Professor Higgins / My Fair Lady
UPDATE public.products SET key_signature = 'F major', updated_at = now() WHERE id = 'a44e4eb6-2bd4-40a3-b748-0d779586a028';
-- Die On This Hill / Sienna Spiro
UPDATE public.products SET key_signature = 'A♭ major', updated_at = now() WHERE id = 'efab4add-0fd6-4883-917a-6fe64296e4ef';
-- Earth, Sea, Sky / Lin Marsh
UPDATE public.products SET key_signature = 'F major', updated_at = now() WHERE id = 'b6ecec45-d184-401f-96ad-0bb2c7427c20';
-- For Better Or Worse / The Great Gatsby
UPDATE public.products SET key_signature = 'B♭ major', updated_at = now() WHERE id = 'cf9bdc00-a40f-47a2-99d7-274b39041459';
-- How It Ends / Big Fish
UPDATE public.products SET key_signature = 'D major', updated_at = now() WHERE id = 'd960b7ab-0269-40a4-a36a-5a71482ee1a7';
-- I Like Christmas for the Food / Katie Thompson
UPDATE public.products SET key_signature = 'C major', updated_at = now() WHERE id = 'e066b846-544f-420f-8a07-368610a1c3da';
-- I Need More / Writing Kevin Taylor
UPDATE public.products SET key_signature = 'G major', updated_at = now() WHERE id = '9b950820-f286-473f-81d4-4d883e13d41a';
-- I Need More / Writing Kevin Taylor
UPDATE public.products SET key_signature = 'G major', updated_at = now() WHERE id = '4be273d9-fd97-49b8-bee9-e353a5b23345';
-- Listen to the Rain / Lin Marsh
UPDATE public.products SET key_signature = 'C major', updated_at = now() WHERE id = '56e9b8f9-7896-4407-ab62-ef941e81c282';
-- Love on the Rocks / Neil Diamond
UPDATE public.products SET key_signature = 'F major', updated_at = now() WHERE id = '80561dec-0ae2-45c9-94b6-0940158fbeb2';
-- Love Revolution / Cy Coleman
UPDATE public.products SET key_signature = 'F major', updated_at = now() WHERE id = 'b59f3a4d-4a97-43c2-add1-e6491f8019d7';
-- Make a wish / Kimberly Akimbo
UPDATE public.products SET title = 'Make a Wish', key_signature = 'B♭ major', updated_at = now() WHERE id = '807b6cb3-eccb-443c-a33c-0ac7265059d6';
-- Make Them Hear You / Ragtime
UPDATE public.products SET key_signature = 'E♭ major', updated_at = now() WHERE id = 'a997ecc6-01b3-4213-9d6f-1f5bb490ee59';
-- Naughty / Matilda Jr
UPDATE public.products SET artist_name = 'Matilda JR.', key_signature = 'F major', updated_at = now() WHERE id = 'f5705cb6-cbb8-4702-80b3-912e9681f466';
-- People will say we’re in love  / Oklahoma
UPDATE public.products SET title = 'People Will Say We''re in Love', artist_name = 'Oklahoma!', key_signature = 'A major', updated_at = now() WHERE id = '23ca0422-5bc0-4e60-ba38-69f417f96d10';
-- She Loves Me / She Loves Me
UPDATE public.products SET key_signature = 'E♭ major', updated_at = now() WHERE id = '03165ce0-4654-4a2d-b2dd-a89b26b86072';
-- She Loves Me / She Loves Me
UPDATE public.products SET key_signature = 'A♭ major', updated_at = now() WHERE id = '8a9c1308-359b-4598-9f93-6f15af89cfe6';
-- Silver Moon / Lin Marsh
UPDATE public.products SET key_signature = 'G major', updated_at = now() WHERE id = '64c0520a-d80c-4320-b87c-1d3d3fbc5c72';
-- Stars / Lin Marsh
UPDATE public.products SET key_signature = 'A major', updated_at = now() WHERE id = '0080cf41-6797-4a5e-b73c-e06613eed4b8';
-- Streets of Dublin / Man of no importance
UPDATE public.products SET artist_name = 'A Man of No Importance', key_signature = 'E major', updated_at = now() WHERE id = '93afc4fe-4013-4281-8448-0458679870de';
-- Summer / Lin Marsh
UPDATE public.products SET key_signature = 'D major', updated_at = now() WHERE id = 'fbd41891-39dd-4add-bea4-b3d87990ac97';
-- Taylor the Latte Boy / Marcy Heisler and Zina Goldrich
UPDATE public.products SET key_signature = 'B♭ major', updated_at = now() WHERE id = '216ef839-65ff-4f62-b7a8-c76237d133c5';
-- Through The Mountain / Flloyd Collins
UPDATE public.products SET artist_name = 'Floyd Collins', key_signature = 'C major', updated_at = now() WHERE id = '99b4df49-dd76-4773-8991-89044019171c';
-- Tonight At Eight / She Loves Me
UPDATE public.products SET key_signature = 'D major', updated_at = now() WHERE id = 'a4be44c9-e525-42e7-ad95-4f3025dd2372';
-- Underground / Cody Fry
UPDATE public.products SET key_signature = 'F major', updated_at = now() WHERE id = 'b9c7c91a-0cfc-4258-8ab5-c946c6947083';
-- Will he like me / Jerry Bock, (She loves me)
UPDATE public.products SET title = 'Will He Like Me', artist_name = 'She Loves Me', key_signature = 'G major', updated_at = now() WHERE id = 'b6a6ca68-805d-40fc-b501-e5ff1e8f4c99';
-- Will He Like Me / She Loves Me
UPDATE public.products SET key_signature = 'G major', updated_at = now() WHERE id = '24d7d534-1ee4-4b27-b04b-e506cd260ad4';
-- With a Little Bit of Luck / My Fair Lady
UPDATE public.products SET key_signature = 'C major', updated_at = now() WHERE id = '5938a5e1-dc0b-4d14-87a7-3c317b227d79';
-- With a Little Bit of Luck / My Fair Lady
UPDATE public.products SET key_signature = 'C major', updated_at = now() WHERE id = 'd93a2af6-e80e-4ab4-8c3b-f145eff39cef';

COMMIT;
