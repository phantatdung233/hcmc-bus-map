import crypto from "node:crypto";
import type { ClientSession } from "mongodb";

import type { BusTicket, TopupOrder, Transaction, Wallet, UserProfile } from "@/types/payment";
import { getDb, getMongoClient } from "@/lib/mongo";

type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

let indexesReady: Promise<void> | null = null;

const now = () => new Date().toISOString();
const createId = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;

const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password: string, stored: string): boolean => {
  const [salt, expectedHash] = stored.split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
};

const ensureIndexes = async () => {
  if (indexesReady) {
    await indexesReady;
    return;
  }

  indexesReady = (async () => {
    const db = await getDb();
    await Promise.all([
      db.collection<StoredUser>("users").createIndex({ email: 1 }, { unique: true }),
      db.collection<Wallet>("wallets").createIndex({ userId: 1 }, { unique: true }),
      db.collection<Transaction>("transactions").createIndex({ id: 1 }, { unique: true }),
      db.collection<Transaction>("transactions").createIndex({ userId: 1, createdAt: -1 }),
      db.collection<TopupOrder>("topup_orders").createIndex({ id: 1 }, { unique: true }),
      db.collection<TopupOrder>("topup_orders").createIndex({ userId: 1, createdAt: -1 }),
      db.collection<BusTicket>("tickets").createIndex({ id: 1 }, { unique: true }),
      db.collection<BusTicket>("tickets").createIndex({ userId: 1, createdAt: -1 }),
    ]);
  })();

  await indexesReady;
};

const toUserProfile = (user: StoredUser): UserProfile => ({
  id: user.id,
  email: user.email,
  createdAt: user.createdAt,
});

const ensureWallet = async (userId: string): Promise<Wallet> => {
  await ensureIndexes();
  const db = await getDb();
  const wallets = db.collection<Wallet>("wallets");

  await wallets.updateOne(
    { userId },
    {
      $setOnInsert: {
        userId,
        balance: 0,
        updatedAt: now(),
      },
    },
    { upsert: true },
  );

  const wallet = await wallets.findOne({ userId });
  if (!wallet) {
    throw new Error("WALLET_NOT_FOUND");
  }

  return wallet;
};

export const createUser = async (email: string, password: string): Promise<UserProfile> => {
  await ensureIndexes();
  const db = await getDb();
  const users = db.collection<StoredUser>("users");

  const normalizedEmail = email.trim().toLowerCase();
  const exists = await users.findOne({ email: normalizedEmail }, { projection: { id: 1 } });

  if (exists) {
    throw new Error("EMAIL_EXISTS");
  }

  const user: StoredUser = {
    id: createId("usr"),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: now(),
  };

  await users.insertOne(user);
  await ensureWallet(user.id);
  return toUserProfile(user);
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
  await ensureIndexes();
  const db = await getDb();
  const users = db.collection<StoredUser>("users");

  const normalizedEmail = email.trim().toLowerCase();
  const user = await users.findOne({ email: normalizedEmail });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("INVALID_CREDENTIALS");
  }

  return toUserProfile(user);
};

export const getUserById = async (userId: string): Promise<UserProfile | null> => {
  await ensureIndexes();
  const db = await getDb();
  const users = db.collection<StoredUser>("users");
  const user = await users.findOne({ id: userId });
  return user ? toUserProfile(user) : null;
};

export const getWalletByUser = async (userId: string): Promise<Wallet> => {
  return ensureWallet(userId);
};

export const getTransactionsByUser = async (userId: string): Promise<Transaction[]> => {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<Transaction>("transactions").find({ userId }).sort({ createdAt: -1 }).toArray();
};

