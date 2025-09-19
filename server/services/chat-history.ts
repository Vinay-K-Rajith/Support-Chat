import MongoClientService from "./mongo-client";

const DB_NAME = "test";
const COLLECTION = "support_chat_history";

export async function getAllChatSessions(schoolCode?: string) {
  await MongoClientService.connect();
  const db = MongoClientService.getDb(DB_NAME);
  
  const pipeline: any[] = [];
  
  // Add match stage for school code filtering if provided
  if (schoolCode) {
    pipeline.push({ $match: { schoolCode: schoolCode } });
  }
  
  pipeline.push(
    { $group: {
      _id: "$sessionId",
      lastMessageAt: { $max: "$timestamp" },
      count: { $sum: 1 },
      firstMessage: { $first: "$content" },
      schoolCode: { $first: "$schoolCode" }
    }},
    { $sort: { lastMessageAt: -1 } }
  );
  
  const sessions = await db.collection(COLLECTION).aggregate(pipeline).toArray();
  return sessions.map(s => ({
    sessionId: s._id,
    lastMessageAt: s.lastMessageAt,
    messageCount: s.count,
    firstMessage: s.firstMessage,
    schoolCode: s.schoolCode
  }));
}

export async function getChatMessagesBySession(sessionId: string) {
  await MongoClientService.connect();
  const db = MongoClientService.getDb(DB_NAME);
  const messages = await db.collection(COLLECTION)
    .find({ sessionId })
    .sort({ timestamp: 1 })
    .toArray();
  return messages;
}

export async function saveChatMessage({ sessionId, content, isUser, timestamp, schoolCode }: { sessionId: string, content: string, isUser: boolean, timestamp?: Date, schoolCode?: string }) {
  await MongoClientService.connect();
  const db = MongoClientService.getDb(DB_NAME);
  const doc = {
    sessionId,
    content,
    isUser,
    timestamp: timestamp || new Date(),
    schoolCode: schoolCode || null
  };
  console.log("💾 Saving message to DB:", { sessionId, isUser: isUser, schoolCode: schoolCode, contentLength: content.length });
  await db.collection(COLLECTION).insertOne(doc);
  console.log("✅ Message saved successfully");
  return doc;
}

export async function getUsageStats(type: 'daily' | 'weekly' | 'monthly', schoolCode?: string) {
  await MongoClientService.connect();
  const db = MongoClientService.getDb(DB_NAME);
  let groupId: any = {};
  if (type === 'daily') {
    groupId = {
      year: { $year: "$timestamp" },
      month: { $month: "$timestamp" },
      day: { $dayOfMonth: "$timestamp" }
    };
  } else if (type === 'weekly') {
    groupId = {
      year: { $year: "$timestamp" },
      week: { $isoWeek: "$timestamp" }
    };
  } else if (type === 'monthly') {
    groupId = {
      year: { $year: "$timestamp" },
      month: { $month: "$timestamp" }
    };
  }
  
  const pipeline: any[] = [];
  
  // Add match stage for school code filtering if provided
  if (schoolCode) {
    pipeline.push({ $match: { schoolCode: schoolCode } });
  }
  
  pipeline.push(
    { $group: {
      _id: groupId,
      count: { $sum: 1 }
    }},
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } }
  );
  
  const results = await db.collection(COLLECTION).aggregate(pipeline).toArray();
  return results.map(r => {
    let period = '';
    if (type === 'daily') {
      period = `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`;
    } else if (type === 'weekly') {
      period = `${r._id.year}-W${r._id.week}`;
    } else if (type === 'monthly') {
      period = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
    }
    return { period, count: r.count };
  });
}

export async function getHourlyUsageStats(dateStr?: string, schoolCode?: string) {
  await MongoClientService.connect();
  const db = MongoClientService.getDb(DB_NAME);
  let match: any = {};
  let start: Date, end: Date;
  if (dateStr) {
    start = new Date(dateStr + 'T00:00:00.000Z');
    end = new Date(dateStr + 'T23:59:59.999Z');
  } else {
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(today.getUTCDate()).padStart(2, '0');
    start = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    end = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`);
  }
  match = { timestamp: { $gte: start, $lte: end } };
  
  // Add school code filtering if provided
  if (schoolCode) {
    match.schoolCode = schoolCode;
  }
  
  const pipeline = [
    { $match: match },
    { $group: {
      _id: { hour: { $hour: "$timestamp" } },
      count: { $sum: 1 }
    }},
    { $sort: { "_id.hour": 1 } }
  ];
  const results = await db.collection(COLLECTION).aggregate(pipeline).toArray();
  const hourMap: Record<number, number> = {};
  results.forEach(r => { hourMap[r._id.hour] = r.count; });
  const full = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] || 0 }));
  return full;
}
