import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSchoolContext } from "./school-context";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || "AIzaSyDiS_-3NEG95Aj3Fr4Vv_hm0EY-rr3IJ00"
);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function generateResponse(userMessage: string, sessionId?: string): Promise<string> {
  try {
    const schoolContext = getSchoolContext();
    
    const systemPrompt = `You are an AI assistant for St. Xavier's School, Bathinda. You help students and parents with enquiries about the school.

IMPORTANT GUIDELINES:
- Always be helpful, professional, and friendly
- Provide accurate information based on the school context provided
- Use proper formatting with emojis and bullet points for better readability
- If you don't have specific information, direct users to contact the school
- Always maintain the school's professional image
- Be concise but comprehensive in your responses

SCHOOL CONTEXT:
${JSON.stringify(schoolContext, null, 2)}

Please respond to the user's query in a helpful and informative way. Use the school context to provide accurate information.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `User Query: ${userMessage}` }
    ]);

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again later or contact the school directly at contactsaintxaviersbathinda@gmail.com for immediate assistance.";
  }
}
