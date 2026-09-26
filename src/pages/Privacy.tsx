import LegalPage, { LegalSection, CONTACT_EMAIL } from "@/components/LegalPage";

const Privacy = () => (
  <LegalPage
    title="Privacy Policy"
    seoTitle="Privacy Policy | Piano Backings by Daniele"
    description="What personal information Piano Backings by Daniele collects, why, who helps process it, and how to access or delete it."
    intro={
      <>
        In short: I only collect what I need to make and deliver your tracks. There are no advertising trackers, and I
        never sell or share your information for marketing.
      </>
    }
  >
    <LegalSection title="1. What I collect">
      <ul>
        <li><strong>Contact details:</strong> your name and email address.</li>
        <li>
          <strong>Your request:</strong> song details, keys, due dates, notes, and any sheet music, voice memos or
          reference links you provide.
        </li>
        <li>
          <strong>Account details:</strong> if you sign in (by email or with Google), your email address and basic
          profile information from your sign-in provider.
        </li>
        <li>
          <strong>Orders and payments:</strong> what you ordered or bought, the amount, and payment status. Card
          payments are processed by Stripe; I never see or store your card number.
        </li>
        <li><strong>Messages:</strong> emails you send me and issue reports submitted through the site.</li>
        <li>
          <strong>Basic usage statistics:</strong> anonymous page-view counts through Vercel Web Analytics, which
          doesn't use cookies or follow you across other websites.
        </li>
      </ul>
    </LegalSection>

    <LegalSection title="2. How I use it">
      <ul>
        <li>to record, deliver and follow up on your tracks;</li>
        <li>to process payments, credits, invoices and refunds;</li>
        <li>to email you about your orders and account, for example confirmations and delivery notices;</li>
        <li>to fix problems and improve the site.</li>
      </ul>
      <p>I don't send marketing emails unless you've asked to receive them.</p>
    </LegalSection>

    <LegalSection title="3. Services that help run the site">
      <p>
        A small number of trusted providers store or process information on my behalf, only as needed to provide the
        service:
      </p>
      <ul>
        <li><strong>Supabase</strong>: database, sign-in and file storage.</li>
        <li><strong>Vercel</strong>: website hosting and anonymous analytics.</li>
        <li><strong>Stripe</strong>: card payments.</li>
        <li><strong>Google</strong>: sending order emails (Gmail) and optional Google sign-in.</li>
        <li><strong>Dropbox</strong>: working files while I record your track.</li>
        <li><strong>Notion</strong>: my private project board for tracking requests.</li>
      </ul>
      <p>
        Some of these providers store data on servers outside Australia, including in the United States. They are
        well-established services with their own security and privacy obligations.
      </p>
    </LegalSection>

    <LegalSection title="4. Cookies and browser storage">
      <p>
        The site uses your browser's storage only for things it needs to work, such as keeping you signed in,
        remembering what's in your cart, and remembering that you closed a notice. There are no advertising or cross-site tracking cookies.
      </p>
    </LegalSection>

    <LegalSection title="5. How long I keep it">
      <p>
        I keep order details and delivered tracks while you have an account or while they're useful for re-ordering
        and support. Payment and invoice records are kept for as long as Australian tax law requires (generally five
        years). You can ask me to delete your information at any time, as explained below.
      </p>
    </LegalSection>

    <LegalSection title="6. Security">
      <p>
        Information is stored with the providers above using encrypted connections. Uploaded files are kept at long,
        randomly generated links that aren't published anywhere. No system is perfectly secure, so please don't upload
        anything you wouldn't want shared, and let me know straight away if you notice something wrong.
      </p>
    </LegalSection>

    <LegalSection title="7. Your choices and rights">
      <p>
        You can ask to see, correct or delete the personal information I hold about you by emailing{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. I'll respond within 30 days. If you're not happy
        with how I've handled a privacy concern, you can contact the Office of the Australian Information
        Commissioner at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a>.
      </p>
    </LegalSection>

    <LegalSection title="8. Changes to this policy">
      <p>
        If I change how I handle personal information, I'll update this page and the date at the top.
      </p>
    </LegalSection>
  </LegalPage>
);

export default Privacy;
