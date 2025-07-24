import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

const DB_NAME = "test";
const COLLECTION = "support_chat_history";

export async function getAllChatSessions() {
  await client.connect();
  const db = client.db(DB_NAME);
  // Group by sessionId, get latest message timestamp for sorting
  const sessions = await db.collection(COLLECTION).aggregate([
    { $group: {
      _id: "$sessionId",
      lastMessageAt: { $max: "$timestamp" },
      count: { $sum: 1 },
      firstMessage: { $first: "$content" }
    }},
    { $sort: { lastMessageAt: -1 } }
  ]).toArray();
  return sessions.map(s => ({
    sessionId: s._id,
    lastMessageAt: s.lastMessageAt,
    messageCount: s.count,
    firstMessage: s.firstMessage
  }));
}

export async function getChatMessagesBySession(sessionId: string) {
  await client.connect();
  const db = client.db(DB_NAME);
  const messages = await db.collection(COLLECTION)
    .find({ sessionId })
    .sort({ timestamp: 1 })
    .toArray();
  return messages;
}

export async function saveChatMessage({ sessionId, content, isUser, timestamp }: { sessionId: string, content: string, isUser: boolean, timestamp?: Date }) {
  await client.connect();
  const db = client.db(DB_NAME);
  const doc = {
    sessionId,
    content,
    isUser,
    timestamp: timestamp || new Date()
  };
  await db.collection(COLLECTION).insertOne(doc);
  return doc;
}

export async function getUsageStats(type: 'daily' | 'weekly' | 'monthly') {
  await client.connect();
  const db = client.db(DB_NAME);
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
  const pipeline = [
    { $group: {
      _id: groupId,
      count: { $sum: 1 }
    }},
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } }
  ];
  const results = await db.collection(COLLECTION).aggregate(pipeline).toArray();
  // Format period string
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

export async function getHourlyUsageStats(dateStr?: string) {
  await client.connect();
  const db = client.db(DB_NAME);
  let match: any = {};
  let start: Date, end: Date;
  if (dateStr) {
    // Parse date and match messages for that day (UTC)
    start = new Date(dateStr + 'T00:00:00.000Z');
    end = new Date(dateStr + 'T23:59:59.999Z');
  } else {
    // Default to today (UTC)
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(today.getUTCDate()).padStart(2, '0');
    start = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    end = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`);
  }
  match = { timestamp: { $gte: start, $lte: end } };
  const pipeline = [
    { $match: match },
    { $group: {
      _id: { hour: { $hour: "$timestamp" } },
      count: { $sum: 1 }
    }},
    { $sort: { "_id.hour": 1 } }
  ];
  const results = await db.collection(COLLECTION).aggregate(pipeline).toArray();
  // Fill missing hours with 0
  const hourMap: Record<number, number> = {};
  results.forEach(r => { hourMap[r._id.hour] = r.count; });
  // Always return 24 items (0-23)
  const full = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] || 0 }));
  return full;
} 