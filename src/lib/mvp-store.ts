import fs from "node:fs";
import path from "node:path";

import type { BusTicket, MvpUser, TopupOrder, Transaction, Wallet } from "@/types/payment";

type StoreState = {
  users: MvpUser[];
  wallets: Wallet[];
  transactions: Transaction[];
  topupOrders: TopupOrder[];
  tickets: BusTicket[];
};

const STORE_FILE = path.join(process.cwd(), ".mvp-store.json");

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

const emptyState = (): StoreState => ({
  users: [],
  wallets: [],
  transactions: [],
  topupOrders: [],
  tickets: [],
});

// Global in-memory store for Vercel/serverless environments
let globalMemoryStore: StoreState | null = null;

const canWriteFilesystem = (): boolean => {
  try {
    if (process.env.VERCEL) {
      return false;
    }
    fs.accessSync(path.dirname(STORE_FILE), fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

const saveState = (state: StoreState) => {
  if (canWriteFilesystem()) {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), "utf8");
    } catch {
      // Fallback to memory if write fails
      globalMemoryStore = state;
    }
  } else {
    // Store in memory for Vercel
    globalMemoryStore = state;
  }
};

const ensureSeed = (state: StoreState): StoreState => {
  const existed = state.users.find((u) => u.email === "demo@bus.local");

  if (existed) {
    const wallet = state.wallets.find((w) => w.userId === existed.id);
    if (!wallet) {
      state.wallets.push({ userId: existed.id, balance: 0, updatedAt: now() });
    }

    return state;
  }

  const user: MvpUser = {
    id: createId("usr"),
    email: "demo@bus.local",
    password: "123456",
    createdAt: now(),
  };

  state.users.push(user);
  state.wallets.push({ userId: user.id, balance: 0, updatedAt: now() });
  return state;
};

const readState = (): StoreState => {
  // Check memory store first (for Vercel)
  if (globalMemoryStore) {
    return { ...globalMemoryStore };
  }

  // Try to read from filesystem
  try {
    if (canWriteFilesystem() && fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<StoreState>;
      const state: StoreState = {
        users: parsed.users ?? [],
        wallets: parsed.wallets ?? [],
        transactions: parsed.transactions ?? [],
        topupOrders: parsed.topupOrders ?? [],
        tickets: parsed.tickets ?? [],
      };

      return ensureSeed(state);
    }
  } catch {
    // Fall through to create new state
  }

  // Create new state
  const state = ensureSeed(emptyState());
  saveState(state);
  return state;
};

const ensureWallet = (state: StoreState, userId: string): Wallet => {
  const existed = state.wallets.find((w) => w.userId === userId);
  if (existed) {
    return existed;
  }

  const wallet: Wallet = {
    userId,
    balance: 0,
    updatedAt: now(),
  };
  state.wallets.push(wallet);
  return wallet;
};

export const createUser = (email: string, password: string): MvpUser => {
  const state = readState();
  const normalizedEmail = email.trim().toLowerCase();

  if (state.users.some((u) => u.email === normalizedEmail)) {
    throw new Error("EMAIL_EXISTS");
  }

  const user: MvpUser = {
    id: createId("usr"),
    email: normalizedEmail,
    password,
    createdAt: now(),
  };

  state.users.push(user);
  ensureWallet(state, user.id);
  saveState(state);
  return user;
};

export const loginUser = (email: string, password: string): MvpUser => {
  const state = readState();
  const normalizedEmail = email.trim().toLowerCase();
  const user = state.users.find((u) => u.email === normalizedEmail);

  if (!user || user.password !== password) {
    throw new Error("INVALID_CREDENTIALS");
  }

  return user;
};

export const getUserById = (userId: string): MvpUser | null => {
  const state = readState();
  return state.users.find((u) => u.id === userId) ?? null;
};

export const getWalletByUser = (userId: string): Wallet => {
  const state = readState();
  const wallet = ensureWallet(state, userId);
  saveState(state);
  return wallet;
};

export const getTransactionsByUser = (userId: string): Transaction[] => {
  const state = readState();
  return state.transactions.filter((tx) => tx.userId === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
};

export const createTopupOrder = (userId: string, amount: number): TopupOrder => {
  const state = readState();
  const id = createId("topup");
  const transactionId = createId("tx");

  const tx: Transaction = {
    id: transactionId,
    userId,
    type: "topup",
    amount,
    status: "pending",
    providerOrderId: id,
    note: "Cho xac nhan webhook",
    createdAt: now(),
  };

  const order: TopupOrder = {
    id,
    userId,
    amount,
    status: "pending",
    transactionId,
    paymentUrl: `/mock-payment?orderId=${id}`,
    createdAt: now(),
  };

  state.transactions.push(tx);
  state.topupOrders.push(order);
  saveState(state);

  return order;
};

export const getTopupOrderById = (orderId: string): TopupOrder | null => {
  const state = readState();
  return state.topupOrders.find((o) => o.id === orderId) ?? null;
};

export const markTopupSuccess = (orderId: string): TopupOrder => {
  const state = readState();
  const order = state.topupOrders.find((o) => o.id === orderId);

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (order.status === "success") {
    return order;
  }

  order.status = "success";

  const tx = state.transactions.find((item) => item.id === order.transactionId);
  if (tx) {
    tx.status = "success";
    tx.note = "Nap tien thanh cong";
  }

  const wallet = ensureWallet(state, order.userId);
  wallet.balance += order.amount;
  wallet.updatedAt = now();

  saveState(state);
  return order;
};

export const creditTopupDirect = (
  userId: string,
  amount: number,
  note = "Nap tien thanh cong (fallback)",
): Transaction => {
  const state = readState();
  const wallet = ensureWallet(state, userId);
  wallet.balance += amount;
  wallet.updatedAt = now();

  const tx: Transaction = {
    id: createId("tx"),
    userId,
    type: "topup",
    amount,
    status: "success",
    note,
    createdAt: now(),
  };

  state.transactions.push(tx);
  saveState(state);
  return tx;
};

export const buyBusTicket = (userId: string, routeId: number, price: number): BusTicket => {
  if (price <= 0) {
    throw new Error("INVALID_PRICE");
  }

  const state = readState();
  const wallet = ensureWallet(state, userId);

  if (wallet.balance < price) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  wallet.balance -= price;
  wallet.updatedAt = now();

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
    ticketCode: `BUS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    price,
    status: "active",
    createdAt: now(),
  };

  state.transactions.push(tx);
  state.tickets.unshift(ticket);
  saveState(state);

  return ticket;
};

export const getTicketsByUser = (userId: string): BusTicket[] => {
  const state = readState();
  return state.tickets.filter((t) => t.userId === userId);
};
