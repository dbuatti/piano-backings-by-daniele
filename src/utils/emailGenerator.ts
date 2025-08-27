import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY");

export interface BackingRequest {
  id?: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  track_purpose: string;
  backing_type: string[]; // Changed to array
  delivery_date: string;
  special_requests: string;
  song_key: string;
  additional_services: string[];
  track_type: string;
  youtube_link?: string;
  voice_memo?: string;
  additional_links?: string; // Added new field
}

// Email signature template
const EMAIL_SIGNATURE = `
<p>Warmly,<br>
Daniele Buatti<br>
Piano Backings by Daniele<br>
<a href="https://pianobackings.com">pianobackings.com</a><br>
<a href="https://www.youtube.com/@pianobackingsbydaniele">YouTube</a> | 
<a href="https://www.instagram.com/pianobackingsbydaniele/">Instagram</a> | 
<a href="https://www.facebook.com/PianoBackingsbyDaniele">Facebook</a></p>
`;

export const generateEmailCopy = async (request: BackingRequest) => {
  // Check if API key is valid
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.log("Gemini API key not configured, using fallback template");
    return generateFallbackEmail(request);
  }

  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Create a more sophisticated prompt based on the request data
    const prompt = `
    You are Daniele, a professional piano backing track creator who provides custom accompaniment for musical theatre performers. 
    Generate a personalized, warm, and professional email for a completed backing track request.
    
    Request details:
    - Request ID: ${request.id || 'N/A'}
    - Client name: ${request.name}
    - Client email: ${request.email}
    - Song title: "${request.song_title}"
    - Musical/Artist: ${request.musical_or_artist}
    - Track purpose: ${request.track_purpose}
    - Backing type(s): ${request.backing_type.join(', ') || 'N/A'}
    - Delivery date: ${request.delivery_date}
    - Special requests: ${request.special_requests || 'None'}
    - Song key: ${request.song_key}
    - Additional services: ${request.additional_services.join(', ') || 'None'}
    - Track type: ${request.track_type}
    - YouTube reference: ${request.youtube_link || 'Not provided'}
    - Voice memo reference: ${request.voice_memo || 'Not provided'}
    - Additional links: ${request.additional_links || 'Not provided'}
    
    Instructions for crafting the email:
    1. Create a compelling subject line that immediately tells the client their track is ready
    2. Open with a warm, personalized greeting using the client's name
    3. Use natural, conversational language - avoid overly enthusiastic phrases like "thrilled"
    4. Address special requests intelligently:
       - If the request is about tempo, mention you've adjusted the track to their specified tempo
       - If they provided a reference link, mention you used it as a guide
       - If they have specific musical requests, acknowledge them specifically
       - Summarize the request in a natural way rather than quoting it verbatim
    5. Include a detailed pricing breakdown with transparent costs, making the total amount due prominent.
    6. Offer multiple payment options with clear instructions.
    7. Proactively offer adjustments or revisions to ensure satisfaction.
    8. Include a personalized sign-off that reflects your professional relationship.
    9. Add your signature with contact information.
    10. Include a link to their customer portal where they can view their request details and download their track.
    11. Keep the tone professional yet friendly, showing genuine care for their success.
    12. Never use "Break a leg" - end with "Warmly" instead.
    13. Make sure hyperlinks are properly formatted as plain text URLs (not HTML) for better email compatibility.
    
    Additional context for tone:
    - Many clients are preparing for auditions or performances, so be encouraging
    - Some clients may be students or emerging artists, so be supportive
    - Clients have already paid or will pay, so express gratitude for their business
    - Your reputation depends on client satisfaction, so be thorough and helpful
    
    Format the response as JSON with two fields:
    {
      "subject": "Email subject line that creates excitement",
      "body": "Full email body content with proper line breaks"
    }
    `;
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse the response as JSON
    try {
      const emailData = JSON.parse(text);
      // Add the signature to the email body
      emailData.body += `\n\n${EMAIL_SIGNATURE}`;
      return emailData;
    } catch (parseError) {
      // If parsing fails, use fallback
      console.error('Error parsing Gemini response:', parseError);
      return generateFallbackEmail(request);
    }
  } catch (error) {
    console.error('Error generating email copy:', error);
    // Use fallback email template
    return generateFallbackEmail(request);
  }
};

