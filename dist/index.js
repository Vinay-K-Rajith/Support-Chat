// server/index.ts
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

// server/services/school-context.ts
function getSchoolContext() {
  return {
    school: {
      name: "St. Xavier's School, Bathinda",
      established: 1983,
      affiliation: "Society of Pilar, Punjab - Haryana (branch of Society of Pilar, GOA)",
      curriculum: "Central Board of Secondary Education (CBSE), Delhi",
      mediumOfInstruction: "English",
      additionalLanguages: ["Punjabi", "Hindi", "Sanskrit"],
      email: "contactsaintxaviersbathinda@gmail.com",
      website: "www.xavierbathinda.com",
      transportation: "Not provided by school",
      history: "Originally an all-boys school, opened to girls in April 1990",
      mission: "All-round development of the child, especially moral and intellectual qualities",
      facilities: [
        "Computer Science",
        "Classical Dance",
        "Music",
        "Dispensaries",
        "Grihini Schools",
        "Orphanages",
        "Balwadis"
      ]
    },
    admissions2025_2026: {
      classes: {
        nursery: {
          ageEligibility: "DOB from 01.04.2021 to 31.03.2022",
          note: "Candidate will NOT be eligible if outside specified age limit"
        },
        lkg: {
          ageEligibility: "DOB from 01.04.2020 to 31.03.2021",
          note: "Candidate will NOT be eligible if outside specified age limit"
        }
      },
      registrationFee: "Rs. 1000/- (non-refundable)",
      selectionProcess: "Draw of lots (conducted online)",
      priorities: [
        "Children of Staff Members (if basic criteria fulfilled)",
        "Christian Minority community children",
        "Other applications by draw of lots"
      ]
    },
    requiredDocuments: {
      essential: [
        "Date of Birth Certificate (Municipal Corporation issued)",
        "Baptism Certificate (for Christian children only)",
        "Parents' Qualification Certificates and Aadhaar Card",
        "Proof of residence (any one of the following)"
      ],
      proofOfResidence: [
        "Voter ID Card",
        "Electricity Bill",
        "Aadhaar Card",
        "Ration Card",
        "Passport",
        "Rent Deed (if staying on rent)"
      ],
      photographs: {
        requirements: [
          "Latest photograph of candidate (taken within one month)",
          "Individual photographs of both parents",
          "Family photograph (showing both parents and candidate)",
          "Red background, JPG format, size less than 20KB"
        ]
      },
      attestation: "All photocopies must be attested by Class A Gazetted Officer only (No Notary attested copies accepted)",
      singleParent: {
        divorce: "Divorce Decree",
        separated: "Legal Separation Document",
        widowWidower: "Death Certificate of spouse",
        adoption: "Adoption Decree"
      }
    },
    feeStructure: {
      fees: "The fee structure for the academic session 2024-25 at St. Xavier's School, Bathinda, provides a detailed financial roadmap for parents across various classes, beginning with LKG, which mandates an initial non-refundable admission fee of \u20B95,000, a non-refundable development fee of \u20B97,000, and a refundable security deposit of \u20B91,000 to secure a place, followed by a quarterly fee schedule that starts with \u20B920,420 from April to June and continues with \u20B915,990 for each of the subsequent quarters\u2014July-September, October-December, and January-March. These quarterly payments encompass an annual amalgamated fee of \u20B94,430, a tuition fee of \u20B915,090, a smart class and Entab fee of \u20B9600, and air conditioner and running costs of \u20B9300, reflecting the school's investment in infrastructure and educational resources. Similarly, UKG follows an identical quarterly fee structure with no admission or development fees but includes the same \u20B91,000 refundable security deposit, maintaining the same breakdown of \u20B920,420 for April-June and \u20B915,990 for the remaining quarters, covering the same annual fee components to ensure consistency in early education costs. Moving to Class I, the total fee rises to \u20B920,570 for April-June and \u20B916,140 for the following quarters, incorporating an amalgamated fee of \u20B94,430, a tuition fee of \u20B915,090, a smart class and Entab fee of \u20B9600, a computer fee of \u20B9150 to support technological learning, and air conditioner costs of \u20B9300 annually, indicating an incremental increase in educational services. Class II adjusts the tuition fee to \u20B912,240 annually, resulting in a total of \u20B917,720 for April-June and \u20B913,290 for other quarters, while retaining the same additional fees as Class I, suggesting a slight reduction in tuition as the curriculum evolves. Class III escalates the initial payment to \u20B918,820 for April-June and \u20B98,850 for subsequent quarters, with a tuition fee of \u20B97,800, alongside smart class and Entab fees of \u20B9600, computer fees of \u20B9150, and air conditioner costs of \u20B9300 annually, reflecting a balanced approach to fee distribution. Class IV further modifies the structure with a total of \u20B913,780 for April-June and \u20B99,300 for other quarters, featuring a tuition fee of \u20B98,550, with the same additional fees, indicating a stabilization in costs as students progress. Classes V-VI and VII-X maintain a tuition fee of \u20B98,550, with totals of \u20B913,830 and \u20B913,890 respectively for April-June, and \u20B99,300 for other quarters, including smart class and Entab fees of \u20B9600 and computer fees of \u20B9150, showing a consistent fee model for middle and higher grades. For Class XI, Xavierites are required to pay a \u20B95,000 admission fee, with quarterly fees of \u20B918,590 for April-June and \u20B912,180 for other quarters, comprising an amalgamated fee of \u20B96,410, a tuition fee of \u20B911,580, and a smart class fee of \u20B9600, while Non-Xavierites face additional non-refundable development fee of \u20B95,000 and a refundable security deposit of \u20B91,000, aligning their quarterly totals with Xavierites. Class XII follows the same fee pattern as Xavierites in Class XI, with quarterly fees of \u20B918,590 for April-June and \u20B912,180 for other quarters, covering the same fee heads. This extensive and meticulously designed fee structure ensures transparency and predictability for parents, accommodating the diverse needs and stages of education from pre-primary to senior secondary levels at St. Xavier's School, Bathinda.",
      note: "Fee structure available on school website www.xavierbathinda.com",
      rules: [
        "Initial payment at admission in cash/online",
        "Caution money refundable when pupil leaves (after due deductions)",
        "Fees once paid are not refundable",
        "Penalty for delay in payment",
        "School reserves right to modify/enhance fees by minimum 10% annually",
        "One month notice required for withdrawal"
      ]
    },
    academicInfo: {
      gradingSystem: {
        "91-100": "A1 (10.0)",
        "81-90": "A2 (9.0)",
        "71-80": "B1 (8.0)",
        "61-70": "B2 (7.0)",
        "51-60": "C1 (6.0)",
        "41-50": "C2 (5.0)",
        "33-40": "D (4.0)",
        "21-32": "E1",
        "00-20": "E2"
      },
      promotionCriteria: "Minimum D grade in each subject required for promotion",
      subjects: [
        "Computer Science",
        "Classical Dance",
        "Music",
        "Punjabi",
        "Hindi",
        "Sanskrit"
      ]
    },
    importantNotes: [
      "Only one form per candidate accepted",
      "Duplicate forms will be rejected",
      "School does not accept donations for admissions",
      "Be aware of third parties making false claims",
      "NEP 2020 implementation may require additional fees",
      "School not responsible if candidate found underage as per NEP 2020"
    ]
  };
}

// server/services/gemini.ts
var genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || "AIzaSyDiS_-3NEG95Aj3Fr4Vv_hm0EY-rr3IJ00"
);
var model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
async function generateResponse(userMessage, sessionId) {
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

// server/routes.ts
import { nanoid } from "nanoid";
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
  app2.post("/api/chat/message", async (req, res) => {
    try {
      const { sessionId, content } = req.body;
      if (!sessionId || !content) {
        return res.status(400).json({ error: "Session ID and content are required" });
      }
      const userMessage = await storage.createChatMessage({
        sessionId,
        content,
        isUser: true
      });
      const aiResponse = await generateResponse(content, sessionId);
      const aiMessage = await storage.createChatMessage({
        sessionId,
        content: aiResponse,
        isUser: false
      });
      res.json({
        userMessage,
        aiMessage
      });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });
  app2.get("/api/chat/history/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getChatMessages(sessionId);
      res.json({ messages });
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "client/index.html"),
        widget: path.resolve(__dirname, "client/widget.html")
      }
    }
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
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(express2.static("dist"));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
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
  const port = 5e3;
  server.listen(5e3, "127.0.0.1", () => {
    console.log("Server running on http://127.0.0.1:5000");
  });
})();
