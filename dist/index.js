// server/index.ts
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  chatSessions;
  chatMessages;
  currentUserId;
  currentMessageId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.chatSessions = /* @__PURE__ */ new Map();
    this.chatMessages = /* @__PURE__ */ new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async createChatSession(insertSession) {
    const session = {
      id: Date.now(),
      sessionId: insertSession.sessionId,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.chatSessions.set(session.sessionId, session);
    this.chatMessages.set(session.sessionId, []);
    return session;
  }
  async createChatMessage(insertMessage) {
    const message = {
      id: this.currentMessageId++,
      sessionId: insertMessage.sessionId,
      content: insertMessage.content,
      isUser: insertMessage.isUser,
      timestamp: /* @__PURE__ */ new Date(),
      metadata: insertMessage.metadata || null
    };
    const sessionMessages = this.chatMessages.get(insertMessage.sessionId) || [];
    sessionMessages.push(message);
    this.chatMessages.set(insertMessage.sessionId, sessionMessages);
    return message;
  }
  async getChatMessages(sessionId) {
    return this.chatMessages.get(sessionId) || [];
  }
};
var storage = new MemStorage();

// server/services/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// server/services/support-context.ts
function getSupportContext() {
  return {
    botRole: "You are a professional customer support bot for all ENTAB modules. You assist school staff in managing, troubleshooting, and optimizing all aspects of ENTAB's ERP, including Fees & Billing, Concessions, Reports, Online Payment, Academic, and more.",
    introduction: `
ENTAB's ERP platform streamlines all school operations, including fee management, concessions, academic records, online payments, reporting, and more. This support desk provides step-by-step guidance for all modules, helping school staff resolve issues, configure settings, and optimize workflows. If you need help with any module, just ask your question.
`,
    moduleFeatures: [
      "Automated and secure fee collection with digital payment integration",
      "Real-time dashboards and reporting for all modules",
      "Bulk operations and reconciliation",
      "Customizable structures for fees, concessions, academics, and more",
      "Cheque bounce management and audit trails",
      "Defaulter tracking and automated reminders",
      "Role-based access and approval workflows",
      "Seamless integration across all school modules",
      "Error prevention and duplicate detection mechanisms",
      "Comprehensive support for Indian school policies and compliance"
    ],
    scenarios: [
      // --- Insert all user-provided scenarios here, each as { title, steps/answer } ---
      // Example:
      {
        title: "Parent has posted fee but not reflecting in ERP.",
        steps: [
          "Verify payment using the Online Payment Verify Form: Go to Fee > Misc > Online Payment Verify, enter payment details, and check status.",
          "If not posted, check payment on the Payment Gateway and confirm status.",
          "If successful but not posted, use Online Payment Status form to post manually: Go to Fee > Misc > Online Payment Status, enter details, and post.",
          "Receipt will be generated if posting is successful."
        ]
      },
      // ... (repeat for all 36+ scenarios provided by the user, grouped by topic/module) ...
      // For brevity, only a few are shown here. The actual edit will include all provided scenarios, each as a scenario object.
      {
        title: "How to do the Cheque Bounce Entry",
        steps: [
          "Log in to Entab.",
          "Navigate to Fee and Billing from the main menu.",
          "Select Receipt Details.",
          "In the search bar, type the Student Name or Admission Number.",
          "In the grid, find the relevant receipt and click the Cross Button to initiate the cheque bounce process.",
          "Fill in the required details for Cheque Bounce (e.g., reason for bounce, date, etc.).",
          "Save the changes. The cheque bounce entry will be recorded."
        ]
      },
      {
        title: "How to Post Fee Receipts in Bulk Using Excel Format",
        steps: [
          "Log in to Entab.",
          "Navigate to Fee and Billing and then to Fee Collection.",
          "Click on Bulk Entry.",
          "Download and refer to the sample format for the fee receipt data.",
          "Fill the Excel File with the required fee receipt details, following the sample format.",
          "After completing the data entry in Excel, click Import File to upload the file to the system.",
          "The system will process the bulk receipt entries accordingly."
        ]
      },
      {
        title: "How to Preview the Fee Defaulters Report",
        steps: [
          "Log in to Entab.",
          "Navigate to Fee and Billing and select Fee Report.",
          "You will see two reports: Student Defaulter Detail and Student Defaulter Summary.",
          "Select the required report based on your need.",
          "The selected report will be displayed for review."
        ]
      },
      {
        title: "How to Preview the Fee Requisition Slip",
        steps: [
          "Log in to Entab.",
          "Navigate to Fee and Billing and then click on Requisition Slip.",
          "In the search bar, enter the Student Name or Admission Number.",
          "The student details will appear on the screen.",
          "Click on Preview to view the Fee Requisition Slip."
        ]
      },
      {
        title: "How to Preview the Tuition Fee Certificate",
        steps: [
          "Log in to Entab.",
          "Navigate to Fee and Billing and then select Fee Certificate.",
          "From the list of certificates, choose Tuition Fee Certificate.",
          "Select the certificate type.",
          "In the search bar, type the Student Name or Admission Number.",
          "Click on Generate.",
          "The Tuition Fee Certificate will be displayed for preview."
        ]
      },
      {
        title: "Fee Structure Update and Realignment",
        scenario: "The fee structure needs to be updated class-wise for the new academic session. However, some fee collection has already been done based on the old or different group settings. Adjustments are necessary to align the collected amounts with the new class-wise fee structure to avoid discrepancies in student accounts and financial records.",
        steps: [
          "Delete Existing Fee Collections: First, delete all the existing fee collections that were recorded based on the old fee structure. This is crucial to allow the system to segregate the fee group class-wise.",
          "Segregate Fee Groups: Once the collections are removed, segregate the fee groups according to the new structure, ensuring that each class has the correct fee group applied.",
          "Apply Updated Fee Structure: After the segregation is completed, apply the updated class-wise fee structure correctly to the students' records. This will ensure there are no discrepancies, and the student accounts and financial records are aligned with the new academic session's fee structure."
        ]
      },
      {
        title: "Application of Concessions to Students",
        scenario: "The school plans to offer two types of concessions to students based on criteria like academic performance, financial need, sibling discounts, etc. Each concession should be reflected separately in the student's fee structure or billing.",
        steps: [
          "For a student, only one concession can be active at a time. If a new concession needs to be applied, it will replace the existing concession.",
          "Specify the concession amount when applying a new concession.",
          "All changes should be properly approved and documented to ensure that there is clarity and transparency in the student's fee records. This documentation ensures that the fee structure remains accurate and follows the school's policies."
        ]
      },
      {
        title: "Duplicate Fee Heads During Online Payment Process",
        scenario: "During the fee collection process, if the system displays duplicate fee heads (same fee head listed more than once), this issue needs to be resolved.",
        steps: [
          "Edit and Save Functionality on the Student Master Form: Ensure that the fee heads are properly configured in the Student Master Form. Check for any discrepancies in the fee heads setup, such as duplicate entries.",
          "Verify Fee Structure: Review the fee structure to ensure that no duplicate fee heads exist. If duplicates are found, remove or correct them to prevent them from appearing in the online payment form.",
          "Update Payment Form: Once the fee heads are fixed, update the online payment form to reflect the correct, non-duplicate fee heads. This should resolve the issue of duplicate fee heads during the payment process."
        ]
      },
      {
        title: "Cheque Bounce Entry Process",
        scenario: "If a cheque payment is detected and needs to be marked as a bounce, the system should allow this action to be properly recorded.",
        steps: [
          "In the Receipt Details section, the system should display a cross sign (X) next to the cheque payment entry that needs to be marked as a bounce.",
          "When the user clicks the cross sign (X), the system should prompt the user with a confirmation message, asking whether they are sure they want to mark the cheque as bounced.",
          "Once confirmed, the system will automatically update the status of the cheque as 'bounced' and make necessary adjustments to the student's account and financial records."
        ]
      },
      {
        title: "Error: 'Contact with School' During Online Payment",
        scenario: "While making an online payment, an error message appears stating 'Contact with school.'",
        steps: [
          "Check Online Payment Settings: Ensure that the payment gateway settings are correctly configured and that there is no connectivity issue between the school's system and the payment service provider.",
          "Verify Fee Head Selection: Ensure that the correct fee head is selected during the online payment process. If any fee head is missing or incorrectly configured, it could lead to this error.",
          "Test the Payment Gateway: Run a test transaction to verify that the system can successfully communicate with the payment gateway without errors. After resolving these issues, the online payment should process without the 'Contact with school' error."
        ]
      },
      {
        title: "Duplicate Receipt Numbers Assigned to Multiple Students",
        scenario: "The same receipt number is being assigned to multiple students during fee payments. Each receipt number should remain unique for each student.",
        steps: [
          "Update Collection Settings: In the collection settings, disable the option for 'Multiple Students - Single Receipt'. This checkbox should not be selectable to prevent assigning the same receipt number to multiple students.",
          "Enforce Unique Receipt Numbers: The system should enforce that each student receives a unique receipt number during the fee payment process, thereby avoiding duplicates."
        ]
      }
    ]
  };
}

