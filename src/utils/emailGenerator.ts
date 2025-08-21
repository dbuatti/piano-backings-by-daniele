import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY");

export interface BackingRequest {
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  track_purpose: string;
  backing_type: string;
  delivery_date: string;
  special_requests: string;
  song_key: string;
  additional_services: string[];
  track_type: string;
  youtube_link?: string;
  voice_memo?: string;
}

export const generateEmailCopy = async (request: BackingRequest) => {
  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Create a prompt based on the request data
    const prompt = `
    You are Daniele, a piano backing track creator. Generate a friendly, professional email for a completed backing track request.
    
    Request details:
    - Client name: ${request.name}
    - Song title: ${request.song_title}
    - Musical/Artist: ${request.musical_or_artist}
    - Track purpose: ${request.track_purpose}
    - Backing type: ${request.backing_type}
    - Delivery date: ${request.delivery_date}
    - Special requests: ${request.special_requests || 'None'}
    - Song key: ${request.song_key}
    - Additional services: ${request.additional_services.join(', ') || 'None'}
    - Track type: ${request.track_type}
    
    Instructions:
    1. Create a subject line
    2. Write a warm, professional email body
    3. Mention the track details
    4. Include pricing information based on track type and additional services
    5. Provide payment options (Buy Me a Coffee link: https://www.buymeacoffee.com/Danielebuatti)
    6. Offer adjustments if needed
    7. End with a friendly sign-off
    
    Format the response as JSON with two fields:
    {
      "subject": "Email subject line",
      "body": "Full email body content"
    }
    `;
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse the response as JSON
    try {
      const emailData = JSON.parse(text);
      return emailData;
    } catch (parseError) {
      // If parsing fails, try to extract subject and body from the text
      console.error('Error parsing Gemini response:', parseError);
      console.log('Raw response:', text);
      
      // Fallback to a basic email structure
      return {
        subject: `Your piano backing – ${request.song_title} from ${request.musical_or_artist}`,
        body: `Hi ${request.name},

I hope you're doing well!

Your custom piano backing track for "${request.song_title}" from ${request.musical_or_artist} is now ready. I've prepared this as a ${request.track_type} in ${request.song_key}.

Special requests included: ${request.special_requests || 'None'}

Pricing summary:
- ${request.track_type}: $${getBasePrice(request.track_type)}
${request.additional_services.map(service => `- ${service}: $${getServicePrice(service)}`).join('\n')}

You can pay easily via Buy Me a Coffee: https://www.buymeacoffee.com/Danielebuatti
Or let me know if you'd prefer a direct bank transfer.

If you'd like any tweaks—tempo adjustments, dynamics, or anything else—just let me know, and I'll happily adjust it.

Thanks so much, and best of luck with your performance!

Warm regards,
Daniele
🎹 Piano Backings by Daniele`
      };
    }
  } catch (error) {
    console.error('Error generating email copy:', error);
    
    // Fallback email template
    return {
      subject: `Your piano backing – ${request.song_title} from ${request.musical_or_artist}`,
      body: `Hi ${request.name},

Your custom piano backing track for "${request.song_title}" from ${request.musical_or_artist} is now ready.

Pricing summary:
- ${request.track_type}: $${getBasePrice(request.track_type)}
${request.additional_services.map(service => `- ${service}: $${getServicePrice(service)}`).join('\n')}

You can pay via Buy Me a Coffee: https://www.buymeacoffee.com/Danielebuatti

Let me know if you need any adjustments!

Best regards,
Daniele
🎹 Piano Backings by Daniele`
    };
  }
};

// Helper functions for pricing
const getBasePrice = (trackType: string) => {
  switch (trackType) {
    case 'quick': return '5-10';
    case 'one-take': return '10-20';
    case 'polished': return '15-35';
    default: return '15-35';
  }
};

const getServicePrice = (service: string) => {
  switch (service) {
    case 'Rush Order': return '10';
    case 'Complex Songs': return '7';
    case 'Additional Edits': return '5';
    case 'Exclusive Ownership': return '40';
    default: return '0';
  }
};