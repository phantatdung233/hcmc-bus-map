import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const projectRoot = process.cwd();

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const idx = line.indexOf("=");
    if (idx <= 0) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

const ensureEnvLoaded = () => {
  parseEnvFile(path.join(projectRoot, ".env"));
  parseEnvFile(path.join(projectRoot, ".env.local"));
};

const main = async () => {
  ensureEnvLoaded();

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "hcmc_bus_map";

  if (!uri) {
    throw new Error("Thieu MONGODB_URI trong .env");
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    const collections = ["mvp_users", "mvp_wallets", "mvp_transactions", "mvp_topup_orders", "mvp_tickets"];

    const result = {};

    for (const name of collections) {
      const exists = await db.listCollections({ name }).hasNext();
      if (!exists) {
        result[name] = "not_found";
        continue;
      }

      await db.collection(name).drop();
      result[name] = "dropped";
    }

    console.log("Da cleanup du lieu MVP tren MongoDB:");
    console.table(result);
  } finally {
    await client.close();
  }
};

main().catch((error) => {
  console.error("Cleanup that bai:", error.message);
  process.exitCode = 1;
});
