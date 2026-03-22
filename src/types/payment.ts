export type TransactionType = "topup" | "buy_ticket";
export type TransactionStatus = "pending" | "success" | "failed";
export type TicketStatus = "active" | "used" | "expired";

export type UserProfile = {
  id: string;
  email: string;
  createdAt: string;
};

export type Wallet = {
  userId: string;
  balance: number;
  updatedAt: string;
};

export type Transaction = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  providerOrderId?: string;
  note?: string;
  createdAt: string;
};

export type TopupOrder = {
  id: string;
  userId: string;
  amount: number;
  status: TransactionStatus;
  transactionId: string;
  paymentUrl: string;
  createdAt: string;
};

export type BusTicket = {
  id: string;
  userId: string;
  routeId: number;
  ticketCode: string;
  price: number;
  status: TicketStatus;
  createdAt: string;
};
