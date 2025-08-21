import MongoClientService from "./mongo-client";

export async function getKnowledgeBase() {
  await MongoClientService.connect();
  const db = MongoClientService.getDb("test");
  const kb = await db.collection("Chatbot").findOne({});
  return kb;
}

export async function updateKnowledgeBase(data: any) {
  await MongoClientService.connect();
  const db = MongoClientService.getDb("test");
  await db.collection("Chatbot").updateOne({}, { $set: data }, { upsert: true });
  return getKnowledgeBase();
}