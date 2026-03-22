import { MongoClient, type Db } from "mongodb";

let clientPromise: Promise<MongoClient> | null = null;

const getMongoUri = () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Thieu MONGODB_URI trong moi truong");
  }

  return uri;
};

export const getDb = async (): Promise<Db> => {
  const dbName = process.env.MONGODB_DB || "hcmc_bus_map";

  const client = await getMongoClient();
  return client.db(dbName);
};

export const getMongoClient = async (): Promise<MongoClient> => {
  if (!clientPromise) {
    const client = new MongoClient(getMongoUri());
    clientPromise = client.connect();
  }

  return clientPromise;
};
