import { MongoClient } from "mongodb";

class MongoClientService {
  private static instance: MongoClient;

  private constructor() {}

  public static getInstance(): MongoClient {
    if (!MongoClientService.instance) {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error("MONGODB_URI is not set");
      }
      MongoClientService.instance = new MongoClient(uri);
    }
    return MongoClientService.instance;
  }

  public static async connect(): Promise<void> {
    const client = MongoClientService.getInstance();
    if (!client) {
      throw new Error("MongoClient instance is not initialized");
    }
    await client.connect();
  }

  public static getDb(dbName: string) {
    const client = MongoClientService.getInstance();
    return client.db(dbName);
  }
}

export default MongoClientService;