// Fallback email template
const generateFallbackEmail = (request: BackingRequest) => {
  // Process special requests more intelligently
  let specialRequestSummary = '';
  if (request.special_requests) {
    if (request.special_requests.toLowerCase().includes('bpm') || request.special_requests.toLowerCase().includes('tempo')) {
      specialRequestSummary = 'I\'ve adjusted the tempo to your requested speed.';
    } else if (request.special_requests.toLowerCase().includes('youtube') || request.special_requests.toLowerCase().includes('reference')) {
      specialRequestSummary = 'I\'ve used your reference recording as a guide for the track.';
    } else {
      specialRequestSummary = 'I\'ve incorporated your specific requests into the track.';
    }
  }
  
  const totalCost = calculateTotal(request.backing_type, request.additional_services);

  return {
    subject: `Your "${request.song_title}" backing track is ready, ${request.name}!`,
    body: `Hi ${request.name},

I hope you're doing well!

Your custom piano backing track for "${request.song_title}" from ${request.musical_or_artist} is now complete and ready for your ${request.track_purpose === 'audition-backing' ? 'audition' : 'practice'}.

${request.special_requests ? specialRequestSummary : 'I\'ve prepared this track with great care to match your needs.'}

Here's a breakdown of the work completed:
${request.backing_type.map(type => `• ${type.replace('-', ' ')} backing: $${getBasePriceForType(type)}`).join('\n')}
${request.additional_services.map(service => `• ${service.replace('-', ' ')}: $${getServicePrice(service)}`).join('\n')}

---
**Total amount due: $${totalCost}**
---

You can view your request details, download your track, and complete your payment here:
https://pianobackingsbydaniele.vercel.app/track/${request.id}

Alternatively, you can complete your payment via:
1. Buy Me a Coffee: https://www.buymeacoffee.com/Danielebuatti
2. Direct bank transfer: BSB: 923100 | Account: 301110875

${request.additional_links ? `
Additional Links provided:
${request.additional_links}
` : ''}

If you'd like any tweaks—tempo adjustments, dynamics, or anything else—just reply to this email, and I'll happily adjust it for you.

Thank you so much for choosing Piano Backings by Daniele. I'm genuinely excited to hear how your ${request.track_purpose === 'audition-backing' ? 'audition' : 'performance'} goes!

${EMAIL_SIGNATURE}`
  };
};

// Helper functions for pricing
const getBasePriceForType = (type: string) => {
  switch (type) {
    case 'full-song': return '30';
    case 'audition-cut': return '15';
    case 'note-bash': return '10';
    default: return '20'; // Default if type is unknown
  }
};

const getServicePrice = (service: string) => {
  switch (service) {
    case 'rush-order': return '10';
    case 'complex-songs': return '7';
    case 'additional-edits': return '5';
    case 'exclusive-ownership': return '40';
    default: return '0';
  }
};

const calculateTotal = (backingTypes: string[], additionalServices: string[]) => {
  let total = 0;
  
  // Add base price for each selected backing type
  backingTypes.forEach(type => {
    switch (type) {
      case 'full-song': total += 30; break;
      case 'audition-cut': total += 15; break;
      case 'note-bash': total += 10; break;
      default: total += 20;
    }
  });
  
  // Add additional service costs
  additionalServices.forEach(service => {
    switch (service) {
      case 'rush-order':
        total += 10;
        break;
      case 'complex-songs':
        total += 7;
        break;
      case 'additional-edits':
        total += 5;
        break;
      case 'exclusive-ownership':
        total += 40;
        break;
    }
  });
  
  return total.toFixed(2);
};