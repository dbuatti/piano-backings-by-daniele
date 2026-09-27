import { Link } from 'react-router-dom';
import seoPages from "@/lib/seo-pages.json";
import LegalPage, { LegalSection, CONTACT_EMAIL } from "@/components/LegalPage";

const Terms = () => (
  <LegalPage
    title="Terms of Service"
    seoTitle={seoPages['/terms'].title}
    description={seoPages['/terms'].description}
    intro={
      <>
        These terms cover custom backing tracks ordered through this site and tracks bought from the shop.
        They're written in plain English. If anything is unclear, just{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#1C0357] font-bold underline">email me</a>.
      </>
    }
  >
    <LegalSection title="1. Who I am">
      <p>
        Piano Backings by Daniele is run by Daniele Buatti (ABN 49 833 619 500), a pianist and music director
        based in Victoria, Australia. In these terms, "I", "me" and "my" mean Daniele; "you" means the person placing an
        order or making a purchase.
      </p>
      <p>
        By submitting a request or buying a track you agree to these terms. If you're under 18, please ask a
        parent or guardian to place the order or check these terms with you.
      </p>
    </LegalSection>

    <LegalSection title="2. Custom backing tracks">
      <ul>
        <li>
          Prices for each tier (Note Bash, Audition Ready, Full Song) and any add-ons are shown on the{' '}
          <Link to="/pricing">pricing page</Link> and confirmed on the order form before you pay.
        </li>
        <li>
          Please give accurate details: the song, the cut, the key and any reference material. I'll record from the
          sheet music and notes you provide, so the track can only be as accurate as the brief.
        </li>
        <li>
          Standard delivery is usually 3 to 5 business days. Requested due dates and "as soon as humanly possible"
          are scheduled on a best-effort basis. A paid Rush Order is delivered within 24 hours of the order being
          accepted; if I can't meet that, the rush fee is refunded.
        </li>
        <li>
          I may decline a request (for example, if it's outside what I can record well or I'm closed for a holiday
          period). If I decline, you won't be charged, or any payment will be refunded in full.
        </li>
        <li>Tracks are delivered as high-quality MP3 files unless we agree on another format.</li>
      </ul>
    </LegalSection>

    <LegalSection title="2a. Custom sheet music">
      <p>
        You can add custom sheet music (+$50) to a custom track order or to a track bought from the shop. It's a clean,
        engraved score of the cut, prepared in Sibelius, with the cut already made so the music flows without cut marks.
      </p>
      <ul>
        <li>For custom orders, it's delivered with your track.</li>
        <li>
          For shop purchases, it's delivered as a PDF, usually within 3 to 5 business days (straight away if it's
          already been prepared for that track).
        </li>
        <li>Sheet music is for your own use, on the same terms as your track (see section 6).</li>
      </ul>
    </LegalSection>

    <LegalSection title="3. Payment">
      <p>
        You can pay by card through Stripe when you order, or by Buy Me a Coffee or direct bank transfer as shown on
        your track page. Card details are handled by Stripe and are never seen or stored by me. Account credits and
        promo codes apply as described when they are issued. They can't be exchanged for cash, and promo codes can't
        be combined unless stated.
      </p>
    </LegalSection>

    <LegalSection title="4. Adjustments after delivery">
      <p>
        I want you to be happy with your track. Small adjustments, such as tempo, dynamics or fixing anything that
        doesn't match your brief, are included; just reply to your delivery email. Changes that alter the original
        brief after recording (a new key, a different cut, extra sections) may be quoted as a new request.
      </p>
    </LegalSection>

    <LegalSection title="5. Cancellations and refunds">
      <ul>
        <li><strong>Before I start recording:</strong> cancel any time for a full refund.</li>
        <li>
          <strong>After I've started:</strong> because each track is made to order, I can't offer change-of-mind
          refunds once work is underway. If you need to cancel mid-way, contact me and I'll do what's fair for the
          work already done.
        </li>
        <li>
          <strong>Shop tracks:</strong> these are instant digital downloads, so change-of-mind refunds aren't
          available once the file has been delivered.
        </li>
        <li>
          If a track has a problem I can't fix (for example, the wrong song, a faulty file, or a track that doesn't
          match its description), you're entitled to a refund.
        </li>
      </ul>
      <p>
        Nothing in these terms limits your rights under the Australian Consumer Law. Where those guarantees apply,
        they come first.
      </p>
    </LegalSection>

    <LegalSection title="6. How you can use your tracks">
      <p>
        When you've paid for a track, you get a personal, non-exclusive licence to use it for your own practice,
        lessons, rehearsals, auditions, self-tapes, performances, and social media videos of you performing with it.
      </p>
      <p>Please don't:</p>
      <ul>
        <li>share, resell, or give away the audio file or sheet music, or upload the track on its own (without your performance) anywhere;</li>
        <li>claim the recording as your own or remove credit where credit is asked for;</li>
        <li>release it commercially (for example, on streaming services) or use it to train AI models without my written permission.</li>
      </ul>
      <p>
        I keep the copyright in my recordings. Unless you add <strong>Exclusive Ownership</strong> to your order, I may
        also offer the track I recorded for you in my shop so other singers can buy it. With Exclusive Ownership, your
        track is yours alone and won't be sold to anyone else.
      </p>
      <p>
        The underlying songs belong to their writers and publishers. If you
        perform publicly, any performance licensing (for example, through APRA AMCOS or the venue) is your or the
        venue's responsibility.
      </p>
    </LegalSection>

    <LegalSection title="7. Material you send me">
      <p>
        By uploading sheet music, voice memos or other material, you confirm you're entitled to share it with me for
        the purpose of making your track. I don't publish the sheet music, voice memos or personal details you send
        me. If your track is later offered in my shop, the listing describes the key and cut in words and may link to
        the official published score. See the <Link to="/privacy">Privacy Policy</Link> for how uploads are stored.
      </p>
    </LegalSection>

    <LegalSection title="8. Your account">
      <p>
        You can order as a guest or with an account. If you create one, keep your login secure and let me know if you
        think someone else has used it. I may suspend accounts that are misused.
      </p>
    </LegalSection>

    <LegalSection title="9. Liability">
      <p>
        I take care to deliver accurate, high-quality tracks on time, but I'm not responsible for losses that I
        couldn't reasonably foresee, such as a missed audition outcome. To the extent the law allows, my total
        liability for any order is limited to the amount you paid for it. This doesn't exclude any liability that
        can't be excluded under the Australian Consumer Law.
      </p>
    </LegalSection>

    <LegalSection title="10. Changes to these terms">
      <p>
        I may update these terms from time to time. The version shown here when you place an order is the one that
        applies to that order. These terms are governed by the laws of Victoria, Australia.
      </p>
    </LegalSection>

    <LegalSection title="11. Contact">
      <p>
        Questions, cancellations or problems with a track: email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalSection>
  </LegalPage>
);

export default Terms;
