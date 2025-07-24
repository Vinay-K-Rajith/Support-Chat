import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatMessageSchema, insertChatSessionSchema } from "@shared/schema";
import { generateResponse } from "./services/gemini";
import { nanoid } from "nanoid";
import { getKnowledgeBase, updateKnowledgeBase } from "./services/knowledge-base";
import { getAllChatSessions, getChatMessagesBySession, saveChatMessage, getUsageStats, getHourlyUsageStats } from "./services/chat-history";
import multer from "multer";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import type { Request } from "express";
import { MongoClient } from "mongodb"; // <-- FIXED: import MongoClient instead of require

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
const upload = multer({ dest: uploadsDir });

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

  // --- Chat History API ---
  app.get("/api/chat/sessions", async (req, res) => {
    try {
      const sessions = await getAllChatSessions();
      res.json({ sessions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  app.get("/api/chat/history/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await getChatMessagesBySession(sessionId);
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  app.post("/api/chat/message", async (req, res) => {
    try {
      const { sessionId, content } = req.body;
      if (!sessionId || !content) {
        return res.status(400).json({ error: "Session ID and content are required" });
      }
      // Save user message
      const userMessage = await saveChatMessage({
        sessionId,
        content,
        isUser: true,
        timestamp: new Date()
      });
      // Generate AI response
      const aiResponse = await generateResponse(content, sessionId);
      // Save AI response
      const aiMessage = await saveChatMessage({
        sessionId,
        content: aiResponse,
        isUser: false,
        timestamp: new Date()
      });
      res.json({ userMessage, aiMessage });
    } catch (error) {
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // --- Chat Usage API ---
  app.get("/api/chat/usage", async (req, res) => {
    try {
      const type = req.query.type as 'daily' | 'weekly' | 'monthly' || 'daily';
      const usage = await getUsageStats(type);
      res.json({ usage });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  app.get("/api/chat/usage/hourly", async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const usage = await getHourlyUsageStats(date);
      res.json({ usage });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hourly usage stats" });
    }
  });

  // --- Ticket Click Logging ---
  app.post("/api/support/ticket-click", async (req, res) => {
    try {
      const { sessionId } = req.body;
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        return res.status(500).json({ error: "MONGODB_URI is not set" });
      }
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db("test");
      await db.collection("ticket").insertOne({
        timestamp: new Date(),
        sessionId: sessionId || null,
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error in /api/support/ticket-click:', error);
      res.status(500).json({ error: "Failed to log ticket click" });
    }
  });

  // --- Ticket Stats Aggregation ---
  app.get("/api/support/ticket-stats", async (req, res) => {
    try {
      const { from, to } = req.query;
      if (!from || !to) {
        return res.status(400).json({ error: "from and to query params required" });
      }
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        return res.status(500).json({ error: "MONGODB_URI is not set" });
      }
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db("test");
      const match = {
        timestamp: {
          $gte: new Date(String(from)),
          $lte: new Date(String(to)),
        },
      };
      const pipeline = [
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: "$timestamp" },
              month: { $month: "$timestamp" },
              day: { $dayOfMonth: "$timestamp" },
              hour: { $hour: "$timestamp" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
      ];
      const stats = await db.collection("ticket").aggregate(pipeline).toArray();
      res.json({ stats });
    } catch (error) {
      console.error('Error in /api/support/ticket-stats:', error);
      res.status(500).json({ error: "Failed to fetch ticket stats" });
    }
  });

  // Knowledge Base API
  app.get("/api/knowledge-base", async (req, res) => {
    try {
      const kb = await getKnowledgeBase();
      res.json(kb);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch knowledge base" });
    }
  });

  app.post("/api/knowledge-base", async (req, res) => {
    try {
      const kb = await updateKnowledgeBase(req.body);
      res.json(kb);
    } catch (error) {
      res.status(500).json({ error: "Failed to update knowledge base" });
    }
  });

  // Upload document to knowledge base
  app.post("/api/knowledge-base/upload-doc", upload.array("documents"), async (req: Request, res) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      const kb = await getKnowledgeBase() || {};
      let documents = Array.isArray((kb as any).documents) ? (kb as any).documents : [];
      for (const file of files) {
        let text = "";
        try {
          if (fs.existsSync(file.path)) {
            if (file.mimetype === "application/pdf") {
              const data = await pdfParse(fs.readFileSync(file.path));
              text = data.text;
            } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.originalname.endsWith(".docx")) {
              const data = await mammoth.extractRawText({ path: file.path });
              text = data.value;
            } else if (file.mimetype === "text/plain" || file.originalname.endsWith(".txt")) {
              text = fs.readFileSync(file.path, "utf8");
            }
          }
        } catch (err) {
          // Ignore file read errors, skip this file
          text = "";
        }
        if (text && text.trim().length > 0) {
          documents.push({ id: file.filename, filename: file.originalname, text });
        }
        try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
      }
      await updateKnowledgeBase({ ...kb, documents });
      res.json({ documents });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // Delete document from knowledge base
  app.delete("/api/knowledge-base/document/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const kb = await getKnowledgeBase() || {};
      let documents = Array.isArray((kb as any).documents) ? (kb as any).documents : [];
      documents = documents.filter((doc: any) => doc.id !== id);
      await updateKnowledgeBase({ ...kb, documents });
      res.json({ documents });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Serve dynamic inject.js for FeeModuleSupportBot embeddable widget (no schoolCode)
  app.get('/inject.js', (req: any, res: any) => {
    res.type('application/javascript').send(`(function() {
      if (window.chatbotInjected) return;
      window.chatbotInjected = true;
      const config = {
        chatbotUrl: 'http://127.0.0.1:5002/',
        chatbotTitle: 'Support',
        buttonIcon: '💬',
        position: 'bottom-right'
      };
      const styles = \`
        .chatbot-container { position: fixed; bottom: 32px; right: 32px; z-index: 999999; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .chatbot-button { width: 70px; height: 70px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-size: 30px; position: relative; }
        .chatbot-container { position: fixed; bottom: 32px; right: 32px; z-index: 999999; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .chatbot-button { width: 70px; height: 70px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-size: 30px; }
        .chatbot-button .ai-badge { position: absolute; bottom: 8px; right: 8px; background: white; border: 1px solid #ccc; border-radius: 8px; color: #333; font-size: 12px; font-weight: bold; padding: 2px 7px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); letter-spacing: 0.5px; }
        .chatbot-button:hover { transform: scale(1.1); box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6); }
        .chatbot-widget { position: absolute; bottom: 0px; right: 0; width: 480px; height: 720px; background: white; border-radius: 24px; box-shadow: 0 12px 48px rgba(0, 0, 0, 0.22); display: none; flex-direction: column; overflow: hidden; animation: slideUp 0.3s ease; }
        .chatbot-widget.active { display: flex; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .chatbot-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; position: relative; }
        .chatbot-title { font-weight: bold; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
        .chatbot-header .chatbot-logo { width: 32px; height: 32px; margin-right: 0.5rem; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15); }
        .chatbot-header .chatbot-logo img { width: 28px; height: 28px; }
        .chatbot-close { background: none; border: none; color: white; font-size: 2rem; cursor: pointer; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.3s ease; }
        .chatbot-close:hover { background: rgba(255, 255, 255, 0.2); }
        .chatbot-iframe { flex: 1; border: none; width: 100%; }
        .chatbot-container.bottom-right { bottom: 32px; right: 32px; left: auto; }
        .chatbot-container.bottom-left { bottom: 32px; left: 32px; right: auto; }
        .chatbot-container.bottom-left .chatbot-widget { right: auto; left: 0; }
        .chatbot-container.top-right { top: 32px; bottom: auto; right: 32px; }
        .chatbot-container.top-right .chatbot-widget { top: 90px; bottom: auto; }
        .chatbot-container.top-left { top: 32px; bottom: auto; left: 32px; right: auto; }
        .chatbot-container.top-left .chatbot-widget { top: 90px; bottom: auto; right: auto; left: 0; }
        @media (max-width: 900px) { .chatbot-widget { width: 98vw; height: 80vh; right: 1vw; } .chatbot-container.bottom-left .chatbot-widget, .chatbot-container.top-left .chatbot-widget { left: 1vw; right: auto; } }
        @media (max-width: 600px) { .chatbot-widget { width: 100vw; height: 100vh; right: 0; left: 0; border-radius: 0; } .chatbot-container { bottom: 0 !important; right: 0 !important; left: 0 !important; } }
        @keyframes pulse { 0% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); } 50% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.8); } 100% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); } }
        .chatbot-button.pulse { animation: pulse 2s infinite; }
      \`;
      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
      const chatbotHTML = '<div class="chatbot-container ' + config.position + '"><button class="chatbot-button" id="chatbotToggle">' + config.buttonIcon + '<span class="ai-badge">AI</span></button><div class="chatbot-widget" id="chatbotWidget"><div class="chatbot-header"><div class="chatbot-title">' + config.chatbotTitle + '</div><button class="chatbot-close" id="chatbotClose">×</button></div><iframe class="chatbot-iframe" src="' + config.chatbotUrl + '" title="AI Chatbot"></iframe></div></div>';
      function initializeChatbot() {
        const container = document.createElement('div');
        container.innerHTML = chatbotHTML;
        document.body.appendChild(container.firstElementChild);
        const chatbotToggle = document.getElementById('chatbotToggle');
        const chatbotWidget = document.getElementById('chatbotWidget');
        const chatbotClose = document.getElementById('chatbotClose');
        chatbotToggle.addEventListener('click', () => {
          chatbotWidget.classList.add('active');
          chatbotToggle.style.display = 'none';
        });
        chatbotClose.addEventListener('click', () => {
          chatbotWidget.classList.remove('active');
          chatbotToggle.style.display = 'flex';
        });
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.chatbot-container')) {
            chatbotWidget.classList.remove('active');
            chatbotToggle.style.display = 'flex';
          }
        });
        const hasSeenChatbot = localStorage.getItem('chatbot-seen');
        if (!hasSeenChatbot) {
          chatbotToggle.classList.add('pulse');
          setTimeout(() => {
            chatbotToggle.classList.remove('pulse');
            localStorage.setItem('chatbot-seen', 'true');
          }, 10000);
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChatbot);
      } else {
        initializeChatbot();
      }
      window.ChatbotConfig = {
        updateUrl: function(newUrl) {
          const iframe = document.querySelector('.chatbot-iframe');
          if (iframe) { iframe.src = newUrl; }
        },
        updateTitle: function(newTitle) {
          const title = document.querySelector('.chatbot-title');
          if (title) { title.textContent = newTitle; }
        },
        updateIcon: function(newIcon) {
          const button = document.querySelector('.chatbot-button');
          if (button) { button.textContent = newIcon; }
        },
        show: function() {
          const widget = document.getElementById('chatbotWidget');
          const toggle = document.getElementById('chatbotToggle');
          if (widget && toggle) {
            widget.classList.add('active');
            toggle.style.display = 'none';
          }
        },
        hide: function() {
          const widget = document.getElementById('chatbotWidget');
          const toggle = document.getElementById('chatbotToggle');
          if (widget && toggle) {
            widget.classList.remove('active');
            toggle.style.display = 'flex';
          }
        }
      };
    })();
    `);
  });

  const httpServer = createServer(app);
  return httpServer;
}