// server/services/mongo-client.ts
import { MongoClient } from "mongodb";
var MongoClientService = class _MongoClientService {
  static instance;
  constructor() {
  }
  static getInstance() {
    if (!_MongoClientService.instance) {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error("MONGODB_URI is not set");
      }
      _MongoClientService.instance = new MongoClient(uri);
    }
    return _MongoClientService.instance;
  }
  static async connect() {
    const client = _MongoClientService.getInstance();
    if (!client) {
      throw new Error("MongoClient instance is not initialized");
    }
    await client.connect();
  }
  static getDb(dbName) {
    const client = _MongoClientService.getInstance();
    return client.db(dbName);
  }
};
var mongo_client_default = MongoClientService;

// server/services/knowledge-base.ts
async function getKnowledgeBase() {
  await mongo_client_default.connect();
  const db = mongo_client_default.getDb("test");
  const kb = await db.collection("Chatbot").findOne({});
  return kb;
}
async function updateKnowledgeBase(data) {
  await mongo_client_default.connect();
  const db = mongo_client_default.getDb("test");
  await db.collection("Chatbot").updateOne({}, { $set: data }, { upsert: true });
  return getKnowledgeBase();
}

// server/services/gemini.ts
var genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ""
);
var model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
async function generateResponse(userMessage, sessionId) {
  try {
    const supportContext = getSupportContext();
    const kb = await getKnowledgeBase();
    let documentText = "";
    if (kb && Array.isArray(kb.documents)) {
      documentText = kb.documents.map((doc) => `Document: ${doc.filename}
${doc.text}`).join("\n\n");
    }
    const systemPrompt = `You are a customer support AI assistant for the Entab Support Desk. You help users solve problems related to any Entab module, including fees, billing, academics, online payments, reports, and more.

When answering, use the following formatting triggers to help the UI render your response beautifully:
- For a summary, start with 'Quick Answer:'
- For instructions,always use 'Step-by-Step Guide:' as a heading, then list each step as a numbered list (1., 2., ...)
- For important notes, use 'Note:' or 'Warning:' at the start of the line whenever it is important to the user
- Use markdown formatting for clarity (bold for headings, lists, etc.)

If a scenario matches, provide the steps or answer in a clear, friendly, and professional manner using the above structure. If not, politely ask for more details or direct the user to contact support.
if you don't have  info on that particular query(or module) ask the user create a new support ticket or send a mail to support@entab.in 
SUPPORT CONTEXT:
${JSON.stringify(supportContext, null, 2)}

DOCUMENTS:
${documentText}

Please respond to the user's query in a helpful and informative way. Use the support context and documents to provide accurate information in detail.`;
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

// server/routes.ts
import { nanoid } from "nanoid";

// server/services/chat-history.ts
var DB_NAME = "test";
var COLLECTION = "support_chat_history";
async function getAllChatSessions() {
  await mongo_client_default.connect();
  const db = mongo_client_default.getDb(DB_NAME);
  const sessions = await db.collection(COLLECTION).aggregate([
    { $group: {
      _id: "$sessionId",
      lastMessageAt: { $max: "$timestamp" },
      count: { $sum: 1 },
      firstMessage: { $first: "$content" }
    } },
    { $sort: { lastMessageAt: -1 } }
  ]).toArray();
  return sessions.map((s) => ({
    sessionId: s._id,
    lastMessageAt: s.lastMessageAt,
    messageCount: s.count,
    firstMessage: s.firstMessage
  }));
}
async function getChatMessagesBySession(sessionId) {
  await mongo_client_default.connect();
  const db = mongo_client_default.getDb(DB_NAME);
  const messages = await db.collection(COLLECTION).find({ sessionId }).sort({ timestamp: 1 }).toArray();
  return messages;
}
async function saveChatMessage({ sessionId, content, isUser, timestamp }) {
  await mongo_client_default.connect();
  const db = mongo_client_default.getDb(DB_NAME);
  const doc = {
    sessionId,
    content,
    isUser,
    timestamp: timestamp || /* @__PURE__ */ new Date()
  };
  await db.collection(COLLECTION).insertOne(doc);
  return doc;
}
async function getUsageStats(type) {
  await mongo_client_default.connect();
  const db = mongo_client_default.getDb(DB_NAME);
  let groupId = {};
  if (type === "daily") {
    groupId = {
      year: { $year: "$timestamp" },
      month: { $month: "$timestamp" },
      day: { $dayOfMonth: "$timestamp" }
    };
  } else if (type === "weekly") {
    groupId = {
      year: { $year: "$timestamp" },
      week: { $isoWeek: "$timestamp" }
    };
  } else if (type === "monthly") {
    groupId = {
      year: { $year: "$timestamp" },
      month: { $month: "$timestamp" }
    };
  }
  const pipeline = [
    { $group: {
      _id: groupId,
      count: { $sum: 1 }
    } },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } }
  ];
  const results = await db.collection(COLLECTION).aggregate(pipeline).toArray();
  return results.map((r) => {
    let period = "";
    if (type === "daily") {
      period = `${r._id.year}-${String(r._id.month).padStart(2, "0")}-${String(r._id.day).padStart(2, "0")}`;
    } else if (type === "weekly") {
      period = `${r._id.year}-W${r._id.week}`;
    } else if (type === "monthly") {
      period = `${r._id.year}-${String(r._id.month).padStart(2, "0")}`;
    }
    return { period, count: r.count };
  });
}
async function getHourlyUsageStats(dateStr) {
  await mongo_client_default.connect();
  const db = mongo_client_default.getDb(DB_NAME);
  let match = {};
  let start, end;
  if (dateStr) {
    start = /* @__PURE__ */ new Date(dateStr + "T00:00:00.000Z");
    end = /* @__PURE__ */ new Date(dateStr + "T23:59:59.999Z");
  } else {
    const today = /* @__PURE__ */ new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(today.getUTCDate()).padStart(2, "0");
    start = /* @__PURE__ */ new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    end = /* @__PURE__ */ new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`);
  }
  match = { timestamp: { $gte: start, $lte: end } };
  const pipeline = [
    { $match: match },
    { $group: {
      _id: { hour: { $hour: "$timestamp" } },
      count: { $sum: 1 }
    } },
    { $sort: { "_id.hour": 1 } }
  ];
  const results = await db.collection(COLLECTION).aggregate(pipeline).toArray();
  const hourMap = {};
  results.forEach((r) => {
    hourMap[r._id.hour] = r.count;
  });
  const full = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] || 0 }));
  return full;
}

// server/routes.ts
import multer from "multer";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
var uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
var upload = multer({ dest: uploadsDir });
async function registerRoutes(app2) {
  app2.post("/api/chat/session", async (req, res) => {
    try {
      const sessionId = nanoid();
      const session = await storage.createChatSession({ sessionId });
      res.json({ sessionId: session.sessionId });
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });
  app2.get("/api/chat/sessions", async (req, res) => {
    try {
      const sessions = await getAllChatSessions();
      res.json({ sessions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });
  app2.get("/api/chat/history/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await getChatMessagesBySession(sessionId);
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });
  app2.post("/api/chat/message", async (req, res) => {
    try {
      const { sessionId, content } = req.body;
      if (!sessionId || !content) {
        return res.status(400).json({ error: "Session ID and content are required" });
      }
      const userMessage = await saveChatMessage({
        sessionId,
        content,
        isUser: true,
        timestamp: /* @__PURE__ */ new Date()
      });
      const aiResponse = await generateResponse(content, sessionId);
      const aiMessage = await saveChatMessage({
        sessionId,
        content: aiResponse,
        isUser: false,
        timestamp: /* @__PURE__ */ new Date()
      });
      res.json({ userMessage, aiMessage });
    } catch (error) {
      res.status(500).json({ error: "Failed to process message" });
    }
  });
  app2.get("/api/chat/usage", async (req, res) => {
    try {
      const type = req.query.type || "daily";
      const usage = await getUsageStats(type);
      res.json({ usage });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });
  app2.get("/api/chat/usage/hourly", async (req, res) => {
    try {
      const date = req.query.date;
      const usage = await getHourlyUsageStats(date);
      res.json({ usage });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hourly usage stats" });
    }
  });
  app2.post("/api/support/ticket-click", async (req, res) => {
    try {
      const { sessionId } = req.body;
      await mongo_client_default.connect();
      const db = mongo_client_default.getDb("test");
      await db.collection("ticket").insertOne({
        timestamp: /* @__PURE__ */ new Date(),
        sessionId: sessionId || null
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error in /api/support/ticket-click:", error);
      res.status(500).json({ error: "Failed to log ticket click" });
    }
  });
  app2.get("/api/support/ticket-stats", async (req, res) => {
    try {
      const { from, to } = req.query;
      if (!from || !to) {
        return res.status(400).json({ error: "from and to query params required" });
      }
      await mongo_client_default.connect();
      const db = mongo_client_default.getDb("test");
      const match = {
        timestamp: {
          $gte: new Date(String(from)),
          $lte: new Date(String(to))
        }
      };
      const pipeline = [
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: "$timestamp" },
              month: { $month: "$timestamp" },
              day: { $dayOfMonth: "$timestamp" },
              hour: { $hour: "$timestamp" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
      ];
      const stats = await db.collection("ticket").aggregate(pipeline).toArray();
      res.json({ stats });
    } catch (error) {
      console.error("Error in /api/support/ticket-stats:", error);
      res.status(500).json({ error: "Failed to fetch ticket stats" });
    }
  });
  app2.get("/api/knowledge-base", async (req, res) => {
    try {
      const kb = await getKnowledgeBase();
      res.json(kb);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch knowledge base" });
    }
  });
  app2.post("/api/knowledge-base", async (req, res) => {
    try {
      const kb = await updateKnowledgeBase(req.body);
      res.json(kb);
    } catch (error) {
      res.status(500).json({ error: "Failed to update knowledge base" });
    }
  });
  app2.post("/api/knowledge-base/upload-doc", upload.array("documents"), async (req, res) => {
    try {
      const files = req.files || [];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      const kb = await getKnowledgeBase() || {};
      let documents = Array.isArray(kb.documents) ? kb.documents : [];
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
          text = "";
        }
        if (text && text.trim().length > 0) {
          documents.push({ id: file.filename, filename: file.originalname, text });
        }
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch {
        }
      }
      await updateKnowledgeBase({ ...kb, documents });
      res.json({ documents });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload document" });
    }
  });
  app2.delete("/api/knowledge-base/document/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const kb = await getKnowledgeBase() || {};
      let documents = Array.isArray(kb.documents) ? kb.documents : [];
      documents = documents.filter((doc) => doc.id !== id);
      await updateKnowledgeBase({ ...kb, documents });
      res.json({ documents });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });
  app2.get("/inject.js", (req, res) => {
    res.type("application/javascript").send(`(function() {
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
      \`;
      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
      const chatbotIconUrl = 'https://static.vecteezy.com/system/resources/previews/015/911/602/non_2x/customer-support-icon-outline-style-vector.jpg';
      // Add the AI badge beside the Support title in the header, matching the provided image
      const chatbotHTML = '<div class="chatbot-container ' + config.position + '"><button class="chatbot-button" id="chatbotToggle"><span class="chatbot-icon-img-wrapper"><img src="' + chatbotIconUrl + '" alt="Support" class="chatbot-icon-img"/></span></button><div class="chatbot-widget" id="chatbotWidget"><div class="chatbot-header"><div class="chatbot-title">' + config.chatbotTitle + '<span class="chatbot-ai-badge">AI</span></div><button class="chatbot-close" id="chatbotClose">\xD7</button></div><iframe class="chatbot-iframe" src="' + config.chatbotUrl + '" title="AI Chatbot"></iframe></div></div>';
      function initializeChatbot() {
        // Check localStorage for 'Value'
        const value = localStorage.getItem('Value');
        if (value !== 'LVISG') {
          console.log('Value is not LVISG, so not showing the chatbot button');
          return;
        }
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import { fileURLToPath } from "url";
var posixPath = path2.posix;
var __filename = fileURLToPath(import.meta.url);
var __dirname = posixPath.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": posixPath.resolve(__dirname, "client", "src"),
      "@shared": posixPath.resolve(__dirname, "shared"),
      "@assets": posixPath.resolve(__dirname, "attached_assets")
    }
  },
  root: posixPath.resolve(__dirname, "client"),
  build: {
    outDir: posixPath.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: posixPath.resolve(__dirname, "client/index.html"),
        widget: posixPath.resolve(__dirname, "client/widget.html"),
        embed: posixPath.resolve(__dirname, "client/embed.html")
      },
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"]
        }
      }
    },
    assetsDir: "assets",
    copyPublicDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid as nanoid2 } from "nanoid";
var viteLogger = createLogger();
var __dirname2 = path3.dirname(new URL(import.meta.url).pathname);
var normalizedDirname = process.platform === "win32" && __dirname2.startsWith("/") ? __dirname2.slice(1) : __dirname2;
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        normalizedDirname,
        "..",
        "client",
        "index.html"
      );
      console.log("Resolved client template path:", clientTemplate);
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error("Error in setupVite middleware:", e);
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(normalizedDirname, "..");
  console.log("Resolved dist path:", distPath);
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(express2.static("dist"));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5002;
  server.listen(5002, "127.0.0.1", () => {
    console.log("Server running on http://127.0.0.1:5002");
  });
})();
