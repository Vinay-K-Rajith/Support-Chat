import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export async function getKnowledgeBase() {
  await client.connect();
  const db = client.db("test");
  const kb = await db.collection("Chatbot").findOne({});
  return kb;
}

export async function updateKnowledgeBase(data: any) {
  await client.connect();
  const db = client.db("test");
  await db.collection("Chatbot").updateOne({}, { $set: data }, { upsert: true });
  return getKnowledgeBase();
} 