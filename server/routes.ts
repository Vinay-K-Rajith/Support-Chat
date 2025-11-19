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
import MongoClientService from "./services/mongo-client";

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
      const { schoolCode } = req.body;
      console.log("🏦 Creating session with schoolCode:", schoolCode);
      console.log("🔍 DEBUG - Full session request body:", JSON.stringify(req.body));
      console.log("🔍 DEBUG - session schoolCode type:", typeof schoolCode, "value:", schoolCode);
      const sessionId = nanoid();
      const session = await storage.createChatSession({ sessionId, schoolCode });
      res.json({ sessionId: session.sessionId });
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  // --- Chat History API ---
  app.get("/api/chat/sessions", async (req, res) => {
    try {
      const schoolCode = req.query.schoolCode as string;
      const sessions = await getAllChatSessions(schoolCode);
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
      const { sessionId, content, schoolCode } = req.body;
      console.log("💬 Message with schoolCode:", schoolCode, "for session:", sessionId);
      console.log("🔍 DEBUG - Full request body:", JSON.stringify(req.body));
      console.log("🔍 DEBUG - schoolCode type:", typeof schoolCode, "value:", schoolCode);
      if (!sessionId || !content) {
        return res.status(400).json({ error: "Session ID and content are required" });
      }
      // Save user message
      const userMessage = await saveChatMessage({
        sessionId,
        content,
        isUser: true,
        timestamp: new Date(),
        schoolCode
      });
      // Generate AI response
      const aiResponse = await generateResponse(content, sessionId);
      // Save AI response
      const aiMessage = await saveChatMessage({
        sessionId,
        content: aiResponse,
        isUser: false,
        timestamp: new Date(),
        schoolCode
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
      const schoolCode = req.query.schoolCode as string;
      const usage = await getUsageStats(type, schoolCode);
      res.json({ usage });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  app.get("/api/chat/usage/hourly", async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const schoolCode = req.query.schoolCode as string;
      const usage = await getHourlyUsageStats(date, schoolCode);
      res.json({ usage });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hourly usage stats" });
    }
  });

  // --- Report Data API ---
  app.get("/api/chat/report", async (req, res) => {
    try {
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
      
      // Get chats from last 2 days
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const allMessages = await db.collection("support_chat_history")
        .find({
          timestamp: { $gte: twoDaysAgo }
        })
        .sort({ timestamp: 1 })
        .toArray();
      
      // Keywords for failed chats
      const failureKeywords = [
        "I apologize, but I'm having trouble",
        "try again later or contact support",
        "I do not (have|see) specific information",
        "I'm not able to help with that",
        "I do not see specific",
        "based on the provided documentation, I do not"
      ];
      const regexPattern = failureKeywords.join("|");
      
      // Group messages by session
      const sessions: Record<string, any> = {};
      allMessages.forEach((msg: any) => {
        if (!sessions[msg.sessionId]) {
          sessions[msg.sessionId] = {
            sessionId: msg.sessionId,
            schoolCode: msg.schoolCode,
            messages: [],
            startTime: msg.timestamp,
            endTime: msg.timestamp
          };
        }
        sessions[msg.sessionId].messages.push(msg);
        if (msg.timestamp > sessions[msg.sessionId].endTime) {
          sessions[msg.sessionId].endTime = msg.timestamp;
        }
      });
      
      // Classify sessions
      const resolved: any[] = [];
      const unresolved: any[] = [];
      
      Object.values(sessions).forEach((session: any) => {
        const hasFailed = session.messages.some((msg: any) => 
          !msg.isUser && new RegExp(regexPattern, 'i').test(msg.content)
        );
        
        const userMessages = session.messages.filter((m: any) => m.isUser);
        const aiMessages = session.messages.filter((m: any) => !m.isUser);
        
        const sessionData = {
          sessionId: session.sessionId,
          schoolCode: session.schoolCode || 'N/A',
          userQuestions: userMessages.length,
          aiResponses: aiMessages.length,
          startTime: session.startTime,
          endTime: session.endTime,
          duration: Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000),
          firstQuestion: userMessages[0]?.content || 'N/A'
        };
        
        if (hasFailed) {
          unresolved.push(sessionData);
        } else {
          resolved.push(sessionData);
        }
      });
      
      res.json({
        period: { start: twoDaysAgo, end: new Date() },
        summary: {
          total: Object.keys(sessions).length,
          resolved: resolved.length,
          unresolved: unresolved.length,
          successRate: Object.keys(sessions).length > 0 
            ? Math.round((resolved.length / Object.keys(sessions).length) * 100) 
            : 0
        },
        resolved,
        unresolved
      });
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // --- Unanswered Questions API ---
  app.get("/api/chat/unanswered", async (req, res) => {
    try {
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
      
      // Keywords that indicate the bot couldn't answer
      // Only match if the message is short and contains these phrases (likely error messages)
      const unansweredKeywords = [
        "I apologize, but I'm having trouble",
        "try again later or contact support",
        "I do not (have|see) specific information",
        "I'm not able to help with that",
        "I do not see specific",
        "based on the provided documentation, I do not"
      ];
      
      // Build regex pattern to match any of these phrases
      const regexPattern = unansweredKeywords.join("|");
      
      // Find AI responses that contain unanswered indicators
      const unansweredMessages = await db.collection("support_chat_history")
        .find({
          isUser: false,
          content: { $regex: regexPattern, $options: 'i' }
        })
        .sort({ timestamp: -1 })
        .limit(0) // 0 means no limit in MongoDB
        .toArray();
      
      console.log(`📊 Found ${unansweredMessages.length} unanswered AI responses`);
      
      // For each unanswered AI response, get the preceding user message
      const unansweredData = [];
      for (const aiMsg of unansweredMessages) {
        const userMsg = await db.collection("support_chat_history")
          .findOne({
            sessionId: aiMsg.sessionId,
            isUser: true,
            timestamp: { $lt: aiMsg.timestamp }
          }, {
            sort: { timestamp: -1 }
          });
        
        if (userMsg) {
          unansweredData.push({
            sessionId: aiMsg.sessionId,
            userMessage: userMsg.content,
            aiResponse: aiMsg.content,
            schoolCode: aiMsg.schoolCode,
            timestamp: aiMsg.timestamp
          });
        }
      }
      
      console.log(`✅ Returning ${unansweredData.length} unanswered questions`);
      res.json({ unanswered: unansweredData });
    } catch (error) {
      console.error("Error fetching unanswered questions:", error);
      res.status(500).json({ error: "Failed to fetch unanswered questions" });
    }
  });

  // --- DEBUG: Check Database Contents ---
  app.get("/api/debug/messages", async (req, res) => {
    try {
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
      const messages = await db.collection("support_chat_history")
        .find({})
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch debug messages" });
    }
  });

  // --- School-wise Analytics ---
  app.get("/api/chat/schools", async (req, res) => {
    try {
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
      const schools = await db.collection("support_chat_history").distinct("schoolCode");
      // Filter out null values and sort
      const validSchools = schools.filter(school => school && school !== null).sort();
      res.json({ schools: validSchools });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch school codes" });
    }
  });

  app.get("/api/chat/schools/stats", async (req, res) => {
    try {
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
      const pipeline = [
        { $match: { schoolCode: { $nin: [null, ""] } } },
        { $group: {
          _id: "$schoolCode",
          messageCount: { $sum: 1 },
          sessionCount: { $addToSet: "$sessionId" },
          lastActivity: { $max: "$timestamp" },
          firstActivity: { $min: "$timestamp" }
        }},
        { $addFields: {
          sessionCount: { $size: "$sessionCount" }
        }},
        { $sort: { messageCount: -1 } }
      ];
      const stats = await db.collection("support_chat_history").aggregate(pipeline).toArray();
      const formattedStats = stats.map(stat => ({
        schoolCode: stat._id,
        messageCount: stat.messageCount,
        sessionCount: stat.sessionCount,
        lastActivity: stat.lastActivity,
        firstActivity: stat.firstActivity
      }));
      res.json({ stats: formattedStats });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch school stats" });
    }
  });

  // --- School Management API ---
  app.get("/api/schools", async (req, res) => {
    try {
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
      const schools = await db.collection("support_schools").find({}).toArray();
      res.json({ schools });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schools" });
    }
  });

  app.get("/api/schools/analytics", async (req, res) => {
    try {
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
      
      // Get all schools from support_schools collection
      const allSchools = await db.collection("support_schools").find({}).toArray();
      const totalSchools = allSchools.length;
      
      // Get active schools from chat history (schools that have sent messages)
      const activeSchoolCodes = await db.collection("support_chat_history")
        .distinct("schoolCode", { schoolCode: { $nin: [null, ""] } });
      const activeSchools = activeSchoolCodes.length;
      
      // Calculate inactive schools
      const inactiveSchools = totalSchools - activeSchools;
      const adoptionRate = totalSchools > 0 ? Math.round((activeSchools / totalSchools) * 100) : 0;
      
      // Get school usage stats with names
      const usageStats = await db.collection("support_chat_history").aggregate([
        { $match: { schoolCode: { $nin: [null, ""] } } },
        { $group: {
          _id: "$schoolCode",
          messageCount: { $sum: 1 },
          sessionCount: { $addToSet: "$sessionId" },
          lastActivity: { $max: "$timestamp" },
          firstActivity: { $min: "$timestamp" }
        }},
        { $addFields: {
          sessionCount: { $size: "$sessionCount" }
        }},
        { $lookup: {
          from: "support_schools",
          localField: "_id",
          foreignField: "schoolcode",
          as: "schoolInfo"
        }},
        { $sort: { lastActivity: -1 } }
      ]).toArray();
      
      // Get monthly adoption trend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const adoptionTrend = await db.collection("support_chat_history").aggregate([
        { $match: { 
          schoolCode: { $nin: [null, ""] },
          timestamp: { $gte: sixMonthsAgo }
        }},
        { $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            schoolCode: "$schoolCode"
          }
        }},
        { $group: {
          _id: {
            year: "$_id.year",
            month: "$_id.month"
          },
          activeSchools: { $sum: 1 }
        }},
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]).toArray();
      
      res.json({
        totalSchools,
        activeSchools,
        inactiveSchools,
        adoptionRate,
        usageStats,
        adoptionTrend
      });
    } catch (error) {
      console.error("School analytics error:", error);
      res.status(500).json({ error: "Failed to fetch school analytics" });
    }
  });

  app.get("/api/schools/active", async (req, res) => {
    try {
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
      
      const recentActive = await db.collection("support_chat_history").aggregate([
        { $match: { 
          schoolCode: { $nin: [null, ""] },
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }},
        { $group: {
          _id: "$schoolCode",
          lastActivity: { $max: "$timestamp" },
          messageCount: { $sum: 1 }
        }},
        { $lookup: {
          from: "support_schools",
          localField: "_id",
          foreignField: "schoolcode",
          as: "schoolInfo"
        }},
        { $sort: { lastActivity: -1 } }
      ]).toArray();
      
      res.json({ schools: recentActive });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active schools" });
    }
  });

  app.get("/api/schools/inactive", async (req, res) => {
    try {
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
      
      // Get all schools
      const allSchools = await db.collection("support_schools").find({}).toArray();
      
      // Get schools that have never sent messages or haven't sent in 30+ days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activeSchoolCodes = await db.collection("support_chat_history")
        .distinct("schoolCode", { 
          schoolCode: { $nin: [null, ""] },
          timestamp: { $gte: thirtyDaysAgo }
        });
      
      const inactiveSchools = allSchools
        .filter(school => !activeSchoolCodes.includes(school.schoolcode));
      
      res.json({ schools: inactiveSchools });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch inactive schools" });
    }
  });

  // --- Ticket Click Logging ---
  app.post("/api/support/ticket-click", async (req, res) => {
    try {
      const { sessionId, schoolCode } = req.body;
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
      await db.collection("ticket").insertOne({
        timestamp: new Date(),
        sessionId: sessionId || null,
        schoolCode: schoolCode || null,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error in /api/support/ticket-click:", error);
      res.status(500).json({ error: "Failed to log ticket click" });
    }
  });

  // --- Support Review Logging ---
  app.post("/api/support/review", async (req, res) => {
    try {
      console.log("📝 Review submission received:", req.body);
      const { rating, comment, schoolCode, sessionId, pageUrl } = req.body || {};
      
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        console.error("❌ Invalid rating value:", rating);
        return res.status(400).json({ error: "rating (1-5) is required" });
      }
      
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
      
      const reviewDoc = {
        timestamp: new Date(),
        rating,
        comment: comment || null,
        schoolCode: schoolCode || null,
        sessionId: sessionId || null,
        pageUrl: pageUrl || null,
        userAgent: req.headers['user-agent'] || null,
        ip: (req.headers['x-forwarded-for'] as string) || req.ip || null,
      };
      
      console.log("💾 Saving review document:", reviewDoc);
      const result = await db.collection("support_review").insertOne(reviewDoc);
      console.log("✅ Review saved successfully with ID:", result.insertedId);
      
      res.json({ success: true, id: result.insertedId });
    } catch (error) {
      console.error("❌ Error in /api/support/review:", error);
      res.status(500).json({ error: "Failed to save support review" });
    }
  });

  // --- Get Average Rating ---
  app.get("/api/support/average-rating", async (req, res) => {
    try {
      const schoolCode = req.query.schoolCode as string;
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
      
      const matchStage = schoolCode ? { schoolCode } : {};
      
      const result = await db.collection("support_review").aggregate([
        { $match: matchStage },
        { $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 }
        }}
      ]).toArray();
      
      const stats = result[0] || { averageRating: 0, totalReviews: 0 };
      
      res.json({ 
        averageRating: stats.averageRating ? Number(stats.averageRating.toFixed(1)) : 0,
        totalReviews: stats.totalReviews 
      });
    } catch (error) {
      console.error("Error fetching average rating:", error);
      res.status(500).json({ error: "Failed to fetch average rating" });
    }
  });

  // --- Ticket Stats Aggregation ---
  app.get("/api/support/ticket-stats", async (req, res) => {
    try {
      const { from, to } = req.query;
      if (!from || !to) {
        return res.status(400).json({ error: "from and to query params required" });
      }
      await MongoClientService.connect();
      const db = MongoClientService.getDb("test");
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
      console.error("Error in /api/support/ticket-stats:", error);
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

  // Serve test HTML files
  app.get('/test-school-tracking', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'test-school-tracking.html'));
  });

  // Serve dynamic inject.js for FeeModuleSupportBot embeddable widget (no schoolCode)
  app.get('/inject.js', (req: any, res: any) => {
    res.type('application/javascript').send(`(function() {
      if (window.chatbotInjected) return;
      window.chatbotInjected = true;
      const config = {
        chatbotUrl: 'https://supportchat.entab.net/',
        chatbotTitle: 'Support',
        position: 'bottom-right'
      };
      const styles = \`
        .chatbot-container { position: fixed; bottom: 0px; right: 32px; z-index: 999999; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .chatbot-button { 
          width: 62px; 
          height: 62px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          border: 4px solid #fff; 
          border-radius: 50%; 
          cursor: pointer; 
          box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); 
          transition: all 0.3s ease; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: white; 
          font-size: 30px; 
          position: relative; 
          padding: 0;
          top: -35px;   /* Move the whole button up by 35px */
          right: -18px; /* Move the whole button right by 18px */
        }
        .chatbot-button .chatbot-icon-img-wrapper {
          width: 46px;
          height: 46px;
          background: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.10);
          position: relative;
          top: 0;
          left: 0;
        }
        .chatbot-button .chatbot-icon-img {
          width: 32px;
          height: 32px;
          object-fit: contain;
          border-radius: 50%;
          display: block;
        }
        .chatbot-button:hover { transform: scale(1.1); box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6); }
        .chatbot-widget { 
          position: absolute; 
          bottom: 0px; 
          right: 0; 
          width: 480px; 
          height: 93vh; /* Changed from 720px to 90vh for 90% of viewport height */
          max-height: 90vh; /* Ensure it never exceeds 90% of viewport */
          background: white; 
          border-radius: 24px; 
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.22); 
          display: none; 
          flex-direction: column; 
          overflow: hidden; 
          animation: slideUp 0.3s ease; 
        }
        .chatbot-widget.active { display: flex; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .chatbot-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; position: relative; }
        .chatbot-title { font-weight: bold; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
        .chatbot-title .chatbot-ai-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          color: #19205B;
          font-weight: bold;
          font-size: 1.15rem;
          border-radius: 0.7em;
          padding: 0 0.55em;
          height: 1.7em;
          margin-left: 0.6em;
          box-shadow: 0 1px 4px rgba(102, 126, 234, 0.10);
          border: none;
          letter-spacing: 0.01em;
        }
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
        @media (max-width: 900px) { 
          .chatbot-widget { width: 98vw; height: 80vh; max-height: 80vh; right: 1vw; } 
          .chatbot-container.bottom-left .chatbot-widget, .chatbot-container.top-left .chatbot-widget { left: 1vw; right: auto; } 
        }
        @media (max-width: 600px) { 
          .chatbot-widget { width: 100vw; height: 90vh; max-height: 90vh; right: 0; left: 0; border-radius: 0; } 
          .chatbot-container { bottom: 0 !important; right: 0 !important; left: 0 !important; } 
        }
        @keyframes pulse { 0% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); } 50% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.8); } 100% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); } }
        .chatbot-button.pulse { animation: pulse 2s infinite; }

        /* Rating modal styles */
        .chatbot-rating-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(0, 0, 0, 0.5); 
          display: none; 
          align-items: center; 
          justify-content: center; 
          z-index: 10000000; 
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease;
        }
        .chatbot-rating-overlay.active { display: flex; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: scale(0.95) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .chatbot-rating-modal { 
          background: #fff; 
          width: 420px; 
          max-width: 90vw; 
          border-radius: 20px; 
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05); 
          padding: 32px 28px 24px;
          animation: slideIn 0.3s ease;
          position: relative;
        }
        .rating-title { 
          font-weight: 700; 
          font-size: 22px; 
          color: #111827; 
          margin-bottom: 6px;
          line-height: 1.3;
        }
        .rating-subtitle { 
          color: #6b7280; 
          font-size: 15px; 
          margin-bottom: 20px;
          line-height: 1.4;
        }
        .rating-stars { 
          display: flex; 
          gap: 12px; 
          margin: 20px 0 24px; 
          font-size: 36px;
          justify-content: center;
        }
        .rating-star { 
          cursor: pointer; 
          color: #e5e7eb; 
          transition: all 0.2s ease;
          user-select: none;
        }
        .rating-star:hover { 
          color: #fbbf24; 
          transform: scale(1.1);
        }
        .rating-star.active { 
          color: #f59e0b;
          filter: drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3));
        }
        .rating-comment { 
          width: 100%; 
          border: 2px solid #e5e7eb; 
          border-radius: 12px; 
          padding: 12px 14px; 
          min-height: 80px; 
          resize: vertical; 
          font-family: inherit; 
          font-size: 14px;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }
        .rating-comment:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .rating-actions { 
          display: flex; 
          justify-content: flex-end; 
          gap: 12px; 
          margin-top: 20px; 
        }
        .rating-skip { 
          background: #f3f4f6; 
          color: #374151; 
          border: 1px solid #d1d5db; 
          padding: 10px 20px; 
          border-radius: 10px; 
          cursor: pointer; 
          font-size: 15px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .rating-skip:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }
        .rating-submit { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff; 
          border: none; 
          padding: 10px 24px; 
          border-radius: 10px; 
          cursor: pointer; 
          font-size: 15px;
          font-weight: 600;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
        .rating-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .rating-submit:active {
          transform: translateY(0);
        }
      \`;
      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
      const chatbotIconUrl = 'https://static.vecteezy.com/system/resources/previews/015/911/602/non_2x/customer-support-icon-outline-style-vector.jpg';
      // Add the AI badge beside the Support title in the header, and simply display "BETA" next to it
          // Construct chatbot URL with school code parameter
          const schoolCode = localStorage.getItem('Value') || '';
          const chatbotUrlWithParams = config.chatbotUrl + (config.chatbotUrl.includes('?') ? '&' : '?') + 'schoolCode=' + encodeURIComponent(schoolCode);
          console.log('🏫 INJECT.JS - School code from localStorage:', schoolCode);
          console.log('🔗 INJECT.JS - Chatbot URL with params:', chatbotUrlWithParams);
          const chatbotHTML = '<div class="chatbot-container ' + config.position + '"><button class="chatbot-button" id="chatbotToggle"><span class="chatbot-icon-img-wrapper"><img src="' + chatbotIconUrl + '" alt="Support" class="chatbot-icon-img"/></span></button><div class="chatbot-widget" id="chatbotWidget"><div class="chatbot-header"><div class="chatbot-title">' + config.chatbotTitle + '<span class="chatbot-ai-badge">AI</span><span style="margin-left:0.5em; font-size:0.95em; color:#fff; font-weight:500;">BETA</span></div><button class="chatbot-close" id="chatbotClose">×</button></div><iframe class="chatbot-iframe" src="' + chatbotUrlWithParams + '" title="AI Chatbot"></iframe></div></div>';
      function initializeChatbot() {
        // Check localStorage for 'Value'
        const value = localStorage.getItem('Value');
        // List of allowed codes
        const allowedCodes = [
          'LVISG','SGCSBJK','SMCSRKJ','SJCHSN','MLZSBSP','HPSJC','CEVMWM','BCRSTK','HTCDJK','HFCKJK','GWISDOB','VJSKKR','SVPSKC','THARCH','NDSISJ','FACSPG','CTSBKA','SHCSVC','AISMBD','BLOSSOM','BISPVDL','STHLUP','SPHSLJ','VWSSUP','VWSBBK','STSDLJH','SSVVSAP','JRSBKL','SVSNMH','CHRIST','SSIKK','BISHOPS','GEDEETN','STPAULKG','SJCQPB','SMCTHR','MMPSJC','LFCUJK','CJSNAM','GBGSWB','BDSISM','SDPSPD','TJISCG','SPCHSG','SJHSKC','AWSMURD','SMESSG','SXSGAN','CSAGUJ','SMSGRG','SSGVSG','SMSMGJ','SMSVGJ','SFSJPG','SMSBRG','DWPSUP','SJSKGP','GHSKC','DVMROD','SPHSBC','LRVIAN','SAPSJC','LJKNGP','CDSKGP','ILAHSR','DIVINE','SJSKKL','MAISKMK','DPSABH','GISNUP','GISFUP','CTKHSUP','MSICUP','SJSBRL','GICBUP','SMCPUP','DVVICK','LFSMGK','SPCDUP','LFVNKR','TOLINS','JPSV','KJSBLR','CMPSAK','DPSSAC','SRVMSC','EESMWB','EISDRJ','CSVGUJ','SOPHIA','CSRGUJ','LFSGKP','OXFDGW','JKGISV','FCHSBJ','SADDN','NEMSMP','MMCHSC','SACSVP','GNPSRK','GCMCSN','HCCSRS','SHCHSB','SOSGAD','BLSWSG','HITECH','SSHEDU','GDGPSA','SXHSRH','AISDEL','SPAKKM','SATLUJ','RASSAZ','VYASWS','DAVNIT','BPSTGR','GPSSBL','STCSBR','BPSPVG','RBAKHA','RTSJWR','IPSFBD','SPTRS','GDGPSP','DPRESI','VISPRV','DPSMAK','GDGPSC','LAHRSC','KNTLPR','KNTLSR','SMSKNK','CTKCSB','CISERP','TCSERP','STJOAN','AHSBYS','AHSGRL','STSUDP','AEASNM','LAXPSK','SHPSKM','JKGISG','NNHSDC','STCLRT','DARSAN','VIDYAB','ISRJR','GHSSMP','MNSJKP','NDAMBR','SMCHSS','NHSJAT','PCHSJK','PCSJAT','VVCHSA','SMERC','PUSHPA','CJSARKS','HCSKAPA','ARYANVNS','CJSARK','CHRISTKR','STTHOMAS','VVVMMP','VKVRDV','VKVHRJ','MMSJKP','DSKEND','SCWPUC','TAACBH','CPSRJK','SPSBUP','SPAMUP','SPAGKP','TVMHSN','GDGSSV','AJPSKRP','LFSBUP','KPSUTN','KMHSUTN','KMHSS','KPSSS','SFSAJK','TAPSPH','SJCGHS','SJPSBR','SPSMTDY','LFCSDLPB','DBESBP','AUXBANDEL','HFSINDORE','CSTIANS','MCSHJH','SICCUP','NHESBJ','MSGNRD','VJSGJH','MHCMBR','BMSSSK','JMPSWB','DWPSBT','ABSBBK','SHCSRT','SXCKTH','JKPSKJ','SPHSKB','BPSMVD','MAPNGP','SJBSJL','CRMLSD','SHCSMW','STCFDB','SJSHDI','MSCDIB','CSKBOK','LFSGDP','TGFSKU','CJMWAV','DFSTNA','SHCSML','MONAGT','BDAVTJ'
        ];
        if (!allowedCodes.includes(value)) {
          console.log('Value is not in allowed codes, so not showing the chatbot button');
          return;
        }
        
        const container = document.createElement('div');
        container.innerHTML = chatbotHTML;
        document.body.appendChild(container.firstElementChild);
        const chatbotToggle = document.getElementById('chatbotToggle');
        const chatbotWidget = document.getElementById('chatbotWidget');
        const chatbotClose = document.getElementById('chatbotClose');
        // Rating UI elements
        const ratingOverlay = document.createElement('div');
        ratingOverlay.className = 'chatbot-rating-overlay';
        ratingOverlay.innerHTML = \`
          <div class=\"chatbot-rating-modal\">
            <div class=\"rating-title\">Rate Your Experience</div>
            <div class=\"rating-subtitle\">How would you rate your chat experience?</div>
            <div class=\"rating-stars\" id=\"ratingStars\">
              <span class=\"rating-star\" data-value=\"1\">★</span>
              <span class=\"rating-star\" data-value=\"2\">★</span>
              <span class=\"rating-star\" data-value=\"3\">★</span>
              <span class=\"rating-star\" data-value=\"4\">★</span>
              <span class=\"rating-star\" data-value=\"5\">★</span>
            </div>
            <textarea class=\"rating-comment\" id=\"ratingComment\" placeholder=\"Share your feedback... (optional)\"></textarea>
            <div class=\"rating-actions\">
              <button class=\"rating-skip\" id=\"ratingSkip\">Skip</button>
              <button class=\"rating-submit\" id=\"ratingSubmit\">Submit</button>
            </div>
          </div>\`;
        document.body.appendChild(ratingOverlay);

        let selectedRating = 5;
        const stars = ratingOverlay.querySelectorAll('.rating-star');
        const highlight = (val) => {
          stars.forEach(s => { const v = Number(s.getAttribute('data-value')); s.classList.toggle('active', v <= val); });
        };
        highlight(selectedRating);
        stars.forEach(star => star.addEventListener('click', () => { selectedRating = Number(star.getAttribute('data-value')); highlight(selectedRating); }));
        
        let chatOpenTime = null;
        let hasShownRatingThisSession = false;
        
        const showRating = () => {
          if (hasShownRatingThisSession) return;
          ratingOverlay.classList.add('active');
          // Reset comment field
          const commentField = ratingOverlay.querySelector('#ratingComment');
          if (commentField) commentField.value = '';
        };
        const hideRating = () => { ratingOverlay.classList.remove('active'); };
        
        // Close modal when clicking overlay background
        ratingOverlay.addEventListener('click', (e) => {
          if (e.target === ratingOverlay) {
            hasShownRatingThisSession = true;
            hideRating();
            closeChatWindow();
          }
        });
        
        const closeChatWindow = () => {
          chatbotWidget.classList.remove('active');
          chatbotToggle.style.display = 'flex';
          chatOpenTime = null;
          hasShownRatingThisSession = false;
        };
        
        ratingOverlay.querySelector('#ratingSkip').addEventListener('click', () => { 
          hasShownRatingThisSession = true;
          hideRating();
          closeChatWindow();
        });
        
        ratingOverlay.querySelector('#ratingSubmit').addEventListener('click', async () => {
          const commentElement = ratingOverlay.querySelector('#ratingComment');
          const comment = commentElement ? commentElement.value.trim() : '';
          const schoolCodeVal = localStorage.getItem('Value') || '';
          const apiBase = 'https://supportchat.entab.net';
          
          const submitButton = ratingOverlay.querySelector('#ratingSubmit');
          submitButton.textContent = 'Submitting...';
          submitButton.disabled = true;
          
          console.log('📤 Submitting review:', { rating: selectedRating, comment, schoolCode: schoolCodeVal, pageUrl: location.href });
          
          try {
            const response = await fetch(apiBase + '/api/support/review', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                rating: selectedRating, 
                comment: comment || null, 
                schoolCode: schoolCodeVal, 
                sessionId: null, 
                pageUrl: location.href 
              })
            });
            
            const data = await response.json();
            
            if (response.ok) {
              console.log('✅ Review submitted successfully:', data);
            } else {
              console.error('❌ Failed to submit review:', response.status, data);
            }
          } catch (err) {
            console.error('❌ Error submitting review:', err);
          } finally {
            submitButton.textContent = 'Submit';
            submitButton.disabled = false;
            hasShownRatingThisSession = true;
            hideRating();
            closeChatWindow();
          }
        });

        chatbotToggle.addEventListener('click', () => {
          chatbotWidget.classList.add('active');
          chatbotToggle.style.display = 'none';
          chatOpenTime = Date.now();
          hasShownRatingThisSession = false;
        });
        
        chatbotClose.addEventListener('click', () => {
          const timeOpen = chatOpenTime ? (Date.now() - chatOpenTime) / 1000 : 0;
          if (timeOpen >= 40 && !hasShownRatingThisSession) {
            showRating();
          } else {
            closeChatWindow();
          }
        });
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.chatbot-container') && !e.target.closest('.chatbot-rating-overlay')) {
            const timeOpen = chatOpenTime ? (Date.now() - chatOpenTime) / 1000 : 0;
            if (chatbotWidget.classList.contains('active') && timeOpen >= 40 && !hasShownRatingThisSession) {
              showRating();
            } else if (chatbotWidget.classList.contains('active')) {
              chatbotWidget.classList.remove('active');
              chatbotToggle.style.display = 'flex';
              chatOpenTime = null;
              hasShownRatingThisSession = false;
            }
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
          if (title) { title.childNodes[0].textContent = newTitle; }
        },
        updateIcon: function(newIconUrl) {
          const img = document.querySelector('.chatbot-button .chatbot-icon-img');
          if (img) { img.src = newIconUrl; }
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
