// Google review ask, used in delivery emails and the 3-day follow-up
// (send-review-followups). Keep REVIEW_CTA_HTML in sync with src/utils/emailGenerator.ts.

export const GOOGLE_REVIEW_URL = 'https://g.page/r/CdYOLqci-9TKEBM/review';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://pianobackings.danielebuatti.com';

const escapeHtml = (value: string) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** One line plus a Hot Pink button, placed straight after a download link. */
export const REVIEW_CTA_HTML = `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
  <tr>
    <td style="padding: 20px; background-color: #FDFCF7; border: 1px solid #ece8f5; border-radius: 12px; text-align: center; font-family: Arial, sans-serif;">
      <p style="margin: 0 0 14px 0; color: #1C0357; font-size: 16px; font-weight: bold;">Loved your track? A quick Google review helps other performers find me&nbsp;→</p>
      <a href="${GOOGLE_REVIEW_URL}" target="_blank" rel="noopener noreferrer"
         style="background-color: #F538BC; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        Leave a Google review
      </a>
    </td>
  </tr>
</table>`;

/** The follow-up sent 3 days after delivery: one ask, nothing else. */
export const reviewFollowupEmail = ({ name, song }: { name?: string | null; song?: string | null }) => {
  const firstName = escapeHtml((name || '').trim().split(/\s+/)[0] || 'there');
  const songLine = song ? ` for <strong>"${escapeHtml(song)}"</strong>` : '';
  return {
    subject: 'How did your track go?',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <p>Hi ${firstName},</p>
        <p>I hope your backing track${songLine} is working well for you!</p>
        ${REVIEW_CTA_HTML}
        <p>If anything about the track isn't quite right, just reply to this email and I'll sort it out.</p>
        <p>Thank you!<br/>Daniele</p>
        <p style="margin-top: 32px; font-size: 12px; color: #888;">
          Piano Backings by Daniele · <a href="${SITE_URL}" style="color: #1C0357;">${SITE_URL.replace(/^https?:\/\//, '')}</a>
        </p>
      </div>`,
  };
};
