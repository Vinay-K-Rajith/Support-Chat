import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSupportContext } from "./support-context";
import { getKnowledgeBase } from "./knowledge-base";
import MongoClientService from "./mongo-client";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || "AIzaSyCKNgAg31MWI2TEYsON8y_0cXzRZZktQnU"
);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function generateResponse(userMessage: string, sessionId?: string): Promise<string> {
  try {
    const supportContext = getSupportContext();
    // Fetch knowledge base documents
    const kb = await getKnowledgeBase();
    let documentText = "";
    if (kb && Array.isArray(kb.documents)) {
      documentText = kb.documents.map((doc: any) => `Document: ${doc.filename}\n${doc.text}`).join("\n\n");
    }
    const systemPrompt = `You are a customer support AI assistant for the Entab Support Desk. You help users solve problems related to any Entab module, including fees, billing, academics, online payments, reports, and more.

When answering, use the following formatting triggers to help the UI render your response beautifully:
- For a summary, start with 'Quick Answer:'
- For instructions,always use 'Step-by-Step Guide:' as a heading, then list each step as a numbered list (1., 2., ...)
- For important notes, use 'Note:' or 'Warning:' at the start of the line whenever it is important to the user
- Use markdown formatting for clarity (bold for headings, lists, etc.)

If a scenario matches, provide the steps or answer in a clear, friendly, and professional manner using the above structure. If not, politely ask for more details or direct the user to contact support.
if you don't have  info on that particular query ask the user create a new support ticket 
SUPPORT CONTEXT:\n${JSON.stringify(supportContext, null, 2)}\n\nDOCUMENTS:\n${documentText}\n\nPlease respond to the user's query in a helpful and informative way. Use the support context and documents to provide accurate information in detail.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `User Query: ${userMessage}` }
    ]);

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again later or contact support for immediate assistance.";
  }
}
