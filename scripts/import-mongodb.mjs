import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const projectRoot = process.cwd();

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

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

const readJson = (relativePath) => {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Khong tim thay file du lieu: ${relativePath}`);
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`File ${relativePath} khong phai JSON array`);
  }

  return parsed;
};

const upsertBy = async (collection, docs, filterBuilder) => {
  if (!docs.length) {
    return { upsertedCount: 0, modifiedCount: 0, matchedCount: 0 };
  }

  const operations = docs.map((doc) => ({
    updateOne: {
      filter: filterBuilder(doc),
      update: { $set: doc },
      upsert: true,
    },
  }));

  return collection.bulkWrite(operations, { ordered: false });
};

const importStaticData = async (db) => {
  const routes = readJson("src/data/routes.json");
  const routeInfos = readJson("src/data/routeinfo.json");
  const stations = readJson("src/data/stations.json");

  const routesCol = db.collection("routes");
  const routeInfosCol = db.collection("route_infos");
  const stationsCol = db.collection("stations");

  await Promise.all([
    routesCol.createIndex({ RouteId: 1 }, { unique: true }),
    routeInfosCol.createIndex({ RouteId: 1 }, { unique: true }),
    stationsCol.createIndex({ StationId: 1, RouteId: 1, StationDirection: 1 }, { unique: true }),
  ]);

  const [routesResult, routeInfosResult, stationsResult] = await Promise.all([
    upsertBy(routesCol, routes, (doc) => ({ RouteId: doc.RouteId })),
    upsertBy(routeInfosCol, routeInfos, (doc) => ({ RouteId: doc.RouteId })),
    upsertBy(stationsCol, stations, (doc) => ({
      StationId: doc.StationId,
      RouteId: doc.RouteId,
      StationDirection: doc.StationDirection,
    })),
  ]);

  return {
    routes: {
      source: routes.length,
      upserted: routesResult.upsertedCount,
      modified: routesResult.modifiedCount,
      matched: routesResult.matchedCount,
    },
    routeInfos: {
      source: routeInfos.length,
      upserted: routeInfosResult.upsertedCount,
      modified: routeInfosResult.modifiedCount,
      matched: routeInfosResult.matchedCount,
    },
    stations: {
      source: stations.length,
      upserted: stationsResult.upsertedCount,
      modified: stationsResult.modifiedCount,
      matched: stationsResult.matchedCount,
    },
  };
};

const main = async () => {
  ensureEnvLoaded();

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "hcmc_bus_map";

  if (!uri) {
    throw new Error("Thieu MONGODB_URI. Hay them MONGODB_URI vao .env hoac .env.local");
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    console.log(`Dang import vao database: ${dbName}`);

    const staticSummary = await importStaticData(db);

    console.log("\n=== Tong ket import du lieu bus ===");
    console.table(staticSummary);

    console.log("\nImport MongoDB thanh cong.");
  } finally {
    await client.close();
  }
};

main().catch((error) => {
  console.error("Import that bai:", error.message);
  process.exitCode = 1;
});