export const createTopupOrder = async (userId: string, amount: number): Promise<TopupOrder> => {
  if (amount <= 0) {
    throw new Error("INVALID_AMOUNT");
  }

  await ensureIndexes();
  const db = await getDb();
  const transactions = db.collection<Transaction>("transactions");
  const topupOrders = db.collection<TopupOrder>("topup_orders");

  const orderId = createId("topup");
  const transactionId = createId("tx");

  const tx: Transaction = {
    id: transactionId,
    userId,
    type: "topup",
    amount,
    status: "pending",
    providerOrderId: orderId,
    note: "Cho xac nhan webhook",
    createdAt: now(),
  };

  const order: TopupOrder = {
    id: orderId,
    userId,
    amount,
    status: "pending",
    transactionId,
    paymentUrl: `/mock-payment?orderId=${orderId}`,
    createdAt: now(),
  };

  await Promise.all([transactions.insertOne(tx), topupOrders.insertOne(order)]);
  return order;
};

export const getTopupOrderById = async (orderId: string): Promise<TopupOrder | null> => {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<TopupOrder>("topup_orders").findOne({ id: orderId });
};

const markTopupSuccessInternal = async (orderId: string, session?: ClientSession): Promise<TopupOrder> => {
  const db = await getDb();
  const topupOrders = db.collection<TopupOrder>("topup_orders");
  const transactions = db.collection<Transaction>("transactions");
  const wallets = db.collection<Wallet>("wallets");

  const order = await topupOrders.findOne({ id: orderId }, session ? { session } : undefined);
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (order.status === "success") {
    return order;
  }

  const orderUpdate = await topupOrders.updateOne(
    { id: orderId, status: { $ne: "success" } },
    { $set: { status: "success" } },
    session ? { session } : undefined,
  );

  // Another request completed this order first, so return the latest state without double-crediting.
  if (!orderUpdate.modifiedCount) {
    const latestOrder = await topupOrders.findOne({ id: orderId }, session ? { session } : undefined);
    if (!latestOrder) {
      throw new Error("ORDER_NOT_FOUND");
    }

    return latestOrder;
  }

  await transactions.updateOne(
    { id: order.transactionId },
    { $set: { status: "success", note: "Nap tien thanh cong" } },
    session ? { session } : undefined,
  );

  await wallets.updateOne(
    { userId: order.userId },
    {
      $setOnInsert: { userId: order.userId },
      $inc: { balance: order.amount },
      $set: { updatedAt: now() },
    },
    { upsert: true, ...(session ? { session } : {}) },
  );

  return {
    ...order,
    status: "success",
  };
};

export const markTopupSuccess = async (orderId: string): Promise<TopupOrder> => {
  await ensureIndexes();
  const client = await getMongoClient();
  const session = client.startSession();

  try {
    let result: TopupOrder | null = null;

    await session.withTransaction(async () => {
      result = await markTopupSuccessInternal(orderId, session);
    });

    if (!result) {
      throw new Error("TOPUP_RESULT_EMPTY");
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    // Fallback for Mongo deployments without transaction support.
    if (message.includes("Transaction numbers are only allowed") || message.includes("does not support transactions")) {
      return markTopupSuccessInternal(orderId);
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

export const buyBusTicket = async (userId: string, routeId: number, price: number): Promise<BusTicket> => {
  if (price <= 0) {
    throw new Error("INVALID_PRICE");
  }

  await ensureIndexes();
  const db = await getDb();
  const wallets = db.collection<Wallet>("wallets");
  const transactions = db.collection<Transaction>("transactions");
  const tickets = db.collection<BusTicket>("tickets");

  const wallet = await ensureWallet(userId);
  if (wallet.balance < price) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  const tx: Transaction = {
    id: createId("tx"),
    userId,
    type: "buy_ticket",
    amount: price,
    status: "success",
    note: `Mua ve tuyen ${routeId}`,
    createdAt: now(),
  };

  const ticket: BusTicket = {
    id: createId("ticket"),
    userId,
    routeId,
    ticketCode: `BUS-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    price,
    status: "active",
    createdAt: now(),
  };

  await Promise.all([
    wallets.updateOne({ userId }, { $inc: { balance: -price }, $set: { updatedAt: now() } }),
    transactions.insertOne(tx),
    tickets.insertOne(ticket),
  ]);

  return ticket;
};

export const getTicketsByUser = async (userId: string): Promise<BusTicket[]> => {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<BusTicket>("tickets").find({ userId }).sort({ createdAt: -1 }).toArray();
};
