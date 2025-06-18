import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatMessageSchema, insertChatSessionSchema } from "@shared/schema";
import { generateResponse } from "./services/gemini";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new chat session
  app.post("/api/chat/session", async (req, res) => {
    try {
      const sessionId = nanoid();
      const session = await storage.createChatSession({ sessionId });
      res.json({ sessionId: session.sessionId });
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  // Send a message and get AI response
  app.post("/api/chat/message", async (req, res) => {
    try {
      const { sessionId, content } = req.body;
      
      if (!sessionId || !content) {
        return res.status(400).json({ error: "Session ID and content are required" });
      }

      // Save user message
      const userMessage = await storage.createChatMessage({
        sessionId,
        content,
        isUser: true,
      });

      // Generate AI response
      const aiResponse = await generateResponse(content, sessionId);
      console.log('AI Response generated:', aiResponse);

      // Save AI response
      const aiMessage = await storage.createChatMessage({
        sessionId,
        content: aiResponse,
        isUser: false,
      });

      console.log('Response payload:', {
        userMessage,
        aiMessage,
      });

      res.json({
        userMessage,
        aiMessage,
      });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Get chat history for a session
  app.get("/api/chat/history/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getChatMessages(sessionId);
      res.json({ messages });
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
