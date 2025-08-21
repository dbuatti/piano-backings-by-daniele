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
    
    // Create a more sophisticated prompt based on the request data
    const prompt = `
    You are Daniele, a professional piano backing track creator who provides custom accompaniment for musical theatre performers. 
    Generate a personalized, warm, and professional email for a completed backing track request.
    
    Request details:
    - Client name: ${request.name}
    - Client email: ${request.email}
    - Song title: "${request.song_title}"
    - Musical/Artist: ${request.musical_or_artist}
    - Track purpose: ${request.track_purpose}
    - Backing type: ${request.backing_type}
    - Delivery date: ${request.delivery_date}
    - Special requests: ${request.special_requests || 'None'}
    - Song key: ${request.song_key}
    - Additional services: ${request.additional_services.join(', ') || 'None'}
    - Track type: ${request.track_type}
    - YouTube reference: ${request.youtube_link || 'Not provided'}
    - Voice memo reference: ${request.voice_memo || 'Not provided'}
    
    Instructions for crafting the email:
    1. Create a compelling subject line that immediately tells the client their track is ready
    2. Open with a warm, personalized greeting using the client's name
    3. Express genuine enthusiasm for working on their specific song
    4. Provide specific details about how you've addressed their special requests
    5. Include a detailed pricing breakdown with transparent costs
    6. Offer multiple payment options with clear instructions
    7. Proactively offer adjustments or revisions to ensure satisfaction
    8. Include a personalized sign-off that reflects your professional relationship
    9. Add your signature with contact information
    10. Keep the tone professional yet friendly, showing genuine care for their success
    
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
    
    Example structure to follow:
    "subject": "Your [Song Title] backing track is ready for [Client Name]!",
    "body": "Hi [Client Name],

I hope you're having a wonderful day!

I'm thrilled to let you know that your custom piano backing track for "[Song Title]" from [Musical/Artist] is now complete and ready for your audition/performance/practice.

[Personalized details about how you addressed their specific requests]

Here's a breakdown of the work completed:
• [Track type] in [key]: [Price]
${request.additional_services.map(service => `• ${service}: $${getServicePrice(service)}`).join('\n')}

Total amount: $[Total]

You can complete your payment via:
1. Buy Me a Coffee: [link]
2. Direct bank transfer: [details]

[Offer adjustments or revisions]

Thank you so much for choosing Piano Backings by Daniele. I'm genuinely excited to hear how your [audition/performance] goes!

Break a leg,
Daniele
🎹 Piano Backings by Daniele
📧 pianobackingsbydaniele@gmail.com"
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
        subject: `Your piano backing – ${request.song_title} from ${request.musical_or_artist} is ready!`,
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
      subject: `Your piano backing – ${request.song_title} from ${request.musical_or_artist} is ready!`,
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
    case 'rush-order': return '10';
    case 'complex-songs': return '7';
    case 'additional-edits': return '5';
    case 'exclusive-ownership': return '40';
    default: return '0';
  }
};