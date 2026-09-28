# Shop catalogue: items to check by hand

`supabase/migrations/0031_clean_shop_catalog.sql` fixes everything that could be
fixed with confidence from the data alone. Run it before deploying. The items below
need someone who knows the tracks: the right value isn't in the data, and guessing
would put wrong information on public song pages.

Edit these in **Admin → Shop → Products**. Song pages update on the next deploy
(changed songs update straight away).

## Fixed by the migration

- Typos: **Flloyd Collins → Floyd Collins**; "Man of no importance" → **A Man of No
  Importance**; "Oklahoma " → **Oklahoma!**; "Matilda Jr" → **Matilda JR.**
- Show column holding a composer: "Jerry Bock, (She loves me)" → **She Loves Me**
  (this row now merges with the other "Will He Like Me" into one song page).
- Show column holding a song name: "COME ALIVE" → **The Greatest Showman** (bundle
  retitled "Bundle: Come Alive, Tightrope, From Now On").
- Title casing: "Make a wish" → **Make a Wish**; "People will say we're in love " →
  **People Will Say We're in Love**; "Will he like me" → **Will He Like Me**.
- One key format everywhere: `B♭ major` / `F♯ minor`. For example, "Bb Major",
  "D Major (2♯)" and "C Major (0)" become "B♭ major", "D major" and "C major". Keys
  are also normalised when a product is saved in admin.

## Couldn't fix: needs your input

### Show column: artist or composer, not a show

The shop now labels the column **Show / artist**, so a songwriter or artist is
acceptable for songs that aren't from a musical. Please confirm or replace:

| Song | Current value | Question |
| --- | --- | --- |
| I Need More (2 versions) | Writing Kevin Taylor | Is this a show title, an artist, or a songwriter? |
| Love Revolution | Cy Coleman | Composer. Which show (if any) is it from? |
| I Like Christmas for the Food | Katie Thompson | Songwriter or performer? Any show? |
| Earth, Sea, Sky / Listen to the Rain / Silver Moon / Stars / Summer | Lin Marsh | Composer. Fine as "artist" if they're standalone songs. |
| Taylor the Latte Boy | Marcy Heisler and Zina Goldrich | Songwriters, standalone song. Fine as is, or use "Goldrich & Heisler". |
| Die On This Hill | Sienna Spiro | Artist. Fine as is. |
| Love on the Rocks | Neil Diamond | Artist. Fine as is. |
| Underground | Cody Fry | Artist. Fine as is. |

### Blank key

- **Glitter and Be Gay (Candide)**: no key recorded.
- **Bundle: Come Alive, Tightrope, From Now On**: key is "Various". Left as is; list
  the three keys if you'd like them shown.

### Blank voice type

- Earth, Sea, Sky; Listen to the Rain; Silver Moon; Stars; Summer (Lin Marsh)
- Naughty (Matilda JR.)
- She Loves Me, the E♭ major version (the A♭ version is Tenor/Bass)

### Blank duration

- Love Revolution (Cy Coleman)
- People Will Say We're in Love (Oklahoma!)
- Will He Like Me, the polished version (the former "Jerry Bock, (She loves me)" row)

### No audio preview (17 products)

Make Them Hear You · Naughty · People Will Say We're in Love · She Loves Me (both) ·
Silver Moon · Stars · Streets of Dublin · Summer · Taylor the Latte Boy · Through the
Mountain · Tonight at Eight · Underground · Will He Like Me (both) · With a Little
Bit of Luck (both).

Migration 0030 says to click **Admin → Shop → Products → Generate previews** once;
that may not have been run yet.

### Song intros

Each song page has a hand-written intro in `src/lib/song-intros.json` (60–100 words).
Songs added later get a generated intro until you add one there. The intros for the
songs above with unknown shows only describe the track (type, key, voice, length),
not the song's story.
