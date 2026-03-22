import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
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

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const readInput = (inputPath) => {
  const absolutePath = path.isAbsolute(inputPath) ? inputPath : path.join(projectRoot, inputPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Khong tim thay file import: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("File import phai la JSON array");
  }

  return parsed;
};

const normalizeUser = (item, index) => {
  const email = typeof item?.email === "string" ? item.email.trim().toLowerCase() : "";
  const password = typeof item?.password === "string" ? item.password : "";
  const balance = Number(item?.balance ?? 0);

  if (!email || !email.includes("@")) {
    throw new Error(`Dong ${index + 1}: email khong hop le`);
  }

  if (password.length < 8) {
    throw new Error(`Dong ${index + 1}: password toi thieu 8 ky tu`);
  }

  if (!Number.isFinite(balance) || balance < 0) {
    throw new Error(`Dong ${index + 1}: balance khong hop le`);
  }

  return {
    email,
    password,
    balance: Math.round(balance),
  };
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const fileArgIndex = args.findIndex((arg) => arg === "--file" || arg === "-f");

  if (fileArgIndex >= 0 && args[fileArgIndex + 1]) {
    return { inputFile: args[fileArgIndex + 1] };
  }

  return { inputFile: "scripts/users.import.json" };
};

const main = async () => {
  ensureEnvLoaded();

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "hcmc_bus_map";

  if (!uri) {
    throw new Error("Thieu MONGODB_URI trong .env");
  }

  const { inputFile } = parseArgs();
  const inputUsers = readInput(inputFile).map(normalizeUser);

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const usersCol = db.collection("users");
    const walletsCol = db.collection("wallets");

    await Promise.all([
      usersCol.createIndex({ email: 1 }, { unique: true }),
      walletsCol.createIndex({ userId: 1 }, { unique: true }),
    ]);

    let inserted = 0;
    let updated = 0;

    for (const item of inputUsers) {
      const existed = await usersCol.findOne({ email: item.email });
      const now = new Date().toISOString();

      let userId;
      if (!existed) {
        userId = `usr_${crypto.randomUUID().replaceAll("-", "")}`;
        await usersCol.insertOne({
          id: userId,
          email: item.email,
          passwordHash: hashPassword(item.password),
          createdAt: now,
        });
        inserted += 1;
      } else {
        userId = existed.id;
        await usersCol.updateOne(
          { id: userId },
          {
            $set: {
              passwordHash: hashPassword(item.password),
            },
          },
        );
        updated += 1;
      }

      await walletsCol.updateOne(
        { userId },
        {
          $setOnInsert: { userId, createdAt: now },
          $set: { updatedAt: now },
          $max: { balance: item.balance },
        },
        { upsert: true },
      );
    }

    console.log(`Import users thanh cong: ${inputUsers.length} records`);
    console.table({ inserted, updated, total: inputUsers.length });
  } finally {
    await client.close();
  }
};

main().catch((error) => {
  console.error("Import users that bai:", error.message);
  process.exitCode = 1;
});
